import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoutePlanModel, RoutePlanSummaryModel } from './route-plan.models';

/**
 * Backend RoutePlan API client. Thin HTTP wrapper — response values are
 * passed through to the view untouched (backend remains source of truth).
 *
 * The base path comes from `environment.apiBaseUrl` (`/api` in development
 * behind the dev proxy, the deployed API origin in production). No environment
 * URL is ever hard-coded here.
 */
@Injectable({ providedIn: 'root' })
export class RoutePlanApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/route-plans`;

  generate(planDate: string): Observable<RoutePlanModel> {
    return this.http.post<RoutePlanModel>(`${this.baseUrl}/generate`, { planDate });
  }

  recalculate(planDate: string): Observable<RoutePlanModel> {
    return this.http.post<RoutePlanModel>(`${this.baseUrl}/recalculate`, { planDate });
  }

  list(date?: string): Observable<RoutePlanSummaryModel[]> {
    return this.http.get<RoutePlanSummaryModel[]>(this.baseUrl, { params: date ? { date } : {} });
  }

  get(id: number): Observable<RoutePlanModel> {
    return this.http.get<RoutePlanModel>(`${this.baseUrl}/${id}`);
  }

  select(id: number): Observable<RoutePlanModel> {
    return this.http.post<RoutePlanModel>(`${this.baseUrl}/${id}/select`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
