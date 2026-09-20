import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeliveryService } from '../core/delivery.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="page dashboard-page">
      <header class="page-heading">
        <div><h1>การจัดส่งวันนี้</h1><p>ตรวจความพร้อม แล้วเริ่มจัดงานให้ไรเดอร์ได้เลย</p></div>
        <span class="demo-tag">ข้อมูลตัวอย่าง</span>
      </header>

      <section class="overview" aria-label="สรุปงานวันนี้">
        <div class="overview-lead"><span>ออเดอร์รอส่ง</span><strong>{{ store.pendingOrders().length }}</strong><small>รายการ</small></div>
        <div><span>ข้าวกล่อง</span><strong>{{ store.pendingBoxes() }}</strong><small>กล่อง</small></div>
        <div><span>ไรเดอร์ที่ต้องใช้</span><strong>{{ ridersNeeded() }}</strong><small>คน · ไม่เกิน 3 ออเดอร์ต่อคน</small></div>
        <div><span>ลูกค้า</span><strong>{{ store.customers().length }}</strong><small>รายในระบบ</small></div>
      </section>

      <section class="today-grid">
        <article class="action-panel">
          <div class="action-top"><span class="status-dot" [class.warning]="!ready()"></span><span>{{ ready() ? 'พร้อมคำนวณเส้นทาง' : 'ยังไม่สามารถคำนวณเส้นทางได้' }}</span></div>
          <h2>{{ ready() ? 'ทุกออเดอร์พร้อมออกส่ง' : 'แก้ข้อมูลก่อนเริ่มจัดส่ง' }}</h2>
          <p>ระบบจะจัดออเดอร์ใกล้กันให้ไรเดอร์ และตรวจว่าคาดว่าจะถึงทุกจุดก่อน 12:30 น.</p>
          <ul class="checks">
            <li><span [class.not-ready]="store.pendingOrders().length === 0">{{ store.pendingOrders().length ? 'ครบ' : 'แก้' }}</span>{{ store.pendingOrders().length }} ออเดอร์รอจัดส่ง</li>
            <li><span [class.not-ready]="missingLocations() > 0">{{ missingLocations() ? 'แก้' : 'ครบ' }}</span>{{ missingLocations() ? missingLocations() + ' ออเดอร์ยังไม่มีตำแหน่งจัดส่ง' : 'ลูกค้าทุกออเดอร์มีตำแหน่งจัดส่ง' }}</li>
            <li><span [class.not-ready]="invalidBoxes() > 0">{{ invalidBoxes() ? 'แก้' : 'ครบ' }}</span>{{ invalidBoxes() ? invalidBoxes() + ' ออเดอร์ต้องแก้จำนวนกล่อง' : 'จำนวนกล่องถูกต้องทุกออเดอร์' }}</li>
          </ul>
          @if (ready()) { <a class="button button-primary main-cta" routerLink="/owner/delivery">คำนวณเส้นทางจัดส่ง</a> }
          @else { <a class="button button-primary main-cta" routerLink="/owner/orders">แก้ไขข้อมูลออเดอร์</a> }
        </article>

        <aside class="schedule-panel">
          <h2>เวลาของรอบนี้</h2>
          <div class="schedule-line"><div><small>อาหารพร้อม</small><strong>11:30</strong></div><span>เริ่มออกส่ง</span></div>
          <div class="schedule-line"><div><small>ต้องถึงทุกคนก่อน</small><strong>12:30</strong></div><span>เส้นตาย</span></div>
          <p>มีเวลาจัดส่งประมาณ 1 ชั่วโมง หลังอาหารพร้อม</p>
          @if (store.plan(); as plan) { <a routerLink="/owner/delivery" class="last-plan">ดูแผนล่าสุด · แผน {{ plan.version }}</a> }
        </aside>
      </section>
      <div class="quick-links"><a routerLink="/owner/customers">ตรวจรายชื่อลูกค้า</a><a routerLink="/owner/orders">ดูออเดอร์ทั้งหมด</a></div>
    </main>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly store = inject(DeliveryService);
  readonly missingLocations = computed(() => this.store.pendingOrders().filter(order => {
    const customer = this.store.customerFor(order);
    return !customer || !Number.isFinite(customer.lat) || !Number.isFinite(customer.lng);
  }).length);
  readonly invalidBoxes = computed(() => this.store.pendingOrders().filter(order => !Number.isInteger(order.boxes) || order.boxes < 1 || order.boxes > 3).length);
  readonly ridersNeeded = computed(() => Math.ceil(this.store.pendingOrders().length / 3));
  readonly ready = computed(() => this.store.pendingOrders().length > 0 && !this.missingLocations() && !this.invalidBoxes());
}
