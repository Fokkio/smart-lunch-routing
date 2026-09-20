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
});
