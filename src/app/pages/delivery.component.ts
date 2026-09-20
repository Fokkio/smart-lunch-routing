import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeliveryService } from '../core/delivery.service';
import { RoutePlan } from '../core/models';
import { DeliveryMapComponent } from '../shared/delivery-map.component';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, DeliveryMapComponent],
  template: `
    <main class="page delivery-page">
      <header class="page-heading"><div><h1>จัดส่งวันนี้</h1><p>ตรวจออเดอร์ ดูแผนเส้นทาง และเตรียมใบงานไรเดอร์</p></div><span class="demo-tag">ตัวอย่างหน้าจอ · การยืนยันไม่บันทึกจริง</span></header>
      <ol class="workflow" aria-label="ขั้นตอนจัดส่ง">
        <li class="done"><span>1</span>ตรวจออเดอร์</li><li [class.done]="store.plan()"><span>2</span>คำนวณเส้นทาง</li><li [class.done]="store.plan()"><span>3</span>ตรวจผล</li><li [class.done]="confirmed"><span>4</span>ยืนยันเส้นทาง</li><li [class.done]="confirmed"><span>5</span>ใบงานไรเดอร์</li>
      </ol>
      @if (!store.plan()) {
        <section class="start-panel">
          <div><h2>พร้อมเริ่มจัดเส้นทาง</h2><p>{{ store.pendingOrders().length }} ออเดอร์ · {{ store.pendingBoxes() }} กล่อง · เริ่มส่ง 11:30 · ต้องเสร็จก่อน 12:30</p></div>
          @if (canCalculate()) { <button type="button" class="button button-primary" [disabled]="calculating" (click)="calculate()">{{ calculating ? 'กำลังหาเส้นทางที่เหมาะสม...' : 'คำนวณเส้นทาง' }}</button> }
          @else { <a routerLink="/owner/orders" class="button button-primary">ตรวจและแก้ข้อมูลออเดอร์</a> }
        </section>
        @if (!canCalculate()) { <p class="notice warning">ยังไม่สามารถคำนวณได้ โปรดตรวจลูกค้า ตำแหน่งจัดส่ง และจำนวนกล่องทุกออเดอร์</p> }
      } @else if (store.plan(); as plan) {
        <section class="deadline" [class.late]="!plan.deadlineSafe" aria-live="polite">
          <div><span class="deadline-kicker">{{ plan.deadlineSafe ? 'คาดว่าทันเวลา' : 'อาจส่งไม่ทัน' }}</span><h2>คาดว่าจะส่งเสร็จ {{ finishTime(plan) }} น.</h2><p>{{ plan.deadlineSafe ? 'เร็วกว่ากำหนด ' + marginMinutes(plan) + ' นาที' : 'เกินกำหนด ' + Math.abs(marginMinutes(plan)) + ' นาที' }} · เส้นตาย 12:30 น.<br>ประมาณการจากระยะเส้นตรง ไม่รวมเวลาจอดส่งและการจราจร</p></div>
          <span class="deadline-state">{{ plan.deadlineSafe ? 'คาดว่าทัน' : 'คาดว่าเกินเวลา' }}</span>
        </section>
        <div class="result-actions"><div><h2>แผนเส้นทางแนะนำ</h2><p>แผน {{ plan.version }} · {{ plan.routes.length }} ไรเดอร์ · {{ plan.routes.length * 3 >= store.pendingOrders().length ? store.pendingOrders().length : plan.routes.length * 3 }} ออเดอร์</p></div><button class="button button-secondary" type="button" (click)="compare()">ลองคำนวณเส้นทางใหม่</button></div>
        <section class="result-grid">
          <article class="map-panel"><app-delivery-map [customers]="store.customers()" [routes]="plan.routes" /><div class="map-caption">เส้นสีคือเส้นเชื่อมพิกัดเพื่อแสดงลำดับจุดส่ง ไม่ใช่ถนนจริง</div></article>
          <aside class="rider-panel"><h3>งานของไรเดอร์</h3><div class="route-list">
            @for (route of plan.routes; track route.rider.id; let i = $index) {
              <article class="route-card" [style.--route-color]="route.rider.color"><div class="route-card-top"><span class="route-swatch"></span><strong>{{ route.rider.name }}</strong><span>คนที่ {{ i + 1 }}</span></div><div class="route-metrics"><span>{{ route.stops.length }} ออเดอร์</span><span>{{ route.totalBoxes }} กล่อง</span><span>{{ route.distanceKm | number:'1.1-2' }} กม.</span><span>{{ route.durationMinutes }} นาที</span></div><p>ร้าน @for (stop of route.stops; track stop.order.id) { <span aria-hidden="true">→</span> {{ stop.customer.name }} }</p></article>
            }
          </div></aside>
        </section>
        <section class="cost-panel"><div><h2>สรุปค่าใช้จ่าย</h2><p>ประมาณการจากข้อมูลตัวอย่างและระยะเส้นตรง</p></div><dl><div><dt>รายได้</dt><dd>{{ plan.revenue | currency:'THB':'symbol-narrow':'1.0-0' }}</dd></div><div><dt>ต้นทุนอาหาร</dt><dd>{{ plan.foodCost | currency:'THB':'symbol-narrow':'1.0-0' }}</dd></div><div><dt>ค่าเรียกไรเดอร์</dt><dd>{{ callFee(plan) | currency:'THB':'symbol-narrow':'1.0-0' }}</dd></div><div><dt>ค่าระยะทาง</dt><dd>{{ distanceFee(plan) | currency:'THB':'symbol-narrow':'1.0-0' }}</dd></div><div><dt>ค่าใช้จ่ายรวม</dt><dd>{{ plan.foodCost + plan.deliveryCost | currency:'THB':'symbol-narrow':'1.0-0' }}</dd></div><div class="cost-total"><dt>กำไรประมาณการ</dt><dd [class.loss]="plan.profit < 0">{{ plan.profit | currency:'THB':'symbol-narrow':'1.0-0' }}</dd></div></dl></section>
        @if (candidate; as next) {
          <section class="comparison" aria-live="polite"><div><h2>เปรียบเทียบก่อนเลือก</h2><p>แผนปัจจุบันจะยังไม่ถูกแทนที่จนกว่าจะกดเลือก</p></div><div class="comparison-grid"><article><span>แผนปัจจุบัน</span><strong>{{ plan.totalDistanceKm | number:'1.1-2' }} กม.</strong><small>{{ longestMinutes(plan) }} นาที · กำไร {{ plan.profit | currency:'THB':'symbol-narrow':'1.0-0' }}</small></article><article><span>แผนใหม่</span><strong>{{ next.totalDistanceKm | number:'1.1-2' }} กม.</strong><small>{{ longestMinutes(next) }} นาที · กำไร {{ next.profit | currency:'THB':'symbol-narrow':'1.0-0' }}</small></article></div><p class="comparison-diff">{{ next.totalDistanceKm < plan.totalDistanceKm ? 'ระยะทางลดลง' : 'ระยะทางเพิ่มขึ้น' }} {{ Math.abs(next.totalDistanceKm - plan.totalDistanceKm) | number:'1.1-2' }} กม. · {{ next.profit >= plan.profit ? 'กำไรเพิ่มขึ้น' : 'กำไรลดลง' }} {{ Math.abs(next.profit - plan.profit) | currency:'THB':'symbol-narrow':'1.0-0' }}</p><div class="button-row"><button class="button button-secondary" type="button" (click)="candidate = null">ใช้เส้นทางเดิม</button><button class="button button-primary" type="button" (click)="chooseCandidate()">เลือกเส้นทางใหม่</button></div></section>
        }
        <section class="confirm-bar"><div><strong>{{ confirmed ? 'แสดงใบงานตัวอย่างแล้ว' : 'ตรวจแผนเรียบร้อยหรือยัง?' }}</strong><p>{{ confirmed ? 'รหัสด้านล่างใช้เปิดหน้าจอไรเดอร์ในเดโม' : 'ยืนยันแล้วจะเห็นตัวอย่างรหัสใบงานของไรเดอร์' }}</p></div><button class="button button-primary" type="button" (click)="confirmDialog.showModal()">ยืนยันและสร้างใบงานไรเดอร์</button></section>
        @if (confirmed) { <section class="jobs"><h2>ใบงานไรเดอร์</h2><div class="jobs-grid">@for (route of plan.routes; track route.rider.id) { <article><strong>{{ route.rider.name }}</strong><code>{{ route.rider.jobCode }}</code><div><button type="button" (click)="copyCode(route.rider.jobCode)">{{ copied === route.rider.jobCode ? 'คัดลอกแล้ว' : 'คัดลอกรหัส' }}</button><a routerLink="/rider">ดูใบงาน</a></div></article> }</div></section> }
        <dialog #confirmDialog class="confirm-dialog"><form method="dialog"><h2>ยืนยันแผนการจัดส่งนี้หรือไม่?</h2><p>{{ store.pendingOrders().length }} ออเดอร์ · {{ plan.routes.length }} ไรเดอร์ · คาดว่าส่งเสร็จ {{ finishTime(plan) }} น. · กำไรประมาณ {{ plan.profit | currency:'THB':'symbol-narrow':'1.0-0' }}</p><p class="dialog-note">นี่คือการแสดงผล UI ตัวอย่าง ไม่บันทึกการยืนยันจริง</p><div class="button-row"><button class="button button-secondary" type="submit">ยกเลิก</button><button class="button button-primary" type="button" (click)="confirmed = true; confirmDialog.close()">ยืนยัน</button></div></form></dialog>
      }
    </main>
  `,
  styleUrl: './delivery.component.scss',
})
export class DeliveryComponent {
  readonly store = inject(DeliveryService);
  readonly Math = Math;
  candidate: RoutePlan | null = null;
  confirmed = false;
  calculating = false;
  copied = '';

  canCalculate(): boolean {
    const orders = this.store.pendingOrders();
    return orders.length > 0 && orders.every(order => {
      const customer = this.store.customerFor(order);
      return customer && Number.isFinite(customer.lat) && Number.isFinite(customer.lng) && Number.isInteger(order.boxes) && order.boxes >= 1 && order.boxes <= 3;
    });
  }
  calculate(): void { if (!this.canCalculate()) return; this.calculating = true; setTimeout(() => { this.store.calculateRoutes(); this.calculating = false; }, 450); }
  compare(): void { this.candidate = this.store.previewRoutes((this.store.plan()?.version || 1) + 1); }
  chooseCandidate(): void { if (!this.candidate) return; this.store.choosePlan(this.candidate); this.candidate = null; this.confirmed = false; }
  longestMinutes(plan: RoutePlan): number { return Math.max(0, ...plan.routes.map(route => route.durationMinutes)); }
  finishTime(plan: RoutePlan): string { const minutes = 11 * 60 + 30 + this.longestMinutes(plan); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  marginMinutes(plan: RoutePlan): number { return 60 - this.longestMinutes(plan); }
  callFee(plan: RoutePlan): number { return plan.routes.length * 15; }
  distanceFee(plan: RoutePlan): number { return Math.round((plan.deliveryCost - this.callFee(plan)) * 100) / 100; }
  async copyCode(code: string): Promise<void> { try { await navigator.clipboard.writeText(code); this.copied = code; } catch { this.copied = ''; } }
}
