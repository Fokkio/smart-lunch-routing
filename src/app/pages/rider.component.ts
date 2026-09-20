import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryService } from '../core/delivery.service';
import { RiderRoute, RouteStop } from '../core/models';

type Stage = 'entry' | 'summary' | 'delivery' | 'completed';

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rider.component.html',
  styleUrl: './rider.component.scss',
})
export class RiderComponent {
  readonly store = inject(DeliveryService);
  jobCode = '';
  activeRoute: RiderRoute | null = null;
  stage: Stage = 'entry';
  stopIndex = 0;
  errorMessage = '';

  get currentStop(): RouteStop | null { return this.activeRoute?.stops[this.stopIndex] ?? null; }

  openJob(): void {
    if (!this.store.plan()) { this.errorMessage = 'ยังไม่มีใบงาน กรุณาให้เจ้าของร้านจัดเส้นทางก่อน'; return; }
    this.activeRoute = this.store.routeForJobCode(this.jobCode);
    this.errorMessage = this.activeRoute ? '' : 'ไม่พบใบงานนี้ กรุณาตรวจสอบเลขใบงานอีกครั้ง';
    if (this.activeRoute) { this.stage = 'summary'; this.stopIndex = 0; }
  }

  useCode(code: string): void { this.jobCode = code; this.openJob(); }
  begin(): void { if (this.activeRoute?.stops.length) this.stage = 'delivery'; }
  completeStop(): void {
    if (!this.activeRoute || this.stage !== 'delivery') return;
    this.stopIndex++;
    if (this.stopIndex >= this.activeRoute.stops.length) this.stage = 'completed';
  }
  closeJob(): void { this.stage = 'entry'; this.activeRoute = null; this.jobCode = ''; this.errorMessage = ''; this.stopIndex = 0; }
  navigateTo(stop: RouteStop): string {
    const params = new URLSearchParams({ api: '1', destination: `${stop.customer.lat},${stop.customer.lng}`, travelmode: 'driving' });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
}
