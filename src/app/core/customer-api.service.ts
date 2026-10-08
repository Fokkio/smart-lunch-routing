import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

import type { ApiCustomer, ApiCustomerInput } from './customer-api.models';

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/customers`;

  // ไม่ระบุคำค้น = โหลดทั้งหมด / ระบุคำค้น = ให้ backend ค้นหา
  getCustomers(search: string = '') {
    return this.http.get<ApiCustomer[]>(this.url, {
      params: search.trim() ? { search: search.trim() } : {},
    });
  }
  nearby(radiusKm = 1) {
    return this.http.get<ApiCustomer[]>(`${this.url}/nearby`, { params: { radiusKm } });
  }
  // ส่งข้อมูลลูกค้าใหม่ และรับลูกค้าที่บันทึกสำเร็จกลับมา
  createCustomer(input: ApiCustomerInput) {
    return this.http.post<ApiCustomer>(this.url, input);
  }

  // แก้ไขลูกค้าตาม id และรับข้อมูลหลังบันทึกกลับมา
  updateCustomer(id: string, input: ApiCustomerInput) {
    return this.http.put<ApiCustomer>(`${this.url}/${id}`, input);
  }

  // ขอให้ backend ลบลูกค้าตาม id
  // เมื่อลบสำเร็จ API ตอบ 204 โดยไม่มีข้อมูลลูกค้ากลับมา
  deleteCustomer(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
