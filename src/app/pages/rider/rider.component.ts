import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { todayLocal } from '../../core/backend-api.service';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { AuthService } from '../../core/auth.service';
import { SHOP } from '../../core/models';
import { DeliveryRouteModel, RouteStopModel } from '../../core/route-plan.models';
import { RoutePlanMapComponent } from '../../shared/route-plan-map.component';

type Stage = 'entry' | 'summary' | 'delivery' | 'completed';

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule, RoutePlanMapComponent],
  templateUrl: './rider.component.html',
})
export class RiderComponent implements OnInit {
  private readonly api = inject(RoutePlanApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly shopPoint = signal<[number, number]>([SHOP.lat, SHOP.lng]);
  jobs: Array<{ planId: number; job: DeliveryRouteModel; shop: { latitude: number; longitude: number; deliveryDeadline: string } }> = [];
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

  get currentStop(): RouteStopModel | null { return this.activeRoute?.stops[this.stopIndex] ?? null; }

  ngOnInit(): void { this.loadJobs(); }

  loadJobs(): void {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.api.myJobs(todayLocal()).subscribe({
      next: jobs => {
        this.loading = false;
        this.jobs = jobs;
        if (jobs[0]) {
          this.shopPoint.set([jobs[0].shop.latitude, jobs[0].shop.longitude]);
          this.deliveryDeadline = jobs[0].shop.deliveryDeadline;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.errorMessage = 'โหลดงานของคุณไม่สำเร็จ กรุณาลองใหม่'; this.cdr.markForCheck(); },
    });
  }

  selectJob(item: { planId: number; job: DeliveryRouteModel; shop: { latitude: number; longitude: number; deliveryDeadline: string } }): void {
    this.activeRoute = item.job;
    this.mapJobs = [item.job];
    this.activePlanId = item.planId;
    this.stopIndex = item.job.stops.findIndex(stop => stop.deliveryStatus !== 'DELIVERED');
    if (this.stopIndex < 0) this.stopIndex = item.job.stops.length;
    this.stage = this.stopIndex === item.job.stops.length ? 'completed' : 'summary';
    this.confirmingStop = false;
    this.cdr.markForCheck();
  }
  begin(): void { if (this.currentStop) { this.confirmingStop = false; this.stage = 'delivery'; } }
  backToSummary(): void { this.confirmingStop = false; this.stage = 'summary'; }
  completeStop(): void {
    const stop = this.currentStop;
    if (!this.activeRoute || this.activePlanId === null || this.activeRoute.jobId === undefined ||
        !stop || this.stage !== 'delivery' || !this.confirmingStop || this.savingStop) return;
    const route = this.activeRoute;
    this.savingStop = true;
    this.errorMessage = '';
    this.api.deliverMyStop(this.activeRoute.jobId, stop.orderId).subscribe({
      next: () => {
        this.savingStop = false;
        if (this.activeRoute !== route) return;
        stop.deliveryStatus = 'DELIVERED';
        this.confirmingStop = false;
        this.stopIndex++;
        if (this.stopIndex >= route.stops.length) this.stage = 'completed';
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingStop = false;
        this.errorMessage = 'บันทึกสถานะส่งไม่สำเร็จ กรุณาลองใหม่';
        this.cdr.markForCheck();
      },
    });
  }
  closeJob(): void { this.stage = 'entry'; this.activeRoute = null; this.mapJobs = []; this.activePlanId = null; this.errorMessage = ''; this.stopIndex = 0; this.confirmingStop = false; this.loadJobs(); }
  logout(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }
  changePassword(): void {
    if (this.changingPassword || this.newPassword.length < 12 || !this.currentPassword) return;
    this.changingPassword = true;
    this.passwordMessage = '';
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => { this.currentPassword = ''; this.newPassword = ''; this.changingPassword = false; this.logout(); },
      error: () => { this.currentPassword = ''; this.newPassword = ''; this.changingPassword = false; this.passwordMessage = 'เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจสอบรหัสเดิมและรหัสใหม่'; this.cdr.markForCheck(); },
    });
  }
}
