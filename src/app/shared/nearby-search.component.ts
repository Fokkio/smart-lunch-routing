import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-nearby-search', standalone: true, imports: [FormsModule],
  template: `<form class="neu-panel mb-5 rounded-2xl p-4" (ngSubmit)="search()">
    <fieldset [disabled]="busy()"><legend class="font-bold">ค้นหา{{ subject() }}ในรัศมี {{ radiusKm() }} กม.</legend>
    <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <label class="grid min-w-0 gap-1 text-sm">ละติจูดค้นหา<input class="neu-field min-h-11 w-full rounded-xl px-3" type="number" name="nearLat" [(ngModel)]="lat" min="-90" max="90" step="any" required /></label>
      <label class="grid min-w-0 gap-1 text-sm">ลองจิจูดค้นหา<input class="neu-field min-h-11 w-full rounded-xl px-3" type="number" name="nearLng" [(ngModel)]="lng" min="-180" max="180" step="any" required /></label>
      <button class="neu-primary min-h-11 rounded-xl px-4 font-bold" type="submit">ค้นหาในรัศมี</button>
      <button class="neu-control min-h-11 rounded-xl px-4 font-bold" type="button" (click)="cleared.emit()">ล้างรัศมี</button>
    </div></fieldset><p class="mt-2 text-sm text-slate-600">ระยะเส้นตรงจากพิกัดที่ระบุ ไม่ใช่ระยะขับรถ</p>
    @if (error) { <p class="mt-2 text-red-800" role="alert">{{ error }}</p> }
  </form>`,
})
export class NearbySearchComponent {
  readonly radiusKm = input.required<number>();
  readonly subject = input.required<string>();
  readonly busy = input(false);
  readonly searched = output<{lat:number;lng:number}>();
  readonly cleared = output<void>();
  lat: number | null = null;
  lng: number | null = null;
  error = '';
  search(): void {
    if (this.lat === null || this.lng === null || !Number.isFinite(this.lat) || !Number.isFinite(this.lng) || Math.abs(this.lat) > 90 || Math.abs(this.lng) > 180) {
      this.error = 'กรุณาระบุพิกัดที่ถูกต้อง'; return;
    }
    this.error = '';
    this.searched.emit({lat:this.lat,lng:this.lng});
  }
}
