# แนวทางทำงานร่วมกันในโปรเจกต์

โปรเจกต์นี้มี Angular frontend และ Express/TypeScript/MySQL backend อยู่ใน repository เดียวกัน

## การแบ่งเจ้าของงาน

| คน | หน้าที่ | พื้นที่หลัก |
|---|---|---|
| คนที่ 1 | Backend, API, MySQL และ routing algorithm | `backend/**` |
| คนที่ 2 | หน้าลูกค้าและออเดอร์ | `src/app/pages/customers/**`, `src/app/pages/orders/**` |
| คนที่ 3 | หน้าจัดเส้นทาง หน้าไรเดอร์ และแผนที่ | `src/app/pages/delivery/**`, `src/app/pages/rider/**`, `src/app/shared/delivery-map/**` |
| คนที่ 4 | API client, shared models, integration และ QA | `src/app/core/**`, `qa-smoke.mjs`, `*.spec.ts`, `.github/**` |

คนที่ 4 เป็นเจ้าของการเชื่อม Angular กับ backend เพื่อให้ทุกหน้าผ่าน API client และ model ชุดเดียวกัน

## ไฟล์ shared ที่ต้องประสานงานก่อนแก้

อย่าแก้ไฟล์เหล่านี้พร้อมกันหลายคน:

- `package.json`
- `package-lock.json`
- `angular.json`
- `README.md`
- `src/app/app.routes.ts`
- `src/app/app.html`
- `.env.example`
- `backend/package.json`

ถ้าต้องแก้ ให้แจ้งคนที่ 4 และแยกเป็น commit ของไฟล์ shared โดยเฉพาะ

## Branch และ Pull Request

ห้าม push ตรงเข้า `main` ให้ใช้ branch แยกตามงาน เช่น:

```text
feat/backend-api
feat/frontend-customers-orders
feat/frontend-delivery-rider
feat/frontend-api-integration
```

เริ่มงานจาก `main` ล่าสุด:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feat/ชื่อ-งาน
```

ก่อนเปิด Pull Request:

```powershell
git add <โฟลเดอร์หรือไฟล์ที่เกี่ยวข้อง>
git commit -m "อธิบายการเปลี่ยนแปลง"
git fetch origin
git rebase origin/main
git push -u origin feat/ชื่อ-งาน
```

เปิด Pull Request เข้า `main` และให้สมาชิกอีกคน review อย่างน้อย 1 คน ห้ามใช้ `git push --force` กับ `main`

## ลำดับการรวมงาน

1. Backend กำหนด endpoint และ JSON contract ก่อน
2. Integration เพิ่ม model และ API client ของ Angular
3. หน้าลูกค้า ออเดอร์ จัดเส้นทาง และไรเดอร์เรียกผ่าน API client เดียวกัน
4. QA ทดสอบ frontend, backend และ flow เชื่อมต่อก่อน merge

## API contract ที่ต้องใช้ร่วมกัน

ต้องตกลงก่อนเริ่มเชื่อมระบบ:

- ID ใช้ `number` หรือ `string`
- สถานะออเดอร์ใช้ตัวพิมพ์เล็กหรือตัวพิมพ์ใหญ่
- Route plan ใช้ชื่อ `routes` หรือ `jobs`
- พิกัดใช้ `lat/lng` หรือ `latitude/longitude`
- รูปแบบรหัสใบงานไรเดอร์

ปัจจุบัน frontend และ backend ยังเป็นคนละ data flow: Angular ใช้ `localStorage` และข้อมูลเดโม ส่วน backend ใช้ API กับ MySQL การเปลี่ยนให้ใช้ backend จริงต้องทำผ่านงาน integration ตามลำดับด้านบน

## ตรวจสอบก่อน merge

Frontend:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
```

Backend:

```powershell
cd backend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
