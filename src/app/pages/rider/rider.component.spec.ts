import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RiderComponent } from './rider.component';

describe('Rider backend job lookup', () => {
  it('persists a completed stop before advancing', () => {
    TestBed.configureTestingModule({
      imports: [RiderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const rider = TestBed.createComponent(RiderComponent).componentInstance;
    rider.jobCode = 'JOB-1';
    rider.openJob();
    http.expectOne((req) => req.url === '/api/route-plans' && req.params.has('date')).flush([{ routePlanId: 5, status: 'SELECTED' }]);
    http.expectOne('/api/route-plans/5').flush({
      jobs: [{
        jobId: 7, jobCode: 'JOB-1', totalBoxes: 2, distanceKm: 1,
        durationMinutes: 5, stops: [{
          sequence: 1, orderId: 10, customerName: 'ลูกค้า', deliveryStatus: 'WAITING',
          boxCount: 2, latitude: 16.2, longitude: 103.2,
        }],
      }],
    });
    expect(rider.stage).toBe('summary');
    rider.begin();
    expect(rider.stage).toBe('delivery');
    rider.confirmingStop = true;
    rider.completeStop();
    expect(rider.stage).toBe('delivery');
    http.expectOne('/api/route-plans/5/jobs/7/stops/10/deliver')
      .flush({}, { status: 500, statusText: 'Server error' });
    expect(rider.stage).toBe('delivery');
    expect(rider.stopIndex).toBe(0);
    rider.completeStop();
    http.expectOne('/api/route-plans/5/jobs/7/stops/10/deliver').flush({ delivered: true });
    expect(rider.stage).toBe('completed');
    http.verify();
  });
});
