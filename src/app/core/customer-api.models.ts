// ไฟล์นี้: รูปแบบข้อมูลลูกค้าที่ backend ส่งมา/รับไป (contract ของ API)

/** Customer API contract; UI string IDs are mapped separately. */
// ข้อมูลลูกค้าจาก API (id เป็นตัวเลข, มีระยะทางเมื่อค้นหาใกล้ร้าน)
export interface ApiCustomer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  lat: number;
  lng: number;
  createdAt?: string;
  distanceKm?: number;
}

// ข้อมูลลูกค้าที่ส่งไปสร้าง/แก้ไข (ไม่มี id)
export interface ApiCustomerInput {
  name: string;
  phone: string;
  address: string | null;
  lat: number;
  lng: number;
}
