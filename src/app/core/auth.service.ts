// ไฟล์นี้: ดูแลการเข้าสู่ระบบ — เก็บ session, แนบ token ทุก request API และกันหน้าที่ต้องใช้สิทธิ์

import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, filter, tap, throwError, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

export type User = { type: 'OWNER' | 'RIDER'; id: number; name: string };
type Session = { token: string; user: User };
export type OwnerAccount = { username: string };
export type OwnerAccountUpdate = {
  currentPassword: string;
  username?: string;
  newPassword?: string;
};
const SESSION_KEY = 'smart-lunch-session-v1';
const privateKeys = ['smart-lunch-customers-v1', 'smart-lunch-orders-v1', 'smart-lunch-plan-v1'];

// ลบข้อมูลส่วนตัวที่แคชไว้ในเครื่อง เมื่อเปลี่ยนผู้ใช้หรือออกจากระบบ
function clearPrivateCache(): void {
  try {
    for (const key of privateKeys) localStorage.removeItem(key);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('smart-lunch-route-details-v1:')) localStorage.removeItem(key);
    }
  } catch {
    /* storage may be unavailable */
  }
}

// service กลางด้าน auth: login/logout, token และข้อมูลบัญชีเจ้าของร้าน
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/auth`;
  private readonly session = signal<Session | null>(this.readSession());
  readonly user = signal<User | null>(this.session()?.user ?? null);

  // ตอนสร้าง: ล้างแคชส่วนตัวเก่าออกก่อน เพื่อไม่ให้ข้อมูลผู้ใช้เก่าหลุดไปหาคนใหม่
  constructor() {
    clearPrivateCache();
  }

  // คืน token ของ session ปัจจุบัน หรือ null ถ้ายังไม่ได้ login
  token(): string | null {
    return this.session()?.token ?? null;
  }

  // login ด้วยบทบาท+ชื่อผู้ใช้+รหัสผ่าน -> บันทึก session ไว้ใน tab นี้
  login(role: User['type'], username: string, password: string) {
    return this.http.post<Session>(`${this.url}/login`, { role, username, password }).pipe(
      tap((session) => {
        clearPrivateCache();
        this.session.set(session);
        this.user.set(session.user);
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch {
          /* current tab still works */
        }
      }),
    );
  }

  // เปลี่ยนรหัสผ่านของตัวเอง -> ส่งรหัสเดิมกับรหัสใหม่ไป backend
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<void>(`${this.url}/password`, { currentPassword, newPassword });
  }

  // ดึงข้อมูลบัญชีเจ้าของร้านจาก backend
  ownerAccount() {
    return this.http.get<OwnerAccount>(`${this.url}/owner-account`);
  }

  // แก้ไขบัญชีเจ้าของร้าน (ชื่อผู้ใช้/รหัสผ่าน) -> ส่งข้อมูลใหม่ไป backend
  updateOwnerAccount(input: OwnerAccountUpdate) {
    return this.http.put<void>(`${this.url}/owner-account`, input);
  }

  // ออกจากระบบ: แจ้ง backend แล้วยกเลิก session ในเครื่อง
  logout(): void {
    const token = this.token();
    if (token)
      this.http.post(`${this.url}/logout`, {}).subscribe({
        error: () => {
          /* local logout remains effective */
        },
      });
    this.clear();
  }

  // ล้าง session และแคชส่วนตัวในเครื่องทั้งหมด
  clear(): void {
    this.session.set(null);
    this.user.set(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
    clearPrivateCache();
  }

  // อ่าน session ที่บันทึกไว้ใน tab นี้ -> session ที่ถูกต้อง หรือ null
  private readSession(): Session | null {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
      return parsed?.token && (parsed.user?.type === 'OWNER' || parsed.user?.type === 'RIDER')
        ? parsed
        : null;
    } catch {
      return null;
    }
  }
}

// interceptor: แนบ Bearer token ให้ request API, จำกัดเวลา, ถ้า 401 ให้ logout แล้วพาไป login
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const apiRequest = req.url.startsWith(`${environment.apiBaseUrl}/`);
  return next(
    apiRequest && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req,
  ).pipe(
    timeout(apiRequest && /\/route-plans\/(generate|recalculate)$/.test(req.url) ? 30000 : 15000),
    filter(() => !apiRequest || token === null || token === auth.token()),
    catchError((error) => {
      if (
        apiRequest &&
        token === auth.token() &&
        error.status === 401 &&
        !req.url.endsWith('/auth/login') &&
        !req.url.endsWith('/auth/password') &&
        !(
          req.method === 'PUT' &&
          req.url.endsWith('/auth/owner-account') &&
          error.error?.message === 'Current password is incorrect'
        )
      ) {
        const loginPath = auth.user()?.type === 'RIDER' ? '/login/rider' : '/login/owner';
        auth.clear();
        void router.navigateByUrl(loginPath);
      }
      return throwError(() => error);
    }),
  );
};

// guard ของ route: อนุญาตเฉพาะบทบาทที่กำหนด ไม่งั้นพาไปหน้า login ของบทบาทนั้น
export function roleGuard(role: User['type']): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.user()?.type === role
      ? true
      : router.createUrlTree([role === 'OWNER' ? '/login/owner' : '/login/rider']);
  };
}
