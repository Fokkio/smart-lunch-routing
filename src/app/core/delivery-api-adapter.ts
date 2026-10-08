import type { ApiCustomer } from './customer-api.models';
import type { ApiOrder, ApiOrderStatus } from './order-api.service';
import type { ApiRider } from './rider-api.service';
import type { Customer, Order, OrderStatus, Rider } from './models';

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

export function fromBackendStatus(status: ApiOrderStatus): OrderStatus {
  if (status === 'PENDING') return 'pending';
  if (status === 'DELIVERED') return 'delivered';
  return 'assigned';
}

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

export function mapOrder(raw: ApiOrder): Order {
  return {
    id: String(raw.id),
    customerId: String(raw.customerId),
    boxes: raw.boxes,
    status: fromBackendStatus(raw.status),
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

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
