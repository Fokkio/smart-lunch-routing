/** Customer API contract; UI string IDs are mapped separately. */
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

export interface ApiCustomerInput {
  name: string;
  phone: string;
  address: string | null;
  lat: number;
  lng: number;
}
