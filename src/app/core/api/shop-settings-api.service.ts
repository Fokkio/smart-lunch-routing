// ไฟล์นี้: คุยกับ API ค่าตั้งร้าน — โหลดและบันทึกชื่อร้าน พิกัด เวลาส่ง และสูตรต้นทุน

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirror ของ backend ShopSettings (ดู backend src/models/shop-settings.model.ts) */
export interface ShopSettings {
  stopServiceMinutes?: number;
  settingId: number;
  shopName: string;
  latitude: number;
  longitude: number;
  /** "HH:MM:SS" */
  deliveryStartTime: string;
  /** "HH:MM:SS" */
  deliveryDeadline: string;
  maxOrdersPerRider: number;
  riderSpeedKmh: number;
  boxSalePrice: number;
  boxFoodCost: number;
  riderBaseCost: number;
  riderCostPerKm: number;
}

// service เรียก API /settings
@Injectable({ providedIn: 'root' })
export class ShopSettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/settings`;

  // ดึงค่าตั้งร้านปัจจุบันจาก backend
  get(): Observable<ShopSettings> {
    return this.http.get<ShopSettings>(this.url);
  }

  // บันทึกค่าตั้งร้านที่แก้ไข (บางส่วนได้) -> ค่าตั้งร้านหลังบันทึก
  update(settings: Partial<ShopSettings>): Observable<ShopSettings> {
    return this.http.put<ShopSettings>(this.url, settings);
  }
}
