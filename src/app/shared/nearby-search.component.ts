import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-nearby-search', standalone: true,
  template: `<label class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold"
    [class.border-blue-500]="active()" [class.bg-blue-50]="active()" [class.text-blue-800]="active()"
    [class.border-slate-200]="!active()" title="ระยะเส้นตรงจากที่ตั้งร้านที่บันทึกไว้">
    <input class="size-4 accent-blue-600" type="checkbox" [checked]="active()" [disabled]="busy()"
      (change)="$any($event.target).checked ? search() : cleared.emit()" />
    {{ subject() }}ในรัศมี {{ radiusKm() }} กม. จากร้าน
  </label>`,
})
export class NearbySearchComponent {
  readonly radiusKm = input.required<number>();
  readonly subject = input.required<string>();
  readonly busy = input(false);
  readonly active = input(false);
  readonly searched = output<void>();
  readonly cleared = output<void>();
  search():void {if(!this.busy())this.searched.emit();}
}
