import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it.each(['OWNER', 'RIDER'])('uses the %s page role and shows a failed login', async (role) => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { role }, queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const login = fixture.componentInstance;
    login.username = 'sample-owner';
    login.password = 'long test password';
    login.login();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/login');
    expect(request.request.body).toEqual({
      role,
      username: 'sample-owner',
      password: 'long test password',
    });
    request.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'เข้าสู่ระบบไม่สำเร็จ',
    );
  });
});
