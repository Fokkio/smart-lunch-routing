// ไฟล์นี้: หน้า "ศูนย์จัดส่ง" ของเจ้าของร้าน — เลือกออเดอร์ สร้าง/เปรียบเทียบ/ยืนยันแผน ดูแผนที่ และจัดการใบงานที่บันทึกไว้

import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  untracked,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { filter, finalize, timeout, type Observable } from 'rxjs';
import { todayLocal } from '../../core/dates';
import { DeliveryService } from '../../core/delivery.service';
import { RiderRoute, RoutePlan, SHOP } from '../../core/models';
import { adaptBackendPlan } from '../../core/route-plan-adapter';
import type {
  DeliveryRouteModel,
  RoutePlanModel,
  RoutePlanStatus,
  RoutePlanSummaryModel,
} from '../../core/route-plan.models';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { routingSourceLabel } from '../../core/route-plan-view';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';
import { RoutePlanMapComponent } from '../../shared/route-plan-map.component';

// หน้าวางแผนจัดส่ง: ขอแผนจาก backend, แสดงสรุป/แผนที่, เลือกและยืนยันแผน, จัดการใบงานที่บันทึกไว้
@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    DeliveryMapComponent,
    RoutePlanMapComponent,
  ],
  templateUrl: './delivery.component.html',
})
export class DeliveryComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService, { optional: true });
  // สร้างตัวกรองที่ปล่อย response ผ่านเฉพาะเมื่อ token ยังเป็นของ session เดิม
  private currentSession() {
    const token = this.auth?.token();
    return <T>(source: Observable<T>) => source.pipe(filter(() => token === this.auth?.token()));
  }
  readonly store = inject(DeliveryService);
  // พิกัดร้านบนแผนที่: จากแผนเปรียบเทียบ/แผนปัจจุบัน/ค่าตั้งร้าน
  readonly shopPoint = computed<[number, number]>(() => {
    const settings =
      this.candidateBackend()?.shop ?? this.store.plan()?.shop ?? this.store.settings();
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
  // แผนเปรียบเทียบที่แปลงเป็นรูปของหน้าแอปแล้ว (null = ไม่มีแผนเปรียบเทียบ)
  readonly candidate = computed(() => {
    const backend = this.candidateBackend();
    return backend
      ? adaptBackendPlan(backend, this.store.riders(), { deadlineTime: this.deadlineLabel() })
      : null;
  });
  calculating = false;
  confirmingPlan = false;
  roundStart = '';
  roundDeadline = '';
  selectedOrderIds: number[] = [];
  // ติ๊ก/ยกเลิกติ๊กออเดอร์ที่จะรวมในแผนรอบนี้
  toggleOrder(id: number, checked: boolean): void {
    this.selectedOrderIds = checked
      ? [...new Set([...this.selectedOrderIds, id])]
      : this.selectedOrderIds.filter((value) => value !== id);
  }
  // ไรเดอร์ที่พร้อมรับงาน (สถานะ READY) สำหรับเลือกมอบหมายงาน
  readyRiders() {
    return this.store.riders().filter((rider) => rider.workStatus === 'READY');
  }
  // มอบหมายใบงานที่ยังไม่ยืนยันให้ไรเดอร์ที่เลือก แล้วอัปเดตแผนที่แสดง
  assignRider(jobId: number, riderId: number): void {
    const rider = this.store.riders().find((r) => Number(r.id) === riderId);
    if (!this.backendPlan || this.backendPlan.status !== 'GENERATED' || !rider) return;
    this.backendPlan = {
      ...this.backendPlan,
      jobs: this.backendPlan.jobs.map((job) => (job.jobId === jobId ? { ...job, riderId } : job)),
    };
    this.store.choosePlan(adaptBackendPlan(this.backendPlan, this.store.riders()));
  }
  // ช่วงเวลาส่งของรอบนี้: ใช้ที่กรอกไว้ก่อน ถ้าไม่กรอกใช้ค่าตั้งร้าน พร้อมออเดอร์ที่ติ๊กไว้
  private roundWindow() {
    return {
      startTime: this.roundStart || this.store.settings()?.deliveryStartTime?.slice(0, 5),
      deadline: this.roundDeadline || this.store.settings()?.deliveryDeadline?.slice(0, 5),
      orderIds: this.selectedOrderIds.length ? [...this.selectedOrderIds] : undefined,
    };
  }
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
  /** id ของแผน backend ที่กำลังเปิดอยู่ */
  get backendPlanId(): number | null {
    return this.backendPlan?.routePlanId ?? null;
  }
  /** ใบงานที่บันทึกไว้ฝั่ง backend ของวันนี้ */
  savedPlans: RoutePlanSummaryModel[] = [];
  loadingPlans = false;
  loadingPlanDetail = false;
  showAllSavedPlans = false;
  /** ข้อความ error ตอนโหลดใบงานที่บันทึกไว้ (null = ไม่มี error) */
  plansError: string | null = null;
  /** โมเดล backend ดิบของแผนที่เลือก — เก็บ geometry เส้นถนนไว้ให้แผนที่ (adapter ทิ้ง field นี้) */
  backendPlan: RoutePlanModel | null = null;
  private readonly candidateBackend = signal<RoutePlanModel | null>(null);
  private viewRequestId = 0;

  // ใบงานที่บันทึกไว้ที่จะแสดง: แสดงทั้งหมดถ้ากดดูทั้งหมด ไม่งั้นแสดงแผนปัจจุบันก่อนแล้วตามด้วย 4 ใบแรก
  get visibleSavedPlans(): RoutePlanSummaryModel[] {
    if (this.showAllSavedPlans) return this.savedPlans;
    const current =
      this.savedPlans.find((plan) => plan.routePlanId === this.backendPlanId) ??
      this.savedPlans.find((plan) => plan.status === 'SELECTED' && !this.isOtherDay(plan));
    return current
      ? [current, ...this.savedPlans.filter((plan) => plan !== current)].slice(0, 4)
      : this.savedPlans.slice(0, 4);
  }

  /** แผนวันอื่น (ไม่ใช่วันนี้) — มักเป็นร่างตกค้างที่ทำให้ลบออเดอร์ไม่ได้ */
  isOtherDay(plan: RoutePlanSummaryModel): boolean {
    return Boolean(plan.planDate) && plan.planDate !== todayLocal();
  }

  // ตอนสร้าง: รีเฟรชข้อมูล แล้วตั้ง effect ให้โหลดใบงานที่บันทึกไว้ทันทีที่ backend พร้อม
  constructor() {
    this.store.refresh();
    // connect() เป็น async — effect นี้รันครั้งแรกตอนสร้าง component และรันซ้ำ
    // เมื่อ usingBackend กลายเป็น true จึงครอบคลุมทั้งเปิดหน้าก่อน/หลัง backend พร้อม
    // (ไม่เช่นนั้นใบงานที่บันทึกไว้จะไม่แสดงจนกว่าจะกดรีเฟรชเอง)
    effect(() => {
      this.store.dataRevision();
      const ready = this.store.usingBackend();
      untracked(() => {
        this.viewRequestId++;
        this.backendPlan = null;
        this.loadingPlanDetail = false;
        this.selectedOrderIds = [];
        this.clearCandidate();
        if (ready) this.loadSavedPlans();
      });
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
      this.routePlans
        .list()
        .pipe(
          timeout(15000),
          this.currentSession(),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.loadingPlans = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (plans) => {
            this.savedPlans = plans;
            // เปิดทานให้เฉพาะแผนวันนี้เสมอ แผนวันอื่นเอาไว้ตรวจ/ลบเอง
            const today = todayLocal();
            // เช็กว่าแผนนี้เป็นของวันนี้หรือไม่ (ไม่มีวัน = ถือว่าเป็นวันนี้)
            const isToday = (plan: RoutePlanSummaryModel) => !plan.planDate || plan.planDate === today;
            const current =
              plans.find((plan) => plan.status === 'SELECTED' && isToday(plan)) ??
              plans.find((plan) => plan.status === 'GENERATED' && isToday(plan));
            if (
              current?.routePlanId != null &&
              this.backendPlanId === null &&
              !this.loadingPlanDetail
            ) {
              this.viewSavedPlan(current.routePlanId);
            }
          },
          error: () => {
            this.plansError = 'โหลดใบงานไม่สำเร็จ ลองกดรีเฟรชอีกครั้ง';
          },
        });
    } catch {
      this.loadingPlans = false;
      this.plansError = 'โหลดใบงานไม่สำเร็จ ลองกดรีเฟรชอีกครั้ง';
    }
  }

  // ป้ายสถานะแผนภาษาไทยจากสถานะของ backend
  planStatusLabel(status: RoutePlanStatus): string {
    return status === 'SELECTED'
      ? 'ยืนยันแล้ว'
      : status === 'REJECTED'
        ? 'ต้องคำนวณใหม่'
        : 'ฉบับร่าง';
  }

  /** เปิดดูใบงานที่บันทึกไว้ */
  viewSavedPlan(id: number, review = false, revealMap = false): void {
    if (!this.routePlans) return;
    const requestId = ++this.viewRequestId;
    this.loadingPlanDetail = true;
    this.plansError = null;
    this.routePlans
      .get(id)
      .pipe(
        timeout(15000),
        this.currentSession(),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cdr.markForCheck()),
      )
      .subscribe({
        next: (backend) => {
          if (requestId !== this.viewRequestId) return;
          this.loadingPlanDetail = false;
          if (backend.status === 'REJECTED') {
            this.plansError = 'แผนนี้ใช้จัดส่งไม่ได้แล้ว กรุณาคำนวณแผนใหม่จากข้อมูลล่าสุด';
            return;
          }
          this.selectedRoute = null;
          this.adoptBackend(backend);
          if (revealMap)
            setTimeout(() => {
              if (requestId !== this.viewRequestId) return;
              this.routeMapPanel?.nativeElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
              this.routeMapPanel?.nativeElement.focus({ preventScroll: true });
            }, 0);
          if (review && backend.status === 'GENERATED') {
            this.startReview();
            setTimeout(() => {
              this.dispatchPanel?.nativeElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
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
    if (
      !window.confirm(
        `ลบใบงาน #${id} หรือไม่?${plan.status === 'SELECTED' ? ' ออเดอร์ที่ยังไม่ส่งจะกลับไปรอจัดส่ง' : ''}`,
      )
    )
      return;
    this.routePlans
      .delete(id)
      .pipe(
        timeout(15000),
        this.currentSession(),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cdr.markForCheck()),
      )
      .subscribe({
        next: () => {
          if (this.backendPlanId === id) {
            this.viewRequestId++;
            this.loadingPlanDetail = false;
            this.backendPlan = null;
            this.store.plan.set(null);
            this.store.confirmedPlan.set(null);
          }
          this.store.refresh();
        },
        error: (error) => {
          // ส่งเหตุผลจริงจาก backend เช่น "กำลังส่งอยู่" ขึ้นหน้า แทนข้อความกลาง
          this.plansError = apiErrorMessage(error, 'ลบใบงานไม่สำเร็จ กรุณาลองใหม่');
        },
      });
  }

  /** jobs สำหรับแผนที่ถนนจริง (null = วาดเส้นตรงแบบเดิม) */
  mapJobs(): DeliveryRouteModel[] | null {
    return this.candidateBackend()?.jobs ?? this.backendPlan?.jobs ?? null;
  }

  /** ชื่อไรเดอร์ตามลำดับใบงาน — ส่งให้แผนที่ถนนใช้ป้ายเดียวกับการ์ด (R01 · name) */
  mapRiderNames(): string[] {
    const plan = this.candidate() ?? this.store.plan();
    return plan ? plan.routes.map((route) => route.rider.name) : [];
  }

  /** ป้ายที่มาของเส้นทาง (null = โหมดคำนวณในเครื่อง) */
  routingNote(): string | null {
    const plan = this.candidateBackend() ?? this.backendPlan;
    return plan ? routingSourceLabel(plan) : null;
  }

  // คำนวณแผนได้หรือไม่: มีออเดอร์ค้าง และไม่ได้กำลังคำนวณ/ยืนยันอยู่
  canCalculate(): boolean {
    const orders = this.store
      .pendingOrders()
      .filter(
        (order) =>
          !this.selectedOrderIds.length || this.selectedOrderIds.includes(Number(order.id)),
      );
    return (
      orders.length > 0 &&
      orders.every((order) => {
        const customer = this.store.customerFor(order);
        return (
          customer &&
          Number.isFinite(customer.lat) &&
          Number.isFinite(customer.lng) &&
          Number.isInteger(order.boxes) &&
          order.boxes >= 1 &&
          order.boxes <= 3
        );
      })
    );
  }
  // ขอให้ backend สร้างแผนใหม่จากออเดอร์ที่เลือกและช่วงเวลาที่ตั้งไว้
  calculate(): void {
    if (!this.canCalculate() || this.calculating) return;
    this.plansError = null;
    this.selectedRoute = null;
    // โหมด backend: ยิง /route-plans/generate แล้วแปลงเป็น RoutePlan ตัวเดิม
    // API ล้มเหลวต้องแจ้งผู้ใช้ ไม่คำนวณแผนคนละเงื่อนไขในเครื่องแทน
    if (this.store.usingBackend() && this.routePlans) {
      this.calculating = true;
      this.routePlans
        .generate(todayLocal(), this.roundWindow())
        .pipe(
          timeout(30000),
          this.currentSession(),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.calculating = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (backend) => {
            this.adoptBackend(backend);
            this.loadSavedPlans();
          },
          error: (error) => {
            this.calculating = false;
            if ([400, 409, 422].includes(error?.status)) {
              this.plansError =
                error.status === 400
                  ? 'ตรวจสอบเวลาและออเดอร์ที่เลือกในรอบนี้'
                  : error.status === 409
                    ? 'ข้อมูลเปลี่ยนแล้ว กรุณารีเฟรชและคำนวณใหม่'
                    : 'จำนวนไรเดอร์พร้อมไม่พอหรือส่งไม่ทันเวลา ลองลดออเดอร์ในรอบนี้';
              return;
            }
            this.plansError = 'คำนวณไม่สำเร็จหรือหมดเวลารอ กรุณารีเฟรชรายการแผนก่อนลองใหม่';
          },
        });
      return;
    }
    this.plansError = 'ยังเชื่อมต่อระบบจัดส่งไม่ได้ กรุณารีเฟรชและลองใหม่';
  }
  // รับแผนจาก backend มาเก็บไว้: แปลงเป็นรูปของหน้าแอป และตั้งเวลาเริ่ม/เส้นตายตามแผน
  private adoptBackend(backend: RoutePlanModel): void {
    this.roundStart = (backend.startTime ?? backend.shop?.deliveryStartTime ?? '').slice(0, 5);
    this.roundDeadline = (backend.deliveryDeadline ?? backend.shop?.deliveryDeadline ?? '').slice(
      0,
      5,
    );
    const plan = adaptBackendPlan(backend, this.store.riders(), {
      deadlineTime: this.deadlineLabel(),
    });
    this.backendPlan = backend;
    this.candidateBackend.set(null);
    this.acknowledgeLate = false;
    this.lateOverride = false;
    this.selectedRoute = null;
    this.store.choosePlan(plan);
    if (backend.status === 'SELECTED') this.store.confirmedPlan.set(plan);
    this.reviewing = false;
    this.calculating = false;
  }
  // ขอให้ backend คำนวณแผนใหม่เพื่อเปรียบเทียบกับแผนเดิม (ยังไม่แทนที่จนกว่าจะเลือก)
  compare(): void {
    if (this.candidate() || this.calculating) return;
    this.plansError = null;
    if (this.store.usingBackend() && this.routePlans && this.backendPlanId !== null) {
      this.calculating = true;
      this.routePlans
        .recalculate(todayLocal(), { ...this.roundWindow(), basePlanId: this.backendPlanId })
        .pipe(
          timeout(30000),
          this.currentSession(),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.calculating = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (backend) => {
            this.calculating = false;
            this.acknowledgeCandidate = false;
            this.candidateBackend.set(backend);
            this.selectedRoute = null;
            this.loadSavedPlans();
          },
          error: (error) => {
            this.calculating = false;
            if ([400, 409, 422].includes(error?.status)) {
              this.plansError =
                error.status === 400
                  ? 'ตรวจสอบเวลาและออเดอร์ที่เลือกในรอบนี้'
                  : error.status === 409
                    ? 'ข้อมูลเปลี่ยนแล้ว กรุณารีเฟรชและคำนวณใหม่'
                    : 'การค้นหารอบนี้ไม่พบแผนทางเลือกที่ต่างและผ่านเงื่อนไข ใช้แผนเดิมหรือปรับรอบ';
              return;
            }
            this.plansError =
              'ค้นหาแผนทางเลือกไม่สำเร็จหรือหมดเวลารอ กรุณารีเฟรชรายการแผนก่อนลองใหม่';
          },
        });
      return;
    }
    this.plansError = 'กรุณาเปิดแผนร่างจากระบบก่อนค้นหาแผนทางเลือก';
  }
  // ทิ้งแผนที่คำนวณมาเปรียบเทียบ (ไม่เลือก)
  discardCandidate(): void {
    const id = this.candidateBackend()?.routePlanId;
    if (id != null && this.routePlans) {
      if (this.discardingCandidate) return;
      this.discardingCandidate = true;
      this.routePlans
        .delete(id)
        .pipe(
          timeout(15000),
          this.currentSession(),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.cdr.markForCheck()),
        )
        .subscribe({
          next: () => {
            this.clearCandidate();
            this.discardingCandidate = false;
            this.loadSavedPlans();
          },
          error: () => {
            this.discardingCandidate = false;
            this.plansError = 'ลบแผนใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง';
          },
        });
      return;
    }
    this.clearCandidate();
  }
  // ล้างแผนเปรียบเทียบและสถานะการรับทราบทั้งหมด
  private clearCandidate(): void {
    this.candidateBackend.set(null);
    this.acknowledgeCandidate = false;
  }
  // เลื่อนหน้าจอไปโฟกัสที่กล่องแผนเปรียบเทียบ
  focusCandidate(): void {
    this.candidateBox?.nativeElement.focus();
    this.candidateBox?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  // เลือกแผนเปรียบเทียบให้เป็นแผนปัจจุบัน
  chooseCandidate(): void {
    const candidate = this.candidate();
    const backend = this.candidateBackend();
    if (!candidate || !backend) return;
    if (!candidate.deadlineSafe && !this.acknowledgeCandidate) {
      this.ackCandidateBox?.nativeElement.focus();
      return;
    }
    this.adoptBackend(backend);
    this.lateOverride = !candidate.deadlineSafe;
    this.acknowledgeCandidate = false;
    this.ackError = false;
  }
  // เริ่มโหมดตรวจแผนก่อนยืนยัน
  startReview(): void {
    this.acknowledgeLate = false;
    this.ackError = false;
    this.reviewing = true;
  }
  // ยืนยันแผนปัจจุบัน: ถ้าแผนส่งเกินเส้นตายต้องติ๊ก รับทราบก่อน แล้วส่งให้ backend บันทึกการเลือก
  confirm(): void {
    const plan = this.store.plan();
    if (!this.reviewing || !plan || this.confirmingPlan) return;
    if (
      this.backendPlanId === null ||
      !this.routePlans ||
      this.backendPlan?.status !== 'GENERATED'
    ) {
      this.plansError =
        'แผนในเครื่องใช้ดูตัวอย่างเท่านั้น กรุณาคำนวณและบันทึกแผนผ่านระบบก่อนออกใบงาน';
      return;
    }
    // แผนที่ส่งเกินเส้นตายต้องติ๊ก ack ก่อน — ไม่ใช่ปุ่มทึบ แต่พาโฟกัสไปที่ checkbox
    if (!plan.deadlineSafe && !this.acknowledgeLate) {
      this.ackError = true;
      this.ackLateBox?.nativeElement.focus();
      return;
    }
    const wasLate = !plan.deadlineSafe;
    // ปิดท้ายการยืนยันแผน: เก็บแผนที่ยืนยันแล้ว ปิดโหมดตรวจ และล้างสถานะรับทราบ
    const finish = () => {
      this.store.confirmPlan();
      this.reviewing = false;
      this.lateOverride = wasLate;
      this.acknowledgeLate = false;
    };
    if (this.backendPlanId != null && this.routePlans) {
      const assignments = this.backendPlan.jobs?.map((job) => ({
        jobId: job.jobId!,
        riderId: job.riderId!,
      }));
      if (
        assignments &&
        (assignments.some((a) => !Number.isSafeInteger(a.riderId) || a.riderId < 1) ||
          new Set(assignments.map((a) => a.riderId)).size !== assignments.length)
      ) {
        this.plansError = 'เลือกไรเดอร์พร้อมงานให้ครบทุกเส้นทาง โดยไม่เลือกคนซ้ำ';
        return;
      }
      this.confirmingPlan = true;
      this.routePlans
        .select(this.backendPlanId, assignments)
        .pipe(
          timeout(15000),
          this.currentSession(),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.confirmingPlan = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (backend) => {
            this.adoptBackend(backend);
            finish();
            this.store.refresh();
            this.loadSavedPlans();
          },
          error: () => {
            this.plansError = 'ยืนยันใบงานไม่สำเร็จ กรุณาตรวจสอบไรเดอร์และลองใหม่';
          },
        });
      return;
    }
  }
  // เวลานานที่สุดในทุกคันของแผน (นาที)
  longestMinutes(plan: RoutePlan): number {
    return Math.max(0, ...plan.routes.map((route) => route.durationMinutes));
  }
  // จำนวนจุดส่งรวมของทุกคันในแผน
  totalStops(plan: RoutePlan): number {
    return plan.routes.reduce((total, route) => total + route.stops.length, 0);
  }
  // แปลงเวลา "HH:MM" -> จำนวนนาทีตั้งแต่เที่ยงคืน
  private timeMinutes(value: string): number {
    const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
    return hours * 60 + minutes;
  }
  // เวลาเริ่มส่งของแผน (นาทีตั้งแต่เที่ยงคืน) จากแผนหรือค่าตั้งร้าน
  private startMinutes(): number {
    return this.timeMinutes(
      this.store.plan()?.startTime ??
        this.store.plan()?.shop?.deliveryStartTime ??
        this.store.settings()?.deliveryStartTime ??
        '11:30',
    );
  }
  // เส้นตายส่งของ (นาทีตั้งแต่เที่ยงคืน) จากแผนหรือค่าตั้งร้าน
  private deadlineMinutes(): number {
    return this.timeMinutes(this.deadlineLabel());
  }
  // เส้นตายส่งของที่จะแสดง (HH:MM) จากแผนหรือค่าตั้งร้าน
  deadlineLabel(): string {
    return (
      this.store.plan()?.deliveryDeadline ??
      this.store.plan()?.shop?.deliveryDeadline ??
      this.store.settings()?.deliveryDeadline ??
      '12:30'
    ).slice(0, 5);
  }
  // เวลาจบโดยประมาณของแผน: ใช้ค่าจาก backend ถ้ามี ไม่งั้นเริ่ม+เวลานานที่สุด
  finishTime(plan: RoutePlan): string {
    return plan.estimatedFinishTime || this.finishTimeForRoute(this.longestMinutes(plan));
  }
  // เวลาที่เหลือก่อนเส้นตายของแผน (นาที, ติดลบ = เกินเส้นตาย)
  marginMinutes(plan: RoutePlan): number {
    return this.deadlineMinutes() - this.startMinutes() - this.longestMinutes(plan);
  }
  // เวลาจบของเส้นทางหนึ่งคัน: เวลาเริ่ม + ระยะเวลาของคันนั้น -> HH:MM
  finishTimeForRoute(durationMinutes: number): string {
    const minutes = this.startMinutes() + durationMinutes;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  // เวลาจบของคันนี้: ใช้ค่าจาก backend ถ้ามี ไม่งั้นคำนวณจากเวลาเริ่ม+ระยะเวลา
  routeFinishTime(route: RiderRoute): string {
    return route.estimatedFinishTime || this.finishTimeForRoute(route.durationMinutes);
  }
  /** คันนี้คาดว่าถึงจุดสุดท้ายเกินเวลาส่งของร้านหรือไม่ */
  isLate(route: RiderRoute): boolean {
    return this.startMinutes() + route.durationMinutes > this.deadlineMinutes();
  }
  /** เกินเส้นตายไปกี่นาที (เรียกเมื่อ isLate เท่านั้น) */
  lateMinutes(route: RiderRoute): number {
    return Math.max(0, this.startMinutes() + route.durationMinutes - this.deadlineMinutes());
  }
  // ความจุรวมของแผน: จำนวนคัน x ออเดอร์สูงสุดต่อคัน
  capacity(plan: RoutePlan): number {
    return (
      plan.routes.length *
      (plan.shop?.maxOrdersPerRider ?? this.store.settings()?.maxOrdersPerRider ?? 3)
    );
  }
  // เปอร์เซ็นต์ความจุที่ใช้ไปของแผน (สูงสุด 100)
  capacityPercent(plan: RoutePlan): number {
    return this.capacity(plan)
      ? Math.min(100, (this.totalStops(plan) / this.capacity(plan)) * 100)
      : 0;
  }
  // ข้อมูลร้านที่จะแสดงบนแผนที่: แผนเปรียบเทียบ > แผนปัจจุบัน > ค่าตั้งร้าน
  mapShop() {
    return this.candidateBackend()?.shop ?? this.store.plan()?.shop ?? this.store.settings();
  }
  // เวลาเริ่มที่จะแสดงบนแผนที่ (HH:MM)
  mapStart(): string {
    return (
      this.candidateBackend()?.startTime ??
      this.backendPlan?.startTime ??
      this.mapShop()?.deliveryStartTime ??
      ''
    ).slice(0, 5);
  }
  // ค่าเรียกไรเดอร์รวมของแผน: จำนวนคัน x ค่าเรียกต่อคัน
  callFee(plan: RoutePlan): number {
    return (
      plan.routes.length * (plan.shop?.riderBaseCost ?? this.store.settings()?.riderBaseCost ?? 15)
    );
  }
  // ค่าตามระยะทางของแผน: ค่าส่งรวม - ค่าเรียกไรเดอร์ (ปัด 2 ตำแหน่ง)
  distanceFee(plan: RoutePlan): number {
    return Math.round((plan.deliveryCost - this.callFee(plan)) * 100) / 100;
  }
}
