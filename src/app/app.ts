import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DeliveryService } from './core/delivery.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  readonly router = inject(Router);
  readonly store = inject(DeliveryService);

  pageTitle(): string {
    if (this.router.url.includes('/customers')) return 'ข้อมูลลูกค้า';
    if (this.router.url.includes('/orders')) return 'ออเดอร์วันนี้';
    return 'ศูนย์จัดส่งวันนี้';
  }
}
