import { Routes } from '@angular/router';
import { roleGuard } from './core/auth.service';

export const routes: Routes = [
  {
    path: 'login/owner',
    title: 'เข้าสู่ระบบเจ้าของร้าน | ครัวเที่ยงตรง',
    data: { role: 'OWNER' },
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login/rider',
    title: 'เข้าสู่ระบบไรเดอร์ | ครัวเที่ยงตรง',
    data: { role: 'RIDER' },
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login',
    title: 'เลือกบัญชี | ครัวเที่ยงตรง',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'owner/customers',
    canActivate: [roleGuard('OWNER')],
    title: 'จัดการลูกค้า | ครัวเที่ยงตรง',
    loadComponent: () =>
      import('./pages/customers/customers.component').then((m) => m.CustomersComponent),
  },
  {
    path: 'owner/orders',
    canActivate: [roleGuard('OWNER')],
    title: 'จัดการออเดอร์ | ครัวเที่ยงตรง',
    loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent),
  },
  {
    path: 'owner/delivery',
    canActivate: [roleGuard('OWNER')],
    title: 'วางแผนจัดส่ง | ครัวเที่ยงตรง',
    loadComponent: () =>
      import('./pages/delivery/delivery.component').then((m) => m.DeliveryComponent),
  },
  {
    path: 'owner/riders',
    canActivate: [roleGuard('OWNER')],
    title: 'จัดการไรเดอร์ | ครัวเที่ยงตรง',
    loadComponent: () => import('./pages/riders/riders.component').then((m) => m.RidersComponent),
  },
  {
    path: 'owner/settings',
    canActivate: [roleGuard('OWNER')],
    title: 'ตั้งค่าร้าน | ครัวเที่ยงตรง',
    loadComponent: () =>
      import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'rider',
    canActivate: [roleGuard('RIDER')],
    title: 'ใบงานไรเดอร์ | ครัวเที่ยงตรง',
    loadComponent: () => import('./pages/rider/rider.component').then((m) => m.RiderComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'owner/orders' },
  { path: '**', redirectTo: 'owner/orders' },
];
