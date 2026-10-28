// ไฟล์นี้: หน้าใบงานของไรเดอร์ — ดูงานวันนี้ รับทราบ เริ่มงาน ส่งทีละจุด นำทางด้วย Google Maps และติดตาม GPS

import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, fromEvent, timer, timeout } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { todayLocal } from '../../core/dates';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { AuthService } from '../../core/auth.service';
import { SHOP } from '../../core/models';
import { DeliveryRouteModel, RouteStopModel, RiderJobModel } from '../../core/route-plan.models';
import { RoutePlanMapComponent } from '../../shared/route-plan-map.component';

type Stage = 'entry' | 'summary' | 'delivery' | 'completed';

// หน้าใบงานไรเดอร์: โหลดงานของตัวเอง, เลือกงาน, กดรับทราบ/เริ่มงาน/ส่งทีละจุด, และเปลี่ยนรหัสผ่าน
@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule, RoutePlanMapComponent],
  templateUrl: './rider.component.html',
})
export class RiderComponent implements OnInit, OnDestroy {
  private readonly api = inject(RoutePlanApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  newJobsMessage = '';
  updatingJob = false;
  private loadedJobs = false;
  // จำนวนงานใหม่ที่ยังไม่รับทราบและยังไม่จบ/ยกเลิก
  get unreadJobs(): number {
    return this.jobs.filter(
      (item) =>
        !item.job.acknowledgedAt && !['COMPLETED', 'CANCELLED'].includes(item.job.status ?? ''),
    ).length;
  }
  readonly shopPoint = signal<[number, number]>([SHOP.lat, SHOP.lng]);
  shopName = 'ร้าน';
  mapStart = '';
  jobs: RiderJobModel[] = [];
  jobQuery = '';
  // งานที่จะแสดง: ตัดงานที่ยกเลิกออก และกรองตามรหัสงานที่ค้นหา
  filteredJobs() {
    const query = this.jobQuery.trim().toLowerCase();
    return this.jobs.filter(
      (item) =>
        item.job.status !== 'CANCELLED' && (item.job.jobCode ?? '').toLowerCase().includes(query),
    );
  }
  deliveryDeadline = '';
  activeRoute: DeliveryRouteModel | null = null;
  mapJobs: DeliveryRouteModel[] = [];
  activePlanId: number | null = null;
  stage: Stage = 'entry';
  stopIndex = 0;
  errorMessage = '';
  confirmingStop = false;
  loading = false;
  savingStop = false;
  currentPassword = '';
  newPassword = '';
  passwordMessage = '';
  changingPassword = false;

  readonly riderLocation = signal<[number, number] | null>(null);
  readonly gpsStatus = signal<'inactive' | 'tracking' | 'error' | 'denied'>('inactive');
  readonly gpsErrorMessage = signal<string>('');
  private watchId: number | null = null;

  // จุดส่งปัจจุบันของงานที่เปิดอยู่ (ตามลำดับที่กำลังส่ง)
  get currentStop(): RouteStopModel | null {
    return this.activeRoute?.stops[this.stopIndex] ?? null;
  }

  // ลิงก์ Google Maps นำทางไปจุดส่งปัจจุบัน (ใช้ GPS สดเป็นจุดเริ่มถ้ามี)
  get navigationUrl(): string | null {
    const stop = this.currentStop;
    if (
      !stop ||
      !Number.isFinite(stop.latitude) ||
      !Number.isFinite(stop.longitude) ||
      Math.abs(stop.latitude) > 90 ||
      Math.abs(stop.longitude) > 180
    )
      return null;
    const params = new URLSearchParams({
      api: '1',
      destination: `${stop.latitude},${stop.longitude}`,
      travelmode: 'driving',
      dir_action: 'navigate',
    });
    // แนบ origin จาก GPS สดเมื่อมีตำแหน่ง — Google Maps เริ่มคำนวณเส้นทางจากจุดที่ไรเดอร์ยืนอยู่ทันที
    const location = this.riderLocation();
    if (location && Number.isFinite(location[0]) && Number.isFinite(location[1])) {
      params.set('origin', `${location[0].toFixed(6)},${location[1].toFixed(6)}`);
    }
    return `https://www.google.com/maps/dir/?${params}`;
  }

  // ตอนเปิดหน้า: โหลดงาน แล้วตั้ง polling ทุก 20 วินาทีและตอนกลับมาหน้านี้เพื่อเช็กงานใหม่
  ngOnInit(): void {
    this.loadJobs();
    // ponytail: polling suits this small dispatch app; use server push if measured traffic requires it.
    timer(20000, 20000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'visible' && this.stage === 'entry') this.loadJobs(true);
      });
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'visible' && this.stage === 'entry') this.loadJobs(true);
      });
  }

  // โหลดใบงานของตัวเองในวันนี้จาก backend (โหมดเบื้องหลังไม่ล้างข้อความเตือนเดิม)
  loadJobs(background = false): void {
    if (this.loading) return;
    this.loading = true;
    if (!background) this.errorMessage = '';
    const token = this.auth.token();
    this.api
      .myJobs(todayLocal())
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          if (token !== this.auth.token()) return;
          this.loading = false;
          if (this.stage === 'entry') this.errorMessage = '';
          const previous = new Set(this.jobs.map((item) => item.job.jobId));
          const added = jobs.filter(
            (item) => !previous.has(item.job.jobId) && item.job.status !== 'COMPLETED',
          ).length;
          if (this.loadedJobs && added)
            this.newJobsMessage = `มีงานใหม่ ${added} ใบ กรุณาตรวจและรับทราบงาน`;
          this.loadedJobs = true;
          this.jobs = jobs;
          if (jobs[0]) {
            this.shopPoint.set([jobs[0].shop.latitude, jobs[0].shop.longitude]);
            this.deliveryDeadline = jobs[0].shop.deliveryDeadline;
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'โหลดงานของคุณไม่สำเร็จ กรุณาลองใหม่';
          this.cdr.markForCheck();
        },
      });
  }

  // เลือกใบงานมาเปิดดู: ตั้งจุดส่งที่ยังไม่ส่งจุดแรกเป็นจุดปัจจุบัน และเริ่มติดตาม GPS ถ้ายังไม่ส่งครบ
  selectJob(item: RiderJobModel): void {
    if (item.job.status === 'CANCELLED') return;
    this.newJobsMessage = '';
    this.errorMessage = '';
    this.shopPoint.set([item.shop.latitude, item.shop.longitude]);
    this.deliveryDeadline = item.shop.deliveryDeadline;
    this.shopName = item.shop.shopName ?? 'ร้าน';
    this.mapStart = (item.job.estimatedStartTime ?? item.shop.deliveryStartTime ?? '').slice(0, 5);
    this.activeRoute = item.job;
    this.mapJobs = [item.job];
    this.activePlanId = item.planId;
    this.stopIndex = item.job.stops.findIndex((stop) => stop.deliveryStatus !== 'DELIVERED');
    if (this.stopIndex < 0) this.stopIndex = item.job.stops.length;
    this.stage =
      this.stopIndex === item.job.stops.length
        ? 'completed'
        : item.job.status === 'DELIVERING'
          ? 'delivery'
          : 'summary';
    this.confirmingStop = false;
    if (this.stage !== 'completed') {
      this.startGpsTracking();
    }
    this.cdr.markForCheck();
  }
  // รับทราบใบงานที่เลือก -> แจ้ง backend ว่าไรเดอร์เห็นงานแล้ว
  acknowledge(): void {
    const route = this.activeRoute;
    if (!route || route.jobId === undefined || this.updatingJob || route.acknowledgedAt) return;
    this.updatingJob = true;
    this.errorMessage = '';
    this.api
      .acknowledgeMyJob(route.jobId)
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.updatingJob = false;
          if (this.activeRoute !== route) return;
          route.acknowledgedAt = new Date().toISOString();
          this.cdr.markForCheck();
        },
        error: () => {
          this.updatingJob = false;
          this.errorMessage = 'รับทราบงานไม่สำเร็จ กรุณารีเฟรชงานและลองใหม่';
          this.cdr.markForCheck();
        },
      });
  }
  // เริ่มใบงานที่เลือก -> แจ้ง backend ว่าเริ่มส่งแล้ว
  begin(): void {
    const route = this.activeRoute;
    if (!this.currentStop || !route || route.jobId === undefined || this.updatingJob) return;
    if (!route.acknowledgedAt) {
      this.errorMessage = 'กรุณารับทราบงานก่อนเริ่มส่ง';
      return;
    }
    this.updatingJob = true;
    this.errorMessage = '';
    this.api
      .startMyJob(route.jobId)
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.updatingJob = false;
          if (this.activeRoute !== route) return;
          route.status = 'DELIVERING';
          this.confirmingStop = false;
          this.stage = 'delivery';
          this.startGpsTracking();
          this.cdr.markForCheck();
        },
        error: () => {
          this.updatingJob = false;
          this.errorMessage = 'เริ่มงานไม่สำเร็จ กรุณารีเฟรชงานและลองใหม่';
          this.cdr.markForCheck();
        },
      });
  }
  // กลับไปหน้ารวมของใบงานที่เลือก (ออกจากโหมดส่งทีละจุด)
  backToSummary(): void {
    this.confirmingStop = false;
    this.stage = 'summary';
  }
  // ยืนยันว่าส่งจุดปัจจุบันแล้ว -> แจ้ง backend แล้วเลื่อนไปจุดถัดไป
  completeStop(): void {
    const stop = this.currentStop;
    if (
      !this.activeRoute ||
      this.activePlanId === null ||
      this.activeRoute.jobId === undefined ||
      !stop ||
      this.stage !== 'delivery' ||
      !this.confirmingStop ||
      this.savingStop
    )
      return;
    const route = this.activeRoute;
    this.savingStop = true;
    this.errorMessage = '';
    this.api
      .deliverMyStop(this.activeRoute.jobId, stop.orderId)
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingStop = false;
          if (this.activeRoute !== route) return;
          stop.deliveryStatus = 'DELIVERED';
          this.confirmingStop = false;
          this.stopIndex++;
          if (this.stopIndex >= route.stops.length) {
            this.stage = 'completed';
            route.status = 'COMPLETED';
            this.stopGpsTracking();
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.savingStop = false;
          this.errorMessage = apiErrorMessage(
            error,
            'บันทึกสถานะส่งไม่สำเร็จ กรุณารีเฟรชงานก่อนลองใหม่',
          );
          this.cdr.markForCheck();
        },
      });
  }
  // ปิดงานที่เปิดอยู่ หยุด GPS และกลับไปหน้ารายการงาน พร้อมโหลดงานใหม่
  closeJob(): void {
    this.stopGpsTracking();
    this.stage = 'entry';
    this.activeRoute = null;
    this.mapJobs = [];
    this.activePlanId = null;
    this.errorMessage = '';
    this.stopIndex = 0;
    this.confirmingStop = false;
    this.loadJobs();
  }

  // ตอนออกจากหน้า: หยุดติดตาม GPS
  ngOnDestroy(): void {
    this.stopGpsTracking();
  }

  // เริ่มติดตามตำแหน่ง GPS ของเครื่องนี้ เพื่อแสดงบนแผนที่และใช้เป็นจุดเริ่มนำทาง
  startGpsTracking(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.gpsStatus.set('error');
      this.gpsErrorMessage.set('อุปกรณ์นี้ไม่รองรับระบบ GPS');
      return;
    }
    if (this.watchId !== null) return;
    this.gpsStatus.set('tracking');
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.riderLocation.set([pos.coords.latitude, pos.coords.longitude]);
        this.gpsStatus.set('tracking');
        this.gpsErrorMessage.set('');
        this.cdr.markForCheck();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          this.gpsStatus.set('denied');
          this.gpsErrorMessage.set('กรุณาเปิดสิทธิ์เข้าถึงพิกัด GPS เพื่อติดตามตำแหน่งสดบนแผนที่');
        } else {
          this.gpsStatus.set('error');
          this.gpsErrorMessage.set('ไม่สามารถรับสัญญาณ GPS ได้ในขณะนี้');
        }
        this.cdr.markForCheck();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 12000,
      },
    );
  }

  // หยุดติดตามตำแหน่ง GPS
  stopGpsTracking(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.gpsStatus.set('inactive');
    this.riderLocation.set(null);
  }
  // ออกจากระบบของไรเดอร์ แล้วพากลับไปหน้า login ไรเดอร์
  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login/rider');
  }
  // เปลี่ยนรหัสผ่านของตัวเอง: ส่งรหัสเดิมกับรหัสใหม่ไป backend แล้วออกจากระบบให้ login ใหม่
  changePassword(): void {
    if (this.changingPassword || this.newPassword.length < 12 || !this.currentPassword) return;
    this.changingPassword = true;
    this.passwordMessage = '';
    this.auth
      .changePassword(this.currentPassword, this.newPassword)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.changingPassword = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.currentPassword = '';
          this.newPassword = '';
          this.changingPassword = false;
          this.logout();
        },
        error: (error) => {
          this.currentPassword = '';
          this.newPassword = '';
          this.passwordMessage = apiErrorMessage(
            error,
            'เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจสอบรหัสเดิมและรหัสใหม่',
          );
        },
      });
  }
}
