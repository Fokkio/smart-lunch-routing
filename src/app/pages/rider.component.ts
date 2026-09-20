import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryService } from '../core/delivery.service';
import { RiderRoute } from '../core/models';
import { RevealDirective } from '../shared/reveal.directive';

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule, RevealDirective],
  template: `
    <main class="rider-page">
      <section class="rider-intro" appReveal>
        <p class="eyebrow">RIDER JOB SHEET</p>
        <h1>ใบงานที่อ่านจบ<br>ก่อนสตาร์ตรถ</h1>
        <p>กรอกรหัสจากเจ้าของร้านเพื่อดูจำนวนกล่อง ลำดับจุดส่ง และเปิดเส้นทางนำทางบนมือถือ</p>
      </section>

      <section class="phone-shell" appReveal>
        <div class="phone-top"><span>11:28</span><span class="signal-lines" aria-hidden="true"><i></i><i></i><i></i></span></div>
        @if (!activeRoute) {
          <div class="access-panel">
            <div class="access-mark">ID</div>
            <p class="eyebrow">DAILY ACCESS</p><h2>กรอกรหัสใบงาน</h2><p>รหัสใช้เปิดใบงานจำลองเท่านั้น ไม่ใช่ระบบยืนยันตัวตนสำหรับ Production</p>
            <form (ngSubmit)="openJob()">
              <label for="jobCode">รหัสใบงาน</label>
              <input id="jobCode" name="jobCode" [(ngModel)]="jobCode" placeholder="เช่น LUNCH-101" autocomplete="off" />
              <button class="button button-primary" type="submit">เปิดใบงานวันนี้</button>
            </form>
            @if (errorMessage) { <div class="error-note">{{ errorMessage }}</div> }
            <div class="demo-codes"><span>รหัสสำหรับเดโม</span>@for (rider of store.riders(); track rider.id) { <button type="button" (click)="useCode(rider.jobCode)">{{ rider.jobCode }}</button> }</div>
          </div>
        } @else {
          <div class="job-sheet">
            <header class="job-header" [style.--route-color]="activeRoute.rider.color">
              <button type="button" class="back-button" (click)="closeJob()">กลับ</button>
              <span class="status-badge">พร้อมออกส่ง</span>
              <p class="eyebrow">{{ activeRoute.rider.jobCode }}</p>
              <h2>สวัสดี<br>{{ activeRoute.rider.name }}</h2>
              <div class="pickup-summary"><span><small>หยิบอาหาร</small><strong>{{ activeRoute.totalBoxes }} กล่อง</strong></span><span><small>จุดส่ง</small><strong>{{ activeRoute.stops.length }} จุด</strong></span><span><small>ระยะทาง</small><strong>{{ activeRoute.distanceKm }} กม.</strong></span></div>
            </header>
            <div class="job-body">
              <div class="departure"><span class="step-dot">S</span><div><small>เริ่มต้น 11:30 น.</small><strong>รับอาหารที่ครัวเที่ยงตรง</strong></div></div>
              <ol class="stop-list">
                @for (stop of activeRoute.stops; track stop.order.id) {
                  <li>
                    <span class="step-dot">{{ stop.sequence }}</span>
                    <div class="stop-card">
                      <div><small>คาดว่าจะถึง {{ stop.arrivalTime }} น.</small><h3>{{ stop.customer.name }}</h3><p>{{ stop.customer.address }}</p></div>
                      <span class="box-badge">{{ stop.order.boxes }} กล่อง</span>
                      <div class="customer-actions"><a [href]="'tel:' + stop.customer.phone">โทร {{ stop.customer.phone }}</a><span>{{ stop.distanceFromPreviousKm }} กม. จากจุดก่อนหน้า</span></div>
                    </div>
                  </li>
                }
              </ol>
              <a class="button button-primary navigation-button" [href]="store.googleMapsUrl(activeRoute)" target="_blank" rel="noopener">เปิดเส้นทางใน Google Maps</a>
              <p class="map-note">แผนที่นำทางเปิดด้วยพิกัด dummy โปรดตรวจสอบสถานที่จริงก่อนใช้งานภาคสนาม</p>
            </div>
          </div>
        }
      </section>
    </main>
  `,
  styleUrl: './rider.component.scss',
})
export class RiderComponent {
  readonly store = inject(DeliveryService);
  jobCode = '';
  activeRoute: RiderRoute | null = null;
  errorMessage = '';

  openJob(): void {
    if (!this.store.plan()) {
      this.errorMessage = 'ยังไม่มีแผนงาน กรุณาให้เจ้าของร้านกดจัดเส้นทางก่อน';
      return;
    }
    this.activeRoute = this.store.routeForJobCode(this.jobCode);
    this.errorMessage = this.activeRoute ? '' : 'ไม่พบรหัสใบงานนี้ ตรวจตัวอักษรแล้วลองอีกครั้ง';
  }
  useCode(code: string): void { this.jobCode = code; this.openJob(); }
  closeJob(): void { this.activeRoute = null; this.jobCode = ''; this.errorMessage = ''; }
}
