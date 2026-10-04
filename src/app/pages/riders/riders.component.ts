import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorMessage } from '../../core/api-error';
import { ApiRider, RidersApiService } from '../../core/rider-api.service';

type Draft = { id?: number; name: string; phone: string; isAvailable: boolean };

@Component({
  selector: 'app-riders',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './riders.component.html',
})
export class RidersComponent implements OnInit {
  private readonly ridersApi = inject(RidersApiService);
  readonly riders = signal<ApiRider[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  query = '';
  showForm = false;
  feedback = '';
  draft: Draft = this.blankDraft();

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.ridersApi.getRiders().subscribe({
      next: (riders) => {
        this.riders.set(riders);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'โหลดรายชื่อไรเดอร์ไม่สำเร็จ'));
        this.loading.set(false);
      },
    });
  }

  availableCount(): number {
    return this.riders().filter((rider) => rider.isAvailable).length;
  }

  filteredRiders(): ApiRider[] {
    const term = this.query.trim().toLowerCase();
    if (!term) return this.riders();
    return this.riders().filter((rider) =>
      `${rider.name} ${rider.phone ?? ''}`.toLowerCase().includes(term),
    );
  }

  startCreate(): void {
    if (this.saving()) return;
    this.draft = this.blankDraft();
    this.error.set('');
    this.showForm = true;
  }

  edit(rider: ApiRider): void {
    if (this.saving()) return;
    this.draft = { id: rider.id, name: rider.name, phone: rider.phone ?? '', isAvailable: rider.isAvailable };
    this.error.set('');
    this.showForm = true;
  }

  cancel(): void {
    if (this.saving()) return;
    this.showForm = false;
    this.error.set('');
  }

  remove(rider: ApiRider): void {
    if (this.saving()) return;
    if (!window.confirm(`ลบไรเดอร์ ${rider.name} หรือไม่?`)) return;
    this.saving.set(true);
    this.error.set('');
    this.ridersApi.deleteRider(rider.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.feedback = `ลบไรเดอร์ ${rider.name} แล้ว`;
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(
          err?.status === 409
            ? 'ลบไม่ได้ เพราะไรเดอร์คนนี้มีใบงานหรือข้อมูลการจัดส่งที่อ้างอิงอยู่'
            : apiErrorMessage(err, 'ลบไรเดอร์ไม่สำเร็จ'),
        );
      },
    });
  }

  save(): void {
    if (this.saving()) return;
    const name = this.draft.name.trim();
    if (!name) {
      this.error.set('กรุณากรอกชื่อไรเดอร์');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const input = { name, phone: this.draft.phone.trim() || null, isAvailable: this.draft.isAvailable };
    const request =
      this.draft.id === undefined
        ? this.ridersApi.createRider(input)
        : this.ridersApi.updateRider(this.draft.id, input);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm = false;
        this.feedback = 'บันทึกไรเดอร์แล้ว';
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'บันทึกไรเดอร์ไม่สำเร็จ'));
      },
    });
  }

  private blankDraft(): Draft {
    return { name: '', phone: '', isAvailable: true };
  }
}
