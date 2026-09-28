import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { DeliveryRouteModel } from '../core/route-plan.models';
import { approximateLine, geometryToLatLngs, LatLng, routeColor } from '../core/route-plan-view';

const SHOP: LatLng = [16.24631, 103.25286];

/**
 * Leaflet map for a backend-generated RoutePlan (OpenStreetMap tiles).
 * Renders backend GeoJSON geometry as road polylines; jobs without
 * geometry (fallback) render as a clearly labelled dashed approximate line.
 */
@Component({
  selector: 'app-route-plan-map',
  standalone: true,
  template: '<div #map class="route-plan-map" role="region" aria-label="แผนที่เส้นทางจากระบบหลังบ้าน"></div>',
  styles: [`.route-plan-map { width: 100%; height: 100%; min-height: 420px; background: #f7f6f3; }`],
})
export class RoutePlanMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() jobs: DeliveryRouteModel[] = [];
  @Input() selectedJob: number | null = null;
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private layer?: L.FeatureGroup;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement, { zoomControl: true }).setView(SHOP, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.render();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.map) this.render();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private render(): void {
    if (!this.map) return;
    this.layer?.remove();
    this.layer = L.featureGroup().addTo(this.map);
    L.circleMarker(SHOP, {
      radius: 9, color: '#111111', fillColor: '#ffffff', fillOpacity: 1, weight: 3,
    }).bindPopup('<strong>ครัวเที่ยงตรง</strong><br>จุดเริ่มต้น 11:30 น.').addTo(this.layer);

    this.jobs.forEach((job, index) => {
      const color = routeColor(job.riderIndex);
      const focused = this.selectedJob === null || this.selectedJob === index;
      const line = geometryToLatLngs(job) ?? approximateLine(SHOP, job);
      L.polyline(line, {
        color, weight: this.selectedJob === index ? 7 : 5,
        opacity: focused ? 0.9 : 0.3,
        dashArray: job.geometry ? undefined : '8 8',
      })
        .bindPopup(job.geometry ? `ไรเดอร์ ${index + 1} · ${job.distanceKm} กม.` : `ไรเดอร์ ${index + 1} · Approximate route (โดยประมาณ)`)
        .addTo(this.layer!);
      job.stops.forEach((stop) => {
        L.marker([stop.latitude, stop.longitude], {
          icon: L.divIcon({
            className: 'stop-badge',
            html: `<span style="background:${color};color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">${stop.sequence}</span>`,
            iconSize: [24, 24],
          }),
        }).bindPopup(
          `<strong>${stop.sequence}. ${stop.customerName}</strong><br>ออเดอร์ #${stop.orderId} · ${stop.boxCount} กล่อง<br>${stop.address ?? ''}<br>ถึงโดยประมาณ ${stop.estimatedArrivalTime} น.`,
        ).addTo(this.layer!);
      });
    });

    const bounds = this.layer.getBounds();
    if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
  }
}
