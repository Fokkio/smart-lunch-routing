// ไฟล์นี้: หน้าจัดการไรเดอร์ของเจ้าของร้าน — ดู เพิ่ม แก้ไข ลบไรเดอร์ และตั้งบัญชี/รหัสผ่านให้ไรเดอร์

import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { apiErrorMessage } from '../../core/api-error';
import { ApiRider, RidersApiService } from '../../core/rider-api.service';
import { DeliveryService } from '../../core/delivery.service';

type Draft = { id?: number; name: string; phone: string; isAvailable: boolean };

// หน้าจัดการไรเดอร์: โหลดรายชื่อ, กรอง, และบันทึก/ลบ/ตั้งบัญชีไรเดอร์
@Component({
  selector: 'app-riders',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './riders.component.html',
})
export class RidersComponent implements OnInit {
  private readonly ridersApi = inject(RidersApiService);
  private readonly deliveryStore = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly riders = signal<ApiRider[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  query = '';
  showForm = false;
  feedback = '';
  accountRider: ApiRider | null = null;
  accountUsername = '';
  newPassword = '';
  draft: Draft = this.blankDraft();

  // ตอนเปิดหน้า: โหลดรายชื่อไรเดอร์
  ngOnInit(): void {
    this.reload();
  }

  // โหลดรายชื่อไรเดอร์จาก backend ใหม่
  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.ridersApi
      .getRiders()
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (riders) => {
          this.riders.set(riders);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(apiErrorMessage(err, 'โหลดรายชื่อไรเดอร์ไม่สำเร็จ'));
          this.loading.set(false);
        },
      });
  }

  // จำนวนไรเดอร์ที่พร้อมรับงาน (isAvailable)
  availableCount(): number {
    return this.riders().filter((rider) => rider.workStatus === 'READY').length;
  }

  // ป้ายสถานะงานของไรเดอร์ภาษาไทยจากสถานะของ backend
  workStatusLabel(rider: ApiRider): string {
    return (
      {
        READY: 'พร้อมรับงาน',
        BUSY: 'มีงานรอส่ง',
        DELIVERING: 'กำลังส่ง',
        PAUSED: 'พักรับงาน',
        UNCONFIGURED: 'ยังไม่ได้เปิดบัญชี',
      } as const
    )[rider.workStatus ?? 'UNCONFIGURED'];
  }

  // ไรเดอร์ที่จะแสดงตามคำค้น (ชื่อ/เบอร์)
  filteredRiders(): ApiRider[] {
    const term = this.query.trim().toLowerCase();
    if (!term) return this.riders();
    return this.riders().filter((rider) =>
      `${rider.name} ${rider.username ?? ''} ${rider.phone ?? ''}`.toLowerCase().includes(term),
    );
  }

  // เปิดฟอร์มเพิ่มไรเดอร์ใหม่ด้วยข้อมูลว่าง
  startCreate(): void {
    if (this.saving()) return;
    this.draft = this.blankDraft();
    this.error.set('');
    this.showForm = true;
  }

  // เปิดฟอร์มแก้ไขไรเดอร์คนนี้ โดยใส่ข้อมูลเดิมลงฟอร์ม
  edit(rider: ApiRider): void {
    if (this.saving()) return;
    this.draft = {
      id: rider.id,
      name: rider.name,
      phone: rider.phone ?? '',
      isAvailable: rider.isAvailable,
    };
    this.error.set('');
    this.showForm = true;
  }

  // เปิดฟอร์มตั้งบัญชี login ให้ไรเดอร์คนนี้
  openAccount(rider: ApiRider): void {
    if (this.saving()) return;
    this.accountRider = rider;
    this.accountUsername = rider.username ?? '';
    this.newPassword = '';
    this.error.set('');
  }

  // บันทึกบัญชี login ของไรเดอร์ (ชื่อผู้ใช้ และรหัสผ่านถ้ากรอก) แล้วโหลดรายชื่อใหม่
  saveAccount(): void {
    const username = this.accountUsername.trim().toLowerCase();
    if (
      !this.accountRider ||
      !/^[a-z][a-z0-9._-]{2,39}$/.test(username) ||
      (this.newPassword.length > 0 && this.newPassword.length < 12) ||
      (!this.accountRider.hasPassword && !this.newPassword) ||
      this.saving()
    )
      return;
    this.saving.set(true);
    this.error.set('');
    this.ridersApi
      .setAccount(this.accountRider.id, username, this.newPassword || undefined)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedback = `บันทึกบัญชีของ ${this.accountRider?.name} แล้ว`;
          this.accountRider = null;
          this.newPassword = '';
          this.deliveryStore.refresh();
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(
            err?.status === 409
              ? 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'
              : apiErrorMessage(err, 'บันทึกบัญชีไม่สำเร็จ'),
          );
        },
      });
  }

  // ปิดฟอร์มโดยไม่บันทึก
  cancel(): void {
    if (this.saving()) return;
    this.showForm = false;
    this.error.set('');
  }

  // ลบไรเดอร์คนนี้หลังยืนยัน แล้วโหลดรายชื่อใหม่
  remove(rider: ApiRider): void {
    if (this.saving()) return;
    if (!window.confirm(`ลบไรเดอร์ ${rider.name} หรือไม่?`)) return;
    this.saving.set(true);
    this.error.set('');
    this.ridersApi
      .deleteRider(rider.id)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedback = `ลบไรเดอร์ ${rider.name} แล้ว`;
          this.deliveryStore.refresh();
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(
            err?.status === 409
              ? 'ลบไม่ได้ เพราะไรเดอร์คนนี้มีใบงานหรือข้อมูลการจัดส่งที่อ้างอิงอยู่'
              : apiErrorMessage(err, 'ลบไรเดอร์ไม่สำเร็จ'),
          );
        },
      });
  }

  // บันทึกฟอร์มไรเดอร์: มี id = แก้ไขคนเดิม, ไม่มี id = เพิ่มคนใหม่
  save(): void {
    if (this.saving()) return;
    const name = this.draft.name.trim();
    if (!name) {
      this.error.set('กรุณากรอกชื่อไรเดอร์');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const input = {
      name,
      phone: this.draft.phone.trim() || null,
      isAvailable: this.draft.isAvailable,
    };
    const request =
      this.draft.id === undefined
        ? this.ridersApi.createRider(input)
        : this.ridersApi.updateRider(this.draft.id, input);
    request
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showForm = false;
          this.feedback = 'บันทึกไรเดอร์แล้ว';
          this.deliveryStore.refresh();
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'บันทึกไรเดอร์ไม่สำเร็จ'));
        },
      });
  }

  // ฟอร์มไรเดอร์ว่างตั้งต้น
  private blankDraft(): Draft {
    return { name: '', phone: '', isAvailable: true };
  }
}
