const express = require('express');
const multer = require('multer');
const { DBFFile } = require('dbffile');
const path = require('path');
const fs = require('fs');

const app = express();
const tempDir = './temp_db';

// ตรวจสอบและสร้างโฟลเดอร์ temp_db ถ้ายังไม่มี
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// ตั้งค่าการเก็บไฟล์ให้ใช้ชื่อเดิม
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        // ใช้ชื่อไฟล์เดิมที่ upload ขึ้นมา
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.json());

let cachedData = [];

app.post('/upload', upload.single('dbfFile'), async (req, res) => {
    try {
        if (!req.file) throw new Error('No file uploaded');
        
        const filePath = req.file.path;
        // ระบุ encoding เป็น cp874 สำหรับภาษาไทยใน Express Accounting
        const dbf = await DBFFile.open(filePath, { encoding: 'cp874' });
        const records = await dbf.readRecords();
        
        cachedData = records;
        res.json({ filename: req.file.originalname, total: records.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/data', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const search = req.query.search || '';

    let filteredData = cachedData;

    if (search) {
        const keywords = search.toLowerCase().split(' ').filter(k => k);
        filteredData = cachedData.filter(row => {
            const rowValues = Object.values(row).join(' ').toLowerCase();
            return keywords.every(kw => rowValues.includes(kw));
        });
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    res.json({
        data: filteredData.slice(startIndex, endIndex),
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit)
    });
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));