import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApiCustomer, CustomersApiService } from '../../core/customer-api.service';
import { CustomersComponent } from './customers.component';

describe('CustomersComponent loading', () => {
  //  ====================================== //
  it('shows loading, then an error instead of an empty list', async () => {
    // ควบคุมว่า API จะตอบเมื่อไร โดยไม่เรียก backend จริง
    const response = new Subject<ApiCustomer[]>();
    const api = {
      getCustomers: vi.fn().mockReturnValue(response),
    };

    await TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [{ provide: CustomersApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CustomersComponent);

    // เริ่มแสดงหน้า และเรียก ngOnInit()
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement;

    expect(page.textContent).toContain('กำลังโหลดรายชื่อลูกค้า');
    expect(page.textContent).not.toContain('ยังไม่มีข้อมูลลูกค้า');

    // จำลอง API ตอบ error และซ่อน log ที่เราตั้งใจทดสอบ
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      response.error(new Error('Connection failed'));
      fixture.detectChanges();

      expect(page.querySelector('[role="alert"]')?.textContent).toContain(
        'โหลดรายชื่อลูกค้าไม่สำเร็จ',
      );

      expect(page.textContent).not.toContain('กำลังโหลดรายชื่อลูกค้า');
      expect(page.textContent).not.toContain('ยังไม่มีข้อมูลลูกค้า');
    } finally {
      errorLog.mockRestore();
    }
  });

  //   =================================================== //
  it('shows an empty state when the API successfully returns no customers', async () => {
    const response = new Subject<ApiCustomer[]>();
    const api = {
      getCustomers: vi.fn().mockReturnValue(response),
    };

    await TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [{ provide: CustomersApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CustomersComponent);
    fixture.detectChanges();

    // API สำเร็จ แต่ไม่มีรายการลูกค้า
    response.next([]);
    response.complete();
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement;

    expect(page.textContent).toContain('ยังไม่มีข้อมูลลูกค้า');
    expect(page.textContent).not.toContain('กำลังโหลดรายชื่อลูกค้า');
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });


  // ==================================================== //
  // การโหลดรายการ
  it('displays customers returned by the API', async () => {
    const response = new Subject<ApiCustomer[]>();
    const api = {
      getCustomers: vi.fn().mockReturnValue(response),
    };

    await TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [{ provide: CustomersApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CustomersComponent);
    fixture.detectChanges();

    response.next([
      {
        id: 42,
        name: 'ลูกค้าจาก API',
        phone: '0800000000',
        address: null,
        lat: 16.2469,
        lng: 103.2531,
      },
    ]);
    response.complete();
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement;

    expect(page.textContent).toContain('ลูกค้าจาก API');
    expect(page.textContent).toContain('0800000000');
    expect(page.textContent).toContain('ยังไม่มีรายละเอียดที่อยู่');
    expect(page.textContent).not.toContain('ยังไม่มีข้อมูลลูกค้า');
    expect(page.textContent).not.toContain('กำลังโหลดรายชื่อลูกค้า');
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });
});
