import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { Customer, RiderRoute, SHOP } from '../core/models';

@Component({
  selector: 'app-delivery-map',
  standalone: true,
  template: '<div #map class="delivery-map" role="region" aria-label="แผนที่จุดส่งและเส้นทางไรเดอร์"></div>',
  styles: [`.delivery-map { width: 100%; height: 100%; min-height: 420px; background: #f7f6f3; }`],
})
export class DeliveryMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() customers: Customer[] = [];
  @Input() routes: RiderRoute[] = [];
  @Input() compact = false;
  @Input() pickable = false;
  @Input() selectedLocation: { lat: number; lng: number } | null = null;
  @Output() locationPicked = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private layer?: L.FeatureGroup;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement.nativeElement, { zoomControl: true }).setView([SHOP.lat, SHOP.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.render();
    if (this.pickable) this.map.on('click', ({ latlng }) => this.emitLocation(latlng));
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
    L.circleMarker([SHOP.lat, SHOP.lng], {
      radius: 9, color: '#111111', fillColor: '#ffffff', fillOpacity: 1, weight: 3,
    }).bindPopup(this.popup(SHOP.name, 'จุดเริ่มต้น 11:30 น.')).addTo(this.layer);

    if (this.routes.length) {
      this.routes.forEach((route) => {
        const points: L.LatLngExpression[] = [[SHOP.lat, SHOP.lng]];
        route.stops.forEach((stop) => {
          points.push([stop.customer.lat, stop.customer.lng]);
          L.circleMarker([stop.customer.lat, stop.customer.lng], {
            radius: 7, color: route.rider.color, fillColor: '#ffffff', fillOpacity: 1, weight: 3,
          }).bindPopup(this.popup(`${stop.sequence}. ${stop.customer.name}`, `${stop.order.boxes} กล่อง · ถึง ${stop.arrivalTime} น.`)).addTo(this.layer!);
        });
        L.polyline(points, { color: route.rider.color, weight: 5, opacity: 0.82 }).addTo(this.layer!);
      });
    } else {
      this.customers.forEach((customer) => {
        L.circleMarker([customer.lat, customer.lng], {
          radius: 6, color: '#787774', fillColor: '#ffffff', fillOpacity: 1, weight: 2,
        }).bindPopup(this.popup(customer.name, customer.address)).addTo(this.layer!);
      });
    }

    if (this.pickable && this.selectedLocation) {
      L.marker([this.selectedLocation.lat, this.selectedLocation.lng], {
        draggable: true,
        icon: L.divIcon({ className: 'location-pin', html: '<span></span>', iconSize: [28, 34], iconAnchor: [14, 34] }),
      }).on('dragend', (event) => this.emitLocation(event.target.getLatLng())).addTo(this.layer);
    }

    const bounds = this.layer.getBounds();
    if (bounds.isValid()) this.map.fitBounds(bounds.pad(this.compact ? 0.12 : 0.2), { maxZoom: 15 });
  }

  private emitLocation(latlng: L.LatLng): void {
    this.locationPicked.emit({ lat: Number(latlng.lat.toFixed(6)), lng: Number(latlng.lng.toFixed(6)) });
  }

  private popup(title: string, detail: string): HTMLElement {
    const content = document.createElement('div');
    const heading = document.createElement('strong');
    const description = document.createElement('div');
    heading.textContent = title;
    description.textContent = detail;
    content.append(heading, description);
    return content;
  }
}
