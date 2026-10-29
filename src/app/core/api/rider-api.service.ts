// ไฟล์นี้: คุยกับ API ไรเดอร์ — โหลด เพิ่ม แก้ไข ลบ และตั้งบัญชี/รหัสผ่าน

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// รูปแบบข้อมูล rider ที่ backend ส่งกลับมา
export interface ApiRider {
  workStatus?: 'READY' | 'BUSY' | 'DELIVERING' | 'PAUSED' | 'UNCONFIGURED';
  assignedOrdersToday?: number;
  id: number;
  name: string;
  username: string | null;
  hasPassword: boolean;
  phone: string | null;
  isAvailable: boolean;
}

// ข้อมูลจากฟอร์มสำหรับสร้าง/แก้ไขไรเดอร์
export interface RiderApiInput {
  name: string;
  phone?: string | null;
  isAvailable?: boolean;
}

// service เรียก API /riders
@Injectable({ providedIn: 'root' })
export class RidersApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/riders`;

  // โหลดไรเดอร์ทั้งหมด (availableOnly = เฉพาะคนที่พร้อมรับงาน)
  getRiders(availableOnly = false) {
    return this.http.get<ApiRider[]>(this.url, {
      params: availableOnly ? { available: 'true' } : {},
    });
  }

  // เพิ่มไรเดอร์ใหม่
  createRider(input: RiderApiInput) {
    return this.http.post<ApiRider>(this.url, input);
  }

  // แก้ไขไรเดอร์ตาม id
  updateRider(id: number, input: RiderApiInput) {
    return this.http.put<ApiRider>(`${this.url}/${id}`, input);
  }

  // ลบไรเดอร์ตาม id
  deleteRider(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // ตั้งรหัสผ่านให้ไรเดอร์ตาม id
  setPassword(id: number, password: string) {
    return this.http.put<void>(`${this.url}/${id}/password`, { password });
  }

  // ตั้งบัญชี login (ชื่อผู้ใช้ และรหัสผ่านถ้ามี) ให้ไรเดอร์ตาม id
  setAccount(id: number, username: string, password?: string) {
    return this.http.put<void>(`${this.url}/${id}/account`, {
      username,
      ...(password ? { password } : {}),
    });
  }
}
