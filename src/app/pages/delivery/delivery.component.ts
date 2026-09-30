import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { todayLocal } from '../../core/backend-api.service';
import { DeliveryService } from '../../core/delivery.service';
import { RoutePlan } from '../../core/models';
import { adaptBackendPlan } from '../../core/route-plan-adapter';
import type { RoutePlanModel } from '../../core/route-plan.models';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, DeliveryMapComponent],
  templateUrl: './delivery.component.html',
})
export class DeliveryComponent {
  readonly store = inject(DeliveryService);
  private readonly routePlans = inject(RoutePlanApiService, { optional: true });
  readonly Math = Math;
  readonly String = String;
  candidate: RoutePlan | null = null;
  calculating = false;
  reviewing = false;
  /** id แผนฝั่ง backend (null = ยังไม่เคยคำนวณ/ใช้โหมดคำนวณในเครื่อง) */
  backendPlanId: number | null = null;
  private candidateBackend: RoutePlanModel | null = null;

  canCalculate(): boolean {
    const orders = this.store.pendingOrders();
    return orders.length > 0 && orders.every(order => {
      const customer = this.store.customerFor(order);
      return customer && Number.isFinite(customer.lat) && Number.isFinite(customer.lng) && Number.isInteger(order.boxes) && order.boxes >= 1 && order.boxes <= 3;
    });
  }
  calculate(): void {
    if (!this.canCalculate()) return;
    // โหมด backend: ยิง /route-plans/generate แล้วแปลงเป็น RoutePlan ตัวเดิม
    // template จึงเหมือนรูปเดิมทุกอย่าง — พัง/ออฟไลน์ค่อยตกกลับไปคำนวณในเครื่อง
    if (this.store.usingBackend() && this.routePlans) {
      this.calculating = true;
      this.routePlans.generate(todayLocal()).subscribe({
        next: (backend) => this.adoptBackend(backend),
        error: () => this.calculateLocally(),
      });
      return;
    }
    this.calculateLocally();
  }
  private calculateLocally(): void {
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
    this.candidateBackend = null;
    this.store.choosePlan(plan);
    this.reviewing = false;
    this.calculating = false;
  }
  compare(): void {
    if (this.store.usingBackend() && this.routePlans) {
      this.routePlans.recalculate(todayLocal()).subscribe({
        next: (backend) => {
          this.candidateBackend = backend;
          this.candidate = adaptBackendPlan(backend, {
            customers: this.store.customers(),
            orders: this.store.orders(),
            riders: this.store.riders(),
          });
        },
        error: () => this.compareLocally(),
      });
      return;
    }
    this.compareLocally();
  }
  private compareLocally(): void {
    this.candidateBackend = null;
    this.candidate = this.store.previewRoutes((this.store.plan()?.version || 1) + 1);
  }
  chooseCandidate(): void {
    if (!this.candidate) return;
    if (this.candidateBackend?.routePlanId != null) this.backendPlanId = this.candidateBackend.routePlanId;
    this.store.choosePlan(this.candidate);
    this.candidate = null;
    this.candidateBackend = null;
    this.reviewing = false;
  }
  confirm(): void {
    if (!this.reviewing || !this.store.plan()) return;
    // ล็อกแผนฝั่ง backend ด้วย แต่ UI ยืนยันแบบเดิมทันที ไม่รอให้เสียจังหวะ
    if (this.backendPlanId != null && this.routePlans) {
      this.routePlans.select(this.backendPlanId).subscribe({ error: () => undefined });
    }
    this.store.confirmPlan();
    this.reviewing = false;
  }
  longestMinutes(plan: RoutePlan): number { return Math.max(0, ...plan.routes.map(route => route.durationMinutes)); }
  finishTime(plan: RoutePlan): string { const minutes = 11 * 60 + 30 + this.longestMinutes(plan); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  marginMinutes(plan: RoutePlan): number { return 60 - this.longestMinutes(plan); }
  finishTimeForRoute(durationMinutes: number): string { const minutes = 11 * 60 + 30 + durationMinutes; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  capacityPercent(routeCount: number): number { return routeCount ? Math.min(100, this.store.pendingOrders().length / (routeCount * 3) * 100) : 0; }
  callFee(plan: RoutePlan): number { return plan.routes.length * 15; }
  distanceFee(plan: RoutePlan): number { return Math.round((plan.deliveryCost - this.callFee(plan)) * 100) / 100; }
}
