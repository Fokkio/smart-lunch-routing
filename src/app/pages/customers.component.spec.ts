import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ApiCustomer } from '../core/customer-api.models';
import { MapCustomer } from '../shared/delivery-map.component';
import { CustomersComponent } from './customers.component';

const LIST: ApiCustomer[] = [
  { id: 3, name: 'สมหญิง', phone: '0811111111', address: 'หอพัก เอ', lat: 16.25, lng: 103.25 },
  { id: 2, name: 'สมชาย', phone: '0822222222', address: null, lat: 16.26, lng: 103.26 },
];

/** Replaces the real Leaflet map, which cannot run in jsdom. */
@Component({
  selector: 'app-delivery-map',
  standalone: true,
  template: '<div class="stub-map">{{ customers.length }}</div>',
})
class DeliveryMapStubComponent {
  @Input() customers: MapCustomer[] = [];
  @Input() pickable = false;
  @Input() selectedLocation: { lat: number; lng: number } | null = null;
  @Output() locationPicked = new EventEmitter<{ lat: number; lng: number }>();
}

describe('Customers page (backend Customers API)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.overrideComponent(CustomersComponent, { set: { imports: [FormsModule, DeliveryMapStubComponent] } });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function open() {
    const fixture = TestBed.createComponent(CustomersComponent);
    fixture.detectChanges();
    http.expectOne('/api/customers').flush(LIST);
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Refreshes after a plain-property mutation made outside Angular.
   * The zoneless scheduler only marks views dirty for signals and event
   * handlers, so `fixture.detectChanges()` would run `checkNoChanges()` against
   * a view it never refreshed and report a false NG0100.
   */
  function refresh(fixture: ComponentFixture<CustomersComponent>): void {
    fixture.changeDetectorRef.detectChanges();
  }

  function prepareForm(component: CustomersComponent): void {
    component.startCreate();
    component.setLocation({ lat: 16.3, lng: 103.3 });
    component.draft = { ...component.draft, name: 'ใหม่ ใจดี', phone: '0833333333', address: 'คอนโด บี' };
  }

  it('loads the list from GET /api/customers and renders every row', () => {
    const fixture = open();
    const rows = fixture.nativeElement.querySelectorAll('.customer-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('สมหญิง');
    expect(rows[1].textContent).toContain('สมชาย');
    expect(fixture.nativeElement.textContent).toContain('2 รายการ');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('passes the API list (not demo data) into the map picker', () => {
    const fixture = open();
    expect(fixture.nativeElement.querySelector('app-delivery-map')).toBeNull();
    fixture.componentInstance.startCreate();
    refresh(fixture);
    expect(fixture.nativeElement.querySelector('.stub-map')?.textContent).toBe('2');
  });

  it('filters the loaded list client-side', () => {
    const component = open().componentInstance;
    component.query = '081111';
    expect(component.filteredCustomers().map((c) => c.id)).toEqual([3]);
    component.query = 'หอพัก';
    expect(component.filteredCustomers().map((c) => c.id)).toEqual([3]);
    component.query = 'ไม่มีในระบบ';
    expect(component.filteredCustomers()).toEqual([]);
  });

  it('creates a customer with POST /api/customers', () => {
    const fixture = open();
    const component = fixture.componentInstance;
    prepareForm(component);
    component.save();

    const request = http.expectOne('/api/customers');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'ใหม่ ใจดี', phone: '0833333333', address: 'คอนโด บี', lat: 16.3, lng: 103.3 });
    request.flush({ id: 9, name: 'ใหม่ ใจดี', phone: '0833333333', address: 'คอนโด บี', lat: 16.3, lng: 103.3 });

    expect(component.showForm).toBe(false);
    expect(component.saving()).toBe(false);
    expect(component.customers().map((c) => c.id)).toEqual([9, 3, 2]);
  });

  it('updates an existing customer with PUT /api/customers/:id', () => {
    const fixture = open();
    const component = fixture.componentInstance;
    component.edit(LIST[0]);
    component.draft = { ...component.draft, name: 'สมหญิง แก้ไขแล้ว' };
    component.save();

    const request = http.expectOne('/api/customers/3');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.name).toBe('สมหญิง แก้ไขแล้ว');
    request.flush({ ...LIST[0], name: 'สมหญิง แก้ไขแล้ว' });

    expect(component.customers().find((c) => c.id === 3)?.name).toBe('สมหญิง แก้ไขแล้ว');
    expect(component.showForm).toBe(false);
  });

  it('never calls the API when the form is invalid', () => {
    const fixture = open();
    const component = fixture.componentInstance;
    component.startCreate();
    component.setLocation({ lat: 16.3, lng: 103.3 });
    component.draft = { ...component.draft, name: '   ', phone: '   ' };
    component.save();

    http.expectNone('/api/customers');
    expect(component.error()).toBe('name, phone, latitude and longitude are required');
    expect(component.saving()).toBe(false);
  });

  it('blocks a second save while one is in flight', () => {
    const fixture = open();
    const component = fixture.componentInstance;
    prepareForm(component);
    component.save();
    component.save();

    const pending = http.match('/api/customers');
    expect(pending.length).toBe(1);
    pending[0].flush({ id: 9, name: 'ใหม่ ใจดี', phone: '0833333333', address: 'คอนโด บี', lat: 16.3, lng: 103.3 });
    expect(component.customers().length).toBe(3);
  });

  it('shows the backend message when saving fails', () => {
    const fixture = open();
    const component = fixture.componentInstance;
    prepareForm(component);
    component.save();

    http.expectOne('/api/customers').flush({ message: 'Customer already exists' }, { status: 500, statusText: 'Server Error' });

    expect(component.error()).toBe('Customer already exists');
    expect(component.saving()).toBe(false);
    expect(component.showForm).toBe(true);
    expect(component.customers().length).toBe(2);
  });

  it('deletes a customer and drops the row from the list', () => {
    const fixture = open();
    const component = fixture.componentInstance;
    component.remove(LIST[1]);

    const request = http.expectOne('/api/customers/2');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(component.customers().map((c) => c.id)).toEqual([3]);
    expect(component.deletingId()).toBeNull();
  });

  it('keeps the row and surfaces the backend message when delete fails', () => {
    const fixture = open();
    const component = fixture.componentInstance;
    component.remove(LIST[1]);

    http.expectOne('/api/customers/2').flush({ message: 'Customer is referenced by an order' }, { status: 500, statusText: 'Server Error' });

    expect(component.customers().length).toBe(2);
    expect(component.listError()).toBe('Customer is referenced by an order');
    expect(component.deletingId()).toBeNull();
  });

  it('does not call DELETE when the user declines the confirmation', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const component = open().componentInstance;
    component.remove(LIST[1]);

    http.expectNone('/api/customers/2');
    expect(component.customers().length).toBe(2);
  });

  it('reports a failed initial load instead of silently showing an empty list', () => {
    const fixture = TestBed.createComponent(CustomersComponent);
    fixture.detectChanges();
    http.expectOne('/api/customers').flush({ message: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(fixture.componentInstance.listError()).toBe('Service unavailable');
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.customers()).toEqual([]);

    refresh(fixture);
    expect(fixture.nativeElement.querySelector('.list-status')?.textContent).toContain('Service unavailable');
    expect(fixture.nativeElement.querySelector('.no-results')).toBeNull();
  });

  it('reloads on demand after a failed load', () => {
    const fixture = TestBed.createComponent(CustomersComponent);
    fixture.detectChanges();
    http.expectOne('/api/customers').flush({ message: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    fixture.componentInstance.reload();
    http.expectOne('/api/customers').flush(LIST);
    expect(fixture.componentInstance.customers().length).toBe(2);
    expect(fixture.componentInstance.listError()).toBe('');
  });
});
