// public/js/viewer.js
let currentPage = 1;
let sortConfig = { key: null, direction: 'asc' };

async function handleFileSelect(input) {
  if (!input.files[0]) return;

  const file = input.files[0];
  document.getElementById("fileNameDisplay").value = file.name;

  const formData = new FormData();
  formData.append("dbfFile", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (res.ok) {
    const result = await res.json();
    currentPage = 1;
    // พยายามหา Default Primary Key จากชื่อไฟล์
    detectDefaultSort(file.name);
    loadData();
  } else {
    alert("เกิดข้อผิดพลาดในการ Upload ไฟล์");
  }
}

function detectDefaultSort(fileName) {
  const name = fileName.toUpperCase();
  // กำหนด Default Primary Key ตามมาตรฐาน Express Accounting
  const primaryKeys = {
    'STMAS': 'STKCOD',
    'ARMAS': 'CUSCOD',
    'APMAS': 'SUPCOD',
    'ISUAN': 'DOCNUM',
    'GLMAS': 'ACCCOD'
  };

  // เช็คว่าชื่อไฟล์มีใน List ไหม
  for (const [key, field] of Object.entries(primaryKeys)) {
    if (name.includes(key)) {
      sortConfig = { key: field, direction: 'asc' };
      return;
    }
  }
  sortConfig = { key: null, direction: 'asc' }; // ถ้าไม่พบ ให้เป็น null
}

async function loadData() {
  const search = document.getElementById("searchInput").value;
  let url = `/api/data?page=${currentPage}&search=${encodeURIComponent(search)}`;
  
  if (sortConfig.key) {
    url += `&sortBy=${sortConfig.key}&sortDir=${sortConfig.direction}`;
  }

  const res = await fetch(url);
  const result = await res.json();
  renderTable(result.data);
  renderPagination(result.totalPages);
}

function renderTable(data) {
  const head = document.getElementById("tableHeader");
  const body = document.getElementById("tableBody");
  head.innerHTML = "";
  body.innerHTML = "";

  if (!data || data.length === 0) {
    body.innerHTML =
      '<tr><td colspan="100%" style="text-align:center;">ไม่พบข้อมูล</td></tr>';
    return;
  }

  const keys = Object.keys(data[0]);
  keys.forEach((key) => {
    const th = document.createElement("th");
    th.style.cursor = "pointer";
    th.innerHTML = `${key} ${getSortIcon(key)}`;
    th.onclick = () => handleSort(key);
    head.appendChild(th);
  });

  data.forEach((row) => {
    const tr = document.createElement("tr");
    keys.forEach((key) => {
      const td = document.createElement("td");
      td.textContent = row[key];
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function getSortIcon(key) {
  if (sortConfig.key !== key) return '↕️';
  return sortConfig.direction === 'asc' ? '🔼' : '🔽';
}

function handleSort(key) {
  if (sortConfig.key === key) {
    sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortConfig.key = key;
    sortConfig.direction = 'asc';
  }
  loadData();
}

function renderPagination(totalPages) {
  const container = document.getElementById("paginationControls");
  if (totalPages === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `หน้า: ${currentPage} / ${totalPages} `;

  const prev = document.createElement("button");
  prev.innerText = "ก่อนหน้า";
  prev.disabled = currentPage === 1;
  prev.onclick = () => {
    currentPage--;
    loadData();
  };

  const next = document.createElement("button");
  next.innerText = "ถัดไป";
  next.disabled = currentPage >= totalPages;
  next.onclick = () => {
    currentPage++;
    loadData();
  };

  container.appendChild(prev);
  container.appendChild(next);
}

function searchData() {
  currentPage = 1;
  loadData();
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  currentPage = 1;
  loadData();
}

// ฟังก์ชันเดิม: Export เฉพาะข้อมูลที่เห็นบนตารางปัจจุบัน (100 รายการ)
function exportCurrentPage() {
  const table = document.getElementById("dataTable");
  if (!table || table.rows.length <= 1) {
    alert("ไม่มีข้อมูลในหน้านี้ที่จะส่งออก");
    return;
  }
  const ws = XLSX.utils.table_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Current_Page");

  let fileName = document.getElementById("fileNameDisplay").value || "Export";
  // ตั้งชื่อไฟล์ให้ชัดเจนว่าเป็นหน้าไหน เช่น GL_Page1.xlsx
  const cleanName = fileName.split(".")[0];
  XLSX.writeFile(wb, `${cleanName}_Page${currentPage}.xlsx`);
}

// ฟังก์ชันใหม่: ดึงข้อมูลทั้งหมดจาก Server ตามคำค้นหา แล้ว Export
async function exportAllData() {
  const search = document.getElementById("searchInput").value;
  const fileNameDisplay = document.getElementById("fileNameDisplay").value;

  if (!fileNameDisplay || fileNameDisplay === "ไม่ได้เลือกไฟล์") {
    alert("กรุณาอัปโหลดไฟล์ก่อน");
    return;
  }

  try {
    // เรียก API โดยขอ limit สูงๆ เพื่อให้ได้ข้อมูลทั้งหมดที่กรองแล้ว
    const res = await fetch(
      `/api/data?page=1&limit=999999&search=${encodeURIComponent(search)}`,
    );
    const result = await res.json();
    const allData = result.data;

    if (!allData || allData.length === 0) {
      alert("ไม่พบข้อมูลที่จะส่งออก");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All_Filtered_Data");

    let fileName = fileNameDisplay.split(".")[0];
    XLSX.writeFile(wb, `${fileName}_Full_Report.xlsx`);
  } catch (error) {
    console.error("Export All Error:", error);
    alert("เกิดข้อผิดพลาดในการส่งออกข้อมูลทั้งหมด");
  }
}

// รองรับการกด Enter เพื่อค้นหา
document
  .getElementById("searchInput")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      searchData();
    }
  });
