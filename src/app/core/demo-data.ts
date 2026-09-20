import { Customer, Order, Rider } from './models';

export const DEMO_CUSTOMERS: Customer[] = [
  { id: 'c-01', name: 'อรทัย สีหราช', phone: '089-214-6741', address: 'หอพักริมคลอง ซอย 2', lat: 16.25141, lng: 103.24958 },
  { id: 'c-02', name: 'ณัฐพงษ์ คำวงศ์', phone: '086-703-1284', address: 'บ้านท่าขอนยาง', lat: 16.25538, lng: 103.25804 },
  { id: 'c-03', name: 'พิมพ์ชนก แสนเมือง', phone: '092-551-8073', address: 'คอนโดเดอะการ์เดน', lat: 16.24334, lng: 103.26061 },
  { id: 'c-04', name: 'กิตติศักดิ์ ภูมี', phone: '095-482-3160', address: 'หอพักศรีสุข', lat: 16.23892, lng: 103.25547 },
  { id: 'c-05', name: 'สิริพร วงศ์คำ', phone: '081-934-5026', address: 'หมู่บ้านวังยาว', lat: 16.24043, lng: 103.24542 },
  { id: 'c-06', name: 'ธนกฤต พรหมมา', phone: '098-167-4320', address: 'อาคารเรียนรวม มมส.', lat: 16.24812, lng: 103.26528 },
  { id: 'c-07', name: 'วราภรณ์ จันทะ', phone: '063-819-2457', address: 'ตลาดน้อย มมส.', lat: 16.25373, lng: 103.24331 },
  { id: 'c-08', name: 'ภานุวัฒน์ สุขใจ', phone: '097-330-6815', address: 'บ้านขามเรียง', lat: 16.23499, lng: 103.24969 },
  { id: 'c-09', name: 'ชลธิชา มณีรัตน์', phone: '084-611-9028', address: 'หอพักบ้านสวน', lat: 16.24652, lng: 103.23871 },
];

export const DEMO_ORDERS: Order[] = [
  { id: 'ORD-2601', customerId: 'c-01', boxes: 2, status: 'pending', createdAt: '2026-09-18T10:04:00' },
  { id: 'ORD-2602', customerId: 'c-02', boxes: 1, status: 'pending', createdAt: '2026-09-18T10:09:00' },
  { id: 'ORD-2603', customerId: 'c-03', boxes: 3, status: 'pending', createdAt: '2026-09-18T10:11:00' },
  { id: 'ORD-2604', customerId: 'c-04', boxes: 2, status: 'pending', createdAt: '2026-09-18T10:18:00' },
  { id: 'ORD-2605', customerId: 'c-05', boxes: 1, status: 'pending', createdAt: '2026-09-18T10:25:00' },
  { id: 'ORD-2606', customerId: 'c-06', boxes: 2, status: 'pending', createdAt: '2026-09-18T10:29:00' },
  { id: 'ORD-2607', customerId: 'c-07', boxes: 1, status: 'pending', createdAt: '2026-09-18T10:35:00' },
  { id: 'ORD-2608', customerId: 'c-08', boxes: 3, status: 'pending', createdAt: '2026-09-18T10:42:00' },
];

export const DEMO_RIDERS: Rider[] = [
  { id: 'r-01', name: 'อนุชา แก้วคำ', phone: '086-235-7140', jobCode: 'LUNCH-101', color: '#9f2f2d' },
  { id: 'r-02', name: 'กมลชนก พูลผล', phone: '091-684-2035', jobCode: 'LUNCH-202', color: '#346538' },
  { id: 'r-03', name: 'ธีรภัทร ยอดเมือง', phone: '083-459-6217', jobCode: 'LUNCH-303', color: '#1f6c9f' },
  { id: 'r-04', name: 'ศุภชัย อินทร์งาม', phone: '096-273-8401', jobCode: 'LUNCH-404', color: '#956400' },
];
