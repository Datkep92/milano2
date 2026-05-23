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

// Expense popup
const expensePopup = document.getElementById("expensePopup");
const expensePopupTitle = document.getElementById("expensePopupTitle");
const expenseName = document.getElementById("expenseName");
const expenseQty = document.getElementById("expenseQty");
const expenseAmount = document.getElementById("expenseAmount");
const expenseDropdown = document.getElementById("expenseDropdown");
const expenseDisplay = document.getElementById("expenseDisplay");
const expenseSmartPanel = document.getElementById("expenseSmartPanel");
const recentExpenseWrap = document.getElementById("recentExpenseWrap");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");

// Debt popup
const debtPopup = document.getElementById("debtPopup");
const debtPopupTitle = document.getElementById("debtPopupTitle");
const debtCustomer = document.getElementById("debtCustomer");
const debtAmountInput = document.getElementById("debtAmount");
const debtNote = document.getElementById("debtNote");
const customerDropdown = document.getElementById("customerDropdown");
const customerDisplay = document.getElementById("customerDisplay");
const customerSmartPanel = document.getElementById("customerSmartPanel");
const recentCustomerWrap = document.getElementById("recentCustomerWrap");
const saveDebtBtn = document.getElementById("saveDebtBtn");

// Payment popup
const paymentPopup = document.getElementById("paymentPopup");
const paymentCustomer = document.getElementById("paymentCustomer");
const paymentAmountInput = document.getElementById("paymentAmount");
const paymentMethod = document.getElementById("paymentMethod");
const paymentDropdown = document.getElementById("paymentDropdown");
const paymentDisplay = document.getElementById("paymentDisplay");
const paymentSmartPanel = document.getElementById("paymentSmartPanel");
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

// ========== KHỞI TẠO ==========
if (reportDate) {
  reportDate.value = getToday();
}

if (bankInput) formatInputMoney(bankInput);
if (cashInput) formatInputMoney(cashInput);
if (reserveInput) formatInputMoney(reserveInput);
if (expenseAmount) formatInputMoney(expenseAmount);
if (debtAmountInput) formatInputMoney(debtAmountInput);
if (paymentAmountInput) formatInputMoney(paymentAmountInput);

// ========== HÀM CHÍNH ==========
function loadTodayData() {
  const date = getCurrentDate();
  const report = getReport(date);
  
  if (bankInput) bankInput.value = report.bank.toLocaleString("vi-VN");
  if (cashInput) cashInput.value = report.cash.toLocaleString("vi-VN");
  if (reserveInput) reserveInput.value = report.reserve.toLocaleString("vi-VN");
  if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(date));
  if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(date));
  if (dayStatus) dayStatus.innerHTML = report.status === "completed" ? "🟢 Đã chốt" : "🟡 Đang nhập";
}

function autoSaveReport() {
  const date = getCurrentDate();
  const today = getToday();
  
  if (date === today) {
    doSaveReport();
    return;
  }
  
  const report = getReport(date);
  
  if (report.status === "completed") {
    if (window.isAdminSync && window.isAdminSync()) {
      doSaveReport();
      showToast("⚡ Bạn đang sửa ngày đã chốt (Quyền Quản lý)");
    } else {
      loadTodayData();
      showToast("⚠️ Ngày đã chốt, chỉ Quản lý mới được sửa!");
    }
  } else {
    doSaveReport();
  }
}

function doSaveReport() {
  const date = getCurrentDate();
  appData.reports[date] = {
    bank: parseMoney(bankInput ? bankInput.value : 0),
    cash: parseMoney(cashInput ? cashInput.value : 0),
    reserve: parseMoney(reserveInput ? reserveInput.value : 0),
    status: getReport(date).status
  };
  saveData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
}

if (bankInput) bankInput.addEventListener("input", autoSaveReport);
if (cashInput) cashInput.addEventListener("input", autoSaveReport);
if (reserveInput) reserveInput.addEventListener("input", autoSaveReport);

function checkMissingReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split("T")[0];
  const report = appData.reports[date];
  if (!report || report.status !== "completed") {
    alert("⚠️ Hôm qua chưa chốt báo cáo");
  }
}
checkMissingReport();

if (completeDayBtn) {
  completeDayBtn.onclick = () => {
    const date = getCurrentDate();
    getReport(date).status = "completed";
    saveData();
    loadTodayData();
    showToast("✓ Đã chốt ngày");
  };
}

// ========== FAB BUTTONS ==========
if (expenseFab) {
  expenseFab.onclick = () => {
    console.log("Expense FAB clicked");
    editingExpenseId = null;
    if (expensePopupTitle) expensePopupTitle.innerText = "Thêm Chi Phí";
    renderRecentExpenses();
    if (expenseSmartPanel) expenseSmartPanel.classList.add("hidden-panel");
    if (expenseDisplay) expenseDisplay.innerText = expenseName?.value || "Chọn nguyên liệu";
    openPopup("expensePopup");
  };
}

if (debtFab) {
  debtFab.onclick = () => {
    console.log("Debt FAB clicked");
    editingDebtId = null;
    if (debtPopupTitle) debtPopupTitle.innerText = "Thêm Công Nợ";
    renderRecentCustomers();
    if (customerSmartPanel) customerSmartPanel.classList.add("hidden-panel");
    if (customerDisplay) customerDisplay.innerText = debtCustomer?.value || "Chọn khách";
    openPopup("debtPopup");
  };
}

if (paymentFab) {
  paymentFab.onclick = () => {
    console.log("Payment FAB clicked");
    renderRecentPayments();
    if (paymentSmartPanel) paymentSmartPanel.classList.add("hidden-panel");
    if (paymentDisplay) paymentDisplay.innerText = paymentCustomer?.value || "Chọn khách";
    updatePaymentInfo();
    openPopup("paymentPopup");
  };
}

// ========== SAVE EXPENSE ==========
if (saveExpenseBtn) {
  saveExpenseBtn.onclick = () => {
    const date = getCurrentDate();
    const today = getToday();
    
    if (date !== today) {
      const report = getReport(date);
      if (report.status !== "completed") {
        alert(`⚠️ Ngày ${date} chưa chốt! Vui lòng chốt ngày này trước khi thêm dữ liệu mới.`);
        return;
      }
    }
    
    const qty = parseMoney(expenseQty ? expenseQty.value : 0);
    const amount = parseMoney(expenseAmount ? expenseAmount.value : 0);
    
    if (qty < 0) { alert("Số lượng không thể âm"); return; }
    if (amount <= 0) { alert("Nhập số tiền"); return; }
    if (!expenseName || !expenseName.value.trim()) { alert("Nhập tên"); return; }
    
    const data = {
      id: editingExpenseId || createId("exp"),
      date: date,
      name: expenseName.value,
      qty: qty,
      amount: amount,
      deleted: false
    };
    
    if (editingExpenseId) {
      const oldItem = appData.expenses.find(x => x.id === editingExpenseId);
      if (!isEditable(oldItem.date)) {
        alert("⚠️ Ngày này đã chốt, không thể sửa!");
        return;
      }
      const index = appData.expenses.findIndex(x => x.id === editingExpenseId);
      appData.expenses[index] = data;
    } else {
      appData.expenses.push(data);
    }
    
    addCategory("expenses", data.name);
    addRecent("expenses", data.name);
    saveData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    renderRecentExpenses();
    showToast("✓ Đã lưu chi phí");
    
    if (expenseAmount) expenseAmount.value = "";
    if (expenseQty) expenseQty.value = "";
    if (expenseAmount) expenseAmount.focus();
  };
}

// ========== SAVE DEBT ==========
if (saveDebtBtn) {
  saveDebtBtn.onclick = () => {
    const date = getCurrentDate();
    const today = getToday();
    
    if (date !== today) {
      const report = getReport(date);
      if (report.status !== "completed") {
        alert(`⚠️ Ngày ${date} chưa chốt! Vui lòng chốt ngày này trước khi thêm dữ liệu mới.`);
        return;
      }
    }
    
    const amount = parseMoney(debtAmountInput ? debtAmountInput.value : 0);
    if (amount <= 0) { alert("Nhập số tiền"); return; }
    if (!debtCustomer || !debtCustomer.value.trim()) { alert("Nhập tên khách"); return; }
    
    const data = {
      id: editingDebtId || createId("debt"),
      type: "debt_add",
      customer: debtCustomer.value,
      amount: amount,
      note: debtNote ? debtNote.value : "",
      date: date,
      deleted: false
    };
    
    if (editingDebtId) {
      const oldItem = appData.debtTransactions.find(x => x.id === editingDebtId);
      if (!isEditable(oldItem.date)) {
        alert("⚠️ Ngày này đã chốt, không thể sửa!");
        return;
      }
      const index = appData.debtTransactions.findIndex(x => x.id === editingDebtId);
      appData.debtTransactions[index] = data;
    } else {
      appData.debtTransactions.push(data);
    }
    
    addCategory("customers", data.customer);
    addRecent("customers", data.customer);
    saveData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    renderRecentCustomers();
    showToast("✓ Đã lưu công nợ");
    
    if (debtAmountInput) debtAmountInput.value = "";
    if (debtNote) debtNote.value = "";
    if (debtAmountInput) debtAmountInput.focus();
  };
}

// ========== SAVE PAYMENT ==========
if (savePaymentBtn) {
  savePaymentBtn.onclick = () => {
    const date = getCurrentDate();
    const today = getToday();
    
    if (date !== today) {
      const report = getReport(date);
      if (report.status !== "completed") {
        alert(`⚠️ Ngày ${date} chưa chốt! Vui lòng chốt ngày này trước khi thêm dữ liệu mới.`);
        return;
      }
    }
    
    const amount = parseMoney(paymentAmountInput ? paymentAmountInput.value : 0);
    if (amount <= 0) { alert("Nhập số tiền"); return; }
    if (!paymentCustomer || !paymentCustomer.value.trim()) { alert("Chọn khách"); return; }
    
    const remain = calculateCustomerDebt(paymentCustomer.value) - amount;
    if (remain < 0) { alert("Thanh toán vượt nợ"); return; }
    
    appData.debtTransactions.push({
      id: createId("pay"),
      type: "payment",
      customer: paymentCustomer.value,
      amount: amount,
      method: paymentMethod ? paymentMethod.value : "TM",
      date: date,
      deleted: false
    });
    
    addCategory("customers", paymentCustomer.value);
    addRecent("customers", paymentCustomer.value);
    saveData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    renderRecentPayments();
    showToast("✓ Đã thanh toán");
    
    if (paymentAmountInput) paymentAmountInput.value = "";
    if (paymentAmountInput) paymentAmountInput.focus();
    updatePaymentInfo();
  };
}

// ========== EDIT/DELETE FUNCTIONS ==========
function editExpense(id) {
  const item = appData.expenses.find(x => x.id === id);
  if (!item) {
    showToast("❌ Không tìm thấy chi phí");
    return;
  }
  
  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");
  
  if (!isToday && isCompleted && !(window.isAdminSync && window.isAdminSync())) {
    alert("⚠️ Ngày này đã chốt, chỉ Quản lý mới được sửa!");
    return;
  }
  
  editingExpenseId = id;
  if (expensePopupTitle) expensePopupTitle.innerText = "Sửa Chi Phí";
  if (expenseName) expenseName.value = item.name;
  if (expenseQty) expenseQty.value = item.qty ? item.qty.toLocaleString("vi-VN") : "";
  if (expenseAmount) expenseAmount.value = item.amount.toLocaleString("vi-VN");
  
  openPopup("expensePopup");
  closePopup("detailPopup");
}

function deleteExpense(id) {
  const item = appData.expenses.find(x => x.id === id);
  if (!item) {
    showToast("❌ Không tìm thấy chi phí");
    return;
  }
  
  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");
  
  if (!isToday && isCompleted && !(window.isAdminSync && window.isAdminSync())) {
    alert("⚠️ Ngày này đã chốt, chỉ Quản lý mới được xóa!");
    return;
  }
  
  if (confirm(`Bạn có chắc muốn xóa chi phí "${item.name}" - ${formatMoney(item.amount)}?`)) {
    item.deleted = true;
    saveData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    renderRecentExpenses();
    closePopup("detailPopup");
    showToast("✓ Đã xóa chi phí");
  }
}

function editDebt(id) {
  const item = appData.debtTransactions.find(x => x.id === id);
  if (!item) {
    showToast("❌ Không tìm thấy công nợ");
    return;
  }
  
  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");
  
  if (!isToday && isCompleted && !(window.isAdminSync && window.isAdminSync())) {
    alert("⚠️ Ngày này đã chốt, chỉ Quản lý mới được sửa!");
    return;
  }
  
  editingDebtId = id;
  if (debtPopupTitle) debtPopupTitle.innerText = "Sửa Công Nợ";
  if (debtCustomer) debtCustomer.value = item.customer;
  if (debtAmountInput) debtAmountInput.value = item.amount.toLocaleString("vi-VN");
  if (debtNote) debtNote.value = item.note || "";
  
  openPopup("debtPopup");
  closePopup("detailPopup");
}

function deleteDebt(id) {
  const item = appData.debtTransactions.find(x => x.id === id);
  if (!item) {
    showToast("❌ Không tìm thấy công nợ");
    return;
  }
  
  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");
  
  if (!isToday && isCompleted && !(window.isAdminSync && window.isAdminSync())) {
    alert("⚠️ Ngày này đã chốt, chỉ Quản lý mới được xóa!");
    return;
  }
  
  const typeText = item.type === "debt_add" ? "Công nợ" : "Thanh toán";
  if (confirm(`Bạn có chắc muốn xóa ${typeText} của "${item.customer}" - ${formatMoney(item.amount)}?`)) {
    item.deleted = true;
    saveData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    closePopup("detailPopup");
    showToast("✓ Đã xóa công nợ");
  }
}

// ========== RECENT & UI ==========
function renderRecentExpenses() {
  if (!recentExpenseWrap) return;
  let html = "";
  appData.recent.expenses.forEach(name => {
    html += `<button class="recent-btn" onclick="selectExpenseRecent('${name.replace(/'/g, "\\'")}')">${name}</button>`;
  });
  recentExpenseWrap.innerHTML = html;
}

function selectExpenseRecent(name) {
  if (expenseName) expenseName.value = name;
  if (expenseDisplay) expenseDisplay.innerText = name;
  if (expenseSmartPanel) expenseSmartPanel.classList.add("hidden-panel");
  if (expenseAmount) expenseAmount.focus();
}

function renderRecentCustomers() {
  if (!recentCustomerWrap) return;
  let html = "";
  appData.recent.customers.forEach(name => {
    html += `<button class="recent-btn" onclick="selectRecentCustomer('${name.replace(/'/g, "\\'")}')">${name}</button>`;
  });
  recentCustomerWrap.innerHTML = html;
}

function selectRecentCustomer(name) {
  if (debtCustomer) debtCustomer.value = name;
  if (customerDisplay) customerDisplay.innerText = name;
  if (customerSmartPanel) customerSmartPanel.classList.add("hidden-panel");
  if (debtAmountInput) debtAmountInput.focus();
}

function renderRecentPayments() {
  if (!recentPaymentWrap) return;
  let html = "";
  appData.recent.customers.forEach(name => {
    const debt = calculateCustomerDebt(name);
    if (debt <= 0) return;
    html += `<button class="recent-btn" onclick="selectPaymentCustomer('${name.replace(/'/g, "\\'")}')">${name}</button>`;
  });
  recentPaymentWrap.innerHTML = html;
}

function selectPaymentCustomer(name) {
  if (paymentCustomer) paymentCustomer.value = name;
  if (paymentDisplay) paymentDisplay.innerText = name;
  if (paymentSmartPanel) paymentSmartPanel.classList.add("hidden-panel");
  updatePaymentInfo();
  if (paymentAmountInput) paymentAmountInput.focus();
}

function updatePaymentInfo() {
  const debt = calculateCustomerDebt(paymentCustomer ? paymentCustomer.value : "");
  if (paymentTotalDebt) paymentTotalDebt.innerText = formatMoney(debt);
  const remain = debt - parseMoney(paymentAmountInput ? paymentAmountInput.value : 0);
  if (paymentRemainDebt) paymentRemainDebt.innerText = formatMoney(remain > 0 ? remain : 0);
}

// ========== DROPDOWN ==========
if (expenseDisplay) {
  expenseDisplay.onclick = () => {
    if (expenseSmartPanel) expenseSmartPanel.classList.toggle("hidden-panel");
    if (expenseName) expenseName.focus();
  };
}

if (customerDisplay) {
  customerDisplay.onclick = () => {
    if (customerSmartPanel) customerSmartPanel.classList.toggle("hidden-panel");
    if (debtCustomer) debtCustomer.focus();
  };
}

if (paymentDisplay) {
  paymentDisplay.onclick = () => {
    if (paymentSmartPanel) paymentSmartPanel.classList.toggle("hidden-panel");
    if (paymentCustomer) paymentCustomer.focus();
  };
}

if (expenseName) {
  expenseName.addEventListener("input", () => {
    renderDropdown(expenseName, expenseDropdown, appData.categories.expenses);
  });
}

if (debtCustomer) {
  debtCustomer.addEventListener("input", renderCustomerDropdown);
}

if (paymentCustomer) {
  paymentCustomer.addEventListener("input", () => {
    renderPaymentDropdown();
    updatePaymentInfo();
  });
}

if (paymentAmountInput) {
  paymentAmountInput.addEventListener("input", updatePaymentInfo);
}

function renderCustomerDropdown() {
  if (!debtCustomer || !customerDropdown) return;
  const keyword = debtCustomer.value.trim().toLowerCase();
  const unique = [...new Set([...appData.recent.customers, ...appData.categories.customers])];
  let html = "";
  unique.filter(x => x.toLowerCase().includes(keyword)).slice(0, 20).forEach(item => {
    const debt = calculateCustomerDebt(item);
    html += `<div class="dropdown-item customer-item"><div>${item}</div><div>${formatMoney(debt)}</div></div>`;
  });
  if (keyword && !unique.includes(debtCustomer.value.trim())) {
    html += `<div class="dropdown-item">+ Tạo mới "${debtCustomer.value.trim()}"</div>`;
  }
  customerDropdown.innerHTML = html;
}

function renderPaymentDropdown() {
  if (!paymentCustomer || !paymentDropdown) return;
  const keyword = paymentCustomer.value.trim().toLowerCase();
  const customers = [...new Set([...appData.recent.customers, ...appData.categories.customers])];
  let html = "";
  customers.filter(x => x.toLowerCase().includes(keyword)).forEach(customer => {
    const debt = calculateCustomerDebt(customer);
    if (debt <= 0) return;
    html += `<div class="dropdown-item customer-item"><div>${customer}</div><div>${formatMoney(debt)}</div></div>`;
  });
  paymentDropdown.innerHTML = html;
}

// ========== CLOSE BUTTONS ==========
document.querySelectorAll(".close-btn").forEach(btn => {
  btn.onclick = () => {
    const popupId = btn.getAttribute("data-close");
    if (popupId) closePopup(popupId);
  };
});

// Dropdown click events
if (expenseDropdown) {
  expenseDropdown.addEventListener("click", (e) => {
    if (!e.target.classList.contains("dropdown-item")) return;
    const text = e.target.innerText.replace('+ Tạo mới "', '').replace('"', '');
    if (expenseName) expenseName.value = text;
    if (expenseDisplay) expenseDisplay.innerText = text;
    if (expenseSmartPanel) expenseSmartPanel.classList.add("hidden-panel");
    if (expenseAmount) expenseAmount.focus();
  });
}

if (customerDropdown) {
  customerDropdown.addEventListener("click", (e) => {
    const item = e.target.closest(".dropdown-item");
    if (!item) return;
    const text = item.innerText.split("\n")[0].replace('+ Tạo mới "', '').replace('"', '').trim();
    if (debtCustomer) debtCustomer.value = text;
    if (customerDisplay) customerDisplay.innerText = text;
    if (customerSmartPanel) customerSmartPanel.classList.add("hidden-panel");
    if (debtAmountInput) debtAmountInput.focus();
  });
}

if (paymentDropdown) {
  paymentDropdown.addEventListener("click", (e) => {
    const item = e.target.closest(".dropdown-item");
    if (!item) return;
    const customer = item.innerText.split("\n")[0].trim();
    if (paymentCustomer) paymentCustomer.value = customer;
    if (paymentDisplay) paymentDisplay.innerText = customer;
    if (paymentSmartPanel) paymentSmartPanel.classList.add("hidden-panel");
    updatePaymentInfo();
    if (paymentAmountInput) paymentAmountInput.focus();
  });
}

// ========== QUICK MONEY ==========
document.querySelectorAll(".quick-money-btn, .quick-debt-btn, .quick-payment-btn").forEach(btn => {
  btn.onclick = () => {
    const value = (Number(btn.innerText.replace('k', '')) * 1000).toLocaleString("vi-VN");
    if (expenseAmount && btn.classList.contains("quick-money-btn")) {
      expenseAmount.value = value;
    } else if (debtAmountInput && btn.classList.contains("quick-debt-btn")) {
      debtAmountInput.value = value;
    } else if (paymentAmountInput && btn.classList.contains("quick-payment-btn")) {
      paymentAmountInput.value = value;
      updatePaymentInfo();
    }
  };
});

// ========== ENTER SAVE ==========
if (expenseAmount) {
  expenseAmount.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && saveExpenseBtn) saveExpenseBtn.click();
  });
}
if (debtAmountInput) {
  debtAmountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && saveDebtBtn) saveDebtBtn.click();
  });
}
if (paymentAmountInput) {
  paymentAmountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && savePaymentBtn) savePaymentBtn.click();
  });
}

// ========== DRAFT ==========
if (expenseName && expenseQty && expenseAmount) {
  [expenseName, expenseQty, expenseAmount].forEach(input => {
    input.addEventListener("input", () => {
      localStorage.setItem("expenseDraft", JSON.stringify({
        name: expenseName.value,
        qty: expenseQty.value,
        amount: expenseAmount.value
      }));
    });
  });
}

if (debtCustomer && debtAmountInput && debtNote) {
  [debtCustomer, debtAmountInput, debtNote].forEach(input => {
    input.addEventListener("input", () => {
      localStorage.setItem("debtDraft", JSON.stringify({
        customer: debtCustomer.value,
        amount: debtAmountInput.value,
        note: debtNote.value
      }));
    });
  });
}

if (paymentCustomer && paymentAmountInput) {
  [paymentCustomer, paymentAmountInput].forEach(input => {
    input.addEventListener("input", () => {
      localStorage.setItem("paymentDraft", JSON.stringify({
        customer: paymentCustomer.value,
        amount: paymentAmountInput.value
      }));
    });
  });
}

function loadExpenseDraft() {
  const draft = JSON.parse(localStorage.getItem("expenseDraft"));
  if (!draft) return;
  if (expenseName) expenseName.value = draft.name || "";
  if (expenseQty) expenseQty.value = draft.qty || "";
  if (expenseAmount) expenseAmount.value = draft.amount || "";
  if (expenseName && expenseName.value && expenseDisplay) expenseDisplay.innerText = expenseName.value;
}

function loadDebtDraft() {
  const draft = JSON.parse(localStorage.getItem("debtDraft"));
  if (!draft) return;
  if (debtCustomer) debtCustomer.value = draft.customer || "";
  if (debtAmountInput) debtAmountInput.value = draft.amount || "";
  if (debtNote) debtNote.value = draft.note || "";
  if (debtCustomer && debtCustomer.value && customerDisplay) customerDisplay.innerText = debtCustomer.value;
}

function loadPaymentDraft() {
  const draft = JSON.parse(localStorage.getItem("paymentDraft"));
  if (!draft) return;
  if (paymentCustomer) paymentCustomer.value = draft.customer || "";
  if (paymentAmountInput) paymentAmountInput.value = draft.amount || "";
  if (paymentCustomer && paymentCustomer.value && paymentDisplay) paymentDisplay.innerText = paymentCustomer.value;
  updatePaymentInfo();
}

// ========== HISTORY ==========
if (openExpenseHistory) {
  openExpenseHistory.onclick = () => {
    if (detailTitle) detailTitle.innerText = "Chi Phí Hôm Nay";
    const date = getCurrentDate();
    let html = "";
    const list = appData.expenses.filter(x => x.date === date && !x.deleted);
    if (list.length === 0) {
      html = '<div class="empty-text">Chưa có dữ liệu</div>';
    } else {
      list.forEach(item => {
        html += `
          <div class="history-item">
            <strong>${item.name}</strong><br>
            ${formatMoney(item.amount)}
            <div class="action-row">
              <button class="action-btn edit-btn" onclick="editExpense('${item.id}')">Sửa</button>
              <button class="action-btn delete-btn" onclick="deleteExpense('${item.id}')">Xóa</button>
            </div>
          </