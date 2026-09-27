---
name: ระบบจัดเส้นทางและแบ่งงานไรเดอร์อัจฉริยะ
description: ระบบจัดส่งมื้อเที่ยงภาษาไทยที่อ่านสถานะและขั้นตอนถัดไปได้ทันที
colors:
  canvas: "#f8faff"
  bone: "#f3f7ff"
  surface: "#ffffff"
  surface-light: "#f3f7ff"
  surface-shadow: "#dbe3f1"
  ink: "#17171a"
  muted: "#667085"
  line: "#dbe3f1"
  line-strong: "#b9c8df"
  primary: "#0053fd"
  primary-hover: "#003fc7"
  green-soft: "#e8f7f0"
  green-text: "#16865c"
  yellow-soft: "#fff5df"
  yellow-text: "#a45b00"
  red-soft: "#fff0f3"
  red-text: "#c72e4d"
  blue-soft: "#eaf1ff"
  blue-text: "#0053fd"
typography:
  headline:
    fontFamily: "Bai Jamjuree, Noto Sans Thai, Leelawadee UI, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Bai Jamjuree, Noto Sans Thai, Leelawadee UI, sans-serif"
    lineHeight: 1.6
  metric:
    fontFamily: "JetBrains Mono, Cascadia Mono, monospace"
    fontSize: "38px"
    lineHeight: 1.25
  label:
    fontFamily: "Bai Jamjuree, Noto Sans Thai, Leelawadee UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  control: "8px"
  card: "12px"
  panel: "14px"
  pill: "999px"
spacing:
  compact: "8px"
  control: "12px"
  regular: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  status-success:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green-text}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# Design System: ระบบจัดเส้นทางและแบ่งงานไรเดอร์อัจฉริยะ

## Overview

**Creative North Star: "มื้อเที่ยงที่จัดการได้ทัน"**

หน้าจอภาษาไทยของร้านข้าวกล่องให้เจ้าของร้านเห็นสถานะ ความพร้อม และสิ่งที่ต้องทำต่อโดยไม่ต้องแปลศัพท์เทคนิค ภาพรวมใช้ operational dashboard โทนขาว–ฟ้า: sidebar สีอ่อน การ์ดพื้นขาวขอบบาง KPI ที่อ่านเร็ว แผนที่เป็นจุดเด่น และ dispatch panel อยู่ข้างกันบนจอกว้าง ฝั่งไรเดอร์ใช้จอมือถือที่เน้นงานของตนทีละจุด

**Key Characteristics:** พื้นหลังฟ้าอ่อนกับการ์ดขาวขอบบาง; ปุ่มหลักสีน้ำเงิน; ตัวเลขเวลา ระยะทาง และเงินใช้ monospace; แผนที่กับรายการไรเดอร์เป็นแกนหลัก; ข้อความสถานะอยู่คู่กับสีเสมอ

## Colors

สีน้ำเงินเป็นสีการกระทำหลัก ส่วนสีสถานะใช้เมื่อมีความหมายเท่านั้น: เขียวสำหรับพร้อม/ทันเวลา/กำไร เหลืองสำหรับเรื่องที่ต้องสนใจ แดงสำหรับผิดพลาด/ช้า/ขาดทุน และฟ้าอ่อนสำหรับสถานะข้อมูลรอง พื้นหลังและเส้นแบ่งใช้ชุด neutral ใน frontmatter

**The Meaning Before Color Rule.** สถานะต้องมีข้อความหรือสัญลักษณ์ที่เข้าใจได้โดยไม่พึ่งสีเพียงอย่างเดียว

สีเส้นทางของไรเดอร์มาจากข้อมูลไรเดอร์และต้องตรงกันระหว่างเส้นบนแผนที่ จุด และการ์ด; ไม่ใช่ชุดสีแบรนด์สำหรับปุ่มหรือสถานะทั่วไป

## Typography

ใช้ Bai Jamjuree พร้อม fallback ใน frontmatter สำหรับข้อความไทยทั้งระบบ และ JetBrains Mono สำหรับรหัส เวลา ระยะทาง และเงิน หัวข้อหน้าโดยทั่วไปประมาณ 32px; ตัวเลขสรุปหลักประมาณ 38px ป้ายกำกับและข้อมูลรองลดน้ำหนักด้วยสี `muted`

**The Scannable Numbers Rule.** เวลา จำนวนกล่อง ระยะทาง และกำไรต้องอ่านแยกจากคำอธิบายได้ทันที

## Layout

ฝั่งเจ้าของร้านใช้แถบบน แถบเมนูซ้ายกว้าง 224px และพื้นที่เนื้อหากว้างไม่เกิน 1560px; ต่ำกว่า breakpoint `lg` เมนูย้ายเป็นแถบล่าง หน้าแผนที่กับรายชื่อไรเดอร์เรียงคู่กันบนจอกว้างและเรียงแนวตั้งบนจอเล็ก ฝั่งไรเดอร์จำกัดความกว้างประมาณ 512px ระยะห่างและ responsive layout ใช้ Tailwind CSS utilities; จอเล็กจัดองค์ประกอบใหม่แทนการย่อทั้งหน้า

## Elevation & Depth

ใช้พื้นผิวแบบ flat/elevated เบา ๆ: การ์ดพื้นขาวมีเส้นขอบเทาฟ้า 1px และเงาเฉพาะส่วนที่ลอยเหนือแผนที่หรือ popup; input ใช้ขอบชัดและ focus ring สีน้ำเงิน

## Shapes

มุมโค้งเล็กน้อย: คอนโทรล 8px, การ์ดหลัก 12px, บาง panel 14px และชิปสถานะทรง pill เส้นขอบบางแบ่งส่วนโดยไม่ทำให้หน้าจอแน่น

## Components

- **Buttons:** ปุ่มหลักสีน้ำเงิน สูงอย่างน้อย 44px; ปุ่มรองพื้นขาวขอบเทา; ปุ่มทำลายข้อมูลเป็นข้อความแดง ไม่ใช้รูปลักษณ์ปุ่มหลัก สถานะ hover เปลี่ยนสีอย่างนุ่มนวล และ focus-visible มีกรอบชัด
- **Inputs:** พื้นขาว ขอบ `line-strong` สูงอย่างน้อย 44px; ช่องเลขใบงานของไรเดอร์สูงอย่างน้อย 52px
- **Cards and chips:** การ์ดพื้นขาวมีขอบบาง; สถานะเป็นพื้นอ่อนกับข้อความสีเข้มและข้อความบอกความหมาย
- **Navigation:** เมนูเจ้าของร้านแสดงหน้าปัจจุบันด้วยพื้นขาวหรือฟ้าอ่อนและข้อความน้ำเงิน; หน้าไรเดอร์ไม่มี sidebar
- **Route result:** แผนที่อยู่คู่การ์ดไรเดอร์; สีประจำไรเดอร์เป็นตัวช่วยจับคู่ แต่ชื่อและลำดับยังแสดงเป็นข้อความ
- **Motion:** ใช้เฉพาะ transition สีสั้น ๆ ที่ช่วยบอกสถานะ; เมื่อผู้ใช้ขอลดการเคลื่อนไหวให้ปิดแอนิเมชันที่ไม่จำเป็นตาม media query ที่มีอยู่

## Do's and Don'ts

### Do:

- **Do** บอกสถานะและขั้นตอนถัดไปด้วยภาษาไทยสั้น ๆ โดยเฉพาะความพร้อมและเส้นตาย 12:30
- **Do** ให้ปุ่มงานหลักเด่นและมีขนาดแตะได้บนมือถือ
- **Do** ใช้สีเส้นทางของไรเดอร์ให้สอดคล้องกันระหว่างแผนที่กับการ์ด

### Don't:

- **Don't** ทำหน้าจอเป็นแผง debug หรือแสดงอัลกอริทึม, JSON และพิกัดเป็นข้อมูลหลัก
- **Don't** ให้ไรเดอร์เห็นบัญชีร้านหรือเส้นทางของคนอื่น
- **Don't** สื่อสถานะด้วยสีหรือไอคอนอย่างเดียว
