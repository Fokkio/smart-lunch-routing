import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DeliveryService } from '../core/delivery.service';
import { DeliveryMapComponent } from '../shared/delivery-map.component';
import { RevealDirective } from '../shared/reveal.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, DeliveryMapComponent, RevealDirective],
  template: `
    <main class="page dashboard-page">
      <section class="page-heading" appReveal>
        <div>
          <p class="eyebrow">OWNER CONTROL ROOM</p>
          <h1>ส่งทุกกล่องให้ทัน<br><em>ก่อนพักเที่ยงจบ</em></h1>
          <p class="lede">ข้อมูลจำลองวันนี้ออกจากครัว 11:30 น. ระบบคำนวณเส้นทางแนะนำด้วยระยะทางและข้อจำกัดไม่เกิน 3 ออเดอร์ต่อไรเดอร์</p>
        </div>
        <div class="action-cluster">
          <span class="time-card"><small>เวลาส่งสุดท้าย</small><strong>12:30</strong></span>
          <button class="button button-primary" type="button" (click)="calculate(false)">จัดเส้นทาง</button>
          @if (store.plan()) { <button class="button button-secondary" type="button" (click)="calculate(true)">เสนอแผนใหม่</button> }
        </div>
      </section>

      <section class="stat-grid" appReveal aria-label="สรุปออเดอร์วันนี้">
        <article class="stat-card"><span>ออเดอร์รอจัด</span><strong>{{ store.pendingOrders().length }}</strong><small>สูงสุด 3 ออเดอร์ / ไรเดอร์</small></article>
        <article class="stat-card"><span>กล่องทั้งหมด</span><strong>{{ store.pendingBoxes() }}</strong><small>ราคา 65 บาท / กล่อง</small></article>
        <article class="stat-card"><span>ไรเดอร์ที่ต้องใช้</span><strong>{{ store.plan()?.routes?.length || '—' }}</strong><small>จากเครือข่ายพร้อมรับงาน</small></article>
        <article class="stat-card" [class.positive]="(store.plan()?.profit || 0) >= 0"><span>กำไรหลังค่าส่ง</span><strong>{{ store.plan() ? (store.plan()!.profit | currency:'THB':'symbol-narrow':'1.0-0') : '—' }}</strong><small>ยังไม่รวมค่าใช้จ่ายอื่นของร้าน</small></article>
      </section>

      <section class="workspace-grid" appReveal>
        <article class="map-card">
          <div class="card-header">
            <div><p class="eyebrow">LIVE ROUTE BOARD</p><h2>แผนที่เส้นทาง</h2></div>
            @if (store.plan(); as plan) { <span class="status" [class.status-good]="plan.deadlineSafe">{{ plan.deadlineSafe ? 'ทันกำหนด' : 'เสี่ยงล่าช้า' }}</span> }
            @else { <span class="status">รอคำนวณ</span> }
          </div>
          <div class="map-frame"><app-delivery-map [customers]="store.customers()" [routes]="store.plan()?.routes || []" /></div>
          @if (store.plan(); as plan) {
            <div class="map-summary">
              <span><small>ระยะทางรวม</small><strong>{{ plan.totalDistanceKm | number:'1.1-2' }} กม.</strong></span>
              <span><small>เวลาวิ่งรวม</small><strong>{{ plan.totalDurationMinutes }} นาที</strong></span>
              <span><small>ค่าส่ง</small><strong>{{ plan.deliveryCost | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></span>
              <span><small>รายรับ</small><strong>{{ plan.revenue | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></span>
            </div>
          }
        </article>

        <aside class="route-panel">
          <div class="card-header"><div><p class="eyebrow">ASSIGNMENTS</p><h2>งานของไรเดอร์</h2></div><span class="plan-label">แผน {{ store.plan()?.version || '—' }}</span></div>
          @if (store.plan(); as plan) {
            <div class="route-list">
              @for (route of plan.routes; track route.rider.id; let index = $index) {
                <article class="route-item" [style.--route-color]="route.rider.color">
                  <div class="route-title"><span class="route-number">0{{ index + 1 }}</span><div><strong>{{ route.rider.name }}</strong><small>{{ route.rider.jobCode }} · {{ route.totalBoxes }} กล่อง</small></div><span class="route-time">{{ route.durationMinutes }} นาที</span></div>
                  <ol>
                    @for (stop of route.stops; track stop.order.id) {
                      <li><span>{{ stop.sequence }}</span><div><strong>{{ stop.customer.name }}</strong><small>{{ stop.arrivalTime }} น. · {{ stop.order.boxes }} กล่อง</small></div></li>
                    }
                  </ol>
                  <div class="route-footer"><span>{{ route.distanceKm }} กม.</span><span>กำไร {{ route.profit | currency:'THB':'symbol-narrow':'1.0-0' }}</span></div>
                </article>
              }
            </div>
            <p class="calculation-note">ค่าส่ง = 15 บาทต่อเที่ยว + 2 บาท × กม. × จำนวนกล่อง ข้อมูลนี้เป็นการจำลอง ไม่ใช่ราคาจริงจากผู้ให้บริการขนส่ง</p>
          } @else {
            <div class="empty-state"><span class="empty-mark">03</span><h3>พร้อมจัดงาน</h3><p>กด “จัดเส้นทาง” เพื่อแบ่งออเดอร์ เรียงจุดส่ง และตรวจเส้นตายโดยอัตโนมัติ</p></div>
          }
        </aside>
      </section>
    </main>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly store = inject(DeliveryService);
  calculate(alternative: boolean): void { this.store.calculateRoutes(alternative); }
}
