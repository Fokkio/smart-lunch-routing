import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DeliveryService } from './core/delivery.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App implements OnInit {
  readonly router = inject(Router);
  readonly store = inject(DeliveryService);

  ngOnInit(): void {
    // เปิดแอปแล้วลองดึงข้อมูลจริงจาก backend ทับข้อมูลจำลอง
    this.store.connect();
  }

  pageTitle(): string {
    if (this.router.url.includes('/customers')) return 'ข้อมูลลูกค้า';
    if (this.router.url.includes('/orders')) return 'ออเดอร์วันนี้';
    if (this.router.url.includes('/riders')) return 'จัดการไรเดอร์';
    return 'ศูนย์จัดส่งวันนี้';
  }
}
