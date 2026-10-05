import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RoutePlanApiService } from '../core/route-plan-api.service';
import { RoutePlanModel, RoutePlanSummaryModel } from '../core/route-plan.models';
import { RoutePlanningComponent } from './route-planning.component';

const PLAN_A: RoutePlanModel = {
  routePlanId: 12, planDate: '2026-10-05', status: 'GENERATED', routingSource: 'ROAD', approximate: false,
  riderCount: 1, totalDistanceKm: 4.3, estimatedFinishTime: '11:48', totalBoxes: 3,
  totalRevenue: 195, totalFoodCost: 120, totalDeliveryCost: 32.2, estimatedProfit: 42.8, jobs: [],
};
const PLAN_B: RoutePlanModel = { ...PLAN_A, routePlanId: 13, status: 'GENERATED', approximate: true, routingSource: 'HAVERSINE' };
const SUMMARY_A: RoutePlanSummaryModel = { ...PLAN_A };
const SUMMARY_B: RoutePlanSummaryModel = { ...PLAN_B };

describe('RoutePlanningComponent candidate flow', () => {
  let api: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
    recalculate: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      list: vi.fn().mockReturnValue(of([SUMMARY_A])),
      get: vi.fn().mockReturnValue(of(PLAN_B)),
      generate: vi.fn().mockReturnValue(of(PLAN_A)),
      recalculate: vi.fn().mockReturnValue(of(PLAN_B)),
      select: vi.fn().mockReturnValue(of({ ...PLAN_B, status: 'SELECTED' })),
    };
    TestBed.configureTestingModule({
      imports: [RoutePlanningComponent],
      providers: [{ provide: RoutePlanApiService, useValue: api }],
    });
    TestBed.overrideComponent(RoutePlanningComponent, { set: { template: '<div></div>' } });
  });

  it('loads candidate summaries for the selected date', () => {
    const fixture = TestBed.createComponent(RoutePlanningComponent);
    expect(api.list).toHaveBeenCalledWith(fixture.componentInstance.planDate());
    expect(fixture.componentInstance.plans()).toEqual([SUMMARY_A]);
  });

  it('refreshes the candidate list after generate', () => {
    const fixture = TestBed.createComponent(RoutePlanningComponent);
    fixture.componentInstance.generate();
    expect(api.generate).toHaveBeenCalledWith(fixture.componentInstance.planDate());
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.plan()?.routePlanId).toBe(PLAN_A.routePlanId);
  });

  it('keeps Plan A when recalculate adds Plan B', () => {
    api.list.mockReset().mockReturnValueOnce(of([SUMMARY_A])).mockReturnValueOnce(of([SUMMARY_A, SUMMARY_B]));
    const fixture = TestBed.createComponent(RoutePlanningComponent);
    fixture.componentInstance.recalculate();
    expect(fixture.componentInstance.plans().map((plan) => plan.routePlanId)).toEqual([12, 13]);
    expect(fixture.componentInstance.plan()?.routePlanId).toBe(13);
  });

  it('loads the selected candidate detail', () => {
    const fixture = TestBed.createComponent(RoutePlanningComponent);
    fixture.componentInstance.openPlan(13);
    expect(api.get).toHaveBeenCalledWith(13);
    expect(fixture.componentInstance.plan()?.routePlanId).toBe(13);
    expect(fixture.componentInstance.plan()?.approximate).toBe(true);
  });

  it('selects the currently loaded plan and shows the selected status', () => {
    const fixture = TestBed.createComponent(RoutePlanningComponent);
    fixture.componentInstance.plan.set(PLAN_B);
    fixture.componentInstance.selectPlan();
    expect(api.select).toHaveBeenCalledWith(13);
    expect(fixture.componentInstance.plan()?.status).toBe('SELECTED');
  });

  it('disables selecting another candidate when a plan is already selected', () => {
    api.list.mockReturnValue(of([{ ...SUMMARY_A, status: 'SELECTED' }]));
    const fixture = TestBed.createComponent(RoutePlanningComponent);
    fixture.componentInstance.plan.set(PLAN_B);
    expect(fixture.componentInstance.canSelectCurrentPlan()).toBe(false);
  });
});
