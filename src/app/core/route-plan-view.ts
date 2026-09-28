import { DeliveryRouteModel, RoutePlanModel } from './route-plan.models';

/**
 * Pure view-model mapping for the route-planning page (tested, no Angular
 * dependencies): distinct route colors, GeoJSON `[lng, lat]` → Leaflet
 * `[lat, lng]` conversion, and human-readable routing-source labels.
 * All numbers/times come straight from the backend response.
 */

/** Predefined presentation palette — one distinct color per rider route. */
export const ROUTE_PALETTE = [
  '#9f2f2d',
  '#346538',
  '#1f6c9f',
  '#956400',
  '#6d4aa0',
  '#b3541e',
  '#0e7c7b',
  '#a02060',
  '#4a6b1f',
  '#31437c',
] as const;

export function routeColor(riderIndex: number): string {
  return ROUTE_PALETTE[riderIndex % ROUTE_PALETTE.length]!;
}

export type LatLng = [number, number];

/**
 * Convert a backend GeoJSON LineString (`[longitude, latitude]`) to a
 * Leaflet polyline (`[latitude, longitude]`). Returns null when the plan
 * used fallback routing and carries no road geometry.
 */
export function geometryToLatLngs(job: DeliveryRouteModel): LatLng[] | null {
  if (!job.geometry) return null;
  return job.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

/** Approximate fallback line shop → stops (dashed display when geometry is null). */
export function approximateLine(
  shop: LatLng,
  job: DeliveryRouteModel,
): LatLng[] {
  return [shop, ...job.stops.map((stop): LatLng => [stop.latitude, stop.longitude])];
}

export function routingSourceLabel(plan: RoutePlanModel): string {
  if (plan.routingSource === 'ROAD' && !plan.approximate) return 'เส้นทางถนนจริง (OSRM)';
  return 'เส้นทางโดยประมาณ (สำรอง)';
}

export function deadlineLabel(plan: RoutePlanModel, deadline: string): string {
  return plan.estimatedFinishTime <= deadline ? 'ส่งทันภายในกำหนด' : 'เกินกำหนด';
}
