// ========== DOM ELEMENTS (CHỈ KHAI BÁO NHỮNG BIẾN CẦN THIẾT CHO EMPLOYEE) ==========
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
const debtAmount = document.getElementById("debtAmount");
const debtNote = document.getElementById("debtNote");
const customerDropdown = document.getElementById("customerDropdown");
const customerDisplay = document.getElementById("customerDisplay");
const customerSmartPanel = document.getElementById("customerSmartPanel");
const recentCustomerWrap = document.getElementById("recentCustomerWrap");
const saveDebtBtn = document.getElementById("saveDebtBtn");

// Payment popup
const paymentPopup = document.getElementById("paymentPopup");
const paymentCustomer = document.getElementById("paymentCustomer");
const paymentAmount = document.getElementById("paymentAmount");
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
reportDate.value = getToday();

[bankInput, cashInput, reserveInput, expenseAmount, debtAmount, paymentAmount].forEach(formatInputMoney);

// Sửa hàm renderRecentExpenses
function renderRecentExpenses(){
  if (!recentExpenseWrap) return;
  if (!appData || !appData.recent || !appData.recent.expenses) {
    recentExpenseWrap.innerHTML = '';
    return;
  }
  let html = "";
  appData.recent.expenses.forEach(name => {
    if (name) {
      html += `<button class="recent-btn" onclick="selectExpenseRecent('${name.replace(/'/g, "\\'")}')">${name}</button>`;
    }
  });
  recentExpenseWrap.innerHTML = html;
}

// Sửa hàm renderRecentCustomers
function renderRecentCustomers(){
  if (!recentCustomerWrap) return;
  if (!appData || !appData.recent || !appData.recent.customers) {
    recentCustomerWrap.innerHTML = '';
    return;
  }
  let html = "";
  appData.recent.customers.forEach(name => {
    if (name) {
      html += `<button class="recent-btn" onclick="selectRecentCustomer('${name.replace(/'/g, "\\'")}')">${name}</button>`;
    }
  });
  recentCustomerWrap.innerHTML = html;
}

// Sửa hàm renderRecentPayments
function renderRecentPayments(){
  if (!recentPaymentWrap) return;
  if (!appData || !appData.recent || !appData.recent.customers) {
    recentPaymentWrap.innerHTML = '';
    return;
  }
  let html = "";
  appData.recent.customers.forEach(name => {
    if (!name) return;
    const debt = calculateCustomerDebt(name);
    if(debt <= 0) return;
    html += `<button class="recent-btn" onclick="selectPaymentCustomer('${name.replace(/'/g, "\\'")}')">${name}</button>`;
  });
  recentPaymentWrap.innerHTML = html;
}

// Sửa hàm loadTodayData
function loadTodayData(){
  if (!appData) {
    console.error("appData chưa sẵn sàng");
    return;
  }
  const date = getCurrentDate();
  const report = getReport(date);
  if (bankInput) bankInput.value = (report.bank || 0).toLocaleString("vi-VN");
  if (cashInput) cashInput.value = (report.cash || 0).toLocaleString("vi-VN");
  if (reserveInput) reserveInput.value = (report.reserve || 0).toLocaleString("vi-VN");
  if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(date));
  if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(date));
  if (dayStatus) dayStatus.innerHTML = report.status === "completed" ? "🟢 Đã chốt" : "🟡 Đang nhập";
}

function autoSaveReport() {
  const date = getCurrentDate();
  const today = getToday();
  
  // Nếu là ngày hôm nay, luôn cho sửa
  if (date === today) {
    doSaveReport();
    return;
  }
  
  // Ngày cũ: kiểm tra
  const report = getReport(date);
  
  if (report.status === "completed") {
    // Ngày cũ đã chốt: chỉ admin mới được sửa
    if (window.isAdminSync && window.isAdminSync()) {
      doSaveReport();
      showToast("⚡ Bạn đang sửa ngày đã chốt (Quyền Quản lý)");
    } else {
      loadTodayData(); // Khôi phục giá trị cũ
      showToast("⚠️ Ngày đã chốt, chỉ Quản lý mới được sửa!");
    }
  } else {
    // Ngày cũ chưa chốt: nhân viên vẫn được sửa
    doSaveReport();
  }
}

function doSaveReport() {
  const date = getCurrentDate();
  appData.reports[date] = {
    bank: parseMoney(bankInput.value),
    cash: parseMoney(cashInput.value),
    reserve: parseMoney(reserveInput.value),
    status: getReport(date).status
  };
  saveData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
}

[bankInput, cashInput, reserveInput].forEach(input => {
  input.addEventListener("input", autoSaveReport);
});

function checkMissingReport(){
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate()-1);
  const date = yesterday.toISOString().split("T")[0];
  const report = appData.reports[date];
  if(!report || report.status !== "completed"){
    alert("⚠️ Hôm qua chưa chốt báo cáo");
  }
}
checkMissingReport();

completeDayBtn.onclick = () => {
  const date = getCurrentDate();
  getReport(date).status = "completed";
  saveData();
  loadTodayData();
  showToast("✓ Đã chốt ngày");
};

// ========== EXPENSE ==========
expenseFab.onclick = () => {
  editingExpenseId = null;
  expensePopupTitle.innerText = "Thêm Chi Phí";
  renderRecentExpenses();
  expenseSmartPanel.classList.add("hidden");
  expenseDisplay.innerText = expenseName.value || "Chọn nguyên liệu";
  openPopup("expensePopup");
};

saveExpenseBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
  
  if(date !== today){
    const report = getReport(date);
    if(report.status !== "completed"){
      alert(`⚠️ Ngày ${date} chưa chốt! Vui lòng chốt ngày này trước khi thêm dữ liệu mới.`);
      return;
    }
  }
  
  const qty = parseMoney(expenseQty.value);
  const amount = parseMoney(expenseAmount.value);
  
  if(qty < 0){ alert("Số lượng không thể âm"); return; }
  if(amount <= 0){ alert("Nhập số tiền"); return; }
  if(!expenseName.value.trim()){ alert("Nhập tên"); return; }
  
  const data = {
    id: editingExpenseId || createId("exp"),
    date: date,
    name: expenseName.value,
    qty: qty,
    amount: amount,
    deleted: false
  };
  
  if(editingExpenseId){
    const oldItem = appData.expenses.find(x => x.id === editingExpenseId);
    if(!isEditable(oldItem.date)){
      alert("⚠️ Ngày này đã chốt, không thể sửa!");
      return;
    }
    const index = appData.expenses.findIndex(x => x.id === editingExpenseId);
    appData.expenses[index] = data;
  }else{
    appData.expenses.push(data);
  }
  
  addCategory("expenses", data.name);
  addRecent("expenses", data.name);
  saveData();
  if(typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentExpenses();
  showToast("✓ Đã lưu chi phí");
  
  expenseAmount.value = "";
  expenseQty.value = "";
  expenseAmount.focus();
};

// ========== DEBT ==========
debtFab.onclick = () => {
  editingDebtId = null;
  debtPopupTitle.innerText = "Thêm Công Nợ";
  renderRecentCustomers();
  customerSmartPanel.classList.add("hidden");
  customerDisplay.innerText = debtCustomer.value || "Chọn khách";
  openPopup("debtPopup");
};

saveDebtBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
  
  if(date !== today){
    const report = getReport(date);
    if(report.status !== "completed"){
      alert(`⚠️ Ngày ${date} chưa chốt! Vui lòng chốt ngày này trước khi thêm dữ liệu mới.`);
      return;
    }
  }
  
  const amount = parseMoney(debtAmount.value);
  if(amount <= 0){ alert("Nhập số tiền"); return; }
  if(!debtCustomer.value.trim()){ alert("Nhập tên khách"); return; }
  
  const data = {
    id: editingDebtId || createId("debt"),
    type: "debt_add",
    customer: debtCustomer.value,
    amount: amount,
    note: debtNote.value,
    date: date,
    deleted: false
  };
  
  if(editingDebtId){
    const oldItem = appData.debtTransactions.find(x => x.id === editingDebtId);
    if(!isEditable(oldItem.date)){
      alert("⚠️ Ngày này đã chốt, không thể sửa!");
      return;
    }
    const index = appData.debtTransactions.findIndex(x => x.id === editingDebtId);
    appData.debtTransactions[index] = data;
  }else{
    appData.debtTransactions.push(data);
  }
  
  addCategory("customers", data.customer);
  addRecent("customers", data.customer);
  saveData();
  if(typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentCustomers();
  showToast("✓ Đã lưu công nợ");
  
  debtAmount.value = "";
  debtNote.value = "";
  debtAmount.focus();
};

// ========== PAYMENT ==========
paymentFab.onclick = () => {
  renderRecentPayments();
  paymentSmartPanel.classList.add("hidden");
  paymentDisplay.innerText = paymentCustomer.value || "Chọn khách";
  updatePaymentInfo();
  openPopup("paymentPopup");
};

savePaymentBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
  
  if(date !== today){
    const report = getReport(date);
    if(report.status !== "completed"){
      alert(`⚠️ Ngày ${date} chưa chốt! Vui lòng chốt ngày này trước khi thêm dữ liệu mới.`);
      return;
    }
  }
  
  const amount = parseMoney(paymentAmount.value);
  if(amount <= 0){ alert("Nhập số tiền"); return; }
  if(!paymentCustomer.value.trim()){ alert("Chọn khách"); return; }
  
  const remain = calculateCustomerDebt(paymentCustomer.value) - amount;
  if(remain < 0){ alert("Thanh toán vượt nợ"); return; }
  
  appData.debtTransactions.push({
    id: createId("pay"),
    type: "payment",
    customer: paymentCustomer.value,
    amount: amount,
    method: paymentMethod.value,
    date: date,
    deleted: false
  });
  
  addCategory("customers", paymentCustomer.value);
  addRecent("customers", paymentCustomer.value);
  saveData();
  if(typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentPayments();
  showToast("✓ Đã thanh toán");
  
  paymentAmount.value = "";
  paymentAmount.focus();
  updatePaymentInfo();
};

// Kiểm tra quyền sửa/xóa ngày cũ đã chốt
async function canModifyOldData() {
  const isAdminUser = await isAdmin();
  return isAdminUser; // Chỉ admin mới được sửa/xóa ngày cũ đã chốt
}

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
  
  // Kiểm tra quyền sửa
  let canEdit = false;
  let errorMsg = "";
  
  if (isToday) {
    // Ngày hôm nay: LUÔN được sửa (kể cả đã chốt)
    canEdit = true;
  } else {
    // Ngày cũ
    if (isCompleted) {
      // Ngày cũ đã chốt: chỉ Quản lý mới được sửa
      if (window.isAdminSync && window.isAdminSync()) {
        canEdit = true;
        errorMsg = "";
      } else {
        canEdit = false;
        errorMsg = "⚠️ Ngày này đã chốt, chỉ Quản lý mới được sửa!";
      }
    } else {
      // Ngày cũ chưa chốt: Nhân viên vẫn được sửa
      canEdit = true;
    }
  }
  
  // Nếu không có quyền, báo lỗi và thoát
  if (!canEdit) {
    if (errorMsg) {
      alert(errorMsg);
    } else {
      alert("⚠️ Bạn không có quyền sửa chi phí này!");
    }
    return;
  }
  
  // Set editing state
  editingExpenseId = id;
  expensePopupTitle.innerText = "Sửa Chi Phí";
  expenseName.value = item.name;
  expenseQty.value = item.qty ? item.qty.toLocaleString("vi-VN") : "";
  expenseAmount.value = item.amount.toLocaleString("vi-VN");
  
  // Hiển thị thông báo nếu đang sửa ngày cũ đã chốt (chỉ admin mới thấy)
  if (!isToday && isCompleted) {
    showToast("⚡ Bạn đang sửa ngày đã chốt (Quyền Quản lý)");
  }
  
  // Mở popup và đóng popup chi tiết
  openPopup("expensePopup");
  closePopup("detailPopup");
  
  // Focus vào ô số tiền
  setTimeout(() => {
    expenseAmount.focus();
  }, 100);
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
  
  // Kiểm tra quyền xóa
  let canDelete = false;
  let errorMsg = "";
  
  if (isToday) {
    // Ngày hôm nay: LUÔN được xóa
    canDelete = true;
  } else {
    // Ngày cũ
    if (isCompleted) {
      // Ngày cũ đã chốt: chỉ Quản lý mới được xóa
      if (window.isAdminSync && window.isAdminSync()) {
        canDelete = true;
        errorMsg = "";
      } else {
        canDelete = false;
        errorMsg = "⚠️ Ngày này đã chốt, chỉ Quản lý mới được xóa!";
      }
    } else {
      // Ngày cũ chưa chốt: Nhân viên vẫn được xóa
      canDelete = true;
    }
  }
  
  if (!canDelete) {
    if (errorMsg) {
      alert(errorMsg);
    } else {
      alert("⚠️ Bạn không có quyền xóa chi phí này!");
    }
    return;
  }
  
  // Xác nhận xóa
  let confirmMsg = `Bạn có chắc muốn xóa chi phí "${item.name}" - ${formatMoney(item.amount)}?`;
  if (!isToday && isCompleted) {
    confirmMsg = `⚠️ CẢNH BÁO: Bạn đang xóa dữ liệu ngày ĐÃ CHỐT (${item.date})\n\n` + confirmMsg;
  }
  
  if (confirm(confirmMsg)) {
    item.deleted = true;
    saveData();
    
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    if (typeof loadTodayData === 'function') loadTodayData();
    if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
    
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
  
  // Kiểm tra quyền sửa
  let canEdit = false;
  let errorMsg = "";
  
  if (isToday) {
    canEdit = true;
  } else {
    if (isCompleted) {
      if (window.isAdminSync && window.isAdminSync()) {
        canEdit = true;
      } else {
        canEdit = false;
        errorMsg = "⚠️ Ngày này đã chốt, chỉ Quản lý mới được sửa!";
      }
    } else {
      canEdit = true;
    }
  }
  
  if (!canEdit) {
    if (errorMsg) alert(errorMsg);
    else alert("⚠️ Bạn không có quyền sửa công nợ này!");
    return;
  }
  
  editingDebtId = id;
  debtPopupTitle.innerText = "Sửa Công Nợ";
  debtCustomer.value = item.customer;
  debtAmount.value = item.amount.toLocaleString("vi-VN");
  debtNote.value = item.note || "";
  
  if (!isToday && isCompleted) {
    showToast("⚡ Bạn đang sửa ngày đã chốt (Quyền Quản lý)");
  }
  
  openPopup("debtPopup");
  closePopup("detailPopup");
  
  setTimeout(() => {
    debtAmount.focus();
  }, 100);
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
  
  // Kiểm tra quyền xóa
  let canDelete = false;
  let errorMsg = "";
  
  if (isToday) {
    canDelete = true;
  } else {
    if (isCompleted) {
      if (window.isAdminSync && window.isAdminSync()) {
        canDelete = true;
      } else {
        canDelete = false;
        errorMsg = "⚠️ Ngày này đã chốt, chỉ Quản lý mới được xóa!";
      }
    } else {
      canDelete = true;
    }
  }
  
  if (!canDelete) {
    if (errorMsg) alert(errorMsg);
    else alert("⚠️ Bạn không có quyền xóa công nợ này!");
    return;
  }
  
  const typeText = item.type === "debt_add" ? "Công nợ" : "Thanh toán";
  let confirmMsg = `Bạn có chắc muốn xóa ${typeText} của "${item.customer}" - ${formatMoney(item.amount)}?`;
  
  if (!isToday && isCompleted) {
    confirmMsg = `⚠️ CẢNH BÁO: Bạn đang xóa dữ liệu ngày ĐÃ CHỐT (${item.date})\n\n` + confirmMsg;
  }
  
  if (confirm(confirmMsg)) {
    item.deleted = true;
    saveData();
    
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    if (typeof loadTodayData === 'function') loadTodayData();
    
    closePopup("detailPopup");
    showToast("✓ Đã xóa công nợ");
  }
}



function selectExpenseRecent(name){
  expenseName.value = name;
  expenseDisplay.innerText = name;
  expenseSmartPanel.classList.add("hidden");
  expenseAmount.focus();
}



function selectRecentCustomer(name){
  debtCustomer.value = name;
  customerDisplay.innerText = name;
  customerSmartPanel.classList.add("hidden");
  debtAmount.focus();
}



function selectPaymentCustomer(name){
  paymentCustomer.value = name;
  paymentDisplay.innerText = name;
  paymentSmartPanel.classList.add("hidden");
  updatePaymentInfo();
  paymentAmount.focus();
}

function updatePaymentInfo(){
  const debt = calculateCustomerDebt(paymentCustomer.value);
  paymentTotalDebt.innerText = formatMoney(debt);
  const remain = debt - parseMoney(paymentAmount.value);
  paymentRemainDebt.innerText = formatMoney(remain > 0 ? remain : 0);
}

// ========== DROPDOWN ==========
expenseDisplay.onclick = () => expenseSmartPanel.classList.toggle("hidden");
customerDisplay.onclick = () => customerSmartPanel.classList.toggle("hidden");
paymentDisplay.onclick = () => paymentSmartPanel.classList.toggle("hidden");

expenseName.addEventListener("input", () => {
  renderDropdown(expenseName, expenseDropdown, appData.categories.expenses);
});

debtCustomer.addEventListener("input", renderCustomerDropdown);
paymentCustomer.addEventListener("input", () => {
  renderPaymentDropdown();
  updatePaymentInfo();
});
paymentAmount.addEventListener("input", updatePaymentInfo);

function renderCustomerDropdown(){
  const keyword = debtCustomer.value.trim().toLowerCase();
  const unique = [...new Set([...appData.recent.customers, ...appData.categories.customers])];
  let html = "";
  unique.filter(x => x.toLowerCase().includes(keyword)).slice(0,20).forEach(item => {
    const debt = calculateCustomerDebt(item);
    html += `<div class="dropdown-item customer-item"><div>${item}</div><div>${formatMoney(debt)}</div></div>`;
  });
  if(keyword && !unique.includes(debtCustomer.value.trim())){
    html += `<div class="dropdown-item">+ Tạo mới "${debtCustomer.value.trim()}"</div>`;
  }
  customerDropdown.innerHTML = html;
}

function renderPaymentDropdown(){
  const keyword = paymentCustomer.value.trim().toLowerCase();
  const customers = [...new Set([...appData.recent.customers, ...appData.categories.customers])];
  let html = "";
  customers.filter(x => x.toLowerCase().includes(keyword)).forEach(customer => {
    const debt = calculateCustomerDebt(customer);
    if(debt <= 0) return;
    html += `<div class="dropdown-item customer-item"><div>${customer}</div><div>${formatMoney(debt)}</div></div>`;
  });
  paymentDropdown.innerHTML = html;
}

// ========== CLOSE & NAVIGATION ==========
document.querySelectorAll(".close-btn").forEach(btn => {
  btn.onclick = () => closePopup(btn.dataset.close);
});

expenseDropdown.addEventListener("click", (e) => {
  if(!e.target.classList.contains("dropdown-item")) return;
  const text = e.target.innerText.replace('+ Tạo mới "','').replace('"','');
  expenseName.value = text;
  expenseDisplay.innerText = text;
  expenseSmartPanel.classList.add("hidden");
  expenseAmount.focus();
});

customerDropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".dropdown-item");
  if(!item) return;
  const text = item.innerText.split("\n")[0].replace('+ Tạo mới "','').replace('"','').trim();
  debtCustomer.value = text;
  customerDisplay.innerText = text;
  customerSmartPanel.classList.add("hidden");
  debtAmount.focus();
});

paymentDropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".dropdown-item");
  if(!item) return;
  const customer = item.innerText.split("\n")[0].trim();
  paymentCustomer.value = customer;
  paymentDisplay.innerText = customer;
  paymentSmartPanel.classList.add("hidden");
  updatePaymentInfo();
  paymentAmount.focus();
});

// ========== QUICK MONEY ==========
document.querySelectorAll(".quick-money-btn").forEach(btn => {
  btn.onclick = () => expenseAmount.value = (Number(btn.innerText) * 1000).toLocaleString("vi-VN");
});
document.querySelectorAll(".quick-debt-btn").forEach(btn => {
  btn.onclick = () => debtAmount.value = (Number(btn.innerText) * 1000).toLocaleString("vi-VN");
});
document.querySelectorAll(".quick-payment-btn").forEach(btn => {
  btn.onclick = () => {
    paymentAmount.value = (Number(btn.innerText) * 1000).toLocaleString("vi-VN");
    updatePaymentInfo();
  };
});

// ========== ENTER SAVE ==========
expenseAmount.addEventListener("keydown", (e) => { if(e.key === "Enter") saveExpenseBtn.click(); });
debtAmount.addEventListener("keydown", (e) => { if(e.key === "Enter") saveDebtBtn.click(); });
paymentAmount.addEventListener("keydown", (e) => { if(e.key === "Enter") savePaymentBtn.click(); });

// ========== DRAFT ==========
[expenseName, expenseQty, expenseAmount].forEach(input => {
  input.addEventListener("input", () => localStorage.setItem("expenseDraft", JSON.stringify({
    name: expenseName.value, qty: expenseQty.value, amount: expenseAmount.value
  })));
});
[debtCustomer, debtAmount, debtNote].forEach(input => {
  input.addEventListener("input", () => localStorage.setItem("debtDraft", JSON.stringify({
    customer: debtCustomer.value, amount: debtAmount.value, note: debtNote.value
  })));
});
[paymentCustomer, paymentAmount].forEach(input => {
  input.addEventListener("input", () => localStorage.setItem("paymentDraft", JSON.stringify({
    customer: paymentCustomer.value, amount: paymentAmount.value
  })));
});

function loadExpenseDraft(){
  const draft = JSON.parse(localStorage.getItem("expenseDraft"));
  if(!draft) return;
  expenseName.value = draft.name || "";
  expenseQty.value = draft.qty || "";
  expenseAmount.value = draft.amount || "";
  if(expenseName.value) expenseDisplay.innerText = expenseName.value;
}
function loadDebtDraft(){
  const draft = JSON.parse(localStorage.getItem("debtDraft"));
  if(!draft) return;
  debtCustomer.value = draft.customer || "";
  debtAmount.value = draft.amount || "";
  debtNote.value = draft.note || "";
  if(debtCustomer.value) customerDisplay.innerText = debtCustomer.value;
}
function loadPaymentDraft(){
  const draft = JSON.parse(localStorage.getItem("paymentDraft"));
  if(!draft) return;
  paymentCustomer.value = draft.customer || "";
  paymentAmount.value = draft.amount || "";
  if(paymentCustomer.value) paymentDisplay.innerText = paymentCustomer.value;
  updatePaymentInfo();
}

// ========== HISTORY ==========
openExpenseHistory.onclick = () => {
  detailTitle.innerText = "Chi Phí Hôm Nay";
  const date = getCurrentDate();
  let html = "";
  const list = appData.expenses.filter(x => x.date === date && !x.deleted);
  if(list.length === 0){
    html = '<div class="empty-text">Chưa có dữ liệu</div>';
  }else{
    list.forEach(item => {
      html += `
        <div class="history-item">
          <strong>${item.name}</strong><br>
          ${formatMoney(item.amount)}
          <div class="action-row">
            <button class="action-btn edit-btn" onclick="editExpense('${item.id}')">Sửa</button>
            <button class="action-btn delete-btn" onclick="deleteExpense('${item.id}')">Xóa</button>
          </div>
        </div>
      `;
    });
  }
  detailContent.innerHTML = html;
  openPopup("detailPopup");
};

openDebtHistory.onclick = () => {
  detailTitle.innerText = "Công Nợ Hôm Nay";
  const date = getCurrentDate();
  let html = "";
  const list = appData.debtTransactions.filter(x => x.date === date && !x.deleted);
  if(list.length === 0){
    html = '<div class="empty-text">Chưa có dữ liệu</div>';
  }else{
    list.forEach(item => {
      html += `
        <div class="history-item">
          <strong>${item.type === "debt_add" ? "🧾" : "💰"} ${item.customer}</strong><br>
          ${item.type === "debt_add" ? "+" : "-"} ${formatMoney(item.amount)}
          <div class="action-row">
            <button class="action-btn edit-btn" onclick="editDebt('${item.id}')">Sửa</button>
            <button class="action-btn delete-btn" onclick="deleteDebt('${item.id}')">Xóa</button>
          </div>
        </div>
      `;
    });
  }
  detailContent.innerHTML = html;
  openPopup("detailPopup");
};

// ========== DATE NAVIGATION ==========
prevDateBtn.onclick = () => {
  const d = new Date(reportDate.value);
  d.setDate(d.getDate()-1);
  reportDate.value = d.toISOString().split("T")[0];
  loadTodayData();
};
nextDateBtn.onclick = () => {
  const d = new Date(reportDate.value);
  d.setDate(d.getDate()+1);
  reportDate.value = d.toISOString().split("T")[0];
  loadTodayData();
};

// ========== LOAD DRAFTS & INIT ==========
loadPaymentDraft();
loadDebtDraft();
loadExpenseDraft();
loadTodayData();