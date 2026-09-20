import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Customer, Order, OrderStatus } from '../core/models';
import { DeliveryService } from '../core/delivery.service';

type Draft = { id?: string; customerId: string; boxes: number; status: OrderStatus };

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent {
  readonly store = inject(DeliveryService);
  query = '';
  customerQuery = '';
  showForm = false;
  draft: Draft = this.blankDraft();

  filteredOrders(): Order[] {
    const term = this.query.trim().toLowerCase();
    return this.store.orders().filter((order) => `${order.id} ${this.customerFor(order)?.name ?? ''} ${this.customerFor(order)?.phone ?? ''}`.toLowerCase().includes(term));
  }

  matchingCustomers(): Customer[] {
    const term = this.customerQuery.trim().toLowerCase();
    return this.store.customers().filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(term)).slice(0, 8);
  }

  selectedCustomer(): Customer | undefined { return this.store.customers().find((customer) => customer.id === this.draft.customerId); }
  customerFor(order: Order): Customer | undefined { return this.store.customerFor(order); }
  statusLabel(status: OrderStatus): string { return { pending: 'รอจัดส่ง', assigned: 'จัดงานแล้ว', delivered: 'ส่งสำเร็จ' }[status]; }

  startCreate(): void { this.draft = this.blankDraft(); this.customerQuery = ''; this.showForm = true; }
  edit(order: Order): void { this.draft = { id: order.id, customerId: order.customerId, boxes: order.boxes, status: order.status }; this.customerQuery = ''; this.showForm = true; }
  cancel(): void { this.showForm = false; }
  chooseCustomer(customer: Customer): void { this.draft.customerId = customer.id; this.customerQuery = ''; }
  adjustBoxes(step: number): void { this.draft.boxes = Math.max(1, Math.min(3, this.draft.boxes + step)); }
  save(): void { if (!this.draft.customerId) return; this.store.saveOrder(this.draft); this.cancel(); }
  remove(order: Order): void { if (window.confirm(`ลบออเดอร์ ${order.id} หรือไม่?`)) this.store.deleteOrder(order.id); }
  private blankDraft(): Draft { return { customerId: '', boxes: 1, status: 'pending' }; }
}
