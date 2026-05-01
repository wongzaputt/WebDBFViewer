const express = require("express");
const router = express.Router();
const multer = require("multer");
const { DBFFile } = require("dbffile");
const fs = require("fs");
const path = require("path");

// กำหนด Path ให้ชัดเจน
const tempDir = path.join(__dirname, "../temp_db");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // ป้องกันการทำ Path Traversal และใช้ชื่อสุ่มที่ปลอดภัย
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `upload-${uniqueSuffix}.dbf`);
  },
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100 MB
    files: 1 // อัปโหลดได้ทีละ 1 ไฟล์ต่อ request
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.dbf') {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์ .dbf เท่านั้น'));
    }
  }
});

let cachedData = [];

router.post("/upload", upload.single("dbfFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "กรุณาเลือกไฟล์" });
  }

  const filePath = req.file.path;

  try {
    // เคลียร์ Cache เดิมเพื่อคืน Memory ก่อนโหลดไฟล์ใหม่
    cachedData = [];

    const dbf = await DBFFile.open(filePath, { encoding: "cp874" });
    const records = await dbf.readRecords();

    // ทำ Index สำหรับค้นหา
    cachedData = records.map((r) => ({
      ...r,
      _searchIndex: Object.values(r).filter(v => v).join(" ").toLowerCase(),
    }));

    // ส่ง Response กลับ (ไม่ต้องรอให้ลบไฟล์เสร็จ)
    res.json({ 
      filename: req.file.originalname, 
      total: records.length,
      message: "อัปโหลดและประมวลผลสำเร็จ" 
    });

  } catch (error) {
    console.error("Processing Error:", error);
    res.status(500).json({ error: "ไม่สามารถประมวลผลไฟล์ DBF ได้: " + error.message });
  } finally {
    // ลบไฟล์ชั่วคราวทิ้งเสมอ (ไม่ว่าจะ Error หรือสำเร็จ)
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Cleanup Error:", err);
      });
    }
  }
});

// API สำหรับดึงข้อมูล พร้อมระบบค้นหา, เรียงลำดับ และแบ่งหน้า
router.get("/data", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const search = req.query.search || "";
  
  // รับพารามิเตอร์การ Sort จาก Frontend
  const sortBy = req.query.sort; 
  const sortDir = req.query.order || "asc";

  let filteredData = [...cachedData];

  // 1. ระบบค้นหา (Multi-keyword search)
  if (search) {
    const keywords = search
      .toLowerCase()
      .split(" ")
      .filter((k) => k);

    filteredData = filteredData.filter((row) => {
      return keywords.every((kw) => row._searchIndex.includes(kw));
    });
  }

  // 2. ระบบเรียงลำดับ (Sorting Logic)
  if (sortBy && filteredData.length > 0) {
    filteredData.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // ตรวจสอบว่าเป็นตัวเลขหรือไม่ (สำหรับฟิลด์ยอดเงิน หรือจำนวน)
      const isNumA = typeof valA === 'number' || (!isNaN(parseFloat(valA)) && isFinite(valA));
      const isNumB = typeof valB === 'number' || (!isNaN(parseFloat(valB)) && isFinite(valB));

      if (isNumA && isNumB) {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      } else {
        // กรณีเป็น String ให้ลบช่องว่างและทำเป็นตัวเล็ก
        valA = valA ? String(valA).toLowerCase().trim() : "";
        valB = valB ? String(valB).toLowerCase().trim() : "";
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  // 3. การแบ่งหน้า (Pagination)
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // ส่งกลับข้อมูลที่ Clean แล้ว (ตัด _searchIndex ออก)
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