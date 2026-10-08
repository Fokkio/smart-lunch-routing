import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeliveryService } from './delivery.service';
import { todayLocal } from './dates';
import { AuthService } from './auth.service';

describe('DeliveryService dispatch state', () => {
  let service: DeliveryService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DeliveryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('clears confirmation when choosing another saved plan', () => {
    service.choosePlan({ version: 1, routes: [] } as never);
    service.confirmPlan();
    expect(service.confirmedPlan()).toBe(service.plan());
    service.choosePlan({ version: 2, routes: [] } as never);
    expect(service.confirmedPlan()).toBeNull();
    expect(service.planHistory()).toHaveLength(1);
  });

  it('invalidates dispatch plans after successful API deletions', () => {
    service.customers.set([{ id: '1', name: 'QA', phone: '', address: '', lat: 16, lng: 103 }]);
    service.orders.set([{ id: '11', customerId: '1', boxes: 2, status: 'pending', createdAt: '' }]);
    service.choosePlan({ version: 1, routes: [] } as never);
    service.confirmPlan();
    service.orderDeleted('11');
    expect(service.orders()).toEqual([]);
    expect(service.plan()).toBeNull();
    expect(service.confirmedPlan()).toBeNull();
    service.customerDeleted('1');
    expect(service.customers()).toEqual([]);
  });

  describe('backend connection', () => {
    const apiCustomers = [
      {
        id: 1,
        name: 'สมชาย ใจดี',
        phone: '0812345678',
        address: 'ขอนแก่น',
        lat: 16.2469,
        lng: 103.2531,
      },
    ];
    const apiOrders = [
      { id: 11, customerId: 1, boxes: 2, status: 'PENDING', orderDate: '2026-09-30' },
    ];
    const apiRiders = [{ id: 5, name: 'Rider Five', phone: '0810000005', isAvailable: true }];
    const apiSettings = {
      settingId: 1,
      shopName: 'ครัวเที่ยงตรง',
      latitude: 16.24631,
      longitude: 103.25286,
      deliveryStartTime: '11:30:00',
      deliveryDeadline: '12:30:00',
      maxOrdersPerRider: 3,
      riderSpeedKmh: 30,
      boxSalePrice: 65,
      boxFoodCost: 40,
      riderBaseCost: 15,
      riderCostPerKm: 2,
    };

    it('loads the complete backend snapshot on connect', () => {
      expect(service.usingBackend()).toBe(false);
      service.plan.set({ version: 99 } as never);
      localStorage.setItem('smart-lunch-plan-v1', '{"version":99}');
      service.connect();

      http.expectOne('/api/customers').flush(apiCustomers);
      http.expectOne(`/api/orders?date=${todayLocal()}`).flush(apiOrders);
      http.expectOne('/api/riders').flush(apiRiders);
      http.expectOne('/api/settings').flush(apiSettings);

      expect(service.usingBackend()).toBe(true);
      expect(service.customers().map((customer) => customer.id)).toEqual(['1']);
      expect(service.orders().map((order) => order.id)).toEqual(['11']);
      expect(service.riders().map((rider) => rider.id)).toEqual(['5']);
      expect(service.settings()).toEqual(apiSettings);
      expect(service.plan()).toBeNull();
      expect(localStorage.getItem('smart-lunch-plan-v1')).toBeNull();
      expect(localStorage.getItem('smart-lunch-orders-v1')).toBeNull();
    });

    it('clears stale data instead of using demo orders when the backend is unreachable', () => {
      service.connect();

      http.expectOne('/api/customers').flush(apiCustomers);
      http.expectOne('/api/riders').flush(apiRiders);
      http
        .expectOne('/api/settings')
        .flush({ message: 'down' }, { status: 500, statusText: 'Error' });
      http
        .expectOne(`/api/orders?date=${todayLocal()}`)
        .flush({ message: 'down' }, { status: 500, statusText: 'Error' });

      expect(service.usingBackend()).toBe(false);
      expect(service.customers()).toEqual([]);
      expect(service.orders()).toEqual([]);
      expect(service.connectionError()).toContain('ไม่สำเร็จ');
      expect(service.connecting()).toBe(false);
      expect(service.settings()).toBeNull();
    });

    it('ignores in-flight data after logout and leaves storage cleared', () => {
      service.connect();
      TestBed.inject(AuthService).clear();
      service.clearForLogout();
      http.expectOne('/api/customers').flush(apiCustomers);
      http.expectOne(`/api/orders?date=${todayLocal()}`).flush(apiOrders);
      http.expectOne('/api/riders').flush(apiRiders);
      http.expectOne('/api/settings').flush(apiSettings);
      expect(service.customers()).toEqual([]);
      expect(service.orders()).toEqual([]);
      expect(service.settings()).toBeNull();
      expect(service.usingBackend()).toBe(false);
      expect(localStorage.getItem('smart-lunch-customers-v1')).toBeNull();
    });

    it('refreshes connected data and clears the old route after a mutation', () => {
      service.connect();
      http.expectOne('/api/customers').flush(apiCustomers);
      http.expectOne(`/api/orders?date=${todayLocal()}`).flush(apiOrders);
      http.expectOne('/api/riders').flush(apiRiders);
      http.expectOne('/api/settings').flush(apiSettings);
      const revision = service.dataRevision();
      service.plan.set({ version: 99 } as never);
      service.refresh();
      http.expectOne('/api/customers').flush(apiCustomers);
      http.expectOne(`/api/orders?date=${todayLocal()}`).flush([]);
      http.expectOne('/api/riders').flush(apiRiders);
      http.expectOne('/api/settings').flush(apiSettings);
      expect(service.pendingOrders()).toEqual([]);
      expect(service.plan()).toBeNull();
      expect(service.dataRevision()).toBe(revision + 1);
    });

    it('does not mix a partial backend response with old local data', () => {
      service.connect();
      http.expectOne('/api/customers').flush(apiCustomers);
      http.expectOne('/api/riders').flush(apiRiders);
      http.expectOne('/api/settings').flush(apiSettings);
      http
        .expectOne(`/api/orders?date=${todayLocal()}`)
        .flush({ message: 'down' }, { status: 500, statusText: 'Error' });
      expect(service.usingBackend()).toBe(false);
      expect(service.customers()).toEqual([]);
      expect(service.orders()).toEqual([]);
    });

    it('never restores legacy order/plan storage or starts with demo orders', () => {
      localStorage.setItem('smart-lunch-orders-v1', JSON.stringify(apiOrders));
      localStorage.setItem('smart-lunch-plan-v1', JSON.stringify({ version: 99, routes: [] }));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      service = TestBed.inject(DeliveryService);
      http = TestBed.inject(HttpTestingController);
      expect(service.orders()).toEqual([]);
      expect(service.customers()).toEqual([]);
      expect(service.riders()).toEqual([]);
      expect(service.plan()).toBeNull();
      expect(localStorage.getItem('smart-lunch-orders-v1')).toBeNull();
      expect(localStorage.getItem('smart-lunch-plan-v1')).toBeNull();
    });

    it('times out an unresponsive snapshot without exposing demo orders', async () => {
      vi.useFakeTimers();
      try {
        service.connect();
        http.match((req) => ['/api/customers', '/api/orders', '/api/riders'].includes(req.url));
        http.expectOne('/api/settings').flush(apiSettings);
        await vi.advanceTimersByTimeAsync(15000);
        expect(service.connecting()).toBe(false);
        expect(service.usingBackend()).toBe(false);
        expect(service.orders()).toEqual([]);
        expect(service.connectionError()).toContain('ไม่สำเร็จ');
      } finally {
        vi.useRealTimers();
      }
    });

    it('clears an old confirmed snapshot on refresh failure and recovers on retry', () => {
      const load = () => {
        http.expectOne('/api/customers').flush(apiCustomers);
        http.expectOne('/api/riders').flush(apiRiders);
        http.expectOne('/api/settings').flush(apiSettings);
      };
      service.connect();
      load();
      http.expectOne(`/api/orders?date=${todayLocal()}`).flush(apiOrders);
      service.plan.set({ version: 99 } as never);
      service.refresh();
      load();
      http
        .expectOne(`/api/orders?date=${todayLocal()}`)
        .flush({}, { status: 500, statusText: 'Error' });
      expect(service.orders()).toEqual([]);
      expect(service.plan()).toBeNull();
      expect(service.usingBackend()).toBe(false);
      service.refresh();
      load();
      http.expectOne(`/api/orders?date=${todayLocal()}`).flush(apiOrders);
      expect(service.usingBackend()).toBe(true);
      expect(service.connectionError()).toBe('');
      expect(service.orders().map((order) => order.id)).toEqual(['11']);
      expect(localStorage.getItem('smart-lunch-orders-v1')).toBeNull();
      service.choosePlan({ version: 2, routes: [] } as never);
      expect(localStorage.getItem('smart-lunch-plan-v1')).toBeNull();
    });
  });
});
