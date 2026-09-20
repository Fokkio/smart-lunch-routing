import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'owner/dashboard', loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'owner/customers', loadComponent: () => import('./pages/customers.component').then((m) => m.CustomersComponent) },
  { path: 'owner/orders', loadComponent: () => import('./pages/orders.component').then((m) => m.OrdersComponent) },
  { path: 'owner/delivery', loadComponent: () => import('./pages/delivery.component').then((m) => m.DeliveryComponent) },
  { path: 'owner/history', loadComponent: () => import('./pages/history.component').then((m) => m.HistoryComponent) },
  { path: 'rider', loadComponent: () => import('./pages/rider.component').then((m) => m.RiderComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'owner/dashboard' },
  { path: '**', redirectTo: 'owner/dashboard' },
];
