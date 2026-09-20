import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="page history-page">
      <header><div><h1>ประวัติการจัดส่ง</h1><p>ตัวอย่างหน้าจอสำหรับตรวจรอบที่ส่งเสร็จแล้ว</p></div><span>ข้อมูลตัวอย่าง · ไม่ใช่ประวัติจริง</span></header>
      <section class="history-panel"><div class="history-tools"><label for="historySearch">ค้นหารอบจัดส่ง</label><input id="historySearch" [(ngModel)]="query" placeholder="วันที่หรือเลขรอบ" /></div>
        <div class="history-list">
          @for (entry of filtered(); track entry.id) {
            <article><div class="date-block"><strong>{{ entry.date }}</strong><small>{{ entry.id }}</small></div><div class="history-meta"><span>{{ entry.orders }} ออเดอร์</span><span>{{ entry.riders }} ไรเดอร์</span><span>ส่งเสร็จ {{ entry.finish }}</span></div><span class="success-chip">ส่งครบแล้ว</span></article>
          } @empty { <div class="empty-state"><h2>ไม่พบรอบจัดส่ง</h2><p>ลองค้นหาด้วยวันที่หรือเลขรอบอื่น</p></div> }
        </div>
      </section>
      <p class="scope-note">เมื่อมีระบบหลังบ้านและข้อมูลการส่งจริง หน้านี้จึงจะบันทึกประวัติได้ ขณะนี้เป็น UI demo เท่านั้น</p>
    </main>
  `,
  styles: [`
    .history-page { padding-top: 44px; padding-bottom: 80px; } header { display: flex; justify-content: space-between; gap: 20px; align-items: start; margin-bottom: 28px; } h1 { margin: 0; font-size: 32px; } header p { margin: 4px 0 0; color: var(--muted); font-size: 13px; } header > span { padding: 6px 9px; border-radius: 999px; background: var(--yellow-soft); color: var(--yellow-text); font-size: 11px; }
    .history-panel { overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: #fff; }.history-tools { display: flex; gap: 18px; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--line); font-size: 12px; }.history-tools input { width: min(100%, 290px); padding: 9px 11px; border: 1px solid var(--line); border-radius: 6px; }
    .history-list article { display: flex; align-items: center; gap: 32px; min-height: 84px; padding: 17px 22px; border-bottom: 1px solid var(--line); }.history-list article:last-child { border-bottom: 0; }.date-block { display: grid; min-width: 150px; }.date-block strong { font-size: 13px; }.date-block small { color: var(--muted); font-size: 10px; }.history-meta { display: flex; flex-wrap: wrap; gap: 18px; color: var(--muted); font-size: 12px; }.success-chip { margin-left: auto; padding: 5px 9px; border-radius: 999px; background: var(--green-soft); color: var(--green-text); font-size: 10px; white-space: nowrap; }.empty-state { padding: 48px 22px; text-align: center; }.empty-state h2 { margin: 0; font-size: 18px; }.empty-state p,.scope-note { color: var(--muted); font-size: 12px; }.scope-note { margin-top: 15px; }
    @media(max-width: 650px) { .history-page { padding-top: 25px; } h1 { font-size: 26px; } header { flex-direction: column; }.history-list article { align-items: start; flex-direction: column; gap: 7px; }.success-chip { margin-left: 0; }.history-tools { flex-direction: column; align-items: stretch; }.history-tools input { width: 100%; } }
  `],
})
export class HistoryComponent {
  query = '';
  readonly entries = [
    { id: 'DEMO-0919', date: '19 ก.ย. 2569', orders: 24, riders: 8, finish: '12:19' },
    { id: 'DEMO-0918', date: '18 ก.ย. 2569', orders: 27, riders: 9, finish: '12:24' },
    { id: 'DEMO-0917', date: '17 ก.ย. 2569', orders: 21, riders: 7, finish: '12:16' },
  ];
  filtered() { const term = this.query.trim().toLowerCase(); return this.entries.filter(entry => `${entry.id} ${entry.date}`.toLowerCase().includes(term)); }
}
