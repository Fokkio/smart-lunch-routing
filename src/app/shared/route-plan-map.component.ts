import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule],
  template: `
    <div class="relative h-full w-full">
      <div #map class="route-plan-map" role="region" aria-label="แผนที่เส้นทางจากระบบหลังบ้าน"></div>
      @if (tilesUnavailable()) {
        <div class="absolute inset-x-3 top-16 z-[500] rounded-xl border border-amber-300 bg-warning-soft p-3 text-sm text-amber-950" role="status">
          <strong class="block">พื้นแผนที่โหลดไม่ได้</strong>
          <p class="mt-1">เส้นทางยังแสดงอยู่ แต่พื้นถนนอาจดูไม่ได้ ตรวจการเชื่อมต่อแล้วลองใหม่</p>
          <button class="neu-control mt-2 min-h-11 rounded-lg px-3 font-bold" type="button" (click)="retryTiles()">ลองโหลดแผนที่อีกครั้ง</button>
        </div>
      }
      @if (jobs.length > 1) {
        <div class="neu-panel-soft absolute bottom-6 left-3 z-[500] w-[min(280px,calc(100%-24px))] rounded-xl p-3 text-sm">
          <label class="block font-semibold text-ink" for="route-plan-job-filter">ดูเส้นทางไรเดอร์
            <select id="route-plan-job-filter" class="neu-field mt-1 min-h-11 w-full rounded-lg px-3 text-sm font-medium" [(ngModel)]="selectedJob" (ngModelChange)="onFilterChange($event)">
              <option [ngValue]="null">ทุกเส้นทาง ({{ jobs.length }} คน)</option>
              @for (job of jobs; track $index) { <option [ngValue]="$index">R{{ String($index + 1).padStart(2, '0') }} · {{ riderName($index) }} · {{ job.totalOrders }} จุด</option> }
            </select>
          </label>
          <p class="mt-2 text-[13px] text-slate-600">เส้นประ = เส้นทางโดยประมาณ ไม่ใช่เส้นถนนจริง</p>
        </div>
      } @else if (jobs.length === 1 && !jobs[0]?.geometry) {
        <div class="neu-panel-soft absolute bottom-6 left-3 z-[500] rounded-xl p-3 text-sm text-slate-700">
          เส้นประ = เส้นทางโดยประมาณ ไม่ใช่เส้นถนนจริง
        </div>
      }
    </div>
  `,
  styles: [`.route-plan-map { width: 100%; height: 100%; min-height: 420px; background: #f7f6f3; }`],
})
export class RoutePlanMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() jobs: DeliveryRouteModel[] = [];
  @Input() selectedJob: number | null = null;
  @Output() selectedJobChange = new EventEmitter<number | null>();
  /** ชื่อไรเดอร์ตามลำดับใบงาน (จาก parent) — ใช้ป้ายเดียวกับการ์ด */
  @Input() riderNames: string[] = [];
  readonly tilesUnavailable = signal(false);
  readonly String = String;
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private tileLayer?: L.TileLayer;
  private layer?: L.FeatureGroup;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement, { zoomControl: true }).setView(SHOP, 14);
    this.tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('loading', () => this.tilesUnavailable.set(false))
      .on('tileerror', () => this.tilesUnavailable.set(true))
      .addTo(this.map);
    this.render();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.selectedJob !== null && this.selectedJob >= this.jobs.length) this.selectedJobChange.emit(null);
    if (this.map) this.render();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  retryTiles(): void {
    this.tilesUnavailable.set(false);
    this.tileLayer?.redraw();
  }

  onFilterChange(value: number | null): void {
    this.selectedJobChange.emit(value);
    this.render();
  }

  riderName(index: number): string {
    return this.riderNames[index] ?? `ไรเดอร์ ${index + 1}`;
  }

  private effectiveSelected(): number | null {
    return this.selectedJob;
  }

  private render(): void {
    if (!this.map) return;
    this.layer?.remove();
    this.layer = L.featureGroup().addTo(this.map);
    L.circleMarker(SHOP, {
      radius: 9, color: '#111111', fillColor: '#ffffff', fillOpacity: 1, weight: 3,
    }).bindPopup('<strong>ครัวเที่ยงตรง</strong><br>จุดเริ่มต้น 11:30 น.').addTo(this.layer);

    const selected = this.effectiveSelected();
    this.jobs.forEach((job, index) => {
      const color = routeColor(job.riderIndex);
      const focused = selected === null || selected === index;
      if (!focused) return;
      const line = geometryToLatLngs(job) ?? approximateLine(SHOP, job);
      L.polyline(line, {
        color, weight: selected === index ? 7 : 5,
        opacity: focused ? 0.9 : 0.3,
        dashArray: job.geometry ? undefined : '8 8',
      })
        .bindPopup(job.geometry ? `ไรเดอร์ ${index + 1} · ${job.distanceKm} กม.` : `ไรเดอร์ ${index + 1} · เส้นทางโดยประมาณ (เส้นประ)`)
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
