// ไฟล์นี้: ค่าตั้งต้นสำหรับตอน build จริง — API อยู่ที่ https://smart-lunch-api.f0kki0.me/api (สลับเข้ามาแทนไฟล์พัฒนาโดยอัตโนมัติ)

import type { AppEnvironment } from './environment.model';

/**
 * Production environment — swapped in by `fileReplacements` when building
 * with `--configuration production` (the default for `ng build`).
 *
 * Feature services must never reference this URL directly; they read
 * `environment.apiBaseUrl` from `./environment`, which resolves to this file
 * only in a production build.
 */
// ค่าตั้งต้นโหมด production
export const environment: AppEnvironment = {
  name: 'production',
  apiBaseUrl: 'https://smart-lunch-api.f0kki0.me/api',
};
