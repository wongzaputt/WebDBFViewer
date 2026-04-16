// public/js/viewer.js
let currentPage = 1;

async function handleFileSelect(input) {
  if (!input.files[0]) return;

  const file = input.files[0];
  document.getElementById("fileNameDisplay").value = file.name;

  const formData = new FormData();
  formData.append("dbfFile", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (res.ok) {
    currentPage = 1;
    loadData();
  } else {
    alert("เกิดข้อผิดพลาดในการ Upload ไฟล์");
  }
}

async function loadData() {
  const search = document.getElementById("searchInput").value;
  const res = await fetch(
    `/api/data?page=${currentPage}&search=${encodeURIComponent(search)}`,
  );
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
    th.textContent = key;
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

// รองรับการกด Enter เพื่อค้นหา
document
  .getElementById("searchInput")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      searchData();
    }
  });
