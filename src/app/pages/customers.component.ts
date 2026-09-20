import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer } from '../core/models';
import { DeliveryService } from '../core/delivery.service';
import { DeliveryMapComponent } from '../shared/delivery-map.component';
import { RevealDirective } from '../shared/reveal.directive';

type CustomerDraft = Omit<Customer, 'id'> & { id?: string };

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, DeliveryMapComponent, RevealDirective],
  template: `
    <main class="page section-page">
      <header class="section-heading" appReveal>
        <div><p class="eyebrow">CUSTOMER DIRECTORY</p><h1>ลูกค้าและพิกัด</h1><p>ค้นหาจากเบอร์โทร ตรวจจุดส่งบนแผนที่ และแก้ข้อมูลที่ใช้คำนวณเส้นทาง</p></div>
        <button class="button button-primary" type="button" (click)="startCreate()">เพิ่มลูกค้า</button>
      </header>

      <section class="split-layout" appReveal>
        <article class="panel table-panel">
          <div class="toolbar">
            <label class="search-field"><span>ค้นหา</span><input [(ngModel)]="query" placeholder="ชื่อ เบอร์โทร หรือที่อยู่" /></label>
            <span class="count-label">{{ filteredCustomers().length }} รายการ</span>
          </div>
          <div class="customer-list">
            @for (customer of filteredCustomers(); track customer.id) {
              <article class="customer-row">
                <span class="initial">{{ customer.name.slice(0, 1) }}</span>
                <div><strong>{{ customer.name }}</strong><small>{{ customer.phone }}</small><p>{{ customer.address }}</p></div>
                <div class="coordinate"><small>LAT / LNG</small><span>{{ customer.lat.toFixed(5) }}<br>{{ customer.lng.toFixed(5) }}</span></div>
                <div class="row-actions"><button type="button" (click)="edit(customer)">แก้ไข</button><button type="button" (click)="remove(customer)">ลบ</button></div>
              </article>
            } @empty { <div class="no-results">ไม่พบลูกค้าที่ตรงกับคำค้น</div> }
          </div>
        </article>

        <aside class="side-stack">
          <article class="panel form-panel">
            <div class="panel-heading"><div><p class="eyebrow">{{ draft.id ? 'EDIT RECORD' : 'NEW RECORD' }}</p><h2>{{ draft.id ? 'แก้ข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่' }}</h2></div></div>
            <form (ngSubmit)="save()" #customerForm="ngForm">
              <label>ชื่อ–นามสกุล<input required name="name" [(ngModel)]="draft.name" /></label>
              <label>เบอร์โทร<input required name="phone" [(ngModel)]="draft.phone" inputmode="tel" /></label>
              <label>ที่อยู่<textarea required name="address" [(ngModel)]="draft.address" rows="2"></textarea></label>
              <div class="field-pair"><label>ละติจูด<input required type="number" step="0.00001" name="lat" [(ngModel)]="draft.lat" /></label><label>ลองจิจูด<input required type="number" step="0.00001" name="lng" [(ngModel)]="draft.lng" /></label></div>
              <p class="form-note">เดโมนี้ใช้พิกัดโดยตรง การค้นหาที่อยู่และ geocoding ต้องเพิ่มบริการแยกในระบบจริง</p>
              <div class="form-actions"><button class="button button-primary" [disabled]="customerForm.invalid" type="submit">บันทึกข้อมูล</button><button class="button button-secondary" type="button" (click)="startCreate()">ล้างฟอร์ม</button></div>
            </form>
          </article>
          <article class="panel mini-map"><app-delivery-map [customers]="store.customers()" [compact]="true" /></article>
        </aside>
      </section>
    </main>
  `,
  styleUrl: './customers.component.scss',
})
export class CustomersComponent {
  readonly store = inject(DeliveryService);
  query = '';
  draft: CustomerDraft = this.blankDraft();

  filteredCustomers(): Customer[] {
    const term = this.query.trim().toLowerCase();
    if (!term) return this.store.customers();
    return this.store.customers().filter((customer) => `${customer.name} ${customer.phone} ${customer.address}`.toLowerCase().includes(term));
  }

  edit(customer: Customer): void { this.draft = { ...customer }; }
  startCreate(): void { this.draft = this.blankDraft(); }
  save(): void { this.store.saveCustomer(this.draft); this.startCreate(); }
  remove(customer: Customer): void {
    if (!this.store.deleteCustomer(customer.id)) window.alert('ลบไม่ได้ เพราะลูกค้ารายนี้ยังมีออเดอร์อยู่');
  }

  private blankDraft(): CustomerDraft {
    return { name: '', phone: '', address: '', lat: 16.24631, lng: 103.25286 };
  }
}
