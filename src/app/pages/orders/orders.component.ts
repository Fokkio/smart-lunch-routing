import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { ApiCustomer } from '../../core/customer-api.models';
import { CustomersApiService } from '../../core/customer-api.service';
import { ApiOrder, ApiOrderStatus, OrderApiService } from '../../core/order-api.service';
import { DeliveryService } from '../../core/delivery.service';

type Draft = { id?: number; customerId: number | null; boxes: number; status: ApiOrderStatus };

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './orders.component.html',
})
export class OrdersComponent {
  private readonly ordersApi = inject(OrderApiService);
  private readonly customersApi = inject(CustomersApiService);
  private readonly deliveryStore = inject(DeliveryService);
  readonly orders = signal<ApiOrder[]>([]);
  readonly customers = signal<ApiCustomer[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly today = new Date().toLocaleDateString('en-CA');
  query = '';
  customerQuery = '';
  simulateCount = 25;
  simFilter: 'all' | 'real' | 'simulated' = 'all';
  showForm = false;
  feedback = '';
  draft: Draft = this.blankDraft();
  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ orders: this.ordersApi.list(this.today), customers: this.customersApi.getCustomers('') }).subscribe({
      next: ({ orders, customers }) => {
        this.orders.set(orders);
        this.customers.set(customers);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiErrorMessage(err, 'โหลดออเดอร์ไม่สำเร็จ'));
        this.loading.set(false);
      },
    });
  }

  pendingOrders(): ApiOrder[] { return this.orders().filter(order => order.status === 'PENDING'); }
  pendingBoxes(): number { return this.pendingOrders().reduce((sum, order) => sum + order.boxes, 0); }

  filteredOrders(): ApiOrder[] {
    const term = this.query.trim().toLowerCase();
    return this.orders().filter((order) => {
      if (this.simFilter === 'real' && order.isSimulated) return false;
      if (this.simFilter === 'simulated' && !order.isSimulated) return false;
      return `${order.id} ${this.customerFor(order)?.name ?? ''} ${this.customerFor(order)?.phone ?? ''}`.toLowerCase().includes(term);
    });
  }

  simulatedCount(): number {
    return this.orders().filter((order) => order.isSimulated).length;
  }

  matchingCustomers(): ApiCustomer[] {
    const term = this.customerQuery.trim().toLowerCase();
    return this.customers().filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(term)).slice(0, 8);
  }

  selectedCustomer(): ApiCustomer | undefined { return this.customers().find((customer) => customer.id === this.draft.customerId); }
  customerFor(order: ApiOrder): ApiCustomer | undefined { return this.customers().find((customer) => customer.id === order.customerId); }
  statusLabel(status: ApiOrderStatus): string { return { PENDING: 'รอจัดส่ง', PLANNED: 'จัดงานแล้ว', DELIVERING: 'กำลังส่ง', DELIVERED: 'ส่งสำเร็จ', CANCELLED: 'ยกเลิก' }[status]; }

  startCreate(): void { this.draft = this.blankDraft(); this.customerQuery = ''; this.showForm = true; }
  edit(order: ApiOrder): void { this.draft = { id: order.id, customerId: order.customerId, boxes: order.boxes, status: order.status }; this.customerQuery = ''; this.showForm = true; }
  cancel(): void { this.showForm = false; }
  chooseCustomer(customer: ApiCustomer): void { this.draft.customerId = customer.id; this.customerQuery = ''; }
  adjustBoxes(step: number): void { this.draft.boxes = Math.max(1, Math.min(3, this.draft.boxes + step)); }
  save(): void {
    if (this.saving() || this.draft.customerId === null) return;
    this.saving.set(true);
    const input = { customerId: this.draft.customerId, boxes: this.draft.boxes, status: this.draft.status, orderDate: this.today };
    const request = this.draft.id === undefined ? this.ordersApi.create(input) : this.ordersApi.update(this.draft.id, input);
    request.subscribe({
      next: () => { this.saving.set(false); this.cancel(); this.feedback = 'บันทึกออเดอร์แล้ว'; this.reload(); },
      error: err => { this.saving.set(false); this.error.set(apiErrorMessage(err, 'บันทึกออเดอร์ไม่สำเร็จ')); },
    });
  }
  simulate(): void {
    this.ordersApi.simulate(this.today, this.simulateCount).subscribe({
      next: () => { this.feedback = 'สร้างออเดอร์จำลองแล้ว'; this.reload(); },
      error: err => this.error.set(apiErrorMessage(err, 'สร้างออเดอร์จำลองไม่สำเร็จ')),
    });
  }
  clearSimulated(): void {
    if (!this.simulatedCount() || !window.confirm(`ล้างออเดอร์จำลอง ${this.simulatedCount()} รายการหรือไม่?`)) return;
    this.ordersApi.clearSimulated().subscribe({
      next: (result) => {
        this.deliveryStore.ordersDeleted(this.orders().filter(order => order.isSimulated).map(order => String(order.id)));
        this.feedback = `ล้างออเดอร์จำลอง ${result.deletedCount} รายการแล้ว`;
        this.reload();
      },
      error: err => this.error.set(err?.status === 409
        ? 'ออเดอร์จำลองยังอยู่ในแผนส่ง กรุณาไปหน้าจัดเส้นทางและลบแผนที่เกี่ยวข้องก่อนล้าง'
        : apiErrorMessage(err, 'ล้างออเดอร์จำลองไม่สำเร็จ')),
    });
  }
  remove(order: ApiOrder): void {
    if (!window.confirm(`ลบออเดอร์ ${order.id} หรือไม่?`)) return;
    this.ordersApi.delete(order.id).subscribe({
      next: () => { this.deliveryStore.orderDeleted(String(order.id)); this.feedback = `ลบออเดอร์ ${order.id} แล้ว`; this.reload(); },
      error: err => this.error.set(
        err?.status === 409
          ? 'ลบไม่ได้ เพราะออเดอร์นี้อยู่ในแผนจัดส่ง (รวมแผนฉบับร่าง) กรุณาลบแผนที่เกี่ยวข้องก่อน'
          : apiErrorMessage(err, 'ลบออเดอร์ไม่สำเร็จ'),
      ),
    });
  }
  private blankDraft(): Draft { return { customerId: null, boxes: 1, status: 'PENDING' }; }
}
