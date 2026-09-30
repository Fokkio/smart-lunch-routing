import type { Customer, Order, Rider, RiderRoute, RoutePlan, RouteStop } from './models';
import type { DeliveryRouteModel, RoutePlanModel } from './route-plan.models';
import { ROUTE_PALETTE } from './route-plan-view';

export interface BackendPlanLookup {
  customers: Customer[];
  orders: Order[];
  riders: Rider[];
}

interface ShopTime {
  deadlineTime: string;
}

const FALLBACK_RIDER_NAMES = (index: number): string => `ไรเดอร์ ${index + 1}`;

/**
 * แปลง backend RoutePlanModel ให้เป็น frontend RoutePlan ตัวเดิมที่
 * delivery.component.html ใช้อยู่ — template ไม่ต้องเปลี่ยน UI จึงเหมือน
 * รูปเดิมทั้งก่อนและหลัง backend ส่งแผนมา ยอดรวมใช้ค่าจาก backend ตรง ๆ
 * ไม่คำนวณใหม่ ส่วนรายรับ/ทุนรายคันแบ่งตามสัดส่วนกล่องให้ผลรวมตรงกัน
 */
export function adaptBackendPlan(
  plan: RoutePlanModel,
  lookup: BackendPlanLookup,
  shop: ShopTime = { deadlineTime: '12:30' },
): RoutePlan {
  const customerById = new Map(lookup.customers.map((c) => [c.id, c]));
  const orderById = new Map(lookup.orders.map((o) => [o.id, o]));
  const riderById = new Map(lookup.riders.map((r) => [r.id, r]));

  const routes: RiderRoute[] = plan.jobs.map((job, index) =>
    adaptJob(plan, job, index, { customerById, orderById, riderById }, lookup.riders, shop),
  );

  return {
    version: plan.routePlanId ?? 1,
    generatedAt: new Date().toISOString(),
    routes,
    totalDistanceKm: plan.totalDistanceKm,
    totalDurationMinutes: routes.reduce((sum, r) => sum + r.durationMinutes, 0),
    deliveryCost: plan.totalDeliveryCost,
    revenue: plan.totalRevenue,
    foodCost: plan.totalFoodCost,
    profit: plan.estimatedProfit,
    deadlineSafe: plan.estimatedFinishTime <= shop.deadlineTime,
  };
}

function adaptJob(
  plan: RoutePlanModel,
  job: DeliveryRouteModel,
  index: number,
  maps: {
    customerById: Map<string, Customer>;
    orderById: Map<string, Order>;
    riderById: Map<string, Rider>;
  },
  riders: Rider[],
  shop: ShopTime,
): RiderRoute {
  const rider: Rider =
    (job.riderId !== null && maps.riderById.get(String(job.riderId))) ||
    riders[index % Math.max(riders.length, 1)] || {
      id: job.riderId !== null ? String(job.riderId) : `backend-r${index + 1}`,
      name: FALLBACK_RIDER_NAMES(index),
      phone: '',
      jobCode: job.jobCode ?? `P${plan.routePlanId ?? ''}-R${index + 1}`,
      color: ROUTE_PALETTE[index % ROUTE_PALETTE.length]!,
    };

  const stops: RouteStop[] = job.stops.map((s) => {
    const customer: Customer = maps.customerById.get(String(s.customerId)) ?? {
      id: String(s.customerId),
      name: s.customerName,
      phone: s.phone,
      address: s.address ?? '',
      lat: s.latitude,
      lng: s.longitude,
    };
    const order: Order = maps.orderById.get(String(s.orderId)) ?? {
      id: String(s.orderId),
      customerId: String(s.customerId),
      boxes: s.boxCount,
      status: 'assigned',
      createdAt: new Date().toISOString(),
    };
    return {
      order,
      customer,
      sequence: s.sequence,
      distanceFromPreviousKm: s.distanceFromPreviousKm,
      arrivalTime: s.estimatedArrivalTime,
    };
  });

  const share = plan.totalBoxes > 0 ? job.totalBoxes / plan.totalBoxes : 0;
  const revenue = round2(plan.totalRevenue * share);
  const foodCost = round2(plan.totalFoodCost * share);
  const deliveryCost = job.deliveryCost;

  return {
    rider: {
      ...rider,
      jobCode: job.jobCode ?? rider.jobCode,
    },
    stops,
    totalBoxes: job.totalBoxes,
    distanceKm: job.distanceKm,
    durationMinutes: job.durationMinutes,
    deliveryCost,
    revenue,
    foodCost,
    profit: round2(revenue - foodCost - deliveryCost),
    deadlineSafe: job.estimatedFinishTime <= shop.deadlineTime,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
