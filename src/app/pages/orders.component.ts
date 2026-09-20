import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer, Order, OrderStatus } from '../core/models';
import { DeliveryService } from '../core/delivery.service';
import { RevealDirective } from '../shared/reveal.directive';

type OrderDraft = { id?: string; customerId: string; boxes: number; status: OrderStatus };

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, RevealDirective],
  template: `
    <main class="page section-page">
      <header class="section-heading" appReveal>
        <div><p class="eyebrow">ORDER INTAKE</p><h1>ออเดอร์มื้อเที่ยง</h1><p>สร้าง แก้ไข และจำลองออเดอร์ก่อนส่งเข้ากระบวนการจัดเส้นทาง</p></div>
        <div class="header-actions"><button class="button button-secondary" type="button" (click)="store.simulateOrder()">จำลองออเดอร์</button><button class="button button-primary" type="button" (click)="startCreate()">เพิ่มออเดอร์</button></div>
      </header>

      <section class="order-layout" appReveal>
        <article class="panel order-table">
          <div class="summary-bar">
            <span><small>รอจัดเส้นทาง</small><strong>{{ store.pendingOrders().length }} ออเดอร์</strong></span>
            <span><small>จำนวนอาหาร</small><strong>{{ store.pendingBoxes() }} กล่อง</strong></span>
            <span><small>รายรับคาดการณ์</small><strong>{{ store.pendingBoxes() * 65 }} บาท</strong></span>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>เลขออเดอร์</th><th>ลูกค้า</th><th>กล่อง</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
              <tbody>
                @for (order of store.orders(); track order.id) {
                  <tr>
                    <td><code>{{ order.id }}</code><small>{{ order.createdAt.slice(11, 16) }} น.</small></td>
                    <td><strong>{{ customerFor(order)?.name }}</strong><small>{{ customerFor(order)?.address }}</small></td>
                    <td><span class="box-count">{{ order.boxes }}</span></td>
                    <td><span class="badge" [class.badge-blue]="order.status === 'assigned'" [class.badge-green]="order.status === 'delivered'">{{ statusLabel(order.status) }}</span></td>
                    <td><div class="row-actions"><button type="button" (click)="edit(order)">แก้ไข</button><button type="button" (click)="store.deleteOrder(order.id)">ลบ</button></div></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </article>

        <aside class="panel form-panel">
          <div class="panel-heading"><p class="eyebrow">{{ draft.id ? 'EDIT ORDER' : 'NEW ORDER' }}</p><h2>{{ draft.id ? 'แก้ไขออเดอร์' : 'รับออเดอร์ใหม่' }}</h2></div>
          <form (ngSubmit)="save()" #orderForm="ngForm">
            <label>ลูกค้า<select required name="customerId" [(ngModel)]="draft.customerId"><option value="" disabled>เลือกลูกค้า</option>@for (customer of store.customers(); track customer.id) { <option [value]="customer.id">{{ customer.name }} · {{ customer.phone }}</option> }</select></label>
            <label>จำนวนข้าวกล่อง<input required type="number" min="1" max="3" name="boxes" [(ngModel)]="draft.boxes" /><small>PDF กำหนดไม่เกิน 3 กล่องต่อออเดอร์</small></label>
            <label>สถานะ<select name="status" [(ngModel)]="draft.status"><option value="pending">รอจัดเส้นทาง</option><option value="assigned">จัดงานแล้ว</option><option value="delivered">ส่งสำเร็จ</option></select></label>
            <div class="price-preview"><span>ยอดขายออเดอร์นี้</span><strong>{{ draft.boxes * 65 }} บาท</strong><small>ต้นทุนอาหาร {{ draft.boxes * 40 }} บาท ก่อนหักค่าส่ง</small></div>
            <div class="form-actions"><button class="button button-primary" [disabled]="orderForm.invalid" type="submit">บันทึกออเดอร์</button><button class="button button-secondary" type="button" (click)="startCreate()">ยกเลิก</button></div>
          </form>
          <div class="rule-note"><span>03</span><p>หนึ่งไรเดอร์รับได้สูงสุด 3 ออเดอร์ต่อเที่ยว จำนวนกล่องรวมอาจมากกว่า 3 กล่องได้ตามสูตรใน PDF</p></div>
        </aside>
      </section>
    </main>
  `,
  styleUrl: './orders.component.scss',
})
export class OrdersComponent {
  readonly store = inject(DeliveryService);
  draft: OrderDraft = this.blankDraft();

  customerFor(order: Order): Customer | undefined { return this.store.customerFor(order); }
  statusLabel(status: OrderStatus): string { return { pending: 'รอจัด', assigned: 'จัดงานแล้ว', delivered: 'ส่งสำเร็จ' }[status]; }
  startCreate(): void { this.draft = this.blankDraft(); }
  edit(order: Order): void { this.draft = { id: order.id, customerId: order.customerId, boxes: order.boxes, status: order.status }; }
  save(): void { this.store.saveOrder(this.draft); this.startCreate(); }
  private blankDraft(): OrderDraft { return { customerId: '', boxes: 1, status: 'pending' }; }
}
