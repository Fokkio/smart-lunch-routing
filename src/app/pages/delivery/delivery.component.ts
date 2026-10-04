import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { todayLocal } from '../../core/backend-api.service';
import { DeliveryService } from '../../core/delivery.service';
import { RiderRoute, RoutePlan, SHOP } from '../../core/models';
import { adaptBackendPlan } from '../../core/route-plan-adapter';
import type { DeliveryRouteModel, RoutePlanModel, RoutePlanStatus, RoutePlanSummaryModel } from '../../core/route-plan.models';
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
  readonly shopPoint = computed<[number, number]>(() => {
    const settings = this.store.settings();
    return settings ? [settings.latitude, settings.longitude] : [SHOP.lat, SHOP.lng];
  });
  private readonly routePlans = inject(RoutePlanApiService, { optional: true });
  readonly Math = Math;
  readonly String = String;
  @ViewChild('candidateBox') private candidateBox?: ElementRef<HTMLElement>;
  @ViewChild('dispatchPanel') private dispatchPanel?: ElementRef<HTMLElement>;
  @ViewChild('routeMapPanel') private routeMapPanel?: ElementRef<HTMLElement>;
  @ViewChild('ackLate') private ackLateBox?: ElementRef<HTMLInputElement>;
  @ViewChild('ackCandidate') private ackCandidateBox?: ElementRef<HTMLInputElement>;
  candidate: RoutePlan | null = null;
  calculating = false;
  discardingCandidate = false;
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
  /** ใบงานที่บันทึกไว้ฝั่ง backend ของวันนี้ */
  savedPlans: RoutePlanSummaryModel[] = [];
  loadingPlans = false;
  loadingPlanDetail = false;
  showAllSavedPlans = false;
  /** ข้อความ error ตอนโหลดใบงานที่บันทึกไว้ (null = ไม่มี error) */
  plansError: string | null = null;
  /** โมเดล backend ดิบของแผนที่เลือก — เก็บ geometry เส้นถนนไว้ให้แผนที่ (adapter ทิ้ง field นี้) */
  backendPlan: RoutePlanModel | null = null;
  private candidateBackend: RoutePlanModel | null = null;
  private viewRequestId = 0;

  get visibleSavedPlans(): RoutePlanSummaryModel[] {
    if (this.showAllSavedPlans) return this.savedPlans;
    const current = this.savedPlans.find((plan) => plan.routePlanId === this.backendPlanId)
      ?? this.savedPlans.find((plan) => plan.status === 'SELECTED');
    return current
      ? [current, ...this.savedPlans.filter((plan) => plan !== current)].slice(0, 4)
      : this.savedPlans.slice(0, 4);
  }

  constructor() {
    // connect() เป็น async — effect นี้รันครั้งแรกตอนสร้าง component และรันซ้ำ
    // เมื่อ usingBackend กลายเป็น true จึงครอบคลุมทั้งเปิดหน้าก่อน/หลัง backend พร้อม
    // (ไม่เช่นนั้นใบงานที่บันทึกไว้จะไม่แสดงจนกว่าจะกดรีเฟรชเอง)
    effect(() => {
      if (this.store.usingBackend()) this.loadSavedPlans();
    });
  }

  /** ดึงรายการใบงานที่บันทึกไว้ (backend เท่านั้น) — มี timeout กันโหลดค้าง */
  loadSavedPlans(): void {
    if (!this.store.usingBackend() || !this.routePlans) {
      this.savedPlans = [];
      this.plansError = null;
      return;
    }
    if (this.loadingPlans) return; // กันยิงซ้ำตอนกำลังโหลด
    this.loadingPlans = true;
    this.plansError = null;
    try {
      this.routePlans.list(todayLocal()).pipe(
        timeout(15000),
        finalize(() => { this.loadingPlans = false; }),
      ).subscribe({
        next: (plans) => {
          this.savedPlans = plans;
          const current = plans.find((plan) => plan.status === 'SELECTED') ?? plans[0];
          if (current?.routePlanId != null && this.backendPlanId === null && !this.loadingPlanDetail) {
            this.viewSavedPlan(current.routePlanId);
          }
        },
        error: () => { this.plansError = 'โหลดใบงานไม่สำเร็จ ลองกดรีเฟรชอีกครั้ง'; },
      });
    } catch {
      this.loadingPlans = false;
      this.plansError = 'โหลดใบงานไม่สำเร็จ ลองกดรีเฟรชอีกครั้ง';
    }
  }

  planStatusLabel(status: RoutePlanStatus): string {
    return status === 'SELECTED' ? 'ยืนยันแล้ว' : status === 'REJECTED' ? 'ปฏิเสธ' : 'ฉบับร่าง';
  }

  /** เปิดดูใบงานที่บันทึกไว้ */
  viewSavedPlan(id: number, review = false, revealMap = false): void {
    if (!this.routePlans) return;
    const requestId = ++this.viewRequestId;
    this.loadingPlanDetail = true;
    this.plansError = null;
    this.routePlans.get(id).pipe(timeout(15000)).subscribe({
      next: (backend) => {
        if (requestId !== this.viewRequestId) return;
        this.loadingPlanDetail = false;
        this.selectedRoute = null;
        this.adoptBackend(backend);
        if (revealMap) setTimeout(() => {
          if (requestId !== this.viewRequestId) return;
          this.routeMapPanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          this.routeMapPanel?.nativeElement.focus({ preventScroll: true });
        }, 0);
        if (review && backend.status === 'GENERATED') {
          this.startReview();
          setTimeout(() => {
            this.dispatchPanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this.dispatchPanel?.nativeElement.focus();
          }, 0);
        }
      },
      error: () => {
        if (requestId !== this.viewRequestId) return;
        this.loadingPlanDetail = false;
        this.plansError = 'เปิดรายละเอียดใบงานไม่สำเร็จ กรุณาลองใหม่';
      },
    });
  }

  /** ลบใบงานที่บันทึกไว้ */
  deleteSavedPlan(plan: RoutePlanSummaryModel): void {
    const id = plan.routePlanId;
    if (id == null || !this.routePlans) return;
    if (!window.confirm(`ลบใบงาน #${id} หรือไม่?${plan.status === 'SELECTED' ? ' ออเดอร์ที่ยังไม่ส่งจะกลับไปรอจัดส่ง' : ''}`)) return;
    this.routePlans.delete(id).subscribe({
      next: () => {
        if (this.backendPlanId === id) {
          this.viewRequestId++;
          this.loadingPlanDetail = false;
          this.backendPlanId = null;
          this.backendPlan = null;
          this.store.plan.set(null);
          this.store.confirmedPlan.set(null);
        }
        this.loadSavedPlans();
      },
      error: () => { this.plansError = 'ลบใบงานไม่สำเร็จ กรุณาลองใหม่'; },
    });
  }

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
        next: (backend) => { this.adoptBackend(backend); this.loadSavedPlans(); },
        error: (error) => {
          this.calculating = false;
          if (error?.status === 422) {
            this.plansError = 'สร้างแผนไม่ได้: จำนวนไรเดอร์ที่พร้อมไม่พอหรือส่งไม่ทันเวลา';
            return;
          }
          this.fallbackNotice = true;
          this.calculateLocally();
        },
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
    this.candidate = null;
    this.fallbackNotice = false;
    this.acknowledgeLate = false;
    this.lateOverride = false;
    this.selectedRoute = null;
    this.store.choosePlan(plan);
    if (backend.status === 'SELECTED') this.store.confirmedPlan.set(plan);
    this.reviewing = false;
    this.calculating = false;
  }
  compare(): void {
    if (this.candidate || this.calculating) return;
    if (this.store.usingBackend() && this.routePlans) {
      this.calculating = true;
      this.routePlans.recalculate(todayLocal()).subscribe({
        next: (backend) => {
          this.calculating = false;
          this.acknowledgeCandidate = false;
          this.candidateBackend = backend;
          this.selectedRoute = null;
          this.candidate = adaptBackendPlan(backend, {
            customers: this.store.customers(),
            orders: this.store.orders(),
            riders: this.store.riders(),
          });
          this.loadSavedPlans();
        },
        error: (error) => {
          this.calculating = false;
          if (error?.status === 422) {
            this.plansError = 'คำนวณแผนใหม่ไม่ได้: จำนวนไรเดอร์ที่พร้อมไม่พอหรือส่งไม่ทันเวลา';
            return;
          }
          this.fallbackNotice = true;
          this.compareLocally();
        },
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
    const id = this.candidateBackend?.routePlanId;
    if (id != null && this.routePlans) {
      if (this.discardingCandidate) return;
      this.discardingCandidate = true;
      this.routePlans.delete(id).subscribe({
        next: () => { this.clearCandidate(); this.discardingCandidate = false; this.loadSavedPlans(); },
        error: () => {
          this.discardingCandidate = false;
          this.plansError = 'ลบแผนใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง';
        },
      });
      return;
    }
    this.clearCandidate();
  }
  private clearCandidate(): void {
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
    const finish = () => {
      this.store.confirmPlan();
      this.reviewing = false;
      this.lateOverride = wasLate;
      this.acknowledgeLate = false;
    };
    if (this.backendPlanId != null && this.routePlans) {
      this.routePlans.select(this.backendPlanId).subscribe({
        next: (backend) => { this.adoptBackend(backend); finish(); this.loadSavedPlans(); },
        error: () => { this.plansError = 'ยืนยันใบงานไม่สำเร็จ กรุณาตรวจสอบไรเดอร์และลองใหม่'; },
      });
      return;
    }
    finish();
  }
  longestMinutes(plan: RoutePlan): number { return Math.max(0, ...plan.routes.map(route => route.durationMinutes)); }
  totalStops(plan: RoutePlan): number { return plan.routes.reduce((total, route) => total + route.stops.length, 0); }
  private timeMinutes(value: string): number { const [hours, minutes] = value.slice(0, 5).split(':').map(Number); return hours * 60 + minutes; }
  private startMinutes(): number { return this.timeMinutes(this.store.settings()?.deliveryStartTime ?? '11:30'); }
  private deadlineMinutes(): number { return this.timeMinutes(this.store.settings()?.deliveryDeadline ?? '12:30'); }
  deadlineLabel(): string { return (this.store.settings()?.deliveryDeadline ?? '12:30').slice(0, 5); }
  finishTime(plan: RoutePlan): string { return this.finishTimeForRoute(this.longestMinutes(plan)); }
  marginMinutes(plan: RoutePlan): number { return this.deadlineMinutes() - this.startMinutes() - this.longestMinutes(plan); }
  finishTimeForRoute(durationMinutes: number): string { const minutes = this.startMinutes() + durationMinutes; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  /** คันนี้คาดว่าถึงจุดสุดท้ายเกินเวลาส่งของร้านหรือไม่ */
  isLate(route: RiderRoute): boolean { return this.startMinutes() + route.durationMinutes > this.deadlineMinutes(); }
  /** เกินเส้นตายไปกี่นาที (เรียกเมื่อ isLate เท่านั้น) */
  lateMinutes(route: RiderRoute): number { return Math.max(0, this.startMinutes() + route.durationMinutes - this.deadlineMinutes()); }
  capacityPercent(plan: RoutePlan): number { return plan.routes.length ? Math.min(100, this.totalStops(plan) / (plan.routes.length * (this.store.settings()?.maxOrdersPerRider ?? 3)) * 100) : 0; }
  callFee(plan: RoutePlan): number { return plan.routes.length * (this.store.settings()?.riderBaseCost ?? 15); }
  distanceFee(plan: RoutePlan): number { return Math.round((plan.deliveryCost - this.callFee(plan)) * 100) / 100; }
}
