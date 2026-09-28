import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// รูปแบบข้อมูล customer ที่ backend ส่งกลับมา
export interface ApiCustomer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  lat: number;
  lng: number;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersApiService {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:3000/api/customers';

  // ขอรายชื่อ customer จาก backend
  getCustomers() {
    return this.http.get<ApiCustomer[]>(this.url);
  }
}