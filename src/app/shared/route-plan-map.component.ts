import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { DeliveryRouteModel } from '../core/route-plan.models';
import { geometryToLatLngs, LatLng, routeColor, stopLine } from '../core/route-plan-view';

const SHOP: LatLng = [16.24631, 103.25286];

/**
 * Leaflet map for a backend-generated RoutePlan (OpenStreetMap tiles).
 * Renders per-order road legs when available. Older plans retain their
 * whole-job road line in overview and use dashed approximate order legs.
 */
@Component({
  selector: 'app-route-plan-map',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative isolate h-full w-full">
      <div
        #map
        class="route-plan-map"
        [class.compact]="compact"
        role="region"
        aria-label="แผนที่เส้นทางจากระบบหลังบ้าน"
      ></div>
      @if (tilesUnavailable()) {
        <div
          class="absolute inset-x-3 top-16 z-[500] rounded-xl border border-amber-300 bg-warning-soft p-3 text-sm text-amber-950"
          role="status"
        >
          <strong class="block">พื้นแผนที่โหลดไม่ได้</strong>
          <p class="mt-1">เส้นทางยังแสดงอยู่ แต่พื้นถนนอาจดูไม่ได้ ตรวจการเชื่อมต่อแล้วลองใหม่</p>
          <button
            class="neu-control mt-2 min-h-11 rounded-lg px-3 font-bold"
            type="button"
            (click)="retryTiles()"
          >
            ลองโหลดแผนที่อีกครั้ง
          </button>
        </div>
      }
      @if (jobs.length > 1) {
        <div
          class="neu-panel-soft absolute bottom-6 left-3 z-[500] w-[min(280px,calc(100%-24px))] rounded-xl p-3 text-sm"
        >
          <label class="block font-semibold text-ink" for="route-plan-job-filter"
            >ดูเส้นทางไรเดอร์
            <select
              id="route-plan-job-filter"
              class="neu-field mt-1 min-h-11 w-full rounded-lg px-3 text-sm font-medium"
              [(ngModel)]="selectedJob"
              (ngModelChange)="onFilterChange($event)"
            >
              <option [ngValue]="null">ทุกเส้นทาง ({{ jobs.length }} คน)</option>
              @for (job of jobs; track $index) {
                <option [ngValue]="$index">
                  R{{ String($index + 1).padStart(2, '0') }} · {{ riderName($index) }} ·
                  {{ job.totalOrders }} จุด
                </option>
              }
            </select>
          </label>
          <p class="mt-2 text-[13px] text-slate-600">
            เส้นประ = เส้นทางโดยประมาณ ไม่ใช่เส้นถนนจริง
          </p>
        </div>
      } @else if (hasApproximateLegs()) {
        <div
          class="neu-panel-soft absolute bottom-6 left-3 z-[500] rounded-xl p-3 text-sm text-slate-700"
        >
          เส้นประ = เส้นทางโดยประมาณ ไม่ใช่เส้นถนนจริง
        </div>
      }
      @if (riderLocation) {
        <button
          class="neu-control absolute top-3 right-3 z-[500] flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-sm"
          type="button"
          (click)="centerOnRider()"
          title="เลื่อนแผนที่ไปที่ตำแหน่งปัจจุบันของฉัน"
        >
          <span class="inline-block size-2 rounded-full bg-primary animate-pulse"></span>
          ตำแหน่งฉัน
        </button>
      }
    </div>
  `,
  styles: [
    `
      .route-plan-map {
        width: 100%;
        height: 100%;
        min-height: 420px;
        background: var(--color-surface-subtle);
      }
      .route-plan-map.compact {
        min-height: 260px;
      }
      .rider-live-marker {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .rider-live-dot {
        width: 14px;
        height: 14px;
        background-color: var(--color-primary, #0866ff);
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
        position: relative;
        z-index: 2;
      }
      .rider-live-pulse {
        position: absolute;
        width: 32px;
        height: 32px;
        background-color: rgba(8, 102, 255, 0.35);
        border-radius: 50%;
        animation: rider-pulse 2s infinite ease-out;
        z-index: 1;
      }
      @keyframes rider-pulse {
        0% {
          transform: scale(0.4);
          opacity: 1;
        }
        100% {
          transform: scale(1.6);
          opacity: 0;
        }
      }
    `,
  ],
})
export class RoutePlanMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() jobs: DeliveryRouteModel[] = [];
  @Input() shop: LatLng = SHOP;
  @Input() shopName = 'ร้าน';
  @Input() startTime = '';
  @Input() compact = false;
  @Input() selectedJob: number | null = null;
  @Output() selectedJobChange = new EventEmitter<number | null>();
  @Input() selectedOrderId: number | null = null;
  /** พิกัด GPS สดของไรเดอร์ (lat, lng) */
  @Input() riderLocation: LatLng | null = null;
  @Input() followRider = false;
  /** ชื่อไรเดอร์ตามลำดับใบงาน (จาก parent) — ใช้ป้ายเดียวกับการ์ด */
  @Input() riderNames: string[] = [];
  readonly tilesUnavailable = signal(false);
  readonly String = String;
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private tileLayer?: L.TileLayer;
  private layer?: L.FeatureGroup;
  private riderMarker?: L.Marker;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement, { zoomControl: true }).setView(this.shop, 14);
    this.tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on('loading', () => this.tilesUnavailable.set(false))
      .on('tileerror', () => this.tilesUnavailable.set(true))
      .addTo(this.map);
    this.render();
    this.updateRiderMarker();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.selectedJob !== null && this.selectedJob >= this.jobs.length)
      this.selectedJobChange.emit(null);
    if (changes['riderLocation'] || changes['followRider']) {
      this.updateRiderMarker();
    }
    const needsFullRender =
      changes['jobs'] ||
      changes['selectedJob'] ||
      changes['selectedOrderId'] ||
      changes['shop'] ||
      changes['shopName'] ||
      changes['startTime'];
    if (needsFullRender && this.map) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.riderMarker?.remove();
    this.map?.remove();
  }

  centerOnRider(): void {
    if (this.map && this.riderLocation) {
      this.map.setView(this.riderLocation, 16, { animate: true });
    }
  }

  private updateRiderMarker(): void {
    if (!this.map) return;
    if (!this.riderLocation) {
      if (this.riderMarker) {
        this.riderMarker.remove();
        this.riderMarker = undefined;
      }
      return;
    }

    if (!this.riderMarker) {
      const icon = L.divIcon({
        className: 'rider-live-marker',
        html: '<div class="rider-live-pulse"></div><div class="rider-live-dot"></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      this.riderMarker = L.marker(this.riderLocation, {
        icon,
        zIndexOffset: 1000,
      })
        .bindPopup('<strong>ตำแหน่งปัจจุบันของคุณ (ไรเดอร์)</strong>')
        .addTo(this.map);
    } else {
      this.riderMarker.setLatLng(this.riderLocation);
    }

    if (this.followRider) {
      this.map.panTo(this.riderLocation, { animate: true });
    }
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

  hasApproximateLegs(): boolean {
    return this.jobs.some((job) => job.stops.some((stop) => !stop.geometry));
  }

  private effectiveSelected(): number | null {
    return this.selectedJob;
  }

  private render(): void {
    if (!this.map) return;
    this.layer?.remove();
    this.layer = L.featureGroup().addTo(this.map);
    const shopPopup = document.createElement('div');
    shopPopup.textContent = `${this.shopName} · จุดเริ่มต้น${this.startTime ? ` ${this.startTime} น.` : ''}`;
    L.circleMarker(this.shop, {
      radius: 9,
      color: '#111111',
      fillColor: '#ffffff',
      fillOpacity: 1,
      weight: 3,
    })
      .bindPopup(shopPopup)
      .addTo(this.layer);

    const selected = this.effectiveSelected();
    this.jobs.forEach((job, index) => {
      const color = routeColor(job.riderIndex);
      const focused = selected === null || selected === index;
      if (!focused) return;
      // Plans created before per-order legs still retain their accurate whole
      // road route in the overview. A selected order remains clearly approximate.
      const legacyRoad =
        this.selectedOrderId === null && job.geometry && job.stops.every((stop) => !stop.geometry)
          ? geometryToLatLngs(job)
          : null;
      if (legacyRoad)
        L.polyline(legacyRoad, { color, weight: 5, opacity: 0.9 })
          .bindPopup(`ไรเดอร์ ${index + 1} · เส้นถนนรวมของแผนเก่า`)
          .addTo(this.layer!);
      job.stops.forEach((stop, stopIndex) => {
        if (this.selectedOrderId !== null && stop.orderId !== this.selectedOrderId) return;
        const leg = stopLine(this.shop, job, stopIndex);
        if (!legacyRoad)
          L.polyline(leg.points, {
            color,
            weight: this.selectedOrderId === stop.orderId ? 7 : 5,
            opacity: 0.9,
            dashArray: leg.approximate ? '8 8' : undefined,
          })
            .bindPopup(
              `ไรเดอร์ ${index + 1} · จุดส่ง ${stop.sequence} (#${stop.orderId}) · ${leg.approximate ? 'เส้นทางโดยประมาณ' : 'เส้นถนนตามแผน'}`,
            )
            .addTo(this.layer!);
        const popup = document.createElement('div');
        popup.style.whiteSpace = 'pre-line';
        popup.textContent = `${stop.sequence}. ${stop.customerName}\nออเดอร์ #${stop.orderId} · ${stop.boxCount} กล่อง\n${stop.address ?? ''}\nถึงโดยประมาณ ${stop.estimatedArrivalTime} น.`;
        L.marker([stop.latitude, stop.longitude], {
          icon: L.divIcon({
            className: 'stop-badge',
            html: `<span style="background:${color};color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">${stop.sequence}</span>`,
            iconSize: [24, 24],
          }),
        })
          .bindPopup(popup)
          .addTo(this.layer!);
      });
    });

    const bounds = this.layer.getBounds();
    if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
  }
}
