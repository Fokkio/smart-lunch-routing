import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../core/models';
import { CustomersApiService } from '../../core/customer-api.service';
import { DeliveryService } from '../../core/delivery.service';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';

type Draft = Omit<Customer, 'id'> & { id?: string };

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, DeliveryMapComponent],
  templateUrl: './customers.component.html',
})
export class CustomersComponent implements OnInit {
  private readonly customerApi = inject(CustomersApiService);
  // รายชื่อ customers for show (from backend)
  readonly apiCustomers = signal<Customer[]>([]);

  // Status Load API
  readonly loadingCustomers = signal(true);
  readonly loadCustomersError = signal('');

  // สถานะบันทึก
  readonly savingCustomer = signal(false);

  readonly store = inject(DeliveryService);
  query = '';
  placeQuery = '';
  showForm = false;
  showCoordinates = false;
  locationSelected = false;
  pickerLocation: { lat: number; lng: number } | null = null;
  manualLat: number | null = null;
  manualLng: number | null = null;
  error = '';
  feedback = '';
  draft: Draft = this.blankDraft();
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // when open customer page ขอ customer API from backend
    this.customerApi.getCustomers().subscribe({
      next: (customers) => {
        this.apiCustomers.set(
          customers.map((customer) => ({
            id: String(customer.id),
            name: customer.name,
            phone: customer.phone,
            address: customer.address ?? '',
            lat: customer.lat,
            lng: customer.lng,
          })),
        );

        this.loadingCustomers.set(false);
      },
      error: (error) => {
        console.error('โหลดลูกค้าจาก API ไม่สำเร็จ:', error);

        this.loadCustomersError.set('โหลดรายชื่อลูกค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        this.loadingCustomers.set(false);
      },
    });
  }

  filteredCustomers(): Customer[] {
    const term = this.query.trim().toLowerCase();
    return this.apiCustomers().filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.address}`.toLowerCase().includes(term),
    );
  }

  placeMatches(): Customer[] {
    const term = this.placeQuery.trim().toLowerCase();
    return term
      ? this.store
          .customers()
          .filter((customer) => `${customer.name} ${customer.address}`.toLowerCase().includes(term))
          .slice(0, 5)
      : [];
  }

  startCreate(): void {
    // กันเปลี่ยนไปเปิดฟอร์มอื่นระหว่างบันทึก
    if (this.savingCustomer()) return;

    this.draft = this.blankDraft();
    this.locationSelected = false;
    this.pickerLocation = null;
    this.manualLat = null;
    this.manualLng = null;
    this.placeQuery = '';
    this.showCoordinates = false;
    this.error = '';
    this.showForm = true;
  }

  edit(customer: Customer): void {
    // กันเปลี่ยนไปเปิดฟอร์มอื่นระหว่างบันทึก
    if (this.savingCustomer()) return;

    this.draft = { ...customer };
    this.locationSelected = true;
    this.pickerLocation = { lat: customer.lat, lng: customer.lng };
    this.manualLat = customer.lat;
    this.manualLng = customer.lng;
    this.placeQuery = '';
    this.showCoordinates = false;
    this.error = '';
    this.showForm = true;
  }

  cancel(): void {
    // กันเปลี่ยนไปเปิดฟอร์มอื่นระหว่างบันทึก
    if (this.savingCustomer()) return;

    this.showForm = false;
    this.error = '';
  }

  selectPlace(customer: Customer): void {
    this.setLocation({ lat: customer.lat, lng: customer.lng });
    if (!this.draft.address.trim()) this.draft.address = customer.address;
    this.placeQuery = '';
  }

  setLocation(location: { lat: number; lng: number }): void {
    this.draft.lat = location.lat;
    this.draft.lng = location.lng;
    this.locationSelected = true;
    this.pickerLocation = location;
    this.manualLat = location.lat;
    this.manualLng = location.lng;
    this.error = '';
  }

  clearLocation(): void {
    this.locationSelected = false;
    this.pickerLocation = null;
  }

  applyCoordinates(): void {
    if (
      this.manualLat === null ||
      this.manualLng === null ||
      !Number.isFinite(this.manualLat) ||
      !Number.isFinite(this.manualLng) ||
      Math.abs(this.manualLat) > 90 ||
      Math.abs(this.manualLng) > 180
    ) {
      this.error = 'กรุณาตรวจสอบตำแหน่งจัดส่งอีกครั้ง';
      return;
    }
    this.setLocation({ lat: this.manualLat, lng: this.manualLng });
  }

  save(): void {
    // ป้องกันส่งคำขอซ้ำระหว่างรอ backend
    if (this.savingCustomer()) return;

    this.error = '';

    // ขั้นนี้เชื่อมเฉพาะเพิ่มลูกค้า ป้องกันเผลอสร้างซ้ำตอนแก้ไข
    if (this.draft.id) {
      this.error = 'การแก้ไขลูกค้ายังไม่ได้เชื่อม API';
      return;
    }

    if (!this.locationSelected) {
      this.error = 'กรุณาปักตำแหน่งจัดส่งของลูกค้า';
      return;
    }

    // หยิบข้อมูลจากฟอร์มเป็นข้อมูลที่จะส่ง โดยไม่ส่ง id
    const input = {
      name: this.draft.name.trim(),
      phone: this.draft.phone.trim(),
      address: this.draft.address.trim() || null,
      lat: this.draft.lat,
      lng: this.draft.lng,
    };

    this.savingCustomer.set(true);

    // CREATE CUSTOMER
    this.customerApi.createCustomer(input).subscribe({
      next: (customer) => {
        // ใช้ข้อมูลที่ backend ตอบกลับ รวมถึง id ที่ฐานข้อมูลสร้างให้
        const savedCustomer: Customer = {
          id: String(customer.id),
          name: customer.name,
          phone: customer.phone,
          address: customer.address ?? '',
          lat: customer.lat,
          lng: customer.lng,
        };

        this.apiCustomers.update((customers) => [savedCustomer, ...customers]);

        this.savingCustomer.set(false);
        this.cancel();
        this.notify('เพิ่มลูกค้าใหม่แล้ว');
      },
      error: (error) => {
        console.error('เพิ่มลูกค้าไม่สำเร็จ:', error);
        this.savingCustomer.set(false);

        // คงฟอร์มและข้อมูลที่กรอกไว้ ให้แก้หรือลองใหม่ได้
        this.error =
          error.status === 400
            ? 'ข้อมูลไม่ถูกต้อง กรุณาตรวจชื่อ เบอร์โทร และพิกัด'
            : 'บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ';
      },
    });
  }

  remove(customer: Customer): void {
    if (!window.confirm(`ลบข้อมูลของ ${customer.name} หรือไม่?`)) return;
    this.notify(
      this.store.deleteCustomer(customer.id)
        ? `ลบข้อมูลของ ${customer.name} แล้ว`
        : 'ลบไม่ได้ เพราะลูกค้ารายนี้ยังมีออเดอร์อยู่',
    );
  }

  private notify(message: string): void {
    clearTimeout(this.feedbackTimer);
    this.feedback = message;
    this.feedbackTimer = setTimeout(() => (this.feedback = ''), 3500);
  }

  private blankDraft(): Draft {
    return { name: '', phone: '', address: '', lat: 16.24631, lng: 103.25286 };
  }
}
