// ========== DOM ELEMENTS ==========
const reportDate = document.getElementById("reportDate");
const bankInput = document.getElementById("bankInput");
const cashInput = document.getElementById("cashInput");
const reserveInput = document.getElementById("reserveInput");
const expenseTotal = document.getElementById("expenseTotal");
const debtTotal = document.getElementById("debtTotal");
const dayStatus = document.getElementById("dayStatus");
const completeDayBtn = document.getElementById("completeDayBtn");
const expenseFab = document.getElementById("expenseFab");
const debtFab = document.getElementById("debtFab");
const paymentFab = document.getElementById("paymentFab");
const prevDateBtn = document.getElementById("prevDateBtn");
const nextDateBtn = document.getElementById("nextDateBtn");
const revenueInput = document.getElementById("revenueInput");
const grabInput = document.getElementById("grabInput");

// Expense popup
const expensePopup = document.getElementById("expensePopup");
const expensePopupTitle = document.getElementById("expensePopupTitle");
const expenseQty = document.getElementById("expenseQty");
const expenseAmount = document.getElementById("expenseAmount");
const recentExpenseWrap = document.getElementById("recentExpenseWrap");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");
const submitDayBtn = document.getElementById("submitDayBtn");
const addNewExpenseBtn = document.getElementById("addNewExpenseBtn");
const newExpenseInput = document.getElementById("newExpenseInput");
const newExpenseName = document.getElementById("newExpenseName");

// Debt popup
const debtPopup = document.getElementById("debtPopup");
const debtPopupTitle = document.getElementById("debtPopupTitle");
const debtAmount = document.getElementById("debtAmount");
const debtNote = document.getElementById("debtNote");
const recentCustomerWrap = document.getElementById("recentCustomerWrap");
const saveDebtBtn = document.getElementById("saveDebtBtn");
const addNewCustomerBtn = document.getElementById("addNewCustomerBtn");
const newCustomerInput = document.getElementById("newCustomerInput");
const newCustomerName = document.getElementById("newCustomerName");

// Payment popup
const paymentPopup = document.getElementById("paymentPopup");
const paymentCustomer = document.getElementById("paymentCustomer");
const paymentAmount = document.getElementById("paymentAmount");
const paymentMethod = document.getElementById("paymentMethod");
const paymentTotalDebt = document.getElementById("paymentTotalDebt");
const paymentRemainDebt = document.getElementById("paymentRemainDebt");
const recentPaymentWrap = document.getElementById("recentPaymentWrap");
const savePaymentBtn = document.getElementById("savePaymentBtn");

// Detail popup
const openExpenseHistory = document.getElementById("openExpenseHistory");
const openDebtHistory = document.getElementById("openDebtHistory");
const detailPopup = document.getElementById("detailPopup");
const detailTitle = document.getElementById("detailTitle");
const detailContent = document.getElementById("detailContent");

// Biến lưu tạm
let selectedExpenseName = "";
let selectedCustomerName = "";
let selectedPaymentCustomer = "";

let missingReportAlertShown = false;

// ========== KHỞI TẠO ==========
reportDate.value = getToday();

// Format input money
[expenseAmount, debtAmount, paymentAmount].forEach(formatInputMoney);

// ========== UPDATE BODY ADMIN CLASS ==========
function updateBodyAdminClass() {
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  if (isAdmin) {
    document.body.classList.add('admin-mode');
  } else {
    document.body.classList.remove('admin-mode');
  }
}

updateBodyAdminClass();

if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().onAuthStateChanged(() => {
    setTimeout(updateBodyAdminClass, 500);
  });
}

// ========== LẤY DỮ LIỆU TỪ CACHE ==========
function getDataFromCache() {
  if (window.getCache) {
    return window.getCache();
  }
  // Fallback
  return {
    data: { expenses: [], adminExpenses: [], debtTransactions: [], reports: {} },
    categories: { expenses: [], adminExpenses: [], customers: [] },
    recent: { expenses: [], adminExpenses: [], customers: [] }
  };
}

// ========== RENDER RECENT PAYMENTS ==========
function renderRecentPayments() {
  if (!recentPaymentWrap) return;
  
  const cache = getDataFromCache();
  const customers = cache.recent.customers || [];
  
  if (customers.length === 0) {
    recentPaymentWrap.innerHTML = '<div class="empty-text">Chưa có khách nợ</div>';
    return;
  }
  
  let html = "";
  customers.forEach(name => {
    if (!name) return;
    const debt = calculateCustomerDebt(name);
    if (debt <= 0) return;
    html += `<button class="recent-btn" onclick="selectPaymentCustomer('${name.replace(/'/g, "\\'")}')" style="display: flex; justify-content: space-between; width: 100%;">
      <span>👤 ${name}</span>
      <span style="color: var(--danger);">${formatMoney(debt)}</span>
    </button>`;
  });
  recentPaymentWrap.innerHTML = html;
}

// ========== SELECT RECENT ==========
function selectExpenseRecent(name) {
  selectedExpenseName = name;
  if (newExpenseInput) newExpenseInput.classList.add("hidden");
  if (newExpenseName) newExpenseName.value = "";
  expenseAmount.focus();
  showToast(`✓ Đã chọn: ${name}`);
}

function selectRecentCustomer(name) {
  selectedCustomerName = name;
  if (newCustomerInput) newCustomerInput.classList.add("hidden");
  if (newCustomerName) newCustomerName.value = "";
  debtAmount.focus();
  showToast(`✓ Đã chọn: ${name}`);
}

// ========== SELECT PAYMENT CUSTOMER ==========
function selectPaymentCustomer(name) {
  paymentCustomer.value = name;
  const paymentDropdown = document.getElementById("paymentDropdown");
  if (paymentDropdown) paymentDropdown.classList.add("hidden");
  updatePaymentInfo();
  paymentAmount.focus();
}

// ========== UPDATE PAYMENT INFO ==========
function updatePaymentInfo() {
  const customer = paymentCustomer ? paymentCustomer.value.trim() : "";
  if (!customer) {
    if (paymentTotalDebt) paymentTotalDebt.innerText = formatMoney(0);
    if (paymentRemainDebt) paymentRemainDebt.innerText = formatMoney(0);
    return;
  }
  const debt = calculateCustomerDebt(customer);
  const paymentValue = parseMoney(paymentAmount ? paymentAmount.value : "0");
  const remain = debt - paymentValue;
  if (paymentTotalDebt) paymentTotalDebt.innerText = formatMoney(debt);
  if (paymentRemainDebt) paymentRemainDebt.innerText = formatMoney(remain > 0 ? remain : 0);
  
  if (paymentRemainDebt) {
    if (remain === 0) {
      paymentRemainDebt.style.color = "#2c8c5c";
    } else if (remain < 0) {
      paymentRemainDebt.style.color = "#c73a2b";
    } else {
      paymentRemainDebt.style.color = "inherit";
    }
  }
}

// ========== SAVE PAYMENT ==========
savePaymentBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  if (date > today) {
    alert(`⚠️ KHÔNG THỂ THANH TOÁN CHO NGÀY TƯƠNG LAI!\n\nNgày ${formatDisplayDate(date)} chưa xảy ra.`);
    return;
  }
  
  if (!isAdmin && date === today) {
    if (!canAddData()) return;
  }
  
  const customer = paymentCustomer ? paymentCustomer.value.trim() : selectedPaymentCustomer;
  
  if (date !== today) {
    const report = getReport(date);
    if (report.status !== "completed") {
      alert(`⚠️ Ngày ${date} chưa chốt! Vui lòng chốt ngày này trước khi thêm dữ liệu mới.`);
      return;
    }
  }

  const amount = parseMoney(paymentAmount.value);
  if (amount <= 0) { alert("Nhập số tiền"); return; }
  if (!customer) { alert("Vui lòng chọn khách hàng"); return; }

  const currentDebt = calculateCustomerDebt(customer);
  
  if (amount > currentDebt && currentDebt > 0) {
    const extraAmount = amount - currentDebt;
    const confirmMsg = confirm(
      `⚠️ Khách hàng "${customer}" chỉ nợ ${formatMoney(currentDebt)}.\n\n` +
      `Bạn muốn thanh toán ${formatMoney(amount)}?\n\n` +
      `Số tiền DƯ sẽ là: ${formatMoney(extraAmount)}\n` +
      `(Số tiền này sẽ được lưu lại cho lần sau mua hàng)\n\n` +
      `Tiếp tục?`
    );
    if (!confirmMsg) return;
  }

  // Tạo payment transaction
  const newDebt = {
    id: createId("pay"),
    type: "payment",
    customer: customer,
    amount: amount,
    method: paymentMethod.value,
    businessDate: date,
    deleted: false,
    createdAt: Date.now(),
    createdBy: firebase.auth().currentUser?.email || 'unknown'
  };
  
  // Lưu vào appData (tạm thời) và sync sẽ xử lý sau
  appData.debtTransactions.push(newDebt);
  
  addCategory("customers", customer);
  addRecent("customers", customer);
  saveData();
  
  if (typeof window.createDebt === 'function') {
    window.createDebt(newDebt).catch(console.error);
  } else if (typeof syncToFirebase === 'function') {
    setTimeout(() => syncToFirebase(), 100);
  }
  
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentPayments();
  renderCustomerDebtList();
  
  updatePaymentInfo();
  paymentAmount.value = "";
  
  const newDebtBalance = calculateCustomerDebt(customer);
  
  if (newDebtBalance === 0) {
    showToast(`🎉 Đã thanh toán HẾT NỢ cho ${customer}!`);
  } else if (newDebtBalance < 0) {
    showToast(`💰 Khách hàng ${customer} đã thanh toán DƯ ${formatMoney(Math.abs(newDebtBalance))}. Số tiền này sẽ được trừ vào lần sau.`);
  } else {
    showToast(`✓ Đã thanh toán ${formatMoney(amount)}. Còn nợ: ${formatMoney(newDebtBalance)}`);
  }
  
  renderRecentPayments();
  paymentAmount.focus();
};

// ========== AUTO SAVE REPORT ==========
function autoSaveReport() {
  const date = getCurrentDate();
  const today = getToday();
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  if (date > today) {
    const report = getReport(date);
    if (bankInput) bankInput.value = formatNumberForInput(report.bank || 0);
    if (cashInput) cashInput.value = formatNumberForInput(report.cash || 0);
    if (reserveInput) reserveInput.value = formatNumberForInput(report.reserve || 0);
    if (revenueInput) revenueInput.value = formatNumberForInput(report.revenue || 0);
    if (grabInput) grabInput.value = formatNumberForInput(report.grab || 0);
    alert(`⚠️ KHÔNG THỂ NHẬP DỮ LIỆU CHO NGÀY TƯƠNG LAI!\n\nNgày ${formatDisplayDate(date)} chưa xảy ra.`);
    showToast(`⚠️ Không thể nhập ngày tương lai`);
    return;
  }
  
  if (isAdmin) {
    doSaveReport();
    return;
  }
  
  if (date === today) {
    if (!isYesterdayCompleted()) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      const report = getReport(date);
      if (bankInput) bankInput.value = formatNumberForInput(report.bank || 0);
      if (cashInput) cashInput.value = formatNumberForInput(report.cash || 0);
      if (reserveInput) reserveInput.value = formatNumberForInput(report.reserve || 0);
      if (revenueInput) revenueInput.value = formatNumberForInput(report.revenue || 0);
      if (grabInput) grabInput.value = formatNumberForInput(report.grab || 0);
      
      alert(`⚠️ KHÔNG THỂ NHẬP SỐ LIỆU!\n\nNgày ${formatDisplayDate(yesterdayStr)} chưa được gửi báo cáo.\n\nVui lòng gửi ngày hôm qua trước khi nhập số liệu mới.`);
      showToast(`⚠️ Ngày ${formatDisplayDate(yesterdayStr)} chưa gửi! Không thể nhập số liệu`);
      
      if (reportDate) {
        reportDate.value = yesterdayStr;
        loadTodayData();
      }
      return;
    }
  }

  if (date === today) {
    doSaveReport();
    return;
  }

  const report = getReport(date);

  if (report.status === "completed") {
    if (window.isAdminSync && window.isAdminSync()) {
      doSaveReport();
      showToast("⚡ Bạn đang sửa ngày đã gửi (Quyền Quản lý)");
    } else {
      loadTodayData();
      showToast("⚠️ Ngày đã gửi, chỉ Quản lý mới được sửa!");
    }
  } else {
    doSaveReport();
  }
}

// ========== LOAD TODAY DATA ==========
function loadTodayData() {
  if (!appData) {
    console.error("appData chưa sẵn sàng");
    return;
  }
  const date = getCurrentDate();
  const report = getReport(date);
  
  if (bankInput) bankInput.value = formatNumberForInput(report.bank || 0);
  if (cashInput) cashInput.value = formatNumberForInput(report.cash || 0);
  if (reserveInput) reserveInput.value = formatNumberForInput(report.reserve || 0);
  if (revenueInput) revenueInput.value = formatNumberForInput(report.revenue || 0);
  if (grabInput) grabInput.value = formatNumberForInput(report.grab || 0);
  
  if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(date));
  if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(date));
  
  updateSubmitButtonStatus();
  updateTotalDebtDisplay();
  renderCustomerDebtList();
  checkMissingReport();
  addMissingReportButton();
}

// ========== SAVE REPORT ==========
function doSaveReport() {
  const date = getCurrentDate();
  const today = getToday();
  
  if (date > today) {
    console.warn("Không thể lưu báo cáo cho ngày tương lai");
    return;
  }
  
  appData.reports[date] = {
    bank: parseMoney(bankInput?.value),
    cash: parseMoney(cashInput?.value),
    reserve: parseMoney(reserveInput?.value),
    revenue: parseMoney(revenueInput?.value),
    grab: parseMoney(grabInput?.value),
    status: getReport(date).status
  };
  saveData();
  
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'managerTab' && typeof renderManagerDashboard === 'function') {
    renderManagerDashboard();
  } else if (activeTab === 'employeeTab') {
    const currentDate = getCurrentDate();
    if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(currentDate));
    if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(currentDate));
    updateTotalDebtDisplay();
    renderCustomerDebtList();
  }
}

[bankInput, cashInput, reserveInput, revenueInput, grabInput].forEach(input => {
  if (input) input.addEventListener("input", autoSaveReport);
});

// ========== KIỂM TRA NGÀY ==========
function isYesterdayCompleted() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const report = getReport(yesterdayStr);
  return report.status === "completed";
}

function canAddData() {
  if (!isYesterdayCompleted()) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    alert(`⚠️ KHÔNG THỂ NHẬP DỮ LIỆU!\n\nNgày ${formatDisplayDate(yesterdayStr)} chưa được chốt báo cáo.\n\nVui lòng chốt ngày hôm qua trước khi nhập dữ liệu mới.`);
    showToast(`⚠️ Ngày ${formatDisplayDate(yesterdayStr)} chưa chốt! Không thể nhập dữ liệu mới`);
    
    addMissingReportButton();
    return false;
  }
  return true;
}

function checkMissingReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split("T")[0];
  const report = appData.reports[date];
  
  if (!report || report.status !== "completed") {
    if (!missingReportAlertShown) {
      alert(`⚠️ CẢNH BÁO: Ngày ${formatDisplayDate(date)} chưa gửi báo cáo!\n\nVui lòng gửi ngày hôm qua trước khi nhập dữ liệu mới.`);
      missingReportAlertShown = true;
    }
    
    showToast(`⚠️ Ngày ${formatDisplayDate(date)} chưa gửi! Vui lòng gửi trước khi nhập liệu`);
    
    if (submitDayBtn) {
      submitDayBtn.style.animation = "blink 1s infinite";
      setTimeout(() => {
        if (submitDayBtn) submitDayBtn.style.animation = "";
      }, 3000);
    }
    
    return false;
  }
  
  missingReportAlertShown = false;
  if (submitDayBtn) submitDayBtn.style.animation = "";
  return true;
}

function goToYesterdayAndComplete() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  if (reportDate) {
    reportDate.value = yesterdayStr;
    loadTodayData();
    showToast(`📅 Đã chuyển đến ngày ${formatDisplayDate(yesterdayStr)}. Hãy chốt ngày này!`);
    
    const dayStatusEl = document.getElementById("dayStatus");
    if (dayStatusEl) {
      dayStatusEl.style.animation = "blink 1s infinite";
      setTimeout(() => {
        if (dayStatusEl) dayStatusEl.style.animation = "";
      }, 3000);
    }
  }
}

function addMissingReportButton() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split("T")[0];
  const report = appData.reports[date];
  
  if (!report || report.status !== "completed") {
    let missingBtn = document.getElementById("missingReportBtn");
    if (!missingBtn) {
      const completeRow = document.querySelector(".day-complete-row");
      if (completeRow) {
        missingBtn = document.createElement("button");
        missingBtn.id = "missingReportBtn";
        missingBtn.className = "primary-btn";
        missingBtn.style.background = "var(--danger)";
        missingBtn.style.marginLeft = "10px";
        missingBtn.innerHTML = `⚠️ CHỐT NGÀY ${formatDisplayDate(date)}`;
        missingBtn.onclick = () => {
          if (confirm(`Bạn có muốn chuyển đến ngày ${formatDisplayDate(date)} để chốt báo cáo?`)) {
            goToYesterdayAndComplete();
          }
        };
        completeRow.appendChild(missingBtn);
      }
    }
  } else {
    const missingBtn = document.getElementById("missingReportBtn");
    if (missingBtn) missingBtn.remove();
  }
}

// ========== NÚT THANH TOÁN NHANH ==========
document.querySelectorAll(".quick-money-btn").forEach(btn => {
  btn.onclick = () => expenseAmount.value = (Number(btn.innerText) * 1000).toLocaleString("vi-VN");
});

document.querySelectorAll(".quick-debt-btn").forEach(btn => {
  btn.onclick = () => debtAmount.value = (Number(btn.innerText) * 1000).toLocaleString("vi-VN");
});

document.querySelectorAll(".quick-payment-btn").forEach(btn => {
  btn.onclick = () => {
    const amount = parseInt(btn.getAttribute('data-amount'));
    if (!isNaN(amount) && paymentAmount) {
      paymentAmount.value = amount.toLocaleString("vi-VN");
      updatePaymentInfo();
      paymentAmount.focus();
    }
  };
});

const fullPaymentBtn = document.querySelector('.btn-full-payment');
if (fullPaymentBtn) {
  fullPaymentBtn.onclick = () => {
    const customer = paymentCustomer ? paymentCustomer.value.trim() : "";
    if (!customer) {
      alert("⚠️ Vui lòng chọn khách hàng");
      return;
    }
    const debt = calculateCustomerDebt(customer);
    if (debt <= 0) {
      alert("✅ Khách hàng không có nợ");
      return;
    }
    if (paymentAmount) {
      paymentAmount.value = debt.toLocaleString("vi-VN");
      updatePaymentInfo();
      paymentAmount.focus();
      showToast(`💰 Đã điền ${formatMoney(debt)}`);
    }
  };
}

// ========== ENTER SAVE ==========
if (expenseAmount) expenseAmount.addEventListener("keydown", (e) => { if (e.key === "Enter") saveExpenseBtn.click(); });
if (debtAmount) debtAmount.addEventListener("keydown", (e) => { if (e.key === "Enter") saveDebtBtn.click(); });
if (paymentAmount) paymentAmount.addEventListener("keydown", (e) => { if (e.key === "Enter") savePaymentBtn.click(); });

// ========== DRAFT ==========
if (newExpenseName) {
  newExpenseName.addEventListener("input", () => localStorage.setItem("expenseDraft", JSON.stringify({
    name: newExpenseName.value, qty: expenseQty.value, amount: expenseAmount.value
  })));
}
[expenseQty, expenseAmount].forEach(input => {
  if (input) {
    input.addEventListener("input", () => localStorage.setItem("expenseDraft", JSON.stringify({
      name: newExpenseName?.value || selectedExpenseName, qty: expenseQty.value, amount: expenseAmount.value
    })));
  }
});

if (newCustomerName) {
  newCustomerName.addEventListener("input", () => localStorage.setItem("debtDraft", JSON.stringify({
    customer: newCustomerName.value, amount: debtAmount.value, note: debtNote.value
  })));
}
[debtAmount, debtNote].forEach(input => {
  if (input) {
    input.addEventListener("input", () => localStorage.setItem("debtDraft", JSON.stringify({
      customer: newCustomerName?.value || selectedCustomerName, amount: debtAmount.value, note: debtNote.value
    })));
  }
});

[paymentCustomer, paymentAmount].forEach(input => {
  if (input) {
    input.addEventListener("input", () => localStorage.setItem("paymentDraft", JSON.stringify({
      customer: paymentCustomer.value, amount: paymentAmount.value
    })));
  }
});

function loadExpenseDraft() {
  const draft = JSON.parse(localStorage.getItem("expenseDraft"));
  if (!draft) return;
  if (draft.name && newExpenseName) newExpenseName.value = draft.name;
  if (expenseQty) expenseQty.value = draft.qty || "";
  if (expenseAmount) expenseAmount.value = draft.amount || "";
}

function loadDebtDraft() {
  const draft = JSON.parse(localStorage.getItem("debtDraft"));
  if (!draft) return;
  if (draft.customer && newCustomerName) newCustomerName.value = draft.customer;
  if (debtAmount) debtAmount.value = draft.amount || "";
  if (debtNote) debtNote.value = draft.note || "";
}

function loadPaymentDraft() {
  const draft = JSON.parse(localStorage.getItem("paymentDraft"));
  if (!draft) return;
  if (paymentCustomer) paymentCustomer.value = draft.customer || "";
  if (paymentAmount) paymentAmount.value = draft.amount || "";
  updatePaymentInfo();
}

openExpenseHistory.onclick = (e) => {
  e.stopPropagation();
  refreshExpensePopupUI();
  openPopup("expensePopup");
};

openDebtHistory.onclick = (e) => {
  e.stopPropagation();
  refreshDebtPopupUI();
  openPopup("debtPopup");
};

// ========== DATE NAVIGATION ==========
prevDateBtn.onclick = () => {
  const d = new Date(reportDate.value);
  d.setDate(d.getDate() - 1);
  reportDate.value = d.toISOString().split("T")[0];
  loadTodayData();
};

nextDateBtn.onclick = () => {
  const d = new Date(reportDate.value);
  d.setDate(d.getDate() + 1);
  reportDate.value = d.toISOString().split("T")[0];
  loadTodayData();
};

if (reportDate) {
  reportDate.addEventListener('change', function() {
    loadTodayData();
  });
}

// ========== DANH SÁCH CÔNG NỢ KHÁCH HÀNG ==========
function renderCustomerDebtList() {
  const container = document.getElementById('customerDebtList');
  if (!container) return;

  if (!appData || !appData.categories || !appData.categories.customers) {
    container.innerHTML = '<div class="empty-text">Chưa có dữ liệu</div>';
    return;
  }

  const allCustomers = new Set();
  appData.categories.customers.forEach(c => allCustomers.add(c));
  appData.recent.customers.forEach(c => allCustomers.add(c));
  appData.debtTransactions.forEach(t => {
    if (!t.deleted && t.customer) allCustomers.add(t.customer);
  });

  const customersWithBalance = [];
  let totalDebt = 0;
  let totalDeposit = 0;

  allCustomers.forEach(customer => {
    const balance = calculateCustomerDebt(customer);
    if (balance !== 0) {
      customersWithBalance.push({ name: customer, balance: balance });
      if (balance > 0) totalDebt += balance;
      if (balance < 0) totalDeposit += Math.abs(balance);
    }
  });

  customersWithBalance.sort((a, b) => {
    if (a.balance > 0 && b.balance <= 0) return -1;
    if (a.balance <= 0 && b.balance > 0) return 1;
    return Math.abs(b.balance) - Math.abs(a.balance);
  });

  if (customersWithBalance.length === 0) {
    container.innerHTML = '<div class="empty-text">✅ Không có khách nợ hay dư tiền</div>';
    return;
  }

  let html = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px; background: var(--bg-tertiary); border-radius: 12px;">
      <span style="font-size: 12px;">💰 Tổng nợ: <strong style="color: var(--danger);">${formatMoney(totalDebt)}</strong></span>
      <span style="font-size: 12px;">💸 Khách dư: <strong style="color: var(--success);">${formatMoney(totalDeposit)}</strong></span>
    </div>
  `;

  customersWithBalance.forEach(customer => {
    const isDebt = customer.balance > 0;
    const isDeposit = customer.balance < 0;
    const displayBalance = Math.abs(customer.balance);
    
    html += `
      <div class="debt-item" onclick="showCustomerDebtDetail('${customer.name.replace(/'/g, "\\'")}')" style="border-left: 3px solid ${isDebt ? 'var(--danger)' : 'var(--success)'};">
        <div class="debt-info">
          <span class="debt-name">👤 ${customer.name}</span>
        </div>
        <div class="debt-badge ${isDeposit ? 'deposit' : ''}" style="background: ${isDebt ? 'var(--danger-light)' : 'var(--success-light)'}; color: ${isDebt ? 'var(--danger)' : 'var(--success)'};">
          ${isDebt ? `Nợ ${formatMoney(displayBalance)}` : `Dư ${formatMoney(displayBalance)}`}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ========== HIỂN THỊ CHI TIẾT CÔNG NỢ ==========
function showCustomerDebtDetail(customerName) {
  const transactions = appData.debtTransactions
    .filter(t => !t.deleted && t.customer === customerName)
    .sort((a, b) => a.date?.localeCompare(b.date) || 0);

  let transactionHtml = '';
  let currentBalance = 0;

  transactions.forEach(t => {
    const isDebt = t.type === "debt_add";
    const amount = t.amount;
    
    if (isDebt) {
      currentBalance += amount;
    } else {
      currentBalance -= amount;
    }
    
    transactionHtml += `
      <div class="debt-transaction-item ${isDebt ? 'add' : 'payment'}">
        <div class="debt-transaction-date">📅 ${t.businessDate || t.date}</div>
        <div class="debt-transaction-amount ${isDebt ? 'add' : 'payment'}">
          ${isDebt ? '+' : '-'} ${formatMoney(amount)}
        </div>
        <div class="debt-transaction-note">
          ${isDebt ? (t.note || 'Công nợ') : (t.method === 'TM' ? '💵 Tiền mặt' : '🏦 Chuyển khoản')}
        </div>
        <div class="debt-transaction-balance" style="font-size: 11px; color: var(--text-light); min-width: 80px; text-align: right;">
          ${currentBalance > 0 ? `Nợ: ${formatMoney(currentBalance)}` : (currentBalance < 0 ? `Dư: ${formatMoney(Math.abs(currentBalance))}` : 'Hết nợ')}
        </div>
      </div>
    `;
  });

  const totalBalance = calculateCustomerDebt(customerName);
  const isDebt = totalBalance > 0;
  const isDeposit = totalBalance < 0;
  const displayBalance = Math.abs(totalBalance);

  const popupHtml = `
    <div class="debt-detail-summary" style="background: ${isDebt ? 'var(--danger-light)' : (isDeposit ? 'var(--success-light)' : 'var(--bg-tertiary)')}">
      <div class="debt-detail-total" style="color: ${isDebt ? 'var(--danger)' : (isDeposit ? 'var(--success)' : 'var(--text)')}">
        ${isDebt ? formatMoney(displayBalance) : (isDeposit ? formatMoney(displayBalance) : '0đ')}
      </div>
      <div class="debt-detail-label">
        ${isDebt ? 'Tổng nợ còn lại' : (isDeposit ? 'Khách đang dư (gối đầu)' : 'Đã thanh toán hết')}
      </div>
    </div>
    <div class="debt-transaction-list">
      ${transactionHtml || '<div class="empty-text">Chưa có giao dịch</div>'}
    </div>
    <div class="debt-detail-actions">
      <button class="primary-btn btn-payment" onclick="quickPaymentFromDebt('${customerName.replace(/'/g, "\\'")}')">💰 Thanh toán</button>
      <button class="close-btn" onclick="closePopup('debtDetailPopup')">Đóng</button>
    </div>
  `;

  let debtDetailPopup = document.getElementById('debtDetailPopup');
  if (!debtDetailPopup) {
    debtDetailPopup = document.createElement('div');
    debtDetailPopup.id = 'debtDetailPopup';
    debtDetailPopup.className = 'popup hidden';
    debtDetailPopup.innerHTML = `
      <div class="popup-content">
        <div class="popup-header">
          <h2>📋 ${customerName}</h2>
          <button class="close-btn" onclick="closePopup('debtDetailPopup')">✕</button>
        </div>
        <div class="popup-body" id="debtDetailBody"></div>
      </div>
    `;
    document.body.appendChild(debtDetailPopup);
  }

  const body = document.getElementById('debtDetailBody');
  if (body) body.innerHTML = popupHtml;
  openPopup('debtDetailPopup');
}

function quickPaymentFromDebt(customerName) {
  closePopup('debtDetailPopup');
  if (paymentCustomer) {
    paymentCustomer.value = customerName;
    updatePaymentInfo();
  }
  openPopup('paymentPopup');
  setTimeout(() => {
    if (paymentAmount) paymentAmount.focus();
  }, 100);
}

const refreshBtn = document.getElementById('refreshDebtList');
if (refreshBtn) {
  refreshBtn.onclick = () => {
    renderCustomerDebtList();
    showToast("✓ Đã cập nhật danh sách công nợ");
  };
}

// ========== CLOSE POPUPS ==========
document.querySelectorAll(".close-btn").forEach(btn => {
  btn.onclick = () => closePopup(btn.dataset.close);
});

// ========== PAYMENT DROPDOWN ==========
const paymentDropdown = document.getElementById("paymentDropdown");
if (paymentCustomer) {
  paymentCustomer.addEventListener("focus", () => {
    renderPaymentDropdown();
    if (paymentDropdown) paymentDropdown.classList.remove("hidden");
  });

  paymentCustomer.addEventListener("input", () => {
    renderPaymentDropdown();
    if (paymentDropdown) paymentDropdown.classList.remove("hidden");
  });
}

document.addEventListener("click", (e) => {
  if (paymentCustomer && paymentDropdown) {
    if (!paymentCustomer.contains(e.target) && !paymentDropdown.contains(e.target)) {
      paymentDropdown.classList.add("hidden");
    }
  }
});

function renderPaymentDropdown() {
  if (!paymentDropdown) return;
  const keyword = paymentCustomer.value.trim().toLowerCase();
  const list = [...new Set([...appData.categories.customers, ...appData.recent.customers])];

  let html = "";
  list.filter(x => x.toLowerCase().includes(keyword)).slice(0, 15).forEach(item => {
    const debt = calculateCustomerDebt(item);
    if (debt <= 0) return;
    html += `<div class="dropdown-item" data-value="${item.replace(/'/g, "\\'")}">
      <div style="display: flex; justify-content: space-between;">
        <span>👤 ${item}</span>
        <span style="color: var(--danger);">${formatMoney(debt)}</span>
      </div>
    </div>`;
  });

  if (keyword && !list.includes(keyword)) {
    html += `<div class="dropdown-item" data-value="${keyword.replace(/'/g, "\\'")}">✨ Thêm mới: ${keyword}</div>`;
  }

  paymentDropdown.innerHTML = html;

  paymentDropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.onclick = () => {
      paymentCustomer.value = item.dataset.value;
      paymentDropdown.classList.add("hidden");
      updatePaymentInfo();
      paymentAmount.focus();
    };
  });
}

function updateTotalDebtDisplay() {
  const totalDebtElement = document.getElementById("totalDebtAll");
  if (totalDebtElement) {
    totalDebtElement.innerText = formatMoney(calculateTotalDebtAll());
  }
}

// ========== CẬP NHẬT LOAD TODAY DATA ==========
const originalLoadTodayData = loadTodayData;
loadTodayData = function() {
  originalLoadTodayData();
  updateTotalDebtDisplay();
  renderCustomerDebtList();
  checkMissingReport();
  addMissingReportButton();
};

setInterval(() => {
  checkMissingReport();
  addMissingReportButton();
}, 5000);

loadPaymentDraft();
loadDebtDraft();
loadExpenseDraft();
loadTodayData();

// ========== RENDER RECENT EXPENSES ==========
const expenseNameInput = document.getElementById("expenseNameInput");

function renderRecentExpenses() {
  if (!recentExpenseWrap) return;
  
  let allExpenses = [...(appData.categories.expenses || [])];
  
  const frequency = {};
  (appData.recent.expenses || []).forEach((name, index) => {
    frequency[name] = (frequency[name] || 0) + (10 - index);
  });
  
  allExpenses.sort((a, b) => {
    const freqA = frequency[a] || 0;
    const freqB = frequency[b] || 0;
    if (freqA !== freqB) return freqB - freqA;
    return a.localeCompare(b);
  });
  
  if (allExpenses.length === 0) {
    recentExpenseWrap.innerHTML = '<div class="empty-text">Chưa có chi phí nào</div>';
    return;
  }
  
  let html = '<div style="margin-bottom: 8px; font-size: 11px; color: var(--text-muted);">📋 Danh sách chi phí (click để chọn):</div>';
  
  allExpenses.forEach(name => {
    if (name) {
      html += `
        <div class="recent-item">
          <button class="recent-btn" onclick="setExpenseName('${name.replace(/'/g, "\\'")}')">
            📦 ${name}
          </button>
          <button class="action-btn-edit" onclick="editExpenseName('${name.replace(/'/g, "\\'")}')" title="Sửa tên">✏️</button>
          <button class="action-btn-delete" onclick="deleteExpenseName('${name.replace(/'/g, "\\'")}')" title="Xóa tên">🗑️</button>
        </div>
      `;
    }
  });
  
  recentExpenseWrap.innerHTML = html;
}

window.setExpenseName = function(name) {
  if (expenseNameInput) expenseNameInput.value = name;
  
  const lastAmount = getLastAmountByName(name, 'expense');
  if (lastAmount && expenseAmount) {
    expenseAmount.value = lastAmount.toLocaleString("vi-VN");
    showToast(`✓ Đã chọn: ${name} - gợi ý ${formatMoney(lastAmount)}`);
  } else {
    showToast(`✓ Đã chọn: ${name}`);
  }
  
  if (expenseAmount) expenseAmount.focus();
};

// ========== SAVE EXPENSE ==========
saveExpenseBtn.onclick = async () => {
  const date = getCurrentDate();
  const today = getToday();
  const report = getReport(date);
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  if (date > today) {
    alert(`⚠️ KHÔNG THỂ NHẬP DỮ LIỆU CHO NGÀY TƯƠNG LAI!`);
    return;
  }
  
  if (!isAdmin) {
    if (date === today) {
      if (!canAddData()) return;
    }
    if (date !== today && report.status === "completed") {
      alert(`⚠️ Ngày ${formatDisplayDate(date)} đã được gửi! Chỉ Quản lý mới được sửa.`);
      return;
    }
  }

  let name = expenseNameInput ? expenseNameInput.value.trim() : "";
  const qty = parseMoney(expenseQty.value);
  const amount = parseMoney(expenseAmount.value);

  if (amount <= 0) { alert("Nhập số tiền"); return; }
  if (!name) { alert("Vui lòng nhập tên chi phí"); return; }

  // Thêm vào recent và categories
  if (!appData.recent.expenses.includes(name)) {
    appData.recent.expenses.unshift(name);
    appData.recent.expenses = appData.recent.expenses.slice(0, 10);
  }
  if (!appData.categories.expenses.includes(name)) {
    appData.categories.expenses.push(name);
  }

  const currentUser = firebase.auth().currentUser;
  const deviceIdLocal = localStorage.getItem("deviceId") || 'unknown';
  
  const newExpense = {
    id: editingExpenseId || createId("exp"),
    businessDate: date,
    name: name,
    qty: qty,
    amount: amount,
    deleted: false,
    version: 1,
    createdAt: Date.now(),
    createdBy: currentUser?.email || 'unknown',
    updatedAt: Date.now(),
    updatedBy: currentUser?.email || 'unknown'
  };

  if (editingExpenseId) {
    // Sửa
    const index = appData.expenses.findIndex(x => x.id === editingExpenseId);
    if (index !== -1) {
      const oldVersion = appData.expenses[index].version || 1;
      newExpense.version = oldVersion + 1;
      appData.expenses[index] = newExpense;
      showToast(`✓ Đã sửa chi phí: ${name} - ${formatMoney(amount)}`);
      
      // Gọi API V2 nếu có
      if (typeof window.updateExpense === 'function') {
        window.updateExpense(editingExpenseId, { name, amount, qty }, oldVersion);
      }
    }
    editingExpenseId = null;
  } else {
    // Thêm mới
    appData.expenses.push(newExpense);
    showToast(`✓ Đã thêm chi phí: ${name} - ${formatMoney(amount)}`);
    
    // Gọi API V2 nếu có
    if (typeof window.createExpense === 'function') {
      window.createExpense(newExpense);
    }
  }

  saveData();
  
  if (expenseNameInput) expenseNameInput.value = "";
  expenseAmount.value = "";
  expenseQty.value = "";
  
  refreshExpensePopupUI();
  renderRecentExpenses();
  
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'managerTab' && typeof renderManagerDashboard === 'function') {
    renderManagerDashboard();
  } else if (activeTab === 'employeeTab') {
    const currentDate = getCurrentDate();
    if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(currentDate));
    if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(currentDate));
    updateTotalDebtDisplay();
    renderCustomerDebtList();
  }
  
  // Gọi sync nếu có
  if (typeof syncToFirebase === 'function') {
    setTimeout(() => syncToFirebase(), 100);
  }
  
  setTimeout(() => {
    if (expenseNameInput) expenseNameInput.focus();
  }, 50);
};

// ========== RENDER RECENT CUSTOMERS ==========
const debtCustomerInput = document.getElementById("debtCustomerInput");

function renderRecentCustomers() {
  if (!recentCustomerWrap) return;
  
  let allCustomers = [...(appData.categories.customers || [])];
  
  const frequency = {};
  (appData.recent.customers || []).forEach((name, index) => {
    frequency[name] = (frequency[name] || 0) + (10 - index);
  });
  
  allCustomers.sort((a, b) => {
    const freqA = frequency[a] || 0;
    const freqB = frequency[b] || 0;
    if (freqA !== freqB) return freqB - freqA;
    return a.localeCompare(b);
  });
  
  if (allCustomers.length === 0) {
    recentCustomerWrap.innerHTML = '<div class="empty-text">Chưa có khách hàng nào</div>';
    return;
  }
  
  let html = '<div style="margin-bottom: 8px; font-size: 11px; color: var(--text-muted);">📋 Danh sách khách hàng (click để chọn):</div>';
  
  allCustomers.forEach(name => {
    if (name) {
      const debt = calculateCustomerDebt(name);
      html += `
        <div class="recent-item">
          <button class="recent-btn" onclick="setCustomerName('${name.replace(/'/g, "\\'")}')">
            👤 ${name} ${debt > 0 ? `<span style="color: var(--danger);">(${formatMoney(debt)})</span>` : ''}
          </button>
          <button class="action-btn-edit" onclick="editCustomerName('${name.replace(/'/g, "\\'")}')" title="Sửa tên">✏️</button>
          <button class="action-btn-delete" onclick="deleteCustomerName('${name.replace(/'/g, "\\'")}')" title="Xóa tên">🗑️</button>
        </div>
      `;
    }
  });
  
  recentCustomerWrap.innerHTML = html;
}

window.setCustomerName = function(name) {
  if (debtCustomerInput) debtCustomerInput.value = name;
  
  const lastAmount = getLastAmountByName(name, 'customer');
  if (lastAmount && debtAmount) {
    debtAmount.value = lastAmount.toLocaleString("vi-VN");
    showToast(`✓ Đã chọn: ${name} - gợi ý ${formatMoney(lastAmount)}`);
  } else {
    showToast(`✓ Đã chọn: ${name}`);
  }
  
  if (debtAmount) debtAmount.focus();
};

// ========== REFRESH EXPENSE POPUP UI ==========
function refreshExpensePopupUI() {
  const date = getCurrentDate();
  const list = appData.expenses.filter(x => x.businessDate === date && !x.deleted);
  const totalExpense = list.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  let historyBox = document.getElementById("expenseHistoryBox");
  
  if (!historyBox) {
    historyBox = document.createElement("div");
    historyBox.id = "expenseHistoryBox";
    const popupContent = document.querySelector("#expensePopup .popup-content");
    if (popupContent) {
      popupContent.appendChild(historyBox);
    }
  }
  
  console.log(`📊 refreshExpensePopupUI: ${list.length} chi phí, tổng: ${formatMoney(totalExpense)}`);
  
  let historyHtml = `
    <div class="popup-history-title" style="display: flex; justify-content: space-between; align-items: center;">
      <span>📋 Chi phí hôm nay</span>
      <span style="font-size: 16px; font-weight: 700; color: var(--danger);">Tổng: ${formatMoney(totalExpense)}</span>
    </div>
  `;

  if (!list.length) {
    historyHtml += `<div class="empty-text">📭 Chưa có dữ liệu chi phí</div>`;
  } else {
    list.forEach(item => {
      historyHtml += `
        <div class="history-item" data-id="${item.id}">
          <div class="history-name">📦 ${item.name}</div>
          <div class="history-amount debt">${formatMoney(item.amount)}</div>
          <div class="history-actions">
            <button class="action-btn edit-btn" onclick="editExpense('${item.id}')">✏️</button>
            <button class="action-btn delete-btn" onclick="deleteExpenseAndRefreshPopup('${item.id}')">🗑️</button>
          </div>
        </div>
      `;
    });
  }
  
  historyBox.innerHTML = historyHtml;
}

// ========== EDIT/DELETE EXPENSE NAME ==========
window.editExpenseName = function(oldName) {
  const newName = prompt("Nhập tên chi phí mới:", oldName);
  if (!newName || newName === oldName) return;
  
  const index = appData.categories.expenses.indexOf(oldName);
  if (index !== -1) appData.categories.expenses[index] = newName;
  
  const recentIndex = appData.recent.expenses.indexOf(oldName);
  if (recentIndex !== -1) appData.recent.expenses[recentIndex] = newName;
  
  appData.expenses.forEach(exp => {
    if (exp.name === oldName) {
      exp.name = newName;
      exp.updatedAt = Date.now();
    }
  });
  
  saveData();
  renderRecentExpenses();
  if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
  showToast(`✓ Đã đổi "${oldName}" thành "${newName}"`);
};

window.deleteExpenseName = function(name) {
  const usedCount = appData.expenses.filter(exp => exp.name === name && !exp.deleted).length;
  
  let message = `Bạn có chắc muốn xóa "${name}" khỏi danh sách chi phí?`;
  if (usedCount > 0) {
    message = `⚠️ Cảnh báo: "${name}" đang được sử dụng trong ${usedCount} giao dịch.\n\nXóa sẽ chỉ xóa khỏi danh sách gợi ý, không xóa giao dịch cũ.\n\nBạn có chắc không?`;
  }
  
  if (confirm(message)) {
    appData.categories.expenses = appData.categories.expenses.filter(n => n !== name);
    appData.recent.expenses = appData.recent.expenses.filter(n => n !== name);
    
    saveData();
    renderRecentExpenses();
    if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
    showToast(`✓ Đã xóa "${name}" khỏi danh sách`);
  }
};

// ========== EDIT/DELETE CUSTOMER NAME ==========
window.editCustomerName = function(oldName) {
  const newName = prompt("Nhập tên khách hàng mới:", oldName);
  if (!newName || newName === oldName) return;
  
  const index = appData.categories.customers.indexOf(oldName);
  if (index !== -1) appData.categories.customers[index] = newName;
  
  const recentIndex = appData.recent.customers.indexOf(oldName);
  if (recentIndex !== -1) appData.recent.customers[recentIndex] = newName;
  
  appData.debtTransactions.forEach(debt => {
    if (debt.customer === oldName) {
      debt.customer = newName;
      debt.updatedAt = Date.now();
    }
  });
  
  saveData();
  renderRecentCustomers();
  renderRecentPayments();
  renderCustomerDebtList();
  if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
  showToast(`✓ Đã đổi "${oldName}" thành "${newName}"`);
};

window.deleteCustomerName = function(name) {
  const debt = calculateCustomerDebt(name);
  
  let message = `Bạn có chắc muốn xóa "${name}" khỏi danh sách khách hàng?`;
  if (debt > 0) {
    message = `⚠️ Cảnh báo: "${name}" đang nợ ${formatMoney(debt)}!\n\nXóa sẽ chỉ xóa khỏi danh sách gợi ý, không ảnh hưởng đến số nợ.\n\nBạn có chắc không?`;
  }
  
  if (confirm(message)) {
    appData.categories.customers = appData.categories.customers.filter(n => n !== name);
    appData.recent.customers = appData.recent.customers.filter(n => n !== name);
    
    saveData();
    renderRecentCustomers();
    renderRecentPayments();
    renderCustomerDebtList();
    if (typeof syncToFirebase === 'function') setTimeout(() => syncToFirebase(), 100);
    showToast(`✓ Đã xóa "${name}" khỏi danh sách`);
  }
};

// ========== GET LAST AMOUNT ==========
function getLastAmountByName(name, type = 'expense') {
  let items = [];
  
  if (type === 'expense') {
    items = appData.expenses.filter(x => x.name === name && !x.deleted);
  } else if (type === 'customer') {
    items = appData.debtTransactions.filter(x => x.customer === name && x.type === "debt_add" && !x.deleted);
  }
  
  if (items.length === 0) return null;
  
  items.sort((a, b) => (b.businessDate || b.date).localeCompare(a.businessDate || a.date));
  return items[0].amount;
}

// ========== REFRESH DEBT POPUP UI ==========
function refreshDebtPopupUI() {
  const date = getCurrentDate();
  const list = appData.debtTransactions.filter(x => (x.businessDate === date || x.date === date) && !x.deleted);
  const totalDebt = list.reduce((sum, item) => sum + (item.type === "debt_add" ? (item.amount || 0) : 0), 0);
  const totalPayment = list.reduce((sum, item) => sum + (item.type === "payment" ? (item.amount || 0) : 0), 0);
  
  let historyBox = document.getElementById("debtHistoryBox");
  
  if (!historyBox) {
    historyBox = document.createElement("div");
    historyBox.id = "debtHistoryBox";
    const popupContent = document.querySelector("#debtPopup .popup-content");
    if (popupContent) {
      popupContent.appendChild(historyBox);
    }
  }
  
  console.log(`📊 refreshDebtPopupUI: ${list.length} giao dịch, nợ: ${formatMoney(totalDebt)}, thu: ${formatMoney(totalPayment)}`);
  
  let historyHtml = `
    <div class="popup-history-title" style="display: flex; justify-content: space-between; align-items: center;">
      <span>🧾 Giao dịch hôm nay</span>
      <div style="display: flex; gap: 12px;">
        <span style="font-size: 13px; color: var(--danger);">Nợ: ${formatMoney(totalDebt)}</span>
        <span style="font-size: 13px; color: var(--success);">Thu: ${formatMoney(totalPayment)}</span>
      </div>
    </div>
  `;

  if (!list.length) {
    historyHtml += `<div class="empty-text">📭 Chưa có giao dịch nào</div>`;
  } else {
    list.forEach(item => {
      const isDebt = item.type === "debt_add";
      historyHtml += `
        <div class="history-item" data-id="${item.id}">
          <div class="history-name">👤 ${item.customer || "Khách hàng"}</div>
          <div class="history-amount ${isDebt ? 'debt' : 'payment'}">
            ${isDebt ? "+" : "-"}${formatMoney(item.amount)}
          </div>
          <div class="history-actions">
            <button class="action-btn edit-btn" onclick="editDebt('${item.id}')">✏️</button>
            <button class="action-btn delete-btn" onclick="deleteDebtAndRefreshPopup('${item.id}')">🗑️</button>
          </div>
        </div>
      `;
    });
  }
  
  historyBox.innerHTML = historyHtml;
}

// ========== DELETE EXPENSE ==========
window.deleteExpenseAndRefreshPopup = function(id) {
  const index = appData.expenses.findIndex(x => x.id === id);
  if (index === -1) { 
    showToast("❌ Không tìm thấy chi phí"); 
    return; 
  }
  
  const item = appData.expenses[index];
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  const today = getToday();
  const report = getReport(item.businessDate || item.date);
  const isCompleted = (report.status === "completed");

  if (!isAdmin) {
    if (isCompleted) {
      alert("⚠️ Ngày này đã gửi, chỉ Quản lý mới được xóa!");
      return;
    }
    if ((item.businessDate || item.date) !== today) {
      alert("⚠️ Nhân viên chỉ được xóa dữ liệu của ngày hôm nay!");
      return;
    }
  }

  if (confirm(`Bạn có chắc muốn xóa chi phí "${item.name}" - ${formatMoney(item.amount)}?`)) {
    
    appData.expenses[index].deleted = true;
    appData.expenses[index].deletedAt = Date.now();
    appData.expenses[index].deletedBy = firebase.auth().currentUser?.email || 'unknown';
    
    saveData();
    
    console.log(`🗑️ Đã đánh dấu xóa expense ${id}`);
    
    refreshExpensePopupUI();
    renderRecentExpenses();
    
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if (activeTab === 'managerTab' && typeof renderManagerDashboard === 'function') {
      renderManagerDashboard();
    } else if (activeTab === 'employeeTab') {
      const currentDate = getCurrentDate();
      if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(currentDate));
      if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(currentDate));
      updateTotalDebtDisplay();
      renderCustomerDebtList();
    }
    
    showToast("✓ Đã xóa chi phí");
    
    if (typeof window.deleteExpense === 'function') {
      window.deleteExpense(id, item.businessDate || item.date);
    } else if (typeof syncToFirebase === 'function') {
      setTimeout(() => syncToFirebase(), 100);
    }
  }
};

// ========== DELETE DEBT ==========
window.deleteDebtAndRefreshPopup = function(id) {
  const index = appData.debtTransactions.findIndex(x => x.id === id);
  if (index === -1) { 
    showToast("❌ Không tìm thấy công nợ"); 
    return; 
  }
  
  const item = appData.debtTransactions[index];
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  const today = getToday();
  const report = getReport(item.businessDate || item.date);
  const isCompleted = (report.status === "completed");

  if (!isAdmin) {
    if (isCompleted) {
      alert("⚠️ Ngày này đã gửi, chỉ Quản lý mới được xóa!");
      return;
    }
    if ((item.businessDate || item.date) !== today) {
      alert("⚠️ Nhân viên chỉ được xóa dữ liệu của ngày hôm nay!");
      return;
    }
  }

  const typeText = item.type === "debt_add" ? "Công nợ" : "Thanh toán";
  if (confirm(`Bạn có chắc muốn xóa ${typeText} của "${item.customer}" - ${formatMoney(item.amount)}?`)) {
    
    appData.debtTransactions[index].deleted = true;
    appData.debtTransactions[index].deletedAt = Date.now();
    appData.debtTransactions[index].deletedBy = firebase.auth().currentUser?.email || 'unknown';
    
    saveData();
    
    console.log(`🗑️ Đã đánh dấu xóa debt ${id}`);
    
    refreshDebtPopupUI();
    renderRecentCustomers();
    renderRecentPayments();
    renderCustomerDebtList();
    updateTotalDebtDisplay();
    
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if (activeTab === 'managerTab' && typeof renderManagerDashboard === 'function') {
      renderManagerDashboard();
    } else if (activeTab === 'employeeTab') {
      const currentDate = getCurrentDate();
      if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(currentDate));
      if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(currentDate));
    }
    
    showToast(`✓ Đã xóa ${typeText}`);
    
    if (typeof window.deleteDebt === 'function') {
      window.deleteDebt(id, item.businessDate || item.date);
    } else if (typeof syncToFirebase === 'function') {
      setTimeout(() => syncToFirebase(), 100);
    }
  }
};

// ========== SAVE DEBT ==========
saveDebtBtn.onclick = async () => {
  const date = getCurrentDate();
  const today = getToday();
  const report = getReport(date);
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  if (date > today) {
    alert(`⚠️ KHÔNG THỂ NHẬP DỮ LIỆU CHO NGÀY TƯƠNG LAI!`);
    return;
  }
  
  if (!isAdmin) {
    if (date === today) {
      if (!canAddData()) return;
    }
    if (date !== today && report.status === "completed") {
      alert(`⚠️ Ngày ${formatDisplayDate(date)} đã được gửi! Chỉ Quản lý mới được sửa.`);
      return;
    }
  }

  let customer = debtCustomerInput ? debtCustomerInput.value.trim() : "";
  const amount = parseMoney(debtAmount.value);
  const note = debtNote.value;

  if (amount <= 0) { alert("Nhập số tiền"); return; }
  if (!customer) { alert("Vui lòng nhập tên khách hàng"); return; }

  if (!appData.recent.customers.includes(customer)) {
    appData.recent.customers.unshift(customer);
    appData.recent.customers = appData.recent.customers.slice(0, 10);
  }
  if (!appData.categories.customers.includes(customer)) {
    appData.categories.customers.push(customer);
  }

  const currentUser = firebase.auth().currentUser;
  const deviceIdLocal = localStorage.getItem("deviceId") || 'unknown';
  
  const newDebt = {
    id: editingDebtId || createId("debt"),
    type: "debt_add",
    customer: customer,
    amount: amount,
    note: note,
    businessDate: date,
    deleted: false,
    version: 1,
    createdAt: Date.now(),
    createdBy: currentUser?.email || 'unknown',
    updatedAt: Date.now(),
    updatedBy: currentUser?.email || 'unknown'
  };

  if (editingDebtId) {
    const index = appData.debtTransactions.findIndex(x => x.id === editingDebtId);
    if (index !== -1) {
      const oldVersion = appData.debtTransactions[index].version || 1;
      newDebt.version = oldVersion + 1;
      appData.debtTransactions[index] = newDebt;
      showToast(`✓ Đã sửa công nợ: ${customer} - ${formatMoney(amount)}`);
      
      if (typeof window.updateDebt === 'function') {
        window.updateDebt(editingDebtId, { customer, amount, note }, oldVersion);
      }
    }
    editingDebtId = null;
  } else {
    appData.debtTransactions.push(newDebt);
    showToast(`✓ Đã thêm công nợ: ${customer} - ${formatMoney(amount)}`);
    
    if (typeof window.createDebt === 'function') {
      window.createDebt(newDebt);
    }
  }

  saveData();
  
  if (debtCustomerInput) debtCustomerInput.value = "";
  debtAmount.value = "";
  debtNote.value = "";
  
  refreshDebtPopupUI();
  renderRecentCustomers();
  renderRecentPayments();
  renderCustomerDebtList();
  updateTotalDebtDisplay();
  
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'managerTab' && typeof renderManagerDashboard === 'function') {
    renderManagerDashboard();
  } else if (activeTab === 'employeeTab') {
    const currentDate = getCurrentDate();
    if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(currentDate));
    if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(currentDate));
  }
  
  if (typeof syncToFirebase === 'function') {
    setTimeout(() => syncToFirebase(), 100);
  }
  
  setTimeout(() => {
    if (debtCustomerInput) debtCustomerInput.focus();
  }, 50);
};

// ========== FAB BUTTONS ==========
expenseFab.onclick = () => {
  editingExpenseId = null;
  expensePopupTitle.innerText = "Thêm Chi Phí";
  renderRecentExpenses();
  if (expenseNameInput) expenseNameInput.value = "";
  expenseAmount.value = "";
  expenseQty.value = "";
  openPopup("expensePopup");
  setTimeout(() => {
    if (expenseNameInput) expenseNameInput.focus();
  }, 100);
};

debtFab.onclick = () => {
  editingDebtId = null;
  debtPopupTitle.innerText = "Thêm Công Nợ";
  renderRecentCustomers();
  if (debtCustomerInput) debtCustomerInput.value = "";
  debtAmount.value = "";
  debtNote.value = "";
  openPopup("debtPopup");
  setTimeout(() => {
    if (debtCustomerInput) debtCustomerInput.focus();
  }, 100);
};

// ========== UPDATE SUBMIT BUTTON STATUS ==========
function updateSubmitButtonStatus() {
  const date = getCurrentDate();
  const report = getReport(date);
  const isCompleted = report.status === "completed";
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  const submitBtn = document.getElementById("submitDayBtn");
  if (!submitBtn) return;
  
  if (isCompleted) {
    submitBtn.innerHTML = "✅ Đã gửi";
    submitBtn.classList.add("submitted");
    submitBtn.disabled = true;
  } else {
    const canSend = isAdmin || (date === getToday());
    if (canSend) {
      submitBtn.innerHTML = "📤 Gửi báo cáo";
      submitBtn.classList.remove("submitted");
      submitBtn.disabled = false;
    } else {
      submitBtn.innerHTML = "🔒 Chưa gửi";
      submitBtn.classList.add("submitted");
      submitBtn.disabled = true;
    }
  }
}

// ========== SUBMIT DAY BUTTON ==========
const submitBtnElement = document.getElementById("submitDayBtn");
if (submitBtnElement) {
  submitBtnElement.onclick = async () => {
    const date = getCurrentDate();
    const today = getToday();
    const report = getReport(date);
    const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
    
    if (report.status === "completed") {
      showToast("⚠️ Báo cáo ngày này đã được gửi rồi!");
      return;
    }
    
    if (!isAdmin && date !== today) {
      showToast("⚠️ Nhân viên chỉ được gửi báo cáo ngày hôm nay!");
      return;
    }
    
    if (!isAdmin && date === today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const yesterdayReport = getReport(yesterdayStr);
      
      if (yesterdayReport.status !== "completed") {
        alert(`⚠️ KHÔNG THỂ GỬI BÁO CÁO HÔM NAY!\n\nNgày ${formatDisplayDate(yesterdayStr)} chưa được gửi.\n\nVui lòng gửi ngày ${formatDisplayDate(yesterdayStr)} trước.`);
        showToast(`⚠️ Vui lòng gửi ngày ${formatDisplayDate(yesterdayStr)} trước!`);
        
        if (reportDate) {
          reportDate.value = yesterdayStr;
          loadTodayData();
          updateSubmitButtonStatus();
        }
        return;
      }
    }
    
    report.status = "completed";
    saveData();
    loadTodayData();
    updateSubmitButtonStatus();
    showToast(`✓ Đã gửi báo cáo ngày ${formatDisplayDate(date)}`);
    
    const expenseTotalVal = calculateExpenseTotal(date);
    const debtTotalVal = calculateDebtTotal(date);
    const expenses = appData.expenses.filter(x => (x.businessDate === date || x.date === date) && !x.deleted);
    const debts = appData.debtTransactions.filter(x => (x.businessDate === date || x.date === date) && x.type === "debt_add" && !x.deleted);
    const allDebtTransactions = appData.debtTransactions.filter(x => !x.deleted);
    
    if (typeof sendFullReport === 'function') {
      const sent = await sendFullReport(date, report, expenses, debts, allDebtTransactions);
      if (sent) {
        showToast(`✓ Đã gửi báo cáo Telegram ngày ${formatDisplayDate(date)}`);
      } else {
        showToast(`⚠️ Gửi báo cáo Telegram thất bại`);
      }
    } else if (typeof sendQuickReport === 'function') {
      await sendQuickReport(date, report, expenseTotalVal, debtTotalVal);
      showToast(`✓ Đã gửi báo cáo Telegram ngày ${formatDisplayDate(date)}`);
    }
    
    const missingBtn = document.getElementById("missingReportBtn");
    if (missingBtn) missingBtn.remove();
    
    console.log(`✅ Đã gửi báo cáo ngày ${date}`);
  };
}

// ========== EDIT EXPENSE ==========
window.editExpense = function(id) {
  const item = appData.expenses.find(x => x.id === id);
  if (!item) {
    showToast("❌ Không tìm thấy chi phí");
    return;
  }
  
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  const today = getToday();
  const report = getReport(item.businessDate || item.date);
  const isCompleted = report.status === "completed";
  
  if (!isAdmin) {
    if (isCompleted) {
      alert("⚠️ Ngày này đã gửi, chỉ Quản lý mới được sửa!");
      return;
    }
    if ((item.businessDate || item.date) !== today) {
      alert("⚠️ Nhân viên chỉ được sửa dữ liệu của ngày hôm nay!");
      return;
    }
  }
  
  if (expenseNameInput) expenseNameInput.value = item.name;
  if (expenseAmount) expenseAmount.value = item.amount.toLocaleString("vi-VN");
  if (expenseQty) expenseQty.value = item.qty || "";
  
  editingExpenseId = id;
  expensePopupTitle.innerText = "✏️ Sửa Chi Phí";
  
  renderRecentExpenses();
  openPopup("expensePopup");
  
  setTimeout(() => {
    if (expenseAmount) expenseAmount.focus();
  }, 100);
  
  showToast(`📝 Đang sửa: ${item.name}`);
};

// ========== EDIT DEBT ==========
window.editDebt = function(id) {
  const item = appData.debtTransactions.find(x => x.id === id);
  if (!item) {
    showToast("❌ Không tìm thấy công nợ");
    return;
  }
  
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  const today = getToday();
  const report = getReport(item.businessDate || item.date);
  const isCompleted = report.status === "completed";
  
  if (!isAdmin) {
    if (isCompleted) {
      alert("⚠️ Ngày này đã gửi, chỉ Quản lý mới được sửa!");
      return;
    }
    if ((item.businessDate || item.date) !== today) {
      alert("⚠️ Nhân viên chỉ được sửa dữ liệu của ngày hôm nay!");
      return;
    }
  }
  
  if (debtCustomerInput) debtCustomerInput.value = item.customer;
  if (debtAmount) debtAmount.value = item.amount.toLocaleString("vi-VN");
  if (debtNote) debtNote.value = item.note || "";
  
  editingDebtId = id;
  debtPopupTitle.innerText = "✏️ Sửa Công Nợ";
  
  renderRecentCustomers();
  renderRecentPayments();
  openPopup("debtPopup");
  
  setTimeout(() => {
    if (debtAmount) debtAmount.focus();
  }, 100);
  
  showToast(`📝 Đang sửa: ${item.customer} - ${formatMoney(item.amount)}`);
};

// ========== SETUP QUICK MONEY BUTTONS ==========
function setupQuickMoneyButtons() {
  document.querySelectorAll(".quick-money-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const amount = btn.getAttribute('data-amount') || (parseInt(btn.innerText) * 1000);
      if (expenseAmount) {
        expenseAmount.value = Number(amount).toLocaleString("vi-VN");
        expenseAmount.focus();
      }
    };
  });

  document.querySelectorAll(".quick-debt-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const amount = btn.getAttribute('data-amount') || (parseInt(btn.innerText) * 1000);
      if (debtAmount) {
        debtAmount.value = Number(amount).toLocaleString("vi-VN");
        debtAmount.focus();
      }
    };
  });

  document.querySelectorAll(".quick-admin-money-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const amount = btn.getAttribute('data-amount') || (parseInt(btn.innerText) * 1000);
      const adminExpenseAmount = document.getElementById("adminExpenseAmount");
      if (adminExpenseAmount) {
        adminExpenseAmount.value = Number(amount).toLocaleString("vi-VN");
        adminExpenseAmount.focus();
      }
    };
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupQuickMoneyButtons);
} else {
  setupQuickMoneyButtons();
}

// ========== ENSURE ADMIN CLASS ==========
function ensureAdminClass() {
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  const hasClass = document.body.classList.contains('admin-mode');
  
  if (isAdmin && !hasClass) {
    document.body.classList.add('admin-mode');
  } else if (!isAdmin && hasClass) {
    document.body.classList.remove('admin-mode');
  }
}

setInterval(() => {
  ensureAdminClass();
}, 2000);

const observer = new MutationObserver(() => {
  ensureAdminClass();
});
observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });