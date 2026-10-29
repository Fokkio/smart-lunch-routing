// ไฟล์นี้: รูปแบบข้อมูลหลักที่หน้าแอปใช้ — ลูกค้า ออเดอร์ ไรเดอร์ จุดส่ง เส้นทาง และแผน

// ลูกค้าในหน้าแอป: id ข้อความ ชื่อ เบอร์ ที่อยู่ พิกัด
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

export type OrderStatus = 'pending' | 'assigned' | 'delivered';

// ออเดอร์ในหน้าแอป: ผูกกับลูกค้า จำนวนกล่อง สถานะ
export interface Order {
  id: string;
  customerId: string;
  boxes: number;
  status: OrderStatus;
  createdAt: string;
}

// ไรเดอร์ในหน้าแอป: สถานะงาน รหัสงาน สีประจำตัว
export interface Rider {
  workStatus?: 'READY' | 'BUSY' | 'DELIVERING' | 'PAUSED' | 'UNCONFIGURED';
  assignedOrdersToday?: number;
  id: string;
  name: string;
  phone: string;
  jobCode: string;
  color: string;
}

// จุดส่งหนึ่งจุด: ออเดอร์+ลูกค้า ลำดับ ระยะจากจุดก่อน เวลาถึงโดยประมาณ
export interface RouteStop {
  order: Order;
  customer: Customer;
  sequence: number;
  distanceFromPreviousKm: number;
  arrivalTime: string;
  deliveryStatus?: 'WAITING' | 'DELIVERING' | 'DELIVERED';
}

// เส้นทางของไรเดอร์หนึ่งคน: จุดส่ง กล่อง ระยะ เวลา ต้นทุน รายรับ กำไร
export interface RiderRoute {
  estimatedStartTime?: string;
  estimatedFinishTime?: string;
  rider: Rider;
  stops: RouteStop[];
  totalBoxes: number;
  distanceKm: number;
  durationMinutes: number;
  deliveryCost: number;
  revenue: number;
  foodCost: number;
  profit: number;
  deadlineSafe: boolean;
}

// แผนทั้งชุด: เส้นทางทุกคัน ยอดรวม และเวลาจบโดยประมาณ
export interface RoutePlan {
  startTime?: string;
  deliveryDeadline?: string;
  shop?: import('../api/shop-settings-api.service').ShopSettings;
  estimatedFinishTime?: string;
  version: number;
  generatedAt: string;
  routes: RiderRoute[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  deliveryCost: number;
  revenue: number;
  foodCost: number;
  profit: number;
  deadlineSafe: boolean;
}

// ค่าร้านตั้งต้น (ใช้เมื่อยังโหลดค่าตั้งร้านจาก backend ไม่ได้)
export const SHOP = {
  name: 'ครัวเที่ยงตรง',
  lat: 16.24631,
  lng: 103.25286,
  departureTime: '11:30',
  deadlineTime: '12:30',
} as const;
