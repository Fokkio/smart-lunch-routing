import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { todayLocal } from '../../core/backend-api.service';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { DeliveryRouteModel, RouteStopModel } from '../../core/route-plan.models';
import { RoutePlanMapComponent } from '../../shared/route-plan-map.component';

type Stage = 'entry' | 'summary' | 'delivery' | 'completed';

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule, RoutePlanMapComponent],
  templateUrl: './rider.component.html',
})
export class RiderComponent {
  private readonly api = inject(RoutePlanApiService);
  jobCode = '';
  activeRoute: DeliveryRouteModel | null = null;
  mapJobs: DeliveryRouteModel[] = [];
  activePlanId: number | null = null;
  stage: Stage = 'entry';
  stopIndex = 0;
  errorMessage = '';
  confirmingStop = false;
  loading = false;
  savingStop = false;

  get currentStop(): RouteStopModel | null { return this.activeRoute?.stops[this.stopIndex] ?? null; }

  openJob(): void {
    const code = this.jobCode.trim().toUpperCase();
    if (!code || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    // ดึงเฉพาะแผนของวันนี้เพื่อเลี่ยง N+1 กับแผนเก่า (backend รองรับ ?date=)
    const today = todayLocal();
    this.api.list(today).pipe(
      switchMap(plans => {
        const selected = plans.filter(plan => plan.status === 'SELECTED' && plan.routePlanId !== undefined);
        return selected.length ? forkJoin(selected.map(plan =>
          this.api.get(plan.routePlanId!).pipe(map(full => ({ planId: plan.routePlanId!, jobs: full.jobs }))),
        )) : of([]);
      }),
    ).subscribe({
      next: plans => {
        this.loading = false;
        const match = plans.flatMap(plan => plan.jobs.map(job => ({ job, planId: plan.planId })))
          .find(item => item.job.jobCode?.toUpperCase() === code);
        this.activeRoute = match?.job ?? null;
        this.mapJobs = match ? [match.job] : [];
        this.activePlanId = match?.planId ?? null;
        this.errorMessage = this.activeRoute ? '' : 'ไม่พบใบงานที่ยืนยันแล้ว กรุณาตรวจสอบเลขใบงานอีกครั้ง';
        if (this.activeRoute) {
          this.stopIndex = this.activeRoute.stops.findIndex(stop => stop.deliveryStatus !== 'DELIVERED');
          if (this.stopIndex < 0) this.stopIndex = this.activeRoute.stops.length;
          this.stage = this.stopIndex === this.activeRoute.stops.length ? 'completed' : 'summary';
          this.confirmingStop = false;
        }
      },
      error: () => { this.loading = false; this.errorMessage = 'โหลดใบงานไม่สำเร็จ กรุณาลองใหม่'; },
    });
  }

  useCode(code: string): void { this.jobCode = code; this.openJob(); }
  begin(): void { if (this.currentStop) { this.confirmingStop = false; this.stage = 'delivery'; } }
  backToSummary(): void { this.confirmingStop = false; this.stage = 'summary'; }
  completeStop(): void {
    const stop = this.currentStop;
    if (!this.activeRoute || this.activePlanId === null || this.activeRoute.jobId === undefined ||
        !stop || this.stage !== 'delivery' || !this.confirmingStop || this.savingStop) return;
    const route = this.activeRoute;
    this.savingStop = true;
    this.errorMessage = '';
    this.api.deliverStop(this.activePlanId, this.activeRoute.jobId, stop.orderId).subscribe({
      next: () => {
        this.savingStop = false;
        if (this.activeRoute !== route) return;
        stop.deliveryStatus = 'DELIVERED';
        this.confirmingStop = false;
        this.stopIndex++;
        if (this.stopIndex >= route.stops.length) this.stage = 'completed';
      },
      error: () => {
        this.savingStop = false;
        this.errorMessage = 'บันทึกสถานะส่งไม่สำเร็จ กรุณาลองใหม่';
      },
    });
  }
  closeJob(): void { this.stage = 'entry'; this.activeRoute = null; this.mapJobs = []; this.activePlanId = null; this.jobCode = ''; this.errorMessage = ''; this.stopIndex = 0; this.confirmingStop = false; }
  navigateTo(stop: RouteStopModel): string {
    const params = new URLSearchParams({ api: '1', destination: `${stop.latitude},${stop.longitude}`, travelmode: 'driving' });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
}
