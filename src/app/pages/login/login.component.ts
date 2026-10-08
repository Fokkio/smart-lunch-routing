import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, type User } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly role: User['type'] | undefined = this.route.snapshot.data['role'];
  readonly owner = this.role === 'OWNER';
  readonly accountUpdated = this.route.snapshot.queryParamMap.has('accountUpdated');
  showPassword = false;
  username = '';
  password = '';
  error = '';
  loading = false;
  login(): void {
    if (!this.role || !this.username.trim() || !this.password || this.loading) return;
    this.loading = true;
    this.error = '';
    this.auth
      .login(this.role, this.username.trim(), this.password)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ user }) => {
          this.password = '';
          void this.router.navigateByUrl(user.type === 'OWNER' ? '/owner/delivery' : '/rider');
        },
        error: (error) => {
          this.error =
            error?.status === 401
              ? 'เข้าสู่ระบบไม่สำเร็จ ตรวจสอบข้อมูลและลองใหม่'
              : apiErrorMessage(error, 'เข้าสู่ระบบไม่สำเร็จ ตรวจสอบข้อมูลและลองใหม่');
        },
      });
  }
}
