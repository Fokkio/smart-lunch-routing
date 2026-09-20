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

  it('invalidates a plan when customer details change', () => {
    service.calculateRoutes();
    const customer = service.customers()[0];
    service.saveCustomer({ ...customer, address: 'จุดส่งตัวอย่างที่แก้ไขแล้ว' });
    expect(service.plan()).toBeNull();
  });
});
