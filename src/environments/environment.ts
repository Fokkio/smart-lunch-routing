// เบส URL ของ backend — dev ใช้ '/api' ผ่าน proxy.conf.json ไปที่ localhost:3000
// ส่วน production จะถูกแทนด้วย environment.production.ts ตอน build
export const environment = {
  production: false,
  apiBaseUrl: '/api',
};
