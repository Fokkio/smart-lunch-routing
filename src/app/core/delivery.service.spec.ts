import { TestBed } from '@angular/core/testing';
import { DeliveryService } from './delivery.service';

describe('DeliveryService route planning', () => {
  let service: DeliveryService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeliveryService);
    service.resetDemo();
  });

  it('assigns no more than three customer orders to each rider', () => {
    const plan = service.calculateRoutes();
    expect(plan.routes.length).toBeGreaterThan(0);
    expect(plan.routes.every((route) => route.stops.length <= 3)).toBe(true);
    expect(plan.routes.reduce((sum, route) => sum + route.stops.length, 0)).toBe(service.pendingOrders().length);
  });

  it('uses the PDF revenue, food-cost, and rider-cost formula', () => {
    const plan = service.calculateRoutes();
    expect(plan.revenue).toBe(service.pendingBoxes() * 65);
    expect(plan.foodCost).toBe(service.pendingBoxes() * 40);
    expect(plan.profit).toBeCloseTo(plan.revenue - plan.foodCost - plan.deliveryCost, 2);
    for (const route of plan.routes) {
      expect(route.deliveryCost).toBeCloseTo(15 + 2 * route.distanceKm * route.totalBoxes, 2);
    }
  });

  it('creates a versioned alternative plan', () => {
    service.calculateRoutes();
    const alternative = service.calculateRoutes(true);
    expect(alternative.version).toBe(2);
    expect(alternative.routes.flatMap((route) => route.stops).length).toBe(service.pendingOrders().length);
  });

  it('previews a different route without replacing the current plan', () => {
    const original = service.calculateRoutes();
    const alternative = service.previewRoutes(2);
    expect(alternative.version).toBe(2);
    expect(service.plan()).toEqual(original);
    expect(alternative.routes.length).toBe(9);
    expect(new Set(alternative.routes.map(route => route.rider.id)).size).toBe(9);
    expect(alternative.routes.every(route => route.stops.length <= 3)).toBe(true);
    service.choosePlan(alternative);
    expect(service.plan()?.version).toBe(2);
  });

  it('opens job codes only after confirmation and resets confirmation on plan changes', () => {
    const plan = service.calculateRoutes();
    const code = plan.routes[0].rider.jobCode;
    expect(service.routeForJobCode(code)).toBeNull();
    service.confirmPlan();
    expect(service.routeForJobCode(code)).toEqual(plan.routes[0]);
    expect(service.planHistory()).toHaveLength(1);
    service.choosePlan(service.previewRoutes(2));
    expect(service.routeForJobCode(code)).toBeNull();
    expect(service.planHistory()).toHaveLength(1);
  });

  it('invalidates a plan when customer details change', () => {
    service.calculateRoutes();
    const customer = service.customers()[0];
    service.saveCustomer({ ...customer, address: 'จุดส่งตัวอย่างที่แก้ไขแล้ว' });
    expect(service.plan()).toBeNull();
  });

  it('returns an empty plan instead of crashing when there are no orders', () => {
    service.orders.set([]);
    const plan = service.previewRoutes(1);
    expect(plan.routes).toEqual([]);
    expect(plan.totalDistanceKm).toBe(0);
    expect(plan.profit).toBe(0);
    expect(service.pendingOrders()).toEqual([]);
    expect(service.pendingBoxes()).toBe(0);
  });

  it('skips orders whose customer no longer exists instead of crashing', () => {
    service.orders.set([
      { id: 'ORD-GOOD', customerId: service.customers()[0].id, boxes: 2, status: 'pending', createdAt: new Date().toISOString() },
      { id: 'ORD-STALE', customerId: 'c-deleted', boxes: 3, status: 'pending', createdAt: new Date().toISOString() },
    ]);
    const plan = service.previewRoutes(1);
    expect(plan.routes.flatMap((route) => route.stops).map((stop) => stop.order.id)).toEqual(['ORD-GOOD']);
  });

  it('drops a stale saved plan that references deleted customers on startup', () => {
    const plan = service.calculateRoutes();
    expect(service.plan()).not.toBeNull();
    // ลบออเดอร์ก่อนจึงลบลูกค้าได้ แล้วจำลองเปิดหน้าใหม่ด้วยแผนเก่าค้างอยู่
    service.orders.set([]);
    localStorage.setItem('smart-lunch-orders-v1', JSON.stringify([]));
    for (const customer of service.customers()) service.deleteCustomer(customer.id);
    expect(service.customers()).toEqual([]);
    const fresh = new DeliveryService();
    expect(fresh.plan()).toBeNull();
    expect(fresh.pendingOrders()).toEqual([]);
    expect(() => fresh.previewRoutes(1)).not.toThrow();
  });
});
