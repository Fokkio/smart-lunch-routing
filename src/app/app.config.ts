// ไฟล์นี้: ตั้งค่าแอปตอนเริ่มทำงาน — ผูก router, HTTP client และ interceptor ที่แนบ token

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/api/auth.service';

import { routes } from './app.routes';

// ค่าตั้งต้นของแอป: เปิด router, HTTP client และ interceptor ที่แนบ token
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
