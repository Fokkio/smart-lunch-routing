/**
 * Backend Customers contract — mirrors
 * `backend/src/models/customer.model.ts` (`Customer` / `CustomerInput`).
 *
 * Deliberately separate from the legacy `Customer` in `./models.ts`: that one
 * still drives the Orders / Delivery / Rider demo flows with string ids
 * (`'c-01'`) and non-null `address`. Changing it globally would force a
 * migration of features that Phase 1B must not touch, so the API layer owns
 * its own DTO and maps nothing back into the legacy model.
 */
export interface ApiCustomer {
  /** Backend `customers.customer_id` — a number, unlike the legacy string id. */
  id: number;
  name: string;
  phone: string;
  /** Nullable because the backend column is nullable. */
  address: string | null;
  lat: number;
  lng: number;
  createdAt?: string;
}

/**
 * Body accepted by `POST /api/customers` and `PUT /api/customers/:id`.
 * Only fields the backend reads — never send frontend-only fields.
 */
export interface ApiCustomerInput {
  name: string;
  phone: string;
  address?: string | null;
  lat: number;
  lng: number;
}
