import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'owner/customers', title: 'จัดการลูกค้า | ครัวเที่ยงตรง', loadComponent: () => import('./pages/customers/customers.component').then((m) => m.CustomersComponent) },
  { path: 'owner/orders', title: 'จัดการออเดอร์ | ครัวเที่ยงตรง', loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent) },
  { path: 'owner/delivery', title: 'วางแผนจัดส่ง | ครัวเที่ยงตรง', loadComponent: () => import('./pages/delivery/delivery.component').then((m) => m.DeliveryComponent) },
  { path: 'rider', title: 'ใบงานไรเดอร์ | ครัวเที่ยงตรง', loadComponent: () => import('./pages/rider/rider.component').then((m) => m.RiderComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'owner/orders' },
  { path: '**', redirectTo: 'owner/orders' },
];
