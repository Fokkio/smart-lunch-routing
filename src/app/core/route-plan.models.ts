// ไฟล์นี้: รูปแบบข้อมูลแผนที่ backend ส่งมา — หน้าแอปแสดงค่าตรงๆ ไม่คำนวณเส้นทางหรือต้นทุนใหม่

/**
 * Backend RoutePlan response contract (mirrors
 * backend/src/domain/routing/route-plan.types.ts).
 *
 * The frontend renders these values as-is — routing, costing, and timing
 * are decided by the backend and never recomputed here.
 */
// จุดส่งหนึ่งจุดจาก backend: ลำดับ ออเดอร์ ลูกค้า กล่อง ระยะ/เวลาจากจุดก่อน เวลาถึง
export interface RouteStopModel {
  sequence: number;
  orderId: number;
  customerId: number;
  customerName: string;
  phone: string;
  address: string | null;
  latitude: number;
  longitude: number;
  boxCount: number;
  distanceFromPreviousKm: number;
  travelTimeFromPreviousMin: number;
  estimatedArrivalTime: string;
  deliveryStatus: 'WAITING' | 'DELIVERING' | 'DELIVERED';
  geometry?: GeoJsonLineString | null;
}

// เส้นถนนรูปแบบ GeoJSON: ชุดพิกัด [lng, lat]
export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

// งานของไรเดอร์หนึ่งคนจาก backend: จุดส่ง ระยะ เวลา ต้นทุน และเส้นถนน
export interface DeliveryRouteModel {
  acknowledgedAt?: string | null;
  status?: 'WAITING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  jobId?: number;
  jobCode?: string;
  riderIndex: number;
  riderId: number | null;
  totalOrders: number;
  totalBoxes: number;
  distanceKm: number;
  durationMinutes: number;
  estimatedStartTime: string;
  estimatedFinishTime: string;
  deliveryCost: number;
  geometry: GeoJsonLineString | null;
  approximate: boolean;
  stops: RouteStopModel[];
}

export type RoutePlanStatus = 'GENERATED' | 'SELECTED' | 'REJECTED';

// แผนทั้งชุดจาก backend: งานทุกคัน ยอดรวม และที่มาของเส้นทาง
export interface RoutePlanModel {
  startTime?: string;
  deliveryDeadline?: string;
  shop?: import('./shop-settings-api.service').ShopSettings;
  routePlanId?: number;
  planDate: string;
  status: RoutePlanStatus;
  routingSource: 'ROAD' | 'HAVERSINE';
  approximate: boolean;
  fallbackReason?: string;
  riderCount: number;
  totalDistanceKm: number;
  estimatedFinishTime: string;
  totalBoxes: number;
  totalRevenue: number;
  totalFoodCost: number;
  totalDeliveryCost: number;
  estimatedProfit: number;
  jobs: DeliveryRouteModel[];
}

/** List/summary contract: same metrics, no `jobs` (see detail endpoint). */
// สรุปแผน (เหมือนแผนเต็มแต่ไม่มีรายละเอียดงาน)
export type RoutePlanSummaryModel = Omit<RoutePlanModel, 'jobs'>;

/** Response for the signed-in rider's jobs. */
// ใบงานของไรเดอร์ที่ login อยู่: แผน งาน และข้อมูลร้าน
export interface RiderJobModel {
  planId: number;
  job: DeliveryRouteModel;
  shop: {
    latitude: number;
    longitude: number;
    deliveryDeadline: string;
    shopName?: string;
    deliveryStartTime?: string;
  };
}
