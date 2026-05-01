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
    // ใช้ชื่อไฟล์แบบสุ่มเพื่อป้องกัน Path Traversal
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // จำกัดไว้ที่ 100MB
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.dbf') {
      cb(null, true);
    } else {
      cb(new Error('Only .dbf files are allowed'));
    }
  }
});

// ตัวแปรเก็บข้อมูลไว้ใน Memory (Shared ภายในไฟล์นี้)
let cachedData = [];

// API สำหรับ Upload ไฟล์
router.post("/upload", upload.single("dbfFile"), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) throw new Error("No file uploaded");

    filePath = req.file.path;
    // รองรับภาษาไทย Express Accounting ด้วย cp874
    const dbf = await DBFFile.open(filePath, { encoding: "cp874" });
    const records = await dbf.readRecords();

    // สร้าง Search Index ล่วงหน้า
    cachedData = records.map((r) => ({
      ...r,
      _searchIndex: Object.values(r).join(" ").toLowerCase(),
    }));

    // ลบไฟล์ทันทีหลังใช้งาน
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    res.json({ filename: req.file.originalname, total: records.length });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ error: error.message });
  }
});

// API สำหรับดึงข้อมูล พร้อมระบบค้นหาและแบ่งหน้า
router.get("/data", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const search = req.query.search || "";
  const sortBy = req.query.sortBy;
  const sortDir = req.query.sortDir || "asc";

  let filteredData = [...cachedData];

  // ระบบค้นหา
  if (search) {
    const keywords = search
      .toLowerCase()
      .split(" ")
      .filter((k) => k);

    filteredData = filteredData.filter((row) => {
      return keywords.every((kw) => row._searchIndex.includes(kw));
    });
  }

  // ระบบ Sort
  if (sortBy) {
    filteredData.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // จัดการกรณีที่เป็น String ให้เทียบแบบไม่สนตัวพิมพ์เล็กใหญ่
      if (typeof valA === "string") valA = valA.toLowerCase().trim();
      if (typeof valB === "string") valB = valB.toLowerCase().trim();

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // ส่งกลับ (Clean data)
  const resultData = filteredData.slice(startIndex, endIndex).map((row) => {
    const { _searchIndex, ...rest } = row;
    return rest;
  });

  res.json({
    data: resultData,
    total: filteredData.length,
    totalPages: Math.ceil(filteredData.length / limit),
  });
});

module.exports = router;

