import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { DeliveryRouteModel, RouteStopModel } from '../../core/route-plan.models';

type Stage = 'entry' | 'summary' | 'delivery' | 'completed';

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rider.component.html',
})
export class RiderComponent {
  private readonly api = inject(RoutePlanApiService);
  jobCode = '';
  activeRoute: DeliveryRouteModel | null = null;
  stage: Stage = 'entry';
  stopIndex = 0;
  errorMessage = '';
  confirmingStop = false;
  loading = false;

  get currentStop(): RouteStopModel | null { return this.activeRoute?.stops[this.stopIndex] ?? null; }

  openJob(): void {
    const code = this.jobCode.trim().toUpperCase();
    if (!code || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    // ดึงเฉพาะแผนของวันนี้เพื่อเลี่ยง N+1 กับแผนเก่า (backend รองรับ ?date=)
    const today = new Date().toLocaleDateString('en-CA');
    this.api.list(today).pipe(
      switchMap(plans => {
        const selected = plans.filter(plan => plan.status === 'SELECTED' && plan.routePlanId !== undefined);
        return selected.length ? forkJoin(selected.map(plan => this.api.get(plan.routePlanId!))) : of([]);
      }),
    ).subscribe({
      next: plans => {
        this.loading = false;
        this.activeRoute = plans.flatMap(plan => plan.jobs).find(job => job.jobCode?.toUpperCase() === code) ?? null;
        this.errorMessage = this.activeRoute ? '' : 'ไม่พบใบงานที่ยืนยันแล้ว กรุณาตรวจสอบเลขใบงานอีกครั้ง';
        if (this.activeRoute) { this.stage = 'summary'; this.stopIndex = 0; this.confirmingStop = false; }
      },
      error: () => { this.loading = false; this.errorMessage = 'โหลดใบงานไม่สำเร็จ กรุณาลองใหม่'; },
    });
  }

  useCode(code: string): void { this.jobCode = code; this.openJob(); }
  begin(): void { if (this.activeRoute?.stops.length) { this.confirmingStop = false; this.stage = 'delivery'; } }
  backToSummary(): void { this.confirmingStop = false; this.stage = 'summary'; }
  completeStop(): void {
    if (!this.activeRoute || this.stage !== 'delivery' || !this.confirmingStop) return;
    this.confirmingStop = false;
    this.stopIndex++;
    if (this.stopIndex >= this.activeRoute.stops.length) this.stage = 'completed';
  }
  closeJob(): void { this.stage = 'entry'; this.activeRoute = null; this.jobCode = ''; this.errorMessage = ''; this.stopIndex = 0; this.confirmingStop = false; }
  navigateTo(stop: RouteStopModel): string {
    const params = new URLSearchParams({ api: '1', destination: `${stop.latitude},${stop.longitude}`, travelmode: 'driving' });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
}
