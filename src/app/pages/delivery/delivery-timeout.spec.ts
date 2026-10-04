import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeliveryComponent } from './delivery.component';
import { DeliveryService } from '../../core/delivery.service';
import { RoutePlanApiService } from '../../core/route-plan-api.service';

describe('DeliveryComponent saved plans loading', () => {
  let fixture: ComponentFixture<DeliveryComponent>;
  let component: DeliveryComponent;
  let listSpy: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(listReturn: any, backendReady: boolean) {
    const usingBackend = signal(backendReady);
    listSpy = vi.fn().mockReturnValue(listReturn);
    TestBed.configureTestingModule({
      imports: [DeliveryComponent],
      providers: [
        provideRouter([]),
        { provide: DeliveryService, useValue: { usingBackend, customers: signal([]), orders: signal([]), riders: signal([]), plan: signal(null), confirmedPlan: signal(null), planHistory: signal([]), pendingOrders: () => [], pendingBoxes: () => 0, customerFor: () => null, calculateRoutes: () => {}, choosePlan: () => {}, confirmPlan: () => {} } },
        { provide: RoutePlanApiService, useValue: { list: listSpy, get: () => NEVER, select: () => NEVER, delete: () => NEVER, generate: () => NEVER, recalculate: () => NEVER } },
      ],
    });
    fixture = TestBed.createComponent(DeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return usingBackend;
  }

  it('shows error after 15s timeout when request hangs', async () => {
    vi.useFakeTimers();
    setup(NEVER, true);
    expect(component.loadingPlans).toBe(true);
    expect(listSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(16000);
    fixture.detectChanges();
    expect(component.loadingPlans).toBe(false);
    expect(component.plansError).toContain('โหลดใบงานไม่สำเร็จ');
  });

  it('loads plans when backend becomes ready after init (effect)', async () => {
    vi.useFakeTimers();
    const usingBackend = setup(of([]), false);
    expect(listSpy).not.toHaveBeenCalled();
    usingBackend.set(true);
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(listSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000);
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it('does not refire spuriously over time', async () => {
    vi.useFakeTimers();
    setup(of([]), true);
    expect(listSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000);
    fixture.detectChanges();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(60000);
    expect(listSpy).toHaveBeenCalledTimes(1);
  });
});
