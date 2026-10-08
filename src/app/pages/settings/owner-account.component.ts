import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { apiErrorMessage } from '../../core/api-error';

@Component({
  selector: 'app-owner-account',
  imports: [FormsModule],
  templateUrl: './owner-account.component.html',
})
export class OwnerAccountComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly currentUsername = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  username = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth
      .ownerAccount()
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (account) => {
          this.username = account.username;
          this.currentUsername.set(account.username);
        },
        error: (error) =>
          this.error.set(apiErrorMessage(error, 'โหลดข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่')),
      });
  }

  save(): void {
    const previousUsername = this.currentUsername();
    if (this.loading() || this.saving() || previousUsername === null) return;
    this.error.set('');
    const username = this.username.trim().toLowerCase();
    const usernameChanged = username !== previousUsername.toLowerCase();
    if (!username || username.length > 100 || !this.currentPassword) {
      this.error.set('กรอกชื่อผู้ใช้และรหัสผ่านปัจจุบันให้ครบ');
      return;
    }
    if (!usernameChanged && !this.newPassword) {
      this.error.set('กรุณาเปลี่ยนชื่อผู้ใช้หรือกำหนดรหัสผ่านใหม่ก่อนบันทึก');
      return;
    }
    if (
      this.newPassword &&
      (this.newPassword.length < 12 || new TextEncoder().encode(this.newPassword).length > 72)
    ) {
      this.error.set('รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร และไม่เกิน 72 ไบต์');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    this.saving.set(true);
    this.auth
      .updateOwnerAccount({
        currentPassword: this.currentPassword,
        ...(usernameChanged ? { username } : {}),
        ...(this.newPassword ? { newPassword: this.newPassword } : {}),
      })
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.currentPassword = this.newPassword = this.confirmPassword = '';
          this.auth.clear();
          void this.router.navigate(['/login/owner'], { queryParams: { accountUpdated: '1' } });
        },
        error: (error) => {
          this.currentPassword = '';
          this.error.set(
            error.status === 409
              ? 'ชื่อผู้ใช้นี้มีบัญชีอื่นใช้อยู่แล้ว กรุณาเลือกชื่อใหม่'
              : error.status === 401 && error.error?.message === 'Current password is incorrect'
                ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
                : apiErrorMessage(error, 'บันทึกบัญชีไม่สำเร็จ กรุณาลองใหม่'),
          );
        },
      });
  }
}
