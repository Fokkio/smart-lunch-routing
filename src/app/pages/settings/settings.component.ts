import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { FormsModule } from '@angular/forms';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';
import { ShopSettings, ShopSettingsApiService } from '../../core/shop-settings-api.service';
import { DeliveryService } from '../../core/delivery.service';
import { RoutePlanApiService } from '../../core/route-plan-api.service';
import { OwnerAccountComponent } from './owner-account.component';

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
