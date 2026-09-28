import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { RoutePlanModel } from '../../core/route-plan.models';
import { deadlineLabel, routeColor, routingSourceLabel } from '../../core/route-plan-view';
import { RoutePlanMapComponent } from '../../shared/route-plan-map.component';

type PageState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RoutePlanMapComponent],
  template: `
    <main class="page planning-page">
      <section class="page-heading">
        <div>
          <p class="eyebrow">ROUTE PLANNING · BACKEND</p>
          <h1>แผนเส้นทาง<br><em>จากระบบหลังบ้าน</em></h1>
          <p class="lede">แผนคำนวณโดย backend (OSRM หรือสำรอง) แล้วแสดงผลที่นี่ — หน้านี้ไม่คำนวณเส้นทางเอง</p>
        </div>
        <div class="action-cluster">
          <label class="date-field">วันที่แผน
            <input type="date" [value]="planDate()" (change)="planDate.set($any($event.target).value)" />
          </label>
          <button class="button button-primary" type="button" (click)="generate()" [disabled]="state() === 'loading'">
            {{ state() === 'loading' ? 'กำลังคำนวณ…' : 'คำนวณแผน' }}
          </button>
          @if (plan()) {
            <button class="button button-secondary" type="button" (click)="recalculate()" [disabled]="state() === 'loading'">คำนวณใหม่</button>
            <button class="button button-secondary" type="button" (click)="selectPlan()" [disabled]="state() === 'loading' || plan()?.status !== 'GENERATED'">เลือกแผนนี้</button>
          }
        </div>
      </section>

      @if (state() === 'error') {
        <section class="alert alert-error" role="alert">
          <strong>คำนวณแผนไม่สำเร็จ</strong>
          <p>{{ errorMessage() }}</p>
          <p class="hint">กรณีไม่มีออเดอร์รอจัด ระบบจะไม่สร้างแผน — เพิ่มออเดอร์ก่อนแล้วลองใหม่</p>
        </section>
      }

      @if (plan(); as current) {
        <section class="stat-grid" aria-label="สรุปแผน">
          <article class="stat-card"><span>ออเดอร์</span><strong>{{ totalOrders(current) }}</strong><small>สูงสุด 3 ออเดอร์ / ไรเดอร์</small></article>
          <article class="stat-card"><span>กล่องทั้งหมด</span><strong>{{ current.totalBoxes }}</strong><small>ราคา 65 บาท / กล่อง</small></article>
          <article class="stat-card"><span>ไรเดอร์</span><strong>{{ current.riderCount }}</strong><small>แผน #{{ current.routePlanId }} · {{ current.status }}</small></article>
          <article class="stat-card"><span>เส้นตาย</span><strong>12:30</strong><small>{{ deadlineLabel(current, '12:30') }}</small></article>
        </section>

        <section class="workspace-grid">
          <article class="map-card">
            <div class="card-header">
              <div><p class="eyebrow">ROUTE BOARD</p><h2>แผนที่เส้นทาง</h2></div>
              <span class="status" [class.status-good]="deadlineLabel(current, '12:30') === 'ส่งทันภายในกำหนด'">
                {{ deadlineLabel(current, '12:30') }} · {{ routingSourceLabel(current) }}
              </span>
            </div>
            <div class="map-frame"><app-route-plan-map [jobs]="current.jobs" [selectedJob]="selectedJob()" /></div>
            <div class="map-summary">
              <span><small>ระยะทางรวม</small><strong>{{ current.totalDistanceKm | number:'1.1-2' }} กม.</strong></span>
              <span><small>ส่งครบประมาณ</small><strong>{{ current.estimatedFinishTime }} น.</strong></span>
              <span><small>ค่าส่ง</small><strong>{{ current.totalDeliveryCost | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></span>
              <span><small>รายรับ</small><strong>{{ current.totalRevenue | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></span>
            </div>
          </article>

          <aside class="route-panel">
            <div class="card-header"><div><p class="eyebrow">ASSIGNMENTS</p><h2>งานของไรเดอร์</h2></div></div>
            <div class="route-list">
              @for (job of current.jobs; track job.jobCode || $index; let index = $index) {
                <article class="route-item" [style.--route-color]="routeColor(job.riderIndex)" (click)="selectedJob.set(selectedJob() === index ? null : index)">
                  <div class="route-title">
                    <span class="route-number">0{{ index + 1 }}</span>
                    <div><strong>ไรเดอร์ {{ index + 1 }}</strong><small>{{ job.jobCode }} · {{ job.totalOrders }} ออเดอร์ · {{ job.totalBoxes }} กล่อง</small></div>
                    <span class="route-time">{{ job.durationMinutes }} นาที</span>
                  </div>
                  <ol>
                    @for (stop of job.stops; track stop.orderId) {
                      <li><span>{{ stop.sequence }}</span><div><strong>{{ stop.customerName }}</strong><small>{{ stop.estimatedArrivalTime }} น. · {{ stop.boxCount }} กล่อง</small></div></li>
                    }
                  </ol>
                  <div class="route-footer"><span>{{ job.distanceKm }} กม.</span><span>ค่าส่ง {{ job.deliveryCost | currency:'THB':'symbol-narrow':'1.0-0' }}</span><span>เสร็จ {{ job.estimatedFinishTime }}</span></div>
                  @if (!job.geometry) { <p class="approx-note">Approximate route — เส้นประโดยประมาณ (ไม่มีข้อมูลถนน)</p> }
                </article>
              }
            </div>
            <div class="summary-card">
              <div><span>รายรับ</span><strong>{{ current.totalRevenue | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></div>
              <div><span>ต้นทุนอาหาร</span><strong>{{ current.totalFoodCost | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></div>
              <div><span>ค่าส่ง</span><strong>{{ current.totalDeliveryCost | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></div>
              <div class="profit"><span>กำไรโดยประมาณ</span><strong>{{ current.estimatedProfit | currency:'THB':'symbol-narrow':'1.0-0' }}</strong></div>
              <div><span>ส่งครบประมาณ</span><strong>{{ current.estimatedFinishTime }} น.</strong></div>
            </div>
          </aside>
        </section>
      } @else if (state() === 'idle') {
        <section class="empty-state"><h3>ยังไม่มีแผน</h3><p>เลือกวันที่แล้วกด “คำนวณแผน” เพื่อสร้างแผนเส้นทางจากระบบหลังบ้าน</p></section>
      }
    </main>
  `,
  styleUrl: './delivery.component.scss',
})
export class DeliveryComponent {
  private readonly api = inject(RoutePlanApiService);

  readonly planDate = signal(new Date().toISOString().slice(0, 10));
  readonly state = signal<PageState>('idle');
  readonly plan = signal<RoutePlanModel | null>(null);
  readonly errorMessage = signal('');
  readonly selectedJob = signal<number | null>(null);

  readonly routeColor = routeColor;
  readonly routingSourceLabel = routingSourceLabel;
  readonly deadlineLabel = deadlineLabel;

  totalOrders(plan: RoutePlanModel): number {
    return plan.jobs.reduce((sum, job) => sum + job.totalOrders, 0);
  }

  generate(): void {
    this.run(this.api.generate(this.planDate()));
  }

  recalculate(): void {
    this.run(this.api.recalculate(this.planDate()));
  }

  selectPlan(): void {
    const id = this.plan()?.routePlanId;
    if (id === undefined) return;
    this.run(this.api.select(id));
  }

  private run(request: import('rxjs').Observable<RoutePlanModel>): void {
    this.state.set('loading');
    this.errorMessage.set('');
    request.subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.selectedJob.set(null);
        this.state.set('loaded');
      },
      error: (error: { error?: { message?: string }; message?: string }) => {
        this.errorMessage.set(error?.error?.message || error?.message || 'เกิดข้อผิดพลาด');
        this.state.set('error');
      },
    });
  }
}
