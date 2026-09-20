import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'owner/dashboard', loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'owner/customers', loadComponent: () => import('./pages/customers.component').then((m) => m.CustomersComponent) },
  { path: 'owner/orders', loadComponent: () => import('./pages/orders.component').then((m) => m.OrdersComponent) },
  { path: 'rider', loadComponent: () => import('./pages/rider.component').then((m) => m.RiderComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'owner/dashboard' },
  { path: '**', redirectTo: 'owner/dashboard' },
];
