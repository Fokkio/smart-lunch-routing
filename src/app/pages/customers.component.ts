import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorMessage } from '../core/api-error';
import { ApiCustomer, ApiCustomerInput } from '../core/customer-api.models';
import { CustomerApiService } from '../core/customer-api.service';
import { DeliveryMapComponent } from '../shared/delivery-map.component';

type Draft = { id?: number; name: string; phone: string; address: string; lat: number; lng: number };

/** Backend rules only (`CustomerService`) — no invented business rules. */
const LAT_LIMIT = 90;
const LNG_LIMIT = 180;

function validateCustomer(payload: ApiCustomerInput): string | null {
  if (!payload.name.trim() || !payload.phone.trim()) return 'name, phone, latitude and longitude are required';
  if (!Number.isFinite(payload.lat) || payload.lat < -LAT_LIMIT || payload.lat > LAT_LIMIT) return 'latitude must be between -90 and 90';
  if (!Number.isFinite(payload.lng) || payload.lng < -LNG_LIMIT || payload.lng > LNG_LIMIT) return 'longitude must be between -180 and 180';
  return null;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule, DeliveryMapComponent],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent {
  private readonly api = inject(CustomerApiService);

  /** API-backed page state — never seeded from localStorage. */
  readonly customers = signal<ApiCustomer[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly listError = signal('');
  readonly error = signal('');

  query = '';
  placeQuery = '';
  showForm = false;
  showCoordinates = false;
  locationSelected = false;
  pickerLocation: { lat: number; lng: number } | null = null;
  manualLat: number | null = null;
  manualLng: number | null = null;
  draft: Draft = this.blankDraft();

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.load();
  }

  filteredCustomers(): ApiCustomer[] {
    const term = this.query.trim().toLowerCase();
    return this.customers().filter((customer) => `${customer.name} ${customer.phone} ${customer.address ?? ''}`.toLowerCase().includes(term));
  }

  placeMatches(): ApiCustomer[] {
    const term = this.placeQuery.trim().toLowerCase();
    return term ? this.customers().filter((customer) => `${customer.name} ${customer.address ?? ''}`.toLowerCase().includes(term)).slice(0, 5) : [];
  }

  startCreate(): void {
    this.draft = this.blankDraft();
    this.locationSelected = false;
    this.pickerLocation = null;
    this.manualLat = null;
    this.manualLng = null;
    this.placeQuery = '';
    this.showCoordinates = false;
    this.error.set('');
    this.showForm = true;
  }

  edit(customer: ApiCustomer): void {
    this.draft = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address ?? '',
      lat: customer.lat,
      lng: customer.lng,
    };
    this.locationSelected = true;
    this.pickerLocation = { lat: customer.lat, lng: customer.lng };
    this.manualLat = customer.lat;
    this.manualLng = customer.lng;
    this.placeQuery = '';
    this.showCoordinates = false;
    this.error.set('');
    this.showForm = true;
  }

  cancel(): void { this.showForm = false; this.error.set(''); }

  selectPlace(customer: ApiCustomer): void {
    this.setLocation({ lat: customer.lat, lng: customer.lng });
    if (!this.draft.address.trim()) this.draft.address = customer.address ?? '';
    this.placeQuery = '';
  }

  setLocation(location: { lat: number; lng: number }): void {
    this.draft.lat = location.lat;
    this.draft.lng = location.lng;
    this.locationSelected = true;
    this.pickerLocation = location;
    this.manualLat = location.lat;
    this.manualLng = location.lng;
    this.error.set('');
  }

  clearLocation(): void { this.locationSelected = false; this.pickerLocation = null; }

  applyCoordinates(): void {
    if (this.manualLat === null || this.manualLng === null || !Number.isFinite(this.manualLat) || !Number.isFinite(this.manualLng) || Math.abs(this.manualLat) > LAT_LIMIT || Math.abs(this.manualLng) > LNG_LIMIT) {
      this.error.set('กรุณาตรวจสอบตำแหน่งจัดส่งอีกครั้ง');
      return;
    }
    this.setLocation({ lat: this.manualLat, lng: this.manualLng });
  }

  save(): void {
    if (this.saving()) return; // guard against double submit
    if (!this.locationSelected) { this.error.set('กรุณาปักตำแหน่งจัดส่งของลูกค้า'); return; }

    const payload: ApiCustomerInput = {
      name: this.draft.name.trim(),
      phone: this.draft.phone.trim(),
      address: this.draft.address.trim(),
      lat: this.draft.lat,
      lng: this.draft.lng,
    };
    const invalid = validateCustomer(payload);
    if (invalid) { this.error.set(invalid); return; } // never call the API with an invalid form

    this.error.set('');
    this.saving.set(true);
    const creating = this.draft.id === undefined;
    const request = creating ? this.api.create(payload) : this.api.update(this.draft.id!, payload);
    request.subscribe({
      next: (saved) => {
        this.upsert(saved);
        this.saving.set(false);
        this.cancel();
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'บันทึกข้อมูลลูกค้าไม่สำเร็จ'));
        this.saving.set(false);
      },
    });
  }

  remove(customer: ApiCustomer): void {
    if (this.deletingId() !== null) return;
    if (!window.confirm(`ลบข้อมูลของ ${customer.name} หรือไม่?`)) return;
    this.listError.set('');
    this.deletingId.set(customer.id);
    this.api.delete(customer.id).subscribe({
      next: () => {
        this.customers.update((list) => list.filter((item) => item.id !== customer.id));
        this.deletingId.set(null);
      },
      error: (err) => {
        this.listError.set(apiErrorMessage(err, 'ลบข้อมูลลูกค้าไม่สำเร็จ'));
        this.deletingId.set(null);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.listError.set('');
    this.api.list().subscribe({
      next: (customers) => { this.customers.set(customers); this.loading.set(false); },
      error: (err) => { this.listError.set(apiErrorMessage(err, 'โหลดรายชื่อลูกค้าไม่สำเร็จ')); this.loading.set(false); },
    });
  }

  /** Sync the list with the backend response (create → prepend, update → replace). */
  private upsert(saved: ApiCustomer): void {
    this.customers.update((list) => {
      const index = list.findIndex((item) => item.id === saved.id);
      return index === -1 ? [saved, ...list] : list.map((item) => (item.id === saved.id ? saved : item));
    });
  }

  private blankDraft(): Draft { return { name: '', phone: '', address: '', lat: 16.24631, lng: 103.25286 }; }
}
