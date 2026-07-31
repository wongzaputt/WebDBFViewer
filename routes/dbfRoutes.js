const express = require("express");
const router = express.Router();
const multer = require("multer");
const { DBFFile } = require("dbffile");
const fs = require("fs");
const path = require("path");
const { query, validationResult } = require("express-validator");

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
    // ป้องกัน Path Traversal ปลอดภัย 100% ด้วยการบังคับใช้นามสกุลคงที่
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `upload-${uniqueSuffix}.dbf`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".dbf") {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะไฟล์ .dbf เท่านั้น"));
    }
  },
});

// แนะนำ: สำหรับระบบที่ใช้งานจริง ควรย้ายตัวแปรนี้ไปเก็บใน Session หรือ Redis แทน
// เพื่อแยกข้อมูลระหว่าง Users ไม่ให้ตีกัน (Race Condition)
let cachedData = [];

// ขัดขวาง Multer Error ให้ส่งเป็น JSON ที่สวยงามตามโครงสร้างโปรเจกต์
const uploadHandler = (req, res, next) => {
  upload.single("dbfFile")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer Error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.post("/upload", uploadHandler, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "กรุณาเลือกไฟล์" });
  }

  const filePath = req.file.path;

  try {
    cachedData = []; // เคลียร์ Cache เดิม

    const dbf = await DBFFile.open(filePath, { encoding: "cp874" });
    const records = await dbf.readRecords();

    // ทำ Index สำหรับค้นหา
    cachedData = records.map((r) => ({
      ...r,
      // ทำความสะอาดข้อมูลเพื่อป้องกัน XSS ตั้งแต่ระดับการทำดัชนี
      _searchIndex: Object.values(r)
        .filter((v) => v !== null && v !== undefined)
        .join(" ")
        .toLowerCase(),
    }));

    res.json({
      filename: path.basename(req.file.originalname), // ป้องกันการแฝง Path จากฝั่ง Client
      total: records.length,
      message: "อัปโหลดและประมวลผลสำเร็จ",
    });
  } catch (error) {
    console.error("Processing Error:", error);
    res.status(500).json({ error: "ไม่สามารถประมวลผลไฟล์ DBF ได้" }); // ไม่เอา error.message ดิบออกไปแสดง เพื่อป้องกัน Information Leakage
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Cleanup Error:", err);
      });
    }
  }
});

// API สำหรับดึงข้อมูล เสริมทัพความปลอดภัยด้วย express-validator คัดกรองเข้มงวด
router.get(
  "/data",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 1000000 }).toInt(),
    query("search").optional().trim().stripLow().escape(), // ทำความสะอาดสตริงค้นหา ป้องกัน XSS & ReDoS
    query("sort").optional().trim().stripLow(),
    query("order").optional().trim().toLowerCase().isIn(["asc", "desc"]),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 100;
    const search = req.query.search || "";
    const sortBy = req.query.sort;
    const sortDir = req.query.order || "asc";

    let filteredData = [...cachedData];

    // 1. ระบบค้นหา (Multi-keyword search)
    if (search) {
      const keywords = search
        .toLowerCase()
        .split(/\s+/) // แยกคำด้วย Regex ช่องว่างที่ปลอดภัย
        .filter((k) => k);

      filteredData = filteredData.filter((row) => {
        return keywords.every(
          (kw) => row._searchIndex && row._searchIndex.includes(kw),
        );
      });
    }

    // 2. ระบบเรียงลำดับ ป้องกันช่องโหว่ Object Injection / Prototype Pollution
    if (sortBy && filteredData.length > 0) {
      // ตรวจสอบว่าคีย์ที่ส่งมาเพื่อทำการเรียง มีอยู่จริงใน Object และไม่ใช่คุณสมบัติอันตรายของ Prototype
      const validKeys = Object.keys(filteredData[0]);
      const unsafeKeys = ["__proto__", "constructor", "prototype"];

      if (validKeys.includes(sortBy) && !unsafeKeys.includes(sortBy)) {
        filteredData.sort((a, b) => {
          let valA = a[sortBy];
          let valB = b[sortBy];

          const isNumA =
            typeof valA === "number" ||
            (!isNaN(parseFloat(valA)) && isFinite(valA));
          const isNumB =
            typeof valB === "number" ||
            (!isNaN(parseFloat(valB)) && isFinite(valB));

          if (isNumA && isNumB) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
          } else {
            valA =
              valA !== null && valA !== undefined
                ? String(valA).toLowerCase().trim()
                : "";
            valB =
              valB !== null && valB !== undefined
                ? String(valB).toLowerCase().trim()
                : "";
          }

          if (valA < valB) return sortDir === "asc" ? -1 : 1;
          if (valA > valB) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }

    // 3. การแบ่งหน้า (Pagination)
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const resultData = filteredData.slice(startIndex, endIndex).map((row) => {
      const { _searchIndex, ...rest } = row;
      return rest;
    });

    res.json({
      data: resultData,
      total: filteredData.length,
      totalPages: Math.ceil(filteredData.length / limit),
    });
  },
);

module.exports = router;
