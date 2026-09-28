import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiCustomer, ApiCustomerInput } from './customer-api.models';

/**
 * Backend Customers API client — same shape as `RoutePlanApiService`.
 *
 * Base path comes from `environment.apiBaseUrl`; the production domain is
 * never hard-coded here.
 *
 * There is no search endpoint on the backend, so `list()` loads everything
 * and the page filters client-side.
 */
@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/customers`;

  /** GET /api/customers */
  list(): Observable<ApiCustomer[]> {
    return this.http.get<ApiCustomer[]>(this.baseUrl);
  }

  /** GET /api/customers/:id */
  get(id: number): Observable<ApiCustomer> {
    return this.http.get<ApiCustomer>(`${this.baseUrl}/${id}`);
  }

  /** POST /api/customers → 201 */
  create(payload: ApiCustomerInput): Observable<ApiCustomer> {
    return this.http.post<ApiCustomer>(this.baseUrl, payload);
  }

  /** PUT /api/customers/:id */
  update(id: number, payload: ApiCustomerInput): Observable<ApiCustomer> {
    return this.http.put<ApiCustomer>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /api/customers/:id → 204 (empty body) */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
