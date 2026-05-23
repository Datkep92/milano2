// ========== DOM ELEMENTS (dùng var có kiểm tra) ==========
if(typeof periodLabel === 'undefined') var periodLabel = document.getElementById("periodLabel");
if(typeof managerBank === 'undefined') var managerBank = document.getElementById("managerBank");
if(typeof managerCash === 'undefined') var managerCash = document.getElementById("managerCash");
if(typeof managerExpense === 'undefined') var managerExpense = document.getElementById("managerExpense");
if(typeof managerDebt === 'undefined') var managerDebt = document.getElementById("managerDebt");
if(typeof managerExpenseList === 'undefined') var managerExpenseList = document.getElementById("managerExpenseList");
if(typeof managerDebtList === 'undefined') var managerDebtList = document.getElementById("managerDebtList");

// Biến trạng thái
if(typeof currentViewMode === 'undefined') var currentViewMode = "period";
if(typeof currentPeriodDate === 'undefined') var currentPeriodDate = new Date();
if(typeof currentMonth === 'undefined') {
  const now = new Date();
  var currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
if(typeof currentDay === 'undefined') var currentDay = getToday();

// DOM elements cho bộ lọc
if(typeof viewModeBtns === 'undefined') var viewModeBtns = document.querySelectorAll(".view-mode-btn");
if(typeof periodPrevBtn === 'undefined') var periodPrevBtn = document.getElementById("periodPrevBtn");
if(typeof periodNextBtn === 'undefined') var periodNextBtn = document.getElementById("periodNextBtn");
if(typeof periodDisplay === 'undefined') var periodDisplay = document.getElementById("periodDisplay");
if(typeof datePickerWrapper === 'undefined') var datePickerWrapper = document.getElementById("datePickerWrapper");
if(typeof monthPickerWrapper === 'undefined') var monthPickerWrapper = document.getElementById("monthPickerWrapper");
if(typeof managerDatePicker === 'undefined') var managerDatePicker = document.getElementById("managerDatePicker");
if(typeof managerMonthPicker === 'undefined') var managerMonthPicker = document.getElementById("managerMonthPicker");
if(typeof statsTitle === 'undefined') var statsTitle = document.getElementById("statsTitle");
if(typeof exportExpenseBtn === 'undefined') var exportExpenseBtn = document.getElementById("exportExpenseBtn");
if(typeof exportDebtBtn === 'undefined') var exportDebtBtn = document.getElementById("exportDebtBtn");

// ========== TAB SWITCHING ==========
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab-btn").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    if(btn.dataset.tab === "managerTab") renderManagerDashboard();
  };
});

// ========== VIEW MODE ==========
viewModeBtns.forEach(btn => {
  btn.onclick = () => {
    viewModeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentViewMode = btn.dataset.mode;
    datePickerWrapper.classList.add("hidden");
    monthPickerWrapper.classList.add("hidden");
    if(currentViewMode === "day"){
      datePickerWrapper.classList.remove("hidden");
      managerDatePicker.value = currentDay;
      renderManagerDashboard();
    }else if(currentViewMode === "month"){
      monthPickerWrapper.classList.remove("hidden");
      managerMonthPicker.value = currentMonth;
      renderManagerDashboard();
    }else{
      renderManagerDashboard();
    }
  };
});

// ========== NAVIGATION ==========
if(periodPrevBtn) {
  periodPrevBtn.onclick = () => {
    if(currentViewMode === "period"){
      const newDate = new Date(currentPeriodDate);
      newDate.setMonth(newDate.getMonth() - 1);
      currentPeriodDate = newDate;
      renderManagerDashboard();
    }else if(currentViewMode === "month"){
      const [year, month] = currentMonth.split("-").map(Number);
      let newYear = year, newMonth = month - 1;
      if(newMonth < 1){ newMonth = 12; newYear = year - 1; }
      currentMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
      if(managerMonthPicker) managerMonthPicker.value = currentMonth;
      renderManagerDashboard();
    }else if(currentViewMode === "day"){
      const newDate = new Date(currentDay);
      newDate.setDate(newDate.getDate() - 1);
      currentDay = newDate.toISOString().split("T")[0];
      if(managerDatePicker) managerDatePicker.value = currentDay;
      renderManagerDashboard();
    }
  };
}

if(periodNextBtn) {
  periodNextBtn.onclick = () => {
    if(currentViewMode === "period"){
      const newDate = new Date(currentPeriodDate);
      newDate.setMonth(newDate.getMonth() + 1);
      currentPeriodDate = newDate;
      renderManagerDashboard();
    }else if(currentViewMode === "month"){
      const [year, month] = currentMonth.split("-").map(Number);
      let newYear = year, newMonth = month + 1;
      if(newMonth > 12){ newMonth = 1; newYear = year + 1; }
      currentMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
      if(managerMonthPicker) managerMonthPicker.value = currentMonth;
      renderManagerDashboard();
    }else if(currentViewMode === "day"){
      const newDate = new Date(currentDay);
      newDate.setDate(newDate.getDate() + 1);
      currentDay = newDate.toISOString().split("T")[0];
      if(managerDatePicker) managerDatePicker.value = currentDay;
      renderManagerDashboard();
    }
  };
}

if(managerDatePicker){
  managerDatePicker.onchange = () => {
    currentDay = managerDatePicker.value;
    renderManagerDashboard();
  };
}
if(managerMonthPicker){
  managerMonthPicker.onchange = () => {
    currentMonth = managerMonthPicker.value;
    renderManagerDashboard();
  };
}

// ========== GET DATE RANGE ==========
function getDateRange(){
  if(currentViewMode === "day"){
    return {
      start: new Date(currentDay),
      end: new Date(currentDay),
      label: `Ngày ${new Date(currentDay).toLocaleDateString("vi-VN")}`,
      type: "day"
    };
  }else if(currentViewMode === "month"){
    const [year, month] = currentMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      start: start,
      end: end,
      label: `Tháng ${month}/${year}`,
      type: "month"
    };
  }else{
    const d = new Date(currentPeriodDate);
    let start, end;
    if(d.getDate() >= 20){
      start = new Date(d.getFullYear(), d.getMonth(), 20);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 19);
    }else{
      start = new Date(d.getFullYear(), d.getMonth() - 1, 20);
      end = new Date(d.getFullYear(), d.getMonth(), 19);
    }
    const formatDate = (date) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    return {
      start: start,
      end: end,
      label: `Kỳ: ${formatDate(start)} → ${formatDate(end)}`,
      type: "period"
    };
  }
}

function isDateInRange(dateStr, range){
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

// ========== RENDER DASHBOARD ==========
function renderManagerDashboard(){
  const range = getDateRange();
  if(periodDisplay) periodDisplay.innerText = range.label;
  if(statsTitle){
    if(range.type === "day") statsTitle.innerText = "📌 Thống Kê Ngày";
    else if(range.type === "month") statsTitle.innerText = "📆 Thống Kê Tháng";
    else statsTitle.innerText = "📅 Thống Kê Kỳ (20→19)";
  }
  
  let bank = 0, cash = 0;
  Object.entries(appData.reports).forEach(([date, report]) => {
    if(isDateInRange(date, range)){
      bank += report.bank || 0;
      cash += report.cash || 0;
    }
  });
  
  const expense = appData.expenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .reduce((a, b) => a + (b.amount || 0), 0);
  
  const debt = appData.debtTransactions
    .filter(x => !x.deleted && x.type === "debt_add" && isDateInRange(x.date, range))
    .reduce((a, b) => a + (b.amount || 0), 0);
  
  managerBank.innerText = formatMoney(bank);
  managerCash.innerText = formatMoney(cash);
  managerExpense.innerText = formatMoney(expense);
  managerDebt.innerText = formatMoney(debt);
  
  renderExpenseStats(range);
  renderDebtStats(range);
}

function renderExpenseStats(range){
  const grouped = {};
  appData.expenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .forEach(item => {
      if(!grouped[item.name]) grouped[item.name] = [];
      grouped[item.name].push(item);
    });
  
  let html = "";
  Object.keys(grouped).sort().forEach(name => {
    const total = grouped[name].reduce((a, b) => a + b.amount, 0);
    const qtyTotal = grouped[name].reduce((a, b) => a + (b.qty || 0), 0);
    html += `
      <div class="manager-item" onclick="showExpenseDetail('${name.replace(/'/g, "\\'")}')">
        <strong>📦 ${name}</strong>
        <div class="manager-item-stats">
          <span>💰 ${formatMoney(total)}</span>
          ${qtyTotal > 0 ? `<span>📊 SL: ${qtyTotal}</span>` : ""}
        </div>
      </div>
    `;
  });
  if(html === "") html = '<div class="empty-text">📭 Chưa có dữ liệu chi phí</div>';
  managerExpenseList.innerHTML = html;
}

function renderDebtStats(range){
  const allCustomers = new Set();
  const balanceAtEnd = {};
  
  appData.categories.customers.forEach(c => allCustomers.add(c));
  appData.recent.customers.forEach(c => allCustomers.add(c));
  appData.debtTransactions.forEach(t => { if(!t.deleted) allCustomers.add(t.customer); });
  
  const rangeEnd = new Date(range.end);
  rangeEnd.setHours(23, 59, 59, 999);
  
  allCustomers.forEach(customer => {
    let balance = 0;
    appData.debtTransactions
      .filter(t => !t.deleted && t.customer === customer)
      .forEach(t => {
        const transDate = new Date(t.date);
        transDate.setHours(0, 0, 0, 0);
        if(transDate <= rangeEnd){
          if(t.type === "debt_add") balance += t.amount;
          else balance -= t.amount;
        }
      });
    balanceAtEnd[customer] = balance;
  });
  
  let html = "";
  Object.keys(balanceAtEnd).sort().forEach(customer => {
    const balance = balanceAtEnd[customer];
    if(balance > 0){
      html += `
        <div class="manager-item" onclick="showDebtDetail('${customer.replace(/'/g, "\\'")}')">
          <strong>👤 ${customer}</strong>
          <div class="manager-item-stats">
            <span>💰 Dư nợ: ${formatMoney(balance)}</span>
          </div>
        </div>
      `;
    }
  });
  if(html === "") html = '<div class="empty-text">✅ Không có khách nợ</div>';
  managerDebtList.innerHTML = html;
}

// ========== EXPORT ==========
function exportToCSV(data, filename, headers){
  let csv = headers.join(",") + "\n";
  data.forEach(row => { csv += row.map(cell => `"${cell}"`).join(",") + "\n"; });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

if(exportExpenseBtn){
  exportExpenseBtn.onclick = () => {
    const range = getDateRange();
    const expenses = appData.expenses.filter(x => !x.deleted && isDateInRange(x.date, range));
    const data = expenses.map(e => [e.date, e.name, e.qty || 0, e.amount]);
    exportToCSV(data, `chi_phi_${range.label.replace(/[\/\s→:]/g, "_")}.csv`, ["Ngày", "Tên", "Số lượng", "Số tiền"]);
    showToast("✓ Đã xuất file chi phí");
  };
}

if(exportDebtBtn){
  exportDebtBtn.onclick = () => {
    const range = getDateRange();
    const debts = appData.debtTransactions.filter(x => !x.deleted && isDateInRange(x.date, range));
    const data = debts.map(d => [d.date, d.customer, d.type === "debt_add" ? "Công nợ" : "Thanh toán", d.amount, d.note || ""]);
    exportToCSV(data, `cong_no_${range.label.replace(/[\/\s→:]/g, "_")}.csv`, ["Ngày", "Khách hàng", "Loại", "Số tiền", "Ghi chú"]);
    showToast("✓ Đã xuất file công nợ");
  };
}

// ========== DETAIL VIEW ==========
function showExpenseDetail(name){
  detailTitle.innerText = "Chi Tiết: " + name;
  let html = "";
  appData.expenses
    .filter(x => x.name === name && !x.deleted)
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(item => {
      html += `
        <div class="history-item">
          <div><strong>📅 ${item.date}</strong></div>
          <div>💰 ${formatMoney(item.amount)}</div>
          ${item.qty ? `<div>📦 Số lượng: ${item.qty}</div>` : ""}
        </div>
      `;
    });
  if(html === "") html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

function showDebtDetail(customer){
  detailTitle.innerText = "Công Nợ: " + customer;
  let balance = 0;
  let html = "";
  appData.debtTransactions
    .filter(x => x.customer === customer && !x.deleted)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(item => {
      if(item.type === "debt_add") balance += item.amount;
      else balance -= item.amount;
      html += `
        <div class="history-item">
          <div><strong>📅 ${item.date}</strong></div>
          <div>${item.type === "debt_add" ? "🧾 Công nợ (+)" : "💰 Thanh toán (-)"}</div>
          <div>💰 ${formatMoney(item.amount)}</div>
          <div>📊 Còn lại: ${formatMoney(balance)}</div>
          ${item.note ? `<div>📝 ${item.note}</div>` : ""}
        </div>
      `;
    });
  if(html === "") html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

// ========== CSS ==========
if(!document.querySelector('#manager-styles')) {
  const style = document.createElement('style');
  style.id = 'manager-styles';
  style.textContent = `
    .manager-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; }
    .manager-item:hover { background: #f9f9f9; }
    .manager-item-stats { display: flex; justify-content: space-between; margin-top: 6px; font-size: 13px; color: #666; }
    .positive { color: #27ae60; }
    .negative { color: #e74c3c; }
    .empty-text { text-align: center; padding: 20px; color: #999; font-style: italic; }
  `;
  document.head.appendChild(style);
}
// Thêm hàm tính tổng công nợ tất cả khách hàng (cho manager)
function calculateTotalDebtAll() {
  const allCustomers = new Set();
  
  appData.categories.customers.forEach(c => allCustomers.add(c));
  appData.recent.customers.forEach(c => allCustomers.add(c));
  appData.debtTransactions.forEach(t => {
    if (!t.deleted && t.customer) allCustomers.add(t.customer);
  });
  
  let total = 0;
  allCustomers.forEach(customer => {
    total += calculateCustomerDebt(customer);
  });
  
  return total;
}
// ========== TỔNG CÔNG NỢ HIỆN TẠI ==========
function updateManagerTotalDebt() {
  const managerTotalDebt = document.getElementById("managerTotalDebt");
  if (managerTotalDebt && typeof window.calculateTotalDebtAll === 'function') {
    managerTotalDebt.innerText = formatMoney(window.calculateTotalDebtAll());
  }
}

// Cập nhật trong renderManagerDashboard
const originalRenderManagerDashboard = renderManagerDashboard;
renderManagerDashboard = function() {
  originalRenderManagerDashboard();
  updateManagerTotalDebt();
};

// ========== INIT ==========
renderManagerDashboard();