// ไฟล์นี้: หน้าตั้งค่าร้านของเจ้าของร้าน — แก้ไขชื่อร้าน พิกัด เวลาส่ง และสูตรต้นทุน พร้อมส่วนบัญชีเจ้าของร้าน

import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { apiErrorMessage } from '../../core/utils/api-error';
import { FormsModule } from '@angular/forms';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';
import { ShopSettings, ShopSettingsApiService } from '../../core/api/shop-settings-api.service';
import { DeliveryService } from '../../core/state/delivery.service';
import { RoutePlanApiService } from '../../core/api/route-plan-api.service';
import { OwnerAccountComponent } from './owner-account.component';

// หน้าตั้งค่าร้าน: โหลดค่าตั้งร้านมาใส่ฟอร์ม ตรวจพิกัด/เวลา แล้วบันทึก
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, DeliveryMapComponent, OwnerAccountComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(ShopSettingsApiService);
  private readonly store = inject(DeliveryService);
  private readonly plans = inject(RoutePlanApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  draft: ShopSettings | null = null;
  loading = true;
  saving = false;
  saved = false;
  error = '';
  // ตั้งพิกัดร้านในฟอร์มจากจุดที่เลือกบนแผนที่ (ตรวจช่วง lat/lng ก่อน)
  setLocation(location: { lat: number; lng: number }): void {
    if (
      !this.draft ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lng) ||
      Math.abs(location.lat) > 90 ||
      Math.abs(location.lng) > 180
    )
      return;
    this.draft = { ...this.draft, latitude: location.lat, longitude: location.lng };
    this.saved = false;
    this.cdr.markForCheck();
  }
  // ตอนเปิดหน้า: โหลดค่าตั้งร้านจาก backend มาใส่ฟอร์ม (เวลาเหลือแค่ HH:MM)
  ngOnInit(): void {
    this.api
      .get()
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (settings) => {
          this.draft = {
            ...settings,
            deliveryStartTime: settings.deliveryStartTime.slice(0, 5),
            deliveryDeadline: settings.deliveryDeadline.slice(0, 5),
          };
        },
        error: (error) => {
          this.error = apiErrorMessage(error, 'โหลดค่าร้านไม่สำเร็จ');
        },
      });
  }
  // บันทึกค่าตั้งร้าน: ตรวจพิกัด ชื่อร้าน และเวลาเริ่มต้องก่อนเส้นตาย แล้วอัปเดต store และล้างแคชแผน
  save(): void {
    if (!this.draft || this.saving) return;
    this.error = '';
    this.saved = false;
    if (
      !Number.isFinite(this.draft.latitude) ||
      !Number.isFinite(this.draft.longitude) ||
      Math.abs(this.draft.latitude) > 90 ||
      Math.abs(this.draft.longitude) > 180
    ) {
      this.error = 'เลือกตำแหน่งร้านที่ถูกต้องบนแผนที่';
      return;
    }
    if (
      !this.draft.shopName.trim() ||
      this.draft.deliveryStartTime >= this.draft.deliveryDeadline
    ) {
      this.error = 'ตรวจสอบชื่อร้านและเวลาส่ง';
      return;
    }
    this.saving = true;
    const { settingId: _settingId, ...patch } = this.draft;
    this.api
      .update(patch)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (settings) => {
          this.draft = {
            ...settings,
            deliveryStartTime: settings.deliveryStartTime.slice(0, 5),
            deliveryDeadline: settings.deliveryDeadline.slice(0, 5),
          };
          this.store.settings.set(settings);
          this.plans.invalidateCache();
          this.saved = true;
        },
        error: (error) => {
          this.error = apiErrorMessage(error, 'บันทึกค่าร้านไม่สำเร็จ กรุณาตรวจสอบข้อมูล');
        },
      });
  }
}
