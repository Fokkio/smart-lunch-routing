import { Injectable, computed, signal } from '@angular/core';
import { DEMO_CUSTOMERS, DEMO_ORDERS, DEMO_RIDERS } from './demo-data';
import { Customer, Order, RiderRoute, RoutePlan, RouteStop, SHOP } from './models';

const CUSTOMER_KEY = 'smart-lunch-customers-v1';
const ORDER_KEY = 'smart-lunch-orders-v1';
const PLAN_KEY = 'smart-lunch-plan-v1';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  readonly customers = signal<Customer[]>(this.load(CUSTOMER_KEY, DEMO_CUSTOMERS));
  readonly orders = signal<Order[]>(this.load(ORDER_KEY, DEMO_ORDERS));
  readonly riders = signal(DEMO_RIDERS);
  readonly plan = signal<RoutePlan | null>(this.load<RoutePlan | null>(PLAN_KEY, null));
  readonly confirmedPlan = signal<RoutePlan | null>(null);
  readonly planHistory = signal<RoutePlan[]>([]);
  readonly pendingOrders = computed(() => this.orders().filter((order) => order.status === 'pending'));
  readonly pendingBoxes = computed(() => this.pendingOrders().reduce((sum, order) => sum + order.boxes, 0));

  constructor() {
    // แผนที่ค้างใน localStorage อาจอ้างลูกค้าที่ถูกลบไปแล้ว — ตรวจแล้วทิ้งทั้งแผน
    // เพื่อให้หน้าเว็บยังแสดงผลได้ แทนที่จะพังทั้งหน้า
    const pruned = this.pruneStalePlan(this.plan());
    if (pruned !== this.plan()) {
      this.plan.set(pruned);
      if (pruned) this.persist(PLAN_KEY, pruned);
      else localStorage.removeItem(PLAN_KEY);
    }
  }

  saveCustomer(input: Omit<Customer, 'id'> & { id?: string }): void {
    const current = this.customers();
    const customer: Customer = { ...input, id: input.id || `c-${Date.now()}` };
    const next = input.id ? current.map((item) => item.id === input.id ? customer : item) : [...current, customer];
    this.customers.set(next);
    this.persist(CUSTOMER_KEY, next);
    this.clearPlan();
  }

  deleteCustomer(id: string): boolean {
    if (this.orders().some((order) => order.customerId === id)) return false;
    const next = this.customers().filter((customer) => customer.id !== id);
    this.customers.set(next);
    this.persist(CUSTOMER_KEY, next);
    return true;
  }

  saveOrder(input: Omit<Order, 'id' | 'createdAt'> & { id?: string }): void {
    const current = this.orders();
    const existing = input.id ? current.find((order) => order.id === input.id) : undefined;
    const order: Order = {
      ...input,
      id: input.id || `ORD-${String(Date.now()).slice(-6)}`,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const next = input.id ? current.map((item) => item.id === input.id ? order : item) : [order, ...current];
    this.orders.set(next);
    this.persist(ORDER_KEY, next);
    this.clearPlan();
  }

  deleteOrder(id: string): void {
    const next = this.orders().filter((order) => order.id !== id);
    this.orders.set(next);
    this.persist(ORDER_KEY, next);
    this.clearPlan();
  }

  simulateOrder(): void {
    const activeCustomerIds = new Set(this.pendingOrders().map((order) => order.customerId));
    const customer = this.customers().find((item) => !activeCustomerIds.has(item.id)) || this.customers()[0];
    if (!customer) return;
    this.saveOrder({ customerId: customer.id, boxes: (this.orders().length % 3) + 1, status: 'pending' });
  }

  calculateRoutes(alternative = false): RoutePlan {
    const plan = this.previewRoutes(alternative ? (this.plan()?.version || 1) + 1 : 1);
    this.choosePlan(plan);
    return plan;
  }

  previewRoutes(version: number): RoutePlan {
    const orders = this.pendingOrders();
    const customerById = new Map(this.customers().map((customer) => [customer.id, customer]));
    // ข้ามออเดอร์ที่ลูกค้าถูกลบไปแล้ว แทนที่จะพังทั้งแผน
    const known = orders.filter((order) => customerById.has(order.customerId));
    // ไม่มีไรเดอร์เลยก็คืนแผนว่าง หน้าเว็บยังแสดงผลได้ตามปกติ
    if (!known.length || !this.riders().length) {
      return this.emptyPlan(version);
    }
    const sorted = [...known].sort((a, b) => {
      const ca = customerById.get(a.customerId)!;
      const cb = customerById.get(b.customerId)!;
      return Math.atan2(ca.lat - SHOP.lat, ca.lng - SHOP.lng) - Math.atan2(cb.lat - SHOP.lat, cb.lng - SHOP.lng);
    });
    const offset = sorted.length ? (version - 1) % sorted.length : 0;
    const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)];
    const groups = Array.from({ length: Math.ceil(rotated.length / 3) }, (_, index) => rotated.slice(index * 3, index * 3 + 3));
    const routes = groups.map((group, index) => this.buildRoute(group, index, customerById));
    const plan: RoutePlan = {
      version,
      generatedAt: new Date().toISOString(),
      routes,
      totalDistanceKm: this.round(routes.reduce((sum, route) => sum + route.distanceKm, 0)),
      totalDurationMinutes: Math.round(routes.reduce((sum, route) => sum + route.durationMinutes, 0)),
      deliveryCost: this.round(routes.reduce((sum, route) => sum + route.deliveryCost, 0)),
      revenue: routes.reduce((sum, route) => sum + route.revenue, 0),
      foodCost: routes.reduce((sum, route) => sum + route.foodCost, 0),
      profit: this.round(routes.reduce((sum, route) => sum + route.profit, 0)),
      deadlineSafe: routes.every((route) => route.deadlineSafe),
    };
    return plan;
  }

  /** แผนค้างที่อ้างลูกค้าที่ไม่มีอยู่แล้วถือว่าใช้ไม่ได้ทั้งแผน — ยอดรวมจะเพี้ยนถ้าตัดบางจุดทิ้ง */
  private pruneStalePlan(plan: RoutePlan | null): RoutePlan | null {
    if (!plan || !Array.isArray(plan.routes)) return null;
    const known = new Set(this.customers().map((customer) => customer.id));
    const intact = plan.routes.every(
      (route) =>
        Array.isArray(route.stops) &&
        route.stops.length > 0 &&
        route.stops.every((stop) => !!stop?.customer && known.has(stop.customer.id)),
    );
    return intact ? plan : null;
  }

  private emptyPlan(version: number): RoutePlan {
    return {
      version,
      generatedAt: new Date().toISOString(),
      routes: [],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      deliveryCost: 0,
      revenue: 0,
      foodCost: 0,
      profit: 0,
      deadlineSafe: true,
    };
  }

  choosePlan(plan: RoutePlan): void {
    this.plan.set(plan);
    this.confirmedPlan.set(null);
    this.persist(PLAN_KEY, plan);
  }

  confirmPlan(): void {
    const plan = this.plan();
    if (!plan) return;
    this.confirmedPlan.set(plan);
    this.planHistory.update(history => [plan, ...history]);
  }

  routeForJobCode(jobCode: string): RiderRoute | null {
    return this.confirmedPlan()?.routes.find((route) => route.rider.jobCode.toLowerCase() === jobCode.trim().toLowerCase()) || null;
  }

  customerFor(order: Order): Customer | undefined {
    return this.customers().find((customer) => customer.id === order.customerId);
  }

  googleMapsUrl(route: RiderRoute): string {
    const waypoints = route.stops.slice(0, -1).map((stop) => `${stop.customer.lat},${stop.customer.lng}`).join('|');
    const destination = route.stops.at(-1)?.customer;
    if (!destination) return 'https://www.google.com/maps';
    const params = new URLSearchParams({
      api: '1',
      origin: `${SHOP.lat},${SHOP.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      travelmode: 'driving',
    });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  resetDemo(): void {
    this.customers.set(structuredClone(DEMO_CUSTOMERS));
    this.orders.set(structuredClone(DEMO_ORDERS));
    this.plan.set(null);
    this.confirmedPlan.set(null);
    this.planHistory.set([]);
    this.persist(CUSTOMER_KEY, this.customers());
    this.persist(ORDER_KEY, this.orders());
    localStorage.removeItem(PLAN_KEY);
  }

  private buildRoute(orders: Order[], riderIndex: number, customerById: Map<string, Customer>): RiderRoute {
    const remaining = orders.map((order) => ({ order, customer: customerById.get(order.customerId)! }));
    const stops: RouteStop[] = [];
    let current: { lat: number; lng: number } = { lat: SHOP.lat, lng: SHOP.lng };
    let totalDistance = 0;
    while (remaining.length) {
      remaining.sort((a, b) => this.distance(current, a.customer) - this.distance(current, b.customer));
      const next = remaining.shift()!;
      const leg = this.distance(current, next.customer);
      totalDistance += leg;
      const elapsedMinutes = totalDistance / 30 * 60;
      stops.push({
        ...next,
        sequence: stops.length + 1,
        distanceFromPreviousKm: this.round(leg),
        arrivalTime: this.timeAfter('11:30', elapsedMinutes),
      });
      current = next.customer;
    }
    const totalBoxes = orders.reduce((sum, order) => sum + order.boxes, 0);
    const distanceKm = this.round(totalDistance);
    const durationMinutes = Math.ceil(distanceKm / 30 * 60);
    const deliveryCost = this.round(15 + (2 * distanceKm * totalBoxes));
    const revenue = totalBoxes * 65;
    const foodCost = totalBoxes * 40;
    return {
      rider: this.riders()[riderIndex % this.riders().length],
      stops,
      totalBoxes,
      distanceKm,
      durationMinutes,
      deliveryCost,
      revenue,
      foodCost,
      profit: this.round(revenue - foodCost - deliveryCost),
      deadlineSafe: durationMinutes <= 60,
    };
  }

  private distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const radius = 6371;
    const dLat = this.toRadians(b.lat - a.lat);
    const dLng = this.toRadians(b.lng - a.lng);
    const lat1 = this.toRadians(a.lat);
    const lat2 = this.toRadians(b.lat);
    const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  private timeAfter(start: string, minutes: number): string {
    const [hours, mins] = start.split(':').map(Number);
    const total = hours * 60 + mins + Math.ceil(minutes);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  private clearPlan(): void {
    this.plan.set(null);
    this.confirmedPlan.set(null);
    localStorage.removeItem(PLAN_KEY);
  }

  private persist(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
  }
}
