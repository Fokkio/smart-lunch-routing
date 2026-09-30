import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { todayLocal } from '../../core/backend-api.service';
import { DeliveryService } from '../../core/delivery.service';
import { RiderRoute, RoutePlan } from '../../core/models';
import { adaptBackendPlan } from '../../core/route-plan-adapter';
import type { DeliveryRouteModel, RoutePlanModel } from '../../core/route-plan.models';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { routingSourceLabel } from '../../core/route-plan-view';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';
import { RoutePlanMapComponent } from '../../shared/route-plan-map.component';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule, RouterLink, DeliveryMapComponent, RoutePlanMapComponent],
  templateUrl: './delivery.component.html',
})
export class DeliveryComponent {
  readonly store = inject(DeliveryService);
  private readonly routePlans = inject(RoutePlanApiService, { optional: true });
  readonly Math = Math;
  readonly String = String;
  @ViewChild('candidateBox') private candidateBox?: ElementRef<HTMLElement>;
  @ViewChild('ackLate') private ackLateBox?: ElementRef<HTMLInputElement>;
  @ViewChild('ackCandidate') private ackCandidateBox?: ElementRef<HTMLInputElement>;
  candidate: RoutePlan | null = null;
  calculating = false;
  reviewing = false;
  /** index เส้นทางที่เลือกโฟกัส (แชร์ระหว่างแผนที่กับ价值卡) null = ดูทั้งหมด */
  selectedRoute: number | null = null;
  /** ติ๊กรับทราบก่อนยืนยันแผนที่ส่งเกินเส้นตาย (รีเซ็ตทุกครั้งที่แผนเปลี่ยน) */
  acknowledgeLate = false;
  /** ติ๊กรับทราบก่อนเลือกแผนใหม่ที่ส่งเกินเส้นตาย */
  acknowledgeCandidate = false;
  /** โชว์ข้อความกำกับเมื่อกดยืนยันทั้งที่ยังไม่ติ๊ก */
  ackError = false;
  /** true เมื่อแผนที่ยืนยันล่าสุดเป็นการ override แผนส่งเกินเวลา */
  lateOverride = false;
  /** true เมื่อตกกลับไปคำนวณในเครื่องเพราะ backend ล่ม — ตัวเลขเป็นเส้นตรงจนกว่าจะ generate สำเร็จ */
  fallbackNotice = false;
  /** id แผนฝั่ง backend (null = ยังไม่เคยคำนวณ/ใช้โหมดคำนวณในเครื่อง) */
  backendPlanId: number | null = null;
  /** โมเดล backend ดิบของแผนที่เลือก — เก็บ geometry เส้นถนนไว้ให้แผนที่ (adapter ทิ้ง field นี้) */
  backendPlan: RoutePlanModel | null = null;
  private candidateBackend: RoutePlanModel | null = null;

  /** jobs สำหรับแผนที่ถนนจริง (null = วาดเส้นตรงแบบเดิม) */
  mapJobs(): DeliveryRouteModel[] | null {
    return this.candidateBackend?.jobs ?? this.backendPlan?.jobs ?? null;
  }

  /** ชื่อไรเดอร์ตามลำดับใบงาน — ส่งให้แผนที่ถนนใช้ป้ายเดียวกับการ์ด (R01 · name) */
  mapRiderNames(): string[] {
    const plan = this.candidate ?? this.store.plan();
    return plan ? plan.routes.map((route) => route.rider.name) : [];
  }

  /** ป้ายที่มาของเส้นทาง (null = โหมดคำนวณในเครื่อง) */
  routingNote(): string | null {
    const plan = this.candidateBackend ?? this.backendPlan;
    return plan ? routingSourceLabel(plan) : null;
  }

  canCalculate(): boolean {
    const orders = this.store.pendingOrders();
    return orders.length > 0 && orders.every(order => {
      const customer = this.store.customerFor(order);
      return customer && Number.isFinite(customer.lat) && Number.isFinite(customer.lng) && Number.isInteger(order.boxes) && order.boxes >= 1 && order.boxes <= 3;
    });
  }
  calculate(): void {
    if (!this.canCalculate()) return;
    this.selectedRoute = null;
    // โหมด backend: ยิง /route-plans/generate แล้วแปลงเป็น RoutePlan ตัวเดิม
    // template จึงเหมือนรูปเดิมทุกอย่าง — พัง/ออฟไลน์ค่อยตกกลับไปคำนวณในเครื่อง
    if (this.store.usingBackend() && this.routePlans) {
      this.calculating = true;
      this.routePlans.generate(todayLocal()).subscribe({
        next: (backend) => this.adoptBackend(backend),
        error: () => { this.fallbackNotice = true; this.calculateLocally(); },
      });
      return;
    }
    this.calculateLocally();
  }
  private calculateLocally(): void {
    this.backendPlan = null;
    this.acknowledgeLate = false;
    this.lateOverride = false;
    this.calculating = true;
    setTimeout(() => { this.store.calculateRoutes(); this.reviewing = false; this.calculating = false; }, 450);
  }
  private adoptBackend(backend: RoutePlanModel): void {
    const plan = adaptBackendPlan(backend, {
      customers: this.store.customers(),
      orders: this.store.orders(),
      riders: this.store.riders(),
    });
    this.backendPlanId = backend.routePlanId ?? null;
    this.backendPlan = backend;
    this.candidateBackend = null;
    this.fallbackNotice = false;
    this.acknowledgeLate = false;
    this.lateOverride = false;
    this.selectedRoute = null;
    this.store.choosePlan(plan);
    this.reviewing = false;
    this.calculating = false;
  }
  compare(): void {
    if (this.store.usingBackend() && this.routePlans) {
      this.routePlans.recalculate(todayLocal()).subscribe({
        next: (backend) => {
          this.acknowledgeCandidate = false;
          this.candidateBackend = backend;
          this.selectedRoute = null;
          this.candidate = adaptBackendPlan(backend, {
            customers: this.store.customers(),
            orders: this.store.orders(),
            riders: this.store.riders(),
          });
        },
        error: () => { this.fallbackNotice = true; this.compareLocally(); },
      });
      return;
    }
    this.compareLocally();
  }
  private compareLocally(): void {
    this.candidateBackend = null;
    this.acknowledgeCandidate = false;
    this.selectedRoute = null;
    this.candidate = this.store.previewRoutes((this.store.plan()?.version || 1) + 1);
  }
  discardCandidate(): void {
    this.candidate = null;
    this.candidateBackend = null;
    this.acknowledgeCandidate = false;
  }
  focusCandidate(): void {
    this.candidateBox?.nativeElement.focus();
    this.candidateBox?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  chooseCandidate(): void {
    if (!this.candidate) return;
    // แผนใหม่สายต้องติ๊ก ack ก่อน ไม่ใช่แค่ปุ่มทึบ — พาโฟกัสไปที่ checkbox
    if (!this.candidate.deadlineSafe && !this.acknowledgeCandidate) {
      this.ackCandidateBox?.nativeElement.focus();
      return;
    }
    if (this.candidateBackend?.routePlanId != null) this.backendPlanId = this.candidateBackend.routePlanId;
    if (this.candidateBackend) this.backendPlan = this.candidateBackend;
    this.lateOverride = !this.candidate.deadlineSafe;
    this.acknowledgeLate = false;
    this.acknowledgeCandidate = false;
    this.ackError = false;
    this.selectedRoute = null;
    this.store.choosePlan(this.candidate);
    this.candidate = null;
    this.candidateBackend = null;
    this.reviewing = false;
  }
  startReview(): void {
    this.acknowledgeLate = false;
    this.ackError = false;
    this.reviewing = true;
  }
  confirm(): void {
    const plan = this.store.plan();
    if (!this.reviewing || !plan) return;
    // แผนที่ส่งเกินเส้นตายต้องติ๊ก ack ก่อน — ไม่ใช่ปุ่มทึบ แต่พาโฟกัสไปที่ checkbox
    if (!plan.deadlineSafe && !this.acknowledgeLate) {
      this.ackError = true;
      this.ackLateBox?.nativeElement.focus();
      return;
    }
    const wasLate = !plan.deadlineSafe;
    // ล็อกแผนฝั่ง backend ด้วย แต่ UI ยืนยันแบบเดิมทันที ไม่รอให้เสียจังหวะ
    if (this.backendPlanId != null && this.routePlans) {
      this.routePlans.select(this.backendPlanId).subscribe({ error: () => undefined });
    }
    this.store.confirmPlan();
    this.reviewing = false;
    // จำไว้ว่าแผนนี้ยืนยันทั้งที่เกินเวลา — แสดงโน้ตในประวัติการยืนยัน
    this.lateOverride = wasLate;
    this.acknowledgeLate = false;
  }
  longestMinutes(plan: RoutePlan): number { return Math.max(0, ...plan.routes.map(route => route.durationMinutes)); }
  finishTime(plan: RoutePlan): string { const minutes = 11 * 60 + 30 + this.longestMinutes(plan); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  marginMinutes(plan: RoutePlan): number { return 60 - this.longestMinutes(plan); }
  finishTimeForRoute(durationMinutes: number): string { const minutes = 11 * 60 + 30 + durationMinutes; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  /** คันนี้คาดว่าถึงจุดสุดท้ายเกิน 12:30 หรือไม่ — ใช้กางรายการจุดส่งอัตโนมัติ */
  isLate(route: RiderRoute): boolean { return this.finishTimeForRoute(route.durationMinutes) > '12:30'; }
  /** เกินเส้นตายไปกี่นาที (เรียกเมื่อ isLate เท่านั้น) */
  lateMinutes(route: RiderRoute): number { return Math.max(0, route.durationMinutes - 60); }
  capacityPercent(routeCount: number): number { return routeCount ? Math.min(100, this.store.pendingOrders().length / (routeCount * 3) * 100) : 0; }
  callFee(plan: RoutePlan): number { return plan.routes.length * 15; }
  distanceFee(plan: RoutePlan): number { return Math.round((plan.deliveryCost - this.callFee(plan)) * 100) / 100; }
}
