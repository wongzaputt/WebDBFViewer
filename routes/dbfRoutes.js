const express = require("express");
const router = express.Router();
const multer = require("multer");
const { DBFFile } = require("dbffile");
const fs = require("fs");
const path = require("path");

const tempDir = "./temp_db";

// ตรวจสอบและสร้างโฟลเดอร์ temp_db ถ้ายังไม่มี
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// ตั้งค่าการเก็บไฟล์ด้วยชื่อเดิม
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// ตัวแปรเก็บข้อมูลไว้ใน Memory (Shared ภายในไฟล์นี้)
let cachedData = [];

// API สำหรับ Upload ไฟล์
router.post("/upload", upload.single("dbfFile"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const filePath = req.file.path;
    // รองรับภาษาไทย Express Accounting ด้วย cp874
    const dbf = await DBFFile.open(filePath, { encoding: "cp874" });
    const records = await dbf.readRecords();

    cachedData = records;
    res.json({ filename: req.file.originalname, total: records.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับดึงข้อมูล พร้อมระบบค้นหาและแบ่งหน้า
router.get("/data", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100; // รองรับ limit จาก fetch
  const search = req.query.search || "";

  let filteredData = cachedData;

  // ระบบค้นหา Multiple Keywords (แยกด้วยช่องว่าง)
  if (search) {
    const keywords = search
      .toLowerCase()
      .split(" ")
      .filter((k) => k);
    filteredData = cachedData.filter((row) => {
      const rowValues = Object.values(row).join(" ").toLowerCase();
      return keywords.every((kw) => rowValues.includes(kw));
    });
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  res.json({
    data: filteredData.slice(startIndex, endIndex),
    total: filteredData.length,
    totalPages: Math.ceil(filteredData.length / limit),
  });
});

module.exports = router;
