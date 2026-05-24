// ========== DOM ELEMENTS ==========
if(typeof periodLabel === 'undefined') var periodLabel = document.getElementById("periodLabel");
if(typeof managerBank === 'undefined') var managerBank = document.getElementById("managerBank");
if(typeof managerCash === 'undefined') var managerCash = document.getElementById("managerCash");
if(typeof managerExpense === 'undefined') var managerExpense = document.getElementById("managerExpense");
if(typeof managerDebt === 'undefined') var managerDebt = document.getElementById("managerDebt");
if(typeof managerAdminExpense === 'undefined') var managerAdminExpense = document.getElementById("managerAdminExpense");
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
    
    // Ẩn/hiện FAB khi chuyển tab
    const expenseFab = document.getElementById("expenseFab");
    const debtFab = document.getElementById("debtFab");
    const paymentFab = document.getElementById("paymentFab");
    const adminExpenseFab = document.getElementById("adminExpenseFab");
    
    const isAdminTab = btn.dataset.tab === "managerTab";
    if(expenseFab) expenseFab.classList.toggle('hidden', isAdminTab);
    if(debtFab) debtFab.classList.toggle('hidden', isAdminTab);
    if(paymentFab) paymentFab.classList.toggle('hidden', isAdminTab);
    if(adminExpenseFab) adminExpenseFab.classList.toggle('hidden', !isAdminTab);
    
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
      label: `${formatDate(start)} → ${formatDate(end)}`,
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
  
  window.currentRange = range;
  
  let bank = 0, cash = 0;
  const bankDetails = [];
  const cashDetails = [];
  
  Object.entries(appData.reports).forEach(([date, report]) => {
    if(isDateInRange(date, range)){
      const bankAmount = report.bank || 0;
      const cashAmount = report.cash || 0;
      bank += bankAmount;
      cash += cashAmount;
      
      if(bankAmount > 0) bankDetails.push({ date, amount: bankAmount });
      if(cashAmount > 0) cashDetails.push({ date, amount: cashAmount });
    }
  });
  
  window.currentBankDetails = bankDetails.sort((a,b) => b.date.localeCompare(a.date));
  window.currentCashDetails = cashDetails.sort((a,b) => b.date.localeCompare(a.date));
  
  const expense = appData.expenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .reduce((a, b) => a + (b.amount || 0), 0);
  
  const debt = appData.debtTransactions
    .filter(x => !x.deleted && x.type === "debt_add" && isDateInRange(x.date, range))
    .reduce((a, b) => a + (b.amount || 0), 0);
  
  // THÊM MỚI: Chi phí quản lý
  const adminExpense = appData.adminExpenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .reduce((a, b) => a + (b.amount || 0), 0);
  
  managerBank.innerText = formatMoney(bank);
  managerCash.innerText = formatMoney(cash);
  managerExpense.innerText = formatMoney(expense);
  managerDebt.innerText = formatMoney(debt);
  if(managerAdminExpense) managerAdminExpense.innerText = formatMoney(adminExpense);
  
  renderExpenseStats(range);
  renderDebtStats(range);
  renderAdminExpenseStats(range); // THÊM MỚI
  
  setupClickableManagerBoxes();
  setupScrollToAdminExpense(); // THÊM MỚI
}

function setupClickableManagerBoxes() {
  const bankBox = document.querySelector('.manager-box:first-child');
  if (bankBox && !bankBox.hasAttribute('data-clickable')) {
    bankBox.setAttribute('data-clickable', 'true');
    bankBox.style.cursor = 'pointer';
    bankBox.onclick = () => showTransactionDetail('bank', 'Chuyển khoản', window.currentBankDetails || []);
  }
  
  const cashBox = document.querySelector('.manager-box:nth-child(2)');
  if (cashBox && !cashBox.hasAttribute('data-clickable')) {
    cashBox.setAttribute('data-clickable', 'true');
    cashBox.style.cursor = 'pointer';
    cashBox.onclick = () => showTransactionDetail('cash', 'Tiền mặt', window.currentCashDetails || []);
  }
  
  // THÊM MỚI: Click vào ô Chi phí quản lý sẽ scroll xuống
  const adminExpenseBox = document.getElementById('adminExpenseBox');
  if (adminExpenseBox && !adminExpenseBox.hasAttribute('data-clickable')) {
    adminExpenseBox.setAttribute('data-clickable', 'true');
    adminExpenseBox.style.cursor = 'pointer';
    adminExpenseBox.onclick = () => scrollToAdminExpenseList();
  }
}

function setupScrollToAdminExpense() {
  const adminExpenseBox = document.getElementById('adminExpenseBox');
  if (adminExpenseBox) {
    adminExpenseBox.style.cursor = 'pointer';
    adminExpenseBox.title = 'Click để xem danh sách chi phí quản lý';
  }
}

function scrollToAdminExpenseList() {
  const adminExpenseList = document.getElementById('managerAdminExpenseList');
  if (adminExpenseList) {
    adminExpenseList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    adminExpenseList.style.transition = 'background 0.5s';
    adminExpenseList.style.background = 'var(--warning-light)';
    setTimeout(() => {
      adminExpenseList.style.background = '';
    }, 1000);
    showToast("📋 Đã cuộn đến danh sách chi phí quản lý");
  } else {
    showToast("⚠️ Chưa có dữ liệu chi phí quản lý");
  }
}

function showTransactionDetail(type, title, details) {
  if (!details || details.length === 0) {
    showToast(`📭 Không có dữ liệu ${title} trong kỳ này`);
    return;
  }
  
  const range = window.currentRange;
  const periodText = range ? range.label : '';
  
  detailTitle.innerText = `💰 ${title} - ${periodText}`;
  
  let html = `
    <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; text-align: center;">
      <div style="font-size: 12px; color: var(--text-light);">Tổng ${title}</div>
      <div style="font-size: 28px; font-weight: 700; color: var(--success);">${formatMoney(details.reduce((a,b) => a + b.amount, 0))}</div>
    </div>
    <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">📋 Chi tiết theo ngày:</div>
  `;
  
  details.forEach(item => {
    const formattedDate = formatDisplayDate(item.date);
    html += `
      <div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formattedDate}</div>
        <div class="history-amount" style="color: var(--success); font-weight: 700;">${formatMoney(item.amount)}</div>
      </div>
    `;
  });
  
  detailContent.innerHTML = html;
  openPopup("detailPopup");
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
    html += `<div class="manager-item" onclick="showExpenseDetail('${name.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;">
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📦 ${name}</span>
      <strong style="flex-shrink:0; white-space:nowrap;">${qtyTotal > 0 ? `SL:${qtyTotal} • ` : ""}${formatMoney(total)}</strong>
    </div>`;
  });
  if(html === "") html = '<div class="empty-text">📭 Chưa có dữ liệu chi phí</div>';
  managerExpenseList.innerHTML = html;
}

// THÊM MỚI: Render chi phí quản lý
function renderAdminExpenseStats(range){
  const grouped = {};
  appData.adminExpenses
    .filter(x => !x.deleted && isDateInRange(x.date, range))
    .forEach(item => {
      if(!grouped[item.name]) grouped[item.name] = [];
      grouped[item.name].push(item);
    });
  
  let html = "";
  Object.keys(grouped).sort().forEach(name => {
    const total = grouped[name].reduce((a, b) => a + b.amount, 0);
    const qtyTotal = grouped[name].reduce((a, b) => a + (b.qty || 0), 0);
    html += `<div class="manager-item" onclick="showAdminExpenseDetail('${name.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;">
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🏢 ${name}</span>
      <strong style="flex-shrink:0; white-space:nowrap;">${qtyTotal > 0 ? `SL:${qtyTotal} • ` : ""}${formatMoney(total)}</strong>
    </div>`;
  });
  if(html === "") html = '<div class="empty-text">📭 Chưa có dữ liệu chi phí quản lý</div>';
  
  let container = document.getElementById("managerAdminExpenseList");
  if(!container) {
    const managerTab = document.getElementById("managerTab");
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'adminExpenseCard';
    card.innerHTML = `
      <div class="card-header">
        <h2>📋 Chi Phí Quản Lý</h2>
        <button class="small-btn" id="exportAdminExpenseBtn">Xuất</button>
      </div>
      <div id="managerAdminExpenseList"></div>
    `;
    const expenseCard = document.querySelector('#managerTab .card:nth-child(3)');
    if(expenseCard) {
      expenseCard.insertAdjacentElement('afterend', card);
    } else {
      managerTab.appendChild(card);
    }
    container = document.getElementById("managerAdminExpenseList");
    
    document.getElementById("exportAdminExpenseBtn")?.addEventListener('click', () => exportAdminExpenses());
  }
  if(container) container.innerHTML = html;
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
      html += `<div class="manager-item" onclick="showDebtDetail('${customer.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer;">
        <span style="flex:1;">👤 ${customer}</span>
        <strong style="color:var(--danger); white-space:nowrap;">Nợ: ${formatMoney(balance)}</strong>
      </div>`;
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

function exportAdminExpenses() {
  const range = getDateRange();
  const adminExpenses = appData.adminExpenses.filter(x => !x.deleted && isDateInRange(x.date, range));
  const data = adminExpenses.map(e => [e.date, e.name, e.qty || 0, e.amount]);
  exportToCSV(data, `chi_phi_quan_ly_${range.label.replace(/[\/\s→:]/g, "_")}.csv`, ["Ngày", "Tên", "Số lượng", "Số tiền"]);
  showToast("✓ Đã xuất file chi phí quản lý");
}

function showExpenseDetail(name){
  detailTitle.innerText = "📋 Chi Phí: " + name;
  let html = "";
  appData.expenses
    .filter(x => x.name === name && !x.deleted)
    .sort((a,b) => b.date.localeCompare(a.date))
    .forEach(item => {
      html += `<div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formatDisplayDate(item.date)}</div>
        <div class="history-amount debt">${formatMoney(item.amount)}</div>
      </div>`;
    });
  if(!html) html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

// THÊM MỚI: Hiển thị chi tiết chi phí quản lý
function showAdminExpenseDetail(name){
  detailTitle.innerText = "🏢 Chi Phí Quản Lý: " + name;
  let html = "";
  appData.adminExpenses
    .filter(x => x.name === name && !x.deleted)
    .sort((a,b) => b.date.localeCompare(a.date))
    .forEach(item => {
      html += `<div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="history-name">📅 ${formatDisplayDate(item.date)}</div>
        <div class="history-amount debt">${formatMoney(item.amount)}</div>
      </div>`;
    });
  if(!html) html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

function showDebtDetail(customer){
  detailTitle.innerText = "🧾 Công Nợ: " + customer;
  let balance = 0;
  let html = "";
  appData.debtTransactions
    .filter(x => x.customer === customer && !x.deleted)
    .sort((a,b) => a.date.localeCompare(b.date))
    .forEach(item => {
      if(item.type === "debt_add") balance += item.amount;
      else balance -= item.amount;
      const isDebt = item.type === "debt_add";
      html += `<div class="history-item" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div class="history-name">
          📅 ${formatDisplayDate(item.date)}
          <div style="font-size:11px; color:var(--text-light);">Còn lại: ${formatMoney(balance)}</div>
        </div>
        <div class="history-amount ${isDebt ? 'debt' : 'payment'}">${isDebt ? '+' : '-'}${formatMoney(item.amount)}</div>
      </div>`;
    });
  if(!html) html = '<div class="empty-text">Không có dữ liệu</div>';
  detailContent.innerHTML = html;
  openPopup("detailPopup");
}

// ========== CSS ==========
if(!document.querySelector('#manager-styles')) {
  const style = document.createElement('style');
  style.id = 'manager-styles';
  style.textContent = `
    .manager-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s; }
    .manager-item:hover { background: var(--bg-tertiary); }
    .manager-item-stats { display: flex; justify-content: space-between; margin-top: 6px; font-size: 13px; color: #666; }
    .positive { color: #27ae60; }
    .negative { color: #e74c3c; }
    .empty-text { text-align: center; padding: 20px; color: #999; font-style: italic; }
    .manager-box { cursor: pointer; transition: all 0.2s; }
    .manager-box:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  `;
  document.head.appendChild(style);
}

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

function updateManagerTotalDebt() {
  const managerTotalDebt = document.getElementById("managerTotalDebt");
  if (managerTotalDebt) {
    managerTotalDebt.innerText = formatMoney(calculateTotalDebtAll());
  }
}

const originalRenderManagerDashboard = renderManagerDashboard;
renderManagerDashboard = function() {
  originalRenderManagerDashboard();
  updateManagerTotalDebt();
};

// Export
window.showAdminExpenseDetail = showAdminExpenseDetail;
window.renderAdminExpenseStats = renderAdminExpenseStats;

renderManagerDashboard();