import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ApiOrderStatus = 'PENDING' | 'PLANNED' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
export interface ApiOrder {
  id: number;
  customerId: number;
  boxes: number;
  status: ApiOrderStatus;
  orderDate: string;
  isSimulated: boolean;
}
export type ApiOrderInput = Pick<ApiOrder, 'customerId' | 'boxes'> & { status?: ApiOrderStatus; orderDate?: string };

@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/orders`;

  list(date?: string): Observable<ApiOrder[]> {
    return this.http.get<ApiOrder[]>(this.url, { params: date ? { date } : {} });
  }
  create(input: ApiOrderInput): Observable<ApiOrder> { return this.http.post<ApiOrder>(this.url, input); }
  update(id: number, input: ApiOrderInput): Observable<ApiOrder> { return this.http.put<ApiOrder>(`${this.url}/${id}`, input); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  simulate(date: string): Observable<{ createdCount: number; orders: ApiOrder[] }> {
    return this.http.post<{ createdCount: number; orders: ApiOrder[] }>(`${this.url}/simulate`, { count: 25, orderDate: date });
  }
}
