# 1. ใช้ Node.js 20 เป็นภาพพื้นฐาน (LTS)
FROM node:20-slim

# 2. ตั้งค่าโฟลเดอร์ทำงานภายใน Container
WORKDIR /app

# 3. คัดลอกไฟล์แพ็กเกจเพื่อติดตั้ง Dependencies ก่อน (เพื่อใช้ Cache ของ Docker)
COPY package*.json ./

# 4. ติดตั้ง Library (ใช้ --only=production เพื่อลดขนาดไฟล์ถ้าต้องการ)
RUN npm install

# 5. คัดลอกไฟล์ทั้งหมดในโปรเจกต์เข้าไป
COPY . .

# 6. สร้างโฟลเดอร์ temp_db ภายใน Container และตั้งค่าสิทธิ์
RUN mkdir -p temp_db && chmod 777 temp_db

# 7. เปิด Port 3000
EXPOSE 3000

# 8. คำสั่งเริ่มทำงาน
CMD ["node", "index.js"]