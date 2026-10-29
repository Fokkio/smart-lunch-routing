// ไฟล์นี้: แปลงข้อมูลดิบจาก API ให้เป็นรูปที่หน้าแอปใช้ (id ตัวเลข -> ข้อความ, สถานะ backend -> สถานะหน้าแอป)

import type { ApiCustomer } from '../models/customer-api.models';
import type { ApiOrder, ApiOrderStatus } from '../api/order-api.service';
import type { ApiRider } from '../api/rider-api.service';
import type { Customer, Order, OrderStatus, Rider } from '../models/models';

const RIDER_COLORS = [
  '#d13b45',
  '#16865c',
  '#0053fd',
  '#c96a16',
  '#7549c7',
  '#0b7a88',
  '#4e7472',
  '#a25228',
  '#5967a2',
  '#7b5e39',
];

// แปลงสถานะออเดอร์จาก backend (PENDING/DELIVERED/อื่น) -> pending/delivered/assigned
export function fromBackendStatus(status: ApiOrderStatus): OrderStatus {
  if (status === 'PENDING') return 'pending';
  if (status === 'DELIVERED') return 'delivered';
  return 'assigned';
}

// แปลงลูกค้าจาก API -> ลูกค้าของหน้าแอป (id เป็นข้อความ, ที่อยู่ค่าว่างเป็น '')
export function mapCustomer(raw: ApiCustomer): Customer {
  return {
    id: String(raw.id),
    name: raw.name,
    phone: raw.phone,
    address: raw.address ?? '',
    lat: Number(raw.lat),
    lng: Number(raw.lng),
  };
}

// แปลงออเดอร์จาก API -> ออเดอร์ของหน้าแอป พร้อมแปลงสถานะ
export function mapOrder(raw: ApiOrder): Order {
  return {
    id: String(raw.id),
    customerId: String(raw.customerId),
    boxes: raw.boxes,
    status: fromBackendStatus(raw.status),
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

// แปลงไรเดอร์จาก API -> ไรเดอร์ของหน้าแอป พร้อมกำหนดสีและรหัสงานตามลำดับ
export function mapRider(raw: ApiRider, index: number): Rider {
  return {
    workStatus: raw.workStatus,
    assignedOrdersToday: raw.assignedOrdersToday,
    id: String(raw.id),
    name: raw.name,
    phone: raw.phone ?? '',
    jobCode: `LUNCH-${raw.id}`,
    color: RIDER_COLORS[index % RIDER_COLORS.length]!,
  };
}
