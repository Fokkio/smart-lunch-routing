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

  // null = ไม่ได้กำลังลบ / string = id ของลูกค้าที่กำลังลบ
  readonly deletingCustomerId = signal<string | null>(null);

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
    // กันเปลี่ยนไปเปิดฟอร์มอื่นระหว่างบันทึก และ ลบ
    if (this.savingCustomer() || this.deletingCustomerId() !== null) return;

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
    // กันเปลี่ยนไปเปิดฟอร์มอื่นระหว่างบันทึก และ ลบ
    if (this.savingCustomer() || this.deletingCustomerId() !== null) return;

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
    // กันเปลี่ยนไปเปิดฟอร์มอื่นระหว่างบันทึก และ ลบ
    if (this.savingCustomer() || this.deletingCustomerId() !== null) return;

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
  // กันเปลี่ยนไปเปิดฟอร์มอื่นระหว่างบันทึก และ ลบ ไม่เกิดขึ้นพร้อมกัน
    if (this.savingCustomer() || this.deletingCustomerId() !== null) return;

    this.error = '';

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

    // เก็บ id ของรายการที่กำลังแก้ไขไว้ก่อนส่งคำขอ
    const editingId = this.draft.id;

    // มี id = แก้คนเดิมด้วย PUT / ไม่มี id = เพิ่มคนใหม่ด้วย POST
    const request = editingId
      ? this.customerApi.updateCustomer(editingId, input)
      : this.customerApi.createCustomer(input);

    request.subscribe({
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

        // EDIT CUSTOMER
        this.apiCustomers.update((customers) =>
          editingId
            ? // แก้ไข: แทนข้อมูลคนเดิมด้วยข้อมูลที่ backend ตอบกลับ
              customers.map((item) => (item.id === editingId ? savedCustomer : item))
            : // เพิ่มใหม่: วางลูกค้าใหม่ไว้ต้นรายการ
              [savedCustomer, ...customers],
        );

        this.savingCustomer.set(false);
        this.cancel();
        this.notify(editingId ? 'บันทึกการแก้ไขลูกค้าแล้ว' : 'เพิ่มลูกค้าใหม่แล้ว');
      },
      error: (error) => {
        console.error('บันทึกลูกค้าไม่สำเร็จ:', error);
        this.savingCustomer.set(false);

        // คงฟอร์มและข้อมูลที่กรอกไว้ ให้แก้หรือลองใหม่ได้
        this.error =
          error.status === 400
            ? 'ข้อมูลไม่ถูกต้อง กรุณาตรวจชื่อ เบอร์โทร และพิกัด'
            : 'บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ';
      },
    });
  }

  // REMOVE //
  remove(customer: Customer): void {
    // ไม่ให้ลบซ้ำ หรือลบระหว่างบันทึกฟอร์ม
    if (this.savingCustomer() || this.deletingCustomerId() !== null) return;

    if (!window.confirm(`ลบข้อมูลของ ${customer.name} หรือไม่?`)) return;

    this.deletingCustomerId.set(customer.id);

    this.customerApi.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.deletingCustomerId.set(null);

        // backend ลบสำเร็จแล้ว จึงเอารายการออกจากหน้าจอ
        this.apiCustomers.update((customers) =>
          customers.filter((item) => item.id !== customer.id),
        );

        // ถ้าเปิดฟอร์มของคนที่ถูกลบอยู่ ให้ปิดฟอร์มด้วย
        if (this.draft.id === customer.id) this.cancel();

        this.notify(`ลบข้อมูลของ ${customer.name} แล้ว`);
      },
      error: (error) => {
        this.deletingCustomerId.set(null);

        if (error.status === 409) {
          this.notify('ลบไม่ได้ เพราะลูกค้ารายนี้มีออเดอร์อ้างอิงอยู่');
        } else if (error.status === 404) {
          this.notify('ไม่พบลูกค้ารายนี้แล้ว กรุณารีเฟรชรายการ');
        } else {
          this.notify('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
      },
    });
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
