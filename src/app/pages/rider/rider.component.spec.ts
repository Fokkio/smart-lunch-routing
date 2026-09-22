import { TestBed } from '@angular/core/testing';
import { DeliveryService } from '../../core/delivery.service';
import { RiderComponent } from './rider.component';

describe('Rider demo flow', () => {
  it('moves through one stop at a time without changing stored order status', () => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [RiderComponent] });
    const store = TestBed.inject(DeliveryService);
    store.resetDemo();
    store.calculateRoutes();
    const fixture = TestBed.createComponent(RiderComponent);
    const rider = fixture.componentInstance;
    rider.jobCode = store.plan()!.routes[0].rider.jobCode;
    rider.openJob();
    expect(rider.stage).toBe('summary');
    rider.begin();
    expect(rider.stage).toBe('delivery');
    expect(rider.currentStop?.sequence).toBe(1);
    for (const _ of rider.activeRoute!.stops) rider.completeStop();
    expect(rider.stage).toBe('completed');
    expect(store.orders().every(order => order.status === 'pending')).toBe(true);
  });
});
