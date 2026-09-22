import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../core/models';
import { DeliveryService } from '../../core/delivery.service';
import { DeliveryMapComponent } from '../../shared/delivery-map/delivery-map.component';

type Draft = Omit<Customer, 'id'> & { id?: string };

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, DeliveryMapComponent],
  templateUrl: './customers.component.html',
})
export class CustomersComponent {
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

  filteredCustomers(): Customer[] {
    const term = this.query.trim().toLowerCase();
    return this.store.customers().filter((customer) => `${customer.name} ${customer.phone} ${customer.address}`.toLowerCase().includes(term));
  }

  placeMatches(): Customer[] {
    const term = this.placeQuery.trim().toLowerCase();
    return term ? this.store.customers().filter((customer) => `${customer.name} ${customer.address}`.toLowerCase().includes(term)).slice(0, 5) : [];
  }

  startCreate(): void {
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

  cancel(): void { this.showForm = false; this.error = ''; }

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

  clearLocation(): void { this.locationSelected = false; this.pickerLocation = null; }

  applyCoordinates(): void {
    if (this.manualLat === null || this.manualLng === null || !Number.isFinite(this.manualLat) || !Number.isFinite(this.manualLng) || Math.abs(this.manualLat) > 90 || Math.abs(this.manualLng) > 180) {
      this.error = 'กรุณาตรวจสอบตำแหน่งจัดส่งอีกครั้ง';
      return;
    }
    this.setLocation({ lat: this.manualLat, lng: this.manualLng });
  }

  save(): void {
    if (!this.locationSelected) { this.error = 'กรุณาปักตำแหน่งจัดส่งของลูกค้า'; return; }
    const message = this.draft.id ? 'บันทึกการแก้ไขลูกค้าแล้ว' : 'เพิ่มลูกค้าใหม่แล้ว';
    this.store.saveCustomer(this.draft);
    this.cancel();
    this.notify(message);
  }

  remove(customer: Customer): void {
    if (!window.confirm(`ลบข้อมูลของ ${customer.name} หรือไม่?`)) return;
    this.notify(this.store.deleteCustomer(customer.id) ? `ลบข้อมูลของ ${customer.name} แล้ว` : 'ลบไม่ได้ เพราะลูกค้ารายนี้ยังมีออเดอร์อยู่');
  }

  private notify(message: string): void {
    clearTimeout(this.feedbackTimer);
    this.feedback = message;
    this.feedbackTimer = setTimeout(() => this.feedback = '', 3500);
  }

  private blankDraft(): Draft { return { name: '', phone: '', address: '', lat: 16.24631, lng: 103.25286 }; }
}
