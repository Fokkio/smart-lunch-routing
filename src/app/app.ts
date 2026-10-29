// ไฟล์นี้: component รากของแอป — โครงหน้า (เมนูเจ้าของร้าน ส่วนหัว) และช่องแสดงหน้าตาม route

import { Component, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DeliveryService } from './core/state/delivery.service';
import { AuthService } from './core/api/auth.service';

// component ราก: แสดงโครงหลักของแอป และเชื่อมข้อมูลผู้ใช้กับข้อมูลจัดส่ง
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly store = inject(DeliveryService);

  // ตอนสร้าง: ดูบทบาทผู้ใช้ แล้วโหลดข้อมูลจัดส่งเมื่อเป็น OWNER หรือล้างข้อมูลเมื่อ logout
  constructor() {
    effect(() => {
      const role = this.auth.user()?.type;
      untracked(() => {
        this.store.clearForLogout();
        if (role === 'OWNER') this.store.connect();
      });
    });
  }

  // ออกจากระบบ แล้วพากลับไปหน้า login ตามบทบาท
  logout(): void {
    const loginPath = this.auth.user()?.type === 'OWNER' ? '/login/owner' : '/login/rider';
    this.auth.logout();
    void this.router.navigateByUrl(loginPath);
  }

  // ชื่อหัวข้อของหน้า จาก URL ปัจจุบัน -> ชื่อภาษาไทย
  pageTitle(): string {
    if (this.router.url.includes('/customers')) return 'ข้อมูลลูกค้า';
    if (this.router.url.includes('/orders')) return 'ออเดอร์วันนี้';
    if (this.router.url.includes('/riders')) return 'จัดการไรเดอร์';
    if (this.router.url.includes('/settings')) return 'ตั้งค่าร้าน';
    return 'ศูนย์จัดส่งวันนี้';
  }
}
