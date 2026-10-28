// ไฟล์นี้: ช่วยเรื่องวันที่ — คืนวันที่วันนี้ตามเวลาไทยในรูป YYYY-MM-DD

// วันที่ของวันนั้นตามเวลาไทย (Asia/Bangkok) -> ข้อความ YYYY-MM-DD
export function todayLocal(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
