import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthService, authInterceptor } from '../../core/auth.service';
import { OwnerAccountComponent } from './owner-account.component';

afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
  sessionStorage.clear();
});

async function setup() {
  sessionStorage.setItem(
    'smart-lunch-session-v1',
    JSON.stringify({ token: 'owner-token', user: { type: 'OWNER', id: 7, name: 'Owner' } }),
  );
  const navigate = vi.fn().mockResolvedValue(true);
  const navigateByUrl = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    imports: [OwnerAccountComponent],
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: Router, useValue: { navigate, navigateByUrl } },
    ],
  });
  const fixture = TestBed.createComponent(OwnerAccountComponent);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/api/auth/owner-account').flush({ username: 'shop-owner' });
  await fixture.whenStable();
  return {
    fixture,
    page: fixture.componentInstance,
    http,
    auth: TestBed.inject(AuthService),
    navigate,
    navigateByUrl,
  };
}

it.each(['username', 'password', 'both'])(
  'saves %s changes once, clears the session and returns to owner login',
  async (kind) => {
    const { page, http, auth, navigate } = await setup();
    page.currentPassword = 'current owner password';
    if (kind !== 'password') page.username = ' NEW.Owner ';
    if (kind !== 'username') page.newPassword = page.confirmPassword = 'different owner password';
    page.save();
    page.save();
    const request = http.expectOne('/api/auth/owner-account');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe('Bearer owner-token');
    expect(request.request.body).toEqual({
      currentPassword: 'current owner password',
      ...(kind !== 'password' ? { username: 'new.owner' } : {}),
      ...(kind !== 'username' ? { newPassword: 'different owner password' } : {}),
    });
    expect(page.saving()).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.token()).toBeNull();
    expect(sessionStorage.getItem('smart-lunch-session-v1')).toBeNull();
    expect(page.currentPassword).toBe('');
    expect(page.newPassword).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/login/owner'], {
      queryParams: { accountUpdated: '1' },
    });
  },
);

it.each([
  ['short', 'short'],
  ['ก'.repeat(25), 'ก'.repeat(25)],
  ['long new password', 'another password'],
  ['', ''],
])(
  'blocks invalid password or unchanged account without a request',
  async (password, confirmation) => {
    const { page, http, auth } = await setup();
    page.currentPassword = 'current owner password';
    page.newPassword = password;
    page.confirmPassword = confirmation;
    page.save();
    http.expectNone((request) => request.method === 'PUT');
    expect(page.error()).not.toBe('');
    expect(auth.token()).toBe('owner-token');
  },
);

it.each([401, 409])('retains the form and session on an account error: %s', async (status) => {
  const { fixture, page, http, auth, navigate, navigateByUrl } = await setup();
  page.username = 'new-owner';
  page.currentPassword = 'incorrect password';
  page.save();
  http
    .expectOne('/api/auth/owner-account')
    .flush(
      { message: status === 401 ? 'Current password is incorrect' : 'Username is already in use' },
      { status, statusText: 'Account update failed' },
    );
  await fixture.whenStable();
  expect(auth.token()).toBe('owner-token');
  expect(page.username).toBe('new-owner');
  expect(page.currentPassword).toBe('');
  expect(page.saving()).toBe(false);
  expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
    status === 401 ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง' : 'ชื่อผู้ใช้นี้มีบัญชีอื่นใช้อยู่แล้ว',
  );
  expect(navigate).not.toHaveBeenCalled();
  expect(navigateByUrl).not.toHaveBeenCalled();
});
