---
name: ระบบจัดเส้นทางและแบ่งงานไรเดอร์อัจฉริยะ
description: ระบบจัดส่งมื้อเที่ยงภาษาไทยที่อ่านสถานะและขั้นตอนถัดไปได้ทันที
colors:
  canvas: "#fbfbfa"
  bone: "#f7f6f3"
  surface: "#ffffff"
  ink: "#20211f"
  muted: "#787774"
  line: "#eaeaea"
  line-strong: "#d9d8d4"
  primary: "#174b3d"
  primary-hover: "#24624f"
  green-soft: "#edf3ec"
  green-text: "#346538"
  yellow-soft: "#fbf3db"
  yellow-text: "#956400"
  red-soft: "#fdebec"
  red-text: "#9f2f2d"
  blue-soft: "#e1f3fe"
  blue-text: "#1f6c9f"
typography:
  headline:
    fontFamily: "Noto Sans Thai, Segoe UI Variable Display, Tahoma, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Noto Sans Thai, Segoe UI Variable Display, Tahoma, sans-serif"
    lineHeight: 1.6
  metric:
    fontFamily: "Noto Sans Thai, Segoe UI Variable Display, Tahoma, sans-serif"
    fontSize: "38px"
    lineHeight: 1.25
  label:
    fontFamily: "Noto Sans Thai, Segoe UI Variable Display, Tahoma, sans-serif"
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

หน้าจอภาษาไทยของร้านข้าวกล่องให้เจ้าของร้านเห็นสถานะ ความพร้อม และสิ่งที่ต้องทำต่อโดยไม่ต้องแปลศัพท์เทคนิค ภาพรวมเรียบ สว่าง เป็นมิตร และเป็นงานปฏิบัติการจริงมากกว่าแดชบอร์ดเชิงวิศวกรรม ฝั่งไรเดอร์ใช้จอมือถือที่เน้นงานของตนทีละจุด

**Key Characteristics:** พื้นหลังอ่อนและการ์ดขาวมีเส้นขอบบาง; ปุ่มหลักสีเขียวเข้ม; ตัวเลขเวลา ระยะทาง และเงินเด่นพอให้กวาดตา; ข้อความสถานะอยู่คู่กับสีเสมอ

## Colors

สีเขียวเข้มเป็นสีการกระทำหลัก ส่วนสีสถานะใช้เมื่อมีความหมายเท่านั้น: เขียวสำหรับพร้อม/ทันเวลา/กำไร เหลืองสำหรับเรื่องที่ต้องสนใจ แดงสำหรับผิดพลาด/ช้า/ขาดทุน และฟ้าอ่อนสำหรับสถานะข้อมูลรอง พื้นหลังและเส้นแบ่งใช้ชุด neutral ใน frontmatter

**The Meaning Before Color Rule.** สถานะต้องมีข้อความหรือสัญลักษณ์ที่เข้าใจได้โดยไม่พึ่งสีเพียงอย่างเดียว

สีเส้นทางของไรเดอร์มาจากข้อมูลไรเดอร์และต้องตรงกันระหว่างเส้นบนแผนที่ จุด และการ์ด; ไม่ใช่ชุดสีแบรนด์สำหรับปุ่มหรือสถานะทั่วไป

## Typography

ใช้ Noto Sans Thai พร้อม fallback ใน frontmatter สำหรับข้อความไทยทั้งระบบ หัวข้อหน้าโดยทั่วไปประมาณ 32px; ตัวเลขสรุปหลักประมาณ 38px และใช้ `tabular-nums` เมื่อเป็นตัวเลขที่ต้องเทียบกัน ป้ายกำกับและข้อมูลรองลดน้ำหนักด้วยสี `muted` ไม่ใช้แบบอักษรประดับ

**The Scannable Numbers Rule.** เวลา จำนวนกล่อง ระยะทาง และกำไรต้องอ่านแยกจากคำอธิบายได้ทันที

## Layout

ฝั่งเจ้าของร้านใช้แถบบน แถบเมนูซ้ายกว้าง 226px และพื้นที่เนื้อหากว้างไม่เกิน 1480px; ใต้ 900px เมนูย้ายเป็นแถบล่าง หน้าแผนที่กับรายชื่อไรเดอร์ใช้สัดส่วน 7:3 บนจอกว้างและเรียงแนวตั้งใต้ 1050px ฝั่งไรเดอร์จำกัดความกว้าง 480px และเต็มจอใต้ 500px ระยะห่างที่ใช้ซ้ำอ้างอิง frontmatter; จอเล็กจัดองค์ประกอบใหม่แทนการย่อทั้งหน้า

## Elevation & Depth

ระบบเกือบแบน: การ์ดสีขาวและเส้นขอบอ่อนสร้างชั้นข้อมูล ไม่มีเงาทั่วไป เงาชัดใช้เฉพาะ dialog ยืนยัน (`0 18px 50px rgba(0,0,0,.14)`); popup แผนที่มีเงาเบา (`0 2px 8px rgba(0,0,0,.04)`)

## Shapes

มุมโค้งเล็กน้อย: คอนโทรล 8px, การ์ดหลัก 12px, บาง panel 14px และชิปสถานะทรง pill เส้นขอบบางแบ่งส่วนโดยไม่ทำให้หน้าจอแน่น

## Components

- **Buttons:** ปุ่มหลักเขียวเข้ม สูงอย่างน้อย 44px; ปุ่มรองพื้นขาวขอบเทา; ปุ่มทำลายข้อมูลเป็นข้อความแดง ไม่ใช้รูปลักษณ์ปุ่มหลัก สถานะ hover เปลี่ยนสีอย่างนุ่มนวล และ focus-visible มีกรอบชัด
- **Inputs:** พื้นขาว ขอบ `line-strong` สูงอย่างน้อย 44px; ช่องเลขใบงานของไรเดอร์สูงอย่างน้อย 52px
- **Cards and chips:** การ์ดพื้นขาวมีขอบบาง; สถานะเป็นพื้นอ่อนกับข้อความสีเข้มและข้อความบอกความหมาย
- **Navigation:** เมนูเจ้าของร้านแสดงหน้าปัจจุบันด้วยพื้นเขียวอ่อนและข้อความเขียว; หน้าไรเดอร์ไม่มี sidebar
- **Route result:** แผนที่อยู่คู่การ์ดไรเดอร์; สีประจำไรเดอร์เป็นตัวช่วยจับคู่ แต่ชื่อและลำดับยังแสดงเป็นข้อความ
- **Motion:** transition ปุ่มราว 150–200ms และ reveal 600ms; เมื่อผู้ใช้ขอลดการเคลื่อนไหวให้ปิดแอนิเมชันที่ไม่จำเป็นตาม media query ที่มีอยู่

## Do's and Don'ts

### Do:

- **Do** บอกสถานะและขั้นตอนถัดไปด้วยภาษาไทยสั้น ๆ โดยเฉพาะความพร้อมและเส้นตาย 12:30
- **Do** ให้ปุ่มงานหลักเด่นและมีขนาดแตะได้บนมือถือ
- **Do** ใช้สีเส้นทางของไรเดอร์ให้สอดคล้องกันระหว่างแผนที่กับการ์ด

### Don't:

- **Don't** ทำหน้าจอเป็นแผง debug หรือแสดงอัลกอริทึม, JSON และพิกัดเป็นข้อมูลหลัก
- **Don't** ให้ไรเดอร์เห็นบัญชีร้านหรือเส้นทางของคนอื่น
- **Don't** สื่อสถานะด้วยสีหรือไอคอนอย่างเดียว
