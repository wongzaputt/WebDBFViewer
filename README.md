# WebDBFViewer 📂🇹🇭

**WebDBFViewer** เป็นโปรเจกต์ตัวอย่างที่แสดงให้เห็นถึงศักยภาพของการใช้ **AI (Generative AI)** ในการช่วยเขียนโค้ด (AI-Assisted Development) เพื่อสร้างเครื่องมือจัดการข้อมูลอย่างรวดเร็วและมีประสิทธิภาพ โปรเจกต์นี้ถูกออกแบบมาเพื่ออ่านและแสดงผลไฟล์ฐานข้อมูลประเภท `.DBF` โดยเฉพาะไฟล์ที่มาจากระบบบัญชีภาษาไทย เช่น **Express Accounting**

## 🌟 คุณสมบัติ (Features)

- **AI-Driven Development**: พัฒนาขึ้นโดยมี AI เป็นผู้ช่วยในการร่างโครงสร้างและแก้ปัญหาทางเทคนิค
- **Modular Routing**: แยกส่วนการทำงานของ API ออกจากไฟล์หลัก เพื่อให้อ่านง่ายและขยายโปรเจกต์ได้สะดวก
- **DBF Support**: รองรับการอ่านไฟล์ `.DBF` และจัดการ Encoding ภาษาไทย (**CP874**) ได้อย่างถูกต้อง
- **Fast Upload**: ระบบเลือกไฟล์แบบ Browse และบันทึกลง Server ด้วยชื่อไฟล์เดิมในโฟลเดอร์ `./temp_db`
- **Dynamic Search**: ค้นหาข้อมูลแบบ Multiple Keywords (แยกด้วยช่องว่าง) ครอบคลุมทุกฟิลด์ในตาราง
- **Advanced Export System**:
  - **Export Page**: ส่งออกข้อมูลเฉพาะหน้าที่กำลังแสดงผล (100 รายการ) เป็นไฟล์ Excel
  - **Export All**: ส่งออกข้อมูลทั้งหมดที่ตรงตามเงื่อนไขการกรอง (ทุกหน้า) เป็นไฟล์ Excel
- **Smooth UI**:
  - หัวตารางลอย (Sticky Header) สะดวกต่อการดูข้อมูลจำนวนมาก
  - ระบบแบ่งหน้า (Pagination) หน้าละ 100 รายการ เพื่อประสิทธิภาพในการโหลด
  - แยกส่วน Style (CSS) และ Logic (JS) ชัดเจน ง่ายต่อการปรับแต่ง

## 📺 วิดีโอสาธิตและขั้นตอนการพัฒนา

คุณสามารถรับชมขั้นตอนการพัฒนาโปรเจกต์นี้โดยใช้ AI ช่วยเขียนโค้ดได้ที่ YouTube:

- **Part 1: การเริ่มโปรเจกต์และโครงสร้างพื้นฐาน** 🎥 [ชมวิดีโอตอนที่ 1](https://youtu.be/uHNMt_-9mJk)
- **Part 2: การจัดการภาษาไทยและการค้นหาขั้นสูง** 🎥 [ชมวิดีโอตอนที่ 2](https://youtu.be/ygaUP_4TtD8)
- **Part 3: การปรับแต่งโครงสร้างและการจัดการไฟล์** 🎥 [ชมวิดีโอตอนที่ 3](https://youtu.be/4Bunwa1v55U)
- **Part 4: การเพิ่มฟีเจอร์ Export Excel และการจัดการ UI** 🎥 [ชมวิดีโอตอนที่ 4](https://youtu.be/HwuVAaNJ5WU)

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Backend**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- **Library**:
  - `dbffile` (สำหรับอ่านข้อมูล DBF)
  - `multer` (สำหรับจัดการไฟล์อัปโหลด)
  - `xlsx` (SheetJS สำหรับการ Export ไฟล์ Excel ฝั่ง Client)
- **Frontend**: Vanilla HTML5, CSS3 (Modern Flexbox/Sticky), JavaScript (ES6+)

## 🚀 เริ่มต้นใช้งาน (Getting Started)

1.  **Clone Repository:**

    ```bash
    git clone [https://github.com/wongzaputt/WebDBFViewer.git](https://github.com/wongzaputt/WebDBFViewer.git)
    cd WebDBFViewer
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Run Server:**

    ```bash
    node index.js
    ```

4.  **Access Web:**
    เปิด Browser ไปที่ `http://localhost:3000`

## 📝 โครงสร้างโปรเจกต์ (Current Structure)

```text
WebDBFViewer/
├── public/                 # ส่วนแสดงผลฝั่ง Client
│   ├── css/
│   │   └── style.css       # ไฟล์จัดการความสวยงาม
│   ├── js/
│   │   └── viewer.js      # Logic ฝั่ง Client (การแสดงผล, Pagination และ Export)
│   └── index.html         # หน้าจอหลัก
├── routes/                 # ส่วนจัดการ API (Backend Logic)
│   └── dbfRoutes.js       # Endpoint สำหรับ Upload และ Query ข้อมูล (.slice)
├── temp_db/               # โฟลเดอร์เก็บไฟล์ .DBF ที่อัปโหลด (Ignore ใน Git)
├── index.js               # ไฟล์หลักสำหรับเปิด Server และตั้งค่า Middleware
├── package.json           # รายการ Library และรายละเอียดโปรเจกต์
└── .gitignore             # ไฟล์ยกเว้นการติดตามของ Git
```

โปรเจกต์นี้สร้างขึ้นเพื่อการเรียนรู้และเป็นตัวอย่างการประยุกต์ใช้ AI ในงานพัฒนาซอฟต์แวร์
