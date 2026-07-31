document.addEventListener("DOMContentLoaded", () => {
  let currentPage = 1;
  let lastRawData = [];
  let sortField = "";
  let sortOrder = "asc";

  // แผนผัง DOM Elements
  const fileInput = document.getElementById("fileInput");
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const btnBrowse = document.getElementById("btnBrowse");
  const btnStructure = document.getElementById("btnStructure");
  const btnSearch = document.getElementById("btnSearch");
  const btnClearSearch = document.getElementById("btnClearSearch");
  const btnExportPage = document.getElementById("btnExportPage");
  const btnExportAll = document.getElementById("btnExportAll");
  const searchInput = document.getElementById("searchInput");
  const structureModal = document.getElementById("structureModal");
  const btnCloseModal = document.getElementById("btnCloseModal");

  // ผูก Event Listeners (สอดคล้องตามมาตรฐานความปลอดภัยของ CSP)
  btnBrowse.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFileSelect(e.target));
  btnStructure.addEventListener("click", openStructureModal);
  btnCloseModal.addEventListener("click", closeStructureModal);
  btnSearch.addEventListener("click", searchData);
  btnClearSearch.addEventListener("click", clearSearch);
  btnExportPage.addEventListener("click", exportCurrentPage);
  btnExportAll.addEventListener("click", exportAllData);

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchData();
  });

  async function handleFileSelect(input) {
    if (!input.files[0]) return;
    const file = input.files[0];
    fileNameDisplay.value = file.name;

    const formData = new FormData();
    formData.append("dbfFile", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        // หมายเหตุ: กรณีใช้ CSRF Protection ในโปรเจกต์ DataRecon
        // อย่าลืมแนบ CSRF Token ใน Headers ของ Fetch ด้วย เช่น 'X-CSRF-TOKEN': token
      });

      if (res.ok) {
        currentPage = 1;
        sortField = "";
        loadData();
      } else {
        alert("เกิดข้อผิดพลาดในการ Upload ไฟล์");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    }
  }

  async function loadData() {
    const search = searchInput.value;
    // ป้องกันการส่งค่าแปลกปลอมผ่านการ Encode URI ส่วนประกอบสำหรับ Express-validator
    const url = `/api/data?page=${parseInt(currentPage) || 1}&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sortField)}&order=${encodeURIComponent(sortOrder)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network response was not ok");
      const result = await res.json();

      lastRawData = result.data || [];
      renderTable(lastRawData);
      renderPagination(result.totalPages || 0);

      btnStructure.disabled = !(lastRawData && lastRawData.length > 0);
    } catch (error) {
      console.error("Load data error:", error);
    }
  }

  function renderTable(data) {
    const head = document.getElementById("tableHeader");
    const body = document.getElementById("tableBody");
    head.innerHTML = "";
    body.innerHTML = "";

    if (!data || data.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.setAttribute("colspan", "100%");
      td.style.textAlign = "center";
      td.textContent = "ไม่พบข้อมูล"; // ใช้ textContent ป้องกัน XSS
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    const keys = Object.keys(data[0]);
    keys.forEach((key) => {
      const th = document.createElement("th");
      th.textContent = key;

      if (key === sortField) {
        th.className = sortOrder === "asc" ? "sort-asc" : "sort-desc";
      }

      th.addEventListener("click", () => {
        if (sortField === key) {
          sortOrder = sortOrder === "asc" ? "desc" : "asc";
        } else {
          sortField = key;
          sortOrder = "asc";
        }
        loadData();
      });

      head.appendChild(th);
    });

    data.forEach((row) => {
      const tr = document.createElement("tr");
      keys.forEach((key) => {
        const td = document.createElement("td");
        // ใช้ textContent ทุกครั้งที่แสดงข้อมูลดิบจากฐานข้อมูล/ไฟล์ เพื่อทำความสะอาดสคริปต์แฝงตัว
        td.textContent =
          row[key] !== undefined && row[key] !== null ? row[key] : "";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function openStructureModal() {
    if (!lastRawData || lastRawData.length === 0) return;

    const fileName = fileNameDisplay.value;
    document.getElementById("modalTableName").textContent =
      "Structure: " + fileName;

    const body = document.getElementById("structureBody");
    body.innerHTML = "";

    const keys = Object.keys(lastRawData[0]);

    keys.forEach((key) => {
      let maxLength = 0;
      let type = "String/Character";
      let isNumeric = true;
      let isDate = true;

      lastRawData.forEach((row) => {
        const val = String(row[key] || "").trim();
        if (val.length > maxLength) maxLength = val.length;
        if (val !== "" && isNaN(Number(val.replace(/,/g, "")))) {
          isNumeric = false;
        }
        if (val !== "" && !/^\d{4}-\d{2}-\d{2}/.test(val)) {
          isDate = false;
        }
      });

      if (isNumeric && maxLength > 0) type = "Numeric/Float";
      else if (isDate && maxLength >= 10) type = "Date/Timestamp";

      const tr = document.createElement("tr");

      const tdKey = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = key;
      tdKey.appendChild(strong);

      const tdType = document.createElement("td");
      tdType.textContent = type;

      const tdLen = document.createElement("td");
      tdLen.textContent = maxLength;

      tr.appendChild(tdKey);
      tr.appendChild(tdType);
      tr.appendChild(tdLen);

      body.appendChild(tr);
    });

    // เรียกใช้ classList แทนการเขียนสไตล์ทับตรงๆ เพื่อไม่ให้ผิดเงื่อนไข CSP style-src
    structureModal.classList.add("show");
  }

  function closeStructureModal() {
    structureModal.classList.remove("show");
  }

  function renderPagination(totalPages) {
    const container = document.getElementById("paginationControls");
    container.innerHTML = "";

    if (totalPages === 0) return;

    // ใช้สร้าง Element ทีละส่วนแทนการใช้ innerHTML ตัวแปรตัวเลขปลอดภัย
    const textNode = document.createTextNode(
      `หน้า: ${currentPage} / ${totalPages} `,
    );
    container.appendChild(textNode);

    const prev = document.createElement("button");
    prev.innerText = "ก่อนหน้า";
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", () => {
      currentPage--;
      loadData();
    });

    const next = document.createElement("button");
    next.innerText = "ถัดไป";
    next.disabled = currentPage >= totalPages;
    next.addEventListener("click", () => {
      currentPage++;
      loadData();
    });

    container.appendChild(prev);
    container.appendChild(next);
  }

  function searchData() {
    currentPage = 1;
    loadData();
  }

  function clearSearch() {
    searchInput.value = "";
    sortField = "";
    currentPage = 1;
    loadData();
  }

  function exportCurrentPage() {
    const table = document.getElementById("dataTable");
    if (!table || table.rows.length <= 1) {
      alert("ไม่มีข้อมูล");
      return;
    }
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Current_Page");

    let fileName = fileNameDisplay.value.split(".")[0] || "Export";
    XLSX.writeFile(wb, `${fileName}_Page${currentPage}.xlsx`);
  }

  async function exportAllData() {
    const search = searchInput.value;
    const currentFileName = fileNameDisplay.value;
    if (!currentFileName || currentFileName === "ไม่ได้เลือกไฟล์") {
      alert("กรุณาอัปโหลดไฟล์ก่อน");
      return;
    }
    try {
      const url = `/api/data?page=1&limit=999999&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sortField)}&order=${encodeURIComponent(sortOrder)}`;
      const res = await fetch(url);
      const result = await res.json();

      if (!result.data || result.data.length === 0) {
        alert("ไม่พบข้อมูล");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(result.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "All_Data");
      XLSX.writeFile(wb, `${currentFileName.split(".")[0]}_Full.xlsx`);
    } catch (error) {
      console.error("Export all error:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลทั้งหมด");
    }
  }
});
