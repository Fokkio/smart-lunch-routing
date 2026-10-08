import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, forkJoin, map, timeout } from 'rxjs';
import { CustomersApiService } from './customer-api.service';
import { OrderApiService } from './order-api.service';
import { RidersApiService } from './rider-api.service';
import { mapCustomer, mapOrder, mapRider } from './delivery-api-adapter';
import { todayLocal } from './dates';
import { Customer, Order, Rider, RoutePlan } from './models';
import { ShopSettings, ShopSettingsApiService } from './shop-settings-api.service';
import { RoutePlanApiService } from './route-plan-api.service';
import { AuthService } from './auth.service';

const PLAN_KEY = 'smart-lunch-plan-v1';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  readonly customers = signal<Customer[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly riders = signal<Rider[]>([]);
  readonly plan = signal<RoutePlan | null>(null);
  readonly connecting = signal(false);
  readonly connectionError = signal('');
  readonly confirmedPlan = signal<RoutePlan | null>(null);
  readonly planHistory = signal<RoutePlan[]>([]);
  readonly pendingOrders = computed(() =>
    this.orders().filter((order) => order.status === 'pending'),
  );
  readonly dispatchCustomers = computed(() => {
    const customerIds = new Set(this.pendingOrders().map((order) => order.customerId));
    return this.customers().filter((customer) => customerIds.has(customer.id));
  });
  readonly pendingBoxes = computed(() =>
    this.pendingOrders().reduce((sum, order) => sum + order.boxes, 0),
  );
  /** Only an API-confirmed snapshot is ready for dispatch. */
  readonly usingBackend = signal(false);
  /** ค่าตั้งร้านจาก backend (null = ยังโหลดไม่ได้ ใช้ค่า default เดียวกับ backend seed) */
  readonly settings = signal<ShopSettings | null>(null);
  readonly dataRevision = signal(0);
  private readonly customersApi = inject(CustomersApiService);
  private readonly ordersApi = inject(OrderApiService);
  private readonly ridersApi = inject(RidersApiService);
  private readonly settingsApi = inject(ShopSettingsApiService, { optional: true });
  private readonly routePlans = inject(RoutePlanApiService, { optional: true });
  private readonly auth = inject(AuthService, { optional: true });
  private loadGeneration = 0;

  private currentResponse(): () => boolean {
    const generation = this.loadGeneration;
    const token = this.auth?.token();
    return () => generation === this.loadGeneration && token === this.auth?.token();
  }

  constructor() {
    // Retire legacy order/plan caches; never restore orders or their snapshots from storage.
    try {
      localStorage.removeItem('smart-lunch-customers-v1');
      localStorage.removeItem('smart-lunch-orders-v1');
      localStorage.removeItem(PLAN_KEY);
    } catch {
      /* API data remains usable when storage is unavailable. */
    }
  }

  /**
   * Load one complete API snapshot; failed/partial loads cannot become dispatch data.
   */
  connect(refresh = false): void {
    if (this.usingBackend() && !refresh) return;
    this.loadGeneration++;
    const current = this.currentResponse();
    this.connecting.set(true);
    this.connectionError.set('');
    forkJoin({
      customers: this.customersApi.getCustomers().pipe(map((rows) => rows.map(mapCustomer))),
      orders: this.ordersApi.list(todayLocal()).pipe(map((rows) => rows.map(mapOrder))),
      riders: this.ridersApi.getRiders().pipe(map((rows) => rows.map(mapRider))),
    })
      .pipe(
        timeout(15000),
        finalize(() => {
          if (current()) this.connecting.set(false);
        }),
      )
      .subscribe({
        next: (data) => {
          if (!current()) return;
          this.customers.set(data.customers);
          this.orders.set(data.orders);
          this.riders.set(data.riders);
          // A persisted local preview has no backend geometry or durable status.
          // Load the saved backend plan afresh on the dispatch page instead.
          this.plan.set(null);
          this.confirmedPlan.set(null);
          try {
            localStorage.removeItem(PLAN_KEY);
          } catch {
            /* browser storage unavailable */
          }
          this.usingBackend.set(true);
          this.dataRevision.update((value) => value + 1);
        },
        error: () => {
          if (!current()) return;
          this.customers.set([]);
          this.orders.set([]);
          this.riders.set([]);
          this.plan.set(null);
          this.confirmedPlan.set(null);
          this.usingBackend.set(false);
          this.connectionError.set('โหลดข้อมูลจัดส่งไม่สำเร็จ กรุณาลองเชื่อมต่ออีกครั้ง');
          this.dataRevision.update((value) => value + 1);
        },
      });
    // ค่าตั้งร้านแยกเส้นต่างหาก — พังก็แค่ใช้ default ไม่กระทบข้อมูลหลัก
    this.settingsApi?.get().subscribe({
      next: (settings) => {
        if (current()) this.settings.set(settings);
      },
      error: (error) => console.warn('[delivery] โหลดค่าตั้งร้านไม่สำเร็จ ใช้ค่า default:', error),
    });
  }

  customerDeleted(id: string): void {
    this.customers.update((list) => list.filter((customer) => customer.id !== id));
    this.routePlans?.invalidateCache();
    this.clearPlan();
  }

  refresh(): void {
    this.routePlans?.invalidateCache();
    this.connect(true);
  }

  orderDeleted(id: string): void {
    this.ordersDeleted([id]);
  }

  ordersDeleted(ids: readonly string[]): void {
    const removed = new Set(ids);
    this.orders.update((list) => list.filter((order) => !removed.has(order.id)));
    this.routePlans?.invalidateCache();
    this.clearPlan();
  }

  choosePlan(plan: RoutePlan): void {
    this.plan.set(plan);
    this.confirmedPlan.set(null);
  }

  confirmPlan(): void {
    const plan = this.plan();
    if (!plan) return;
    this.confirmedPlan.set(plan);
    this.planHistory.update((history) => [plan, ...history]);
  }

  customerFor(order: Order): Customer | undefined {
    return this.customers().find((customer) => customer.id === order.customerId);
  }

  private clearPlan(): void {
    this.plan.set(null);
    this.confirmedPlan.set(null);
  }

  clearForLogout(): void {
    this.loadGeneration++;
    this.customers.set([]);
    this.orders.set([]);
    this.riders.set([]);
    this.plan.set(null);
    this.confirmedPlan.set(null);
    this.planHistory.set([]);
    this.settings.set(null);
    this.usingBackend.set(false);
    this.connecting.set(false);
    this.connectionError.set('');
    this.routePlans?.invalidateCache();
  }
}
