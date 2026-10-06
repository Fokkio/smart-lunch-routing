import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-nearby-search', standalone: true,
  template: `<section class="neu-panel mb-5 rounded-2xl p-4">
    <h2 class="font-bold">ค้นหา{{ subject() }}ในรัศมี {{ radiusKm() }} กม. จากร้าน</h2>
    <p class="mt-2 text-sm text-slate-600">ใช้ที่ตั้งร้านที่บันทึกไว้ ระยะเส้นตรง ไม่ใช่ระยะขับรถ</p>
    <div class="mt-3 flex flex-wrap gap-2">
      <button class="neu-primary min-h-11 rounded-xl px-4 font-bold" type="button" [disabled]="busy()" (click)="search()">ค้นหาจากที่ตั้งร้าน</button>
      <button class="neu-control min-h-11 rounded-xl px-4 font-bold" type="button" [disabled]="busy()" (click)="cleared.emit()">ล้างการค้นหารัศมี</button>
    </div>
  </section>`,
})
export class NearbySearchComponent {
  readonly radiusKm = input.required<number>();
  readonly subject = input.required<string>();
  readonly busy = input(false);
  readonly searched = output<void>();
  readonly cleared = output<void>();
  search():void {if(!this.busy())this.searched.emit();}
}
