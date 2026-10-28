// ไฟล์นี้: คุยกับ API ออเดอร์ — โหลด ค้นหาใกล้ร้าน เพิ่ม แก้ไข ลบ สร้างออเดอร์จำลอง และลบออเดอร์จำลอง

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
  createdAt?: string;
  distanceKm?: number;
}
export type ApiOrderInput = Pick<ApiOrder, 'customerId' | 'boxes'> & {
  status?: ApiOrderStatus;
  orderDate?: string;
};

// service เรียก API /orders
@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/orders`;

  // โหลดออเดอร์: ระบุวัน = วันนั้น, ไม่ระบุ = ตามที่ backend กำหนด
  list(date?: string): Observable<ApiOrder[]> {
    return this.http.get<ApiOrder[]>(this.url, { params: date ? { date } : {} });
  }
  // โหลดออเดอร์ใกล้ร้านในรัศมีที่กำหนด กรองตามวันและสถานะได้
  nearby(date?: string, status?: ApiOrderStatus, radiusKm = 2): Observable<ApiOrder[]> {
    return this.http.get<ApiOrder[]>(`${this.url}/nearby`, {
      params: { radiusKm, ...(date ? { date } : {}), ...(status ? { status } : {}) },
    });
  }
  // สร้างออเดอร์ใหม่ -> ส่งข้อมูลไป backend แล้วรับออเดอร์ที่บันทึกแล้วกลับมา
  create(input: ApiOrderInput): Observable<ApiOrder> {
    return this.http.post<ApiOrder>(this.url, input);
  }
  // แก้ไขออเดอร์ตาม id -> ส่งข้อมูลใหม่ไป backend
  update(id: number, input: ApiOrderInput): Observable<ApiOrder> {
    return this.http.put<ApiOrder>(`${this.url}/${id}`, input);
  }
  // ขอลบออเดอร์ตาม id
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
  // ขอให้ backend สร้างออเดอร์จำลองตามจำนวนที่ระบุในวันนั้น -> จำนวนที่สร้างและรายการที่สร้าง
  simulate(date: string, count = 25): Observable<{ createdCount: number; orders: ApiOrder[] }> {
    return this.http.post<{ createdCount: number; orders: ApiOrder[] }>(`${this.url}/simulate`, {
      count,
      orderDate: date,
    });
  }
  // ขอลบออเดอร์จำลองตาม id ที่ระบุ -> จำนวนที่ลบ
  clearSimulated(orderIds: number[]): Observable<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>(`${this.url}/simulated`, {
      body: { orderIds },
    });
  }
}
