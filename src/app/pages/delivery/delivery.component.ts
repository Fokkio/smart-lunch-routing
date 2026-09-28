import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeliveryService } from '../../core/delivery.service';
import { RoutePlan } from '../../core/models';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, DeliveryMapComponent],
  templateUrl: './delivery.component.html',
})
export class DeliveryComponent {
  readonly store = inject(DeliveryService);
  readonly Math = Math;
  readonly String = String;
  candidate: RoutePlan | null = null;
  calculating = false;
  reviewing = false;

  canCalculate(): boolean {
    const orders = this.store.pendingOrders();
    return orders.length > 0 && orders.every(order => {
      const customer = this.store.customerFor(order);
      return customer && Number.isFinite(customer.lat) && Number.isFinite(customer.lng) && Number.isInteger(order.boxes) && order.boxes >= 1 && order.boxes <= 3;
    });
  }
  calculate(): void { if (!this.canCalculate()) return; this.calculating = true; setTimeout(() => { this.store.calculateRoutes(); this.reviewing = false; this.calculating = false; }, 450); }
  compare(): void { this.candidate = this.store.previewRoutes((this.store.plan()?.version || 1) + 1); }
  chooseCandidate(): void { if (!this.candidate) return; this.store.choosePlan(this.candidate); this.candidate = null; this.reviewing = false; }
  confirm(): void { if (!this.reviewing || !this.store.plan()) return; this.store.confirmPlan(); this.reviewing = false; }
  longestMinutes(plan: RoutePlan): number { return Math.max(0, ...plan.routes.map(route => route.durationMinutes)); }
  finishTime(plan: RoutePlan): string { const minutes = 11 * 60 + 30 + this.longestMinutes(plan); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  marginMinutes(plan: RoutePlan): number { return 60 - this.longestMinutes(plan); }
  finishTimeForRoute(durationMinutes: number): string { const minutes = 11 * 60 + 30 + durationMinutes; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  capacityPercent(routeCount: number): number { return routeCount ? Math.min(100, this.store.pendingOrders().length / (routeCount * 3) * 100) : 0; }
  callFee(plan: RoutePlan): number { return plan.routes.length * 15; }
  distanceFee(plan: RoutePlan): number { return Math.round((plan.deliveryCost - this.callFee(plan)) * 100) / 100; }
}
