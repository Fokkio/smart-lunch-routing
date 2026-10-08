import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { App } from './app';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './core/auth.service';
import { DeliveryService } from './core/delivery.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('hides owner navigation before login', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside')).toBeNull();
  });

  it.each(['/login', '/login/owner', '/login/rider'])(
    'keeps the owner shell off %s with an active session',
    async (path) => {
      TestBed.overrideProvider(AuthService, {
        useValue: { user: signal({ type: 'OWNER', id: 1, name: 'Owner' }) },
      });
      TestBed.overrideProvider(DeliveryService, {
        useValue: {
          clearForLogout: vi.fn(),
          connect: vi.fn(),
          settings: signal(null),
          pendingOrders: signal([]),
        },
      });
      vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(path);
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('aside')).toBeNull();
      expect(root.querySelector('main')?.className).toBe('');
    },
  );
});
