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
// Thêm dòng này cùng với các const khác
const submitDayBtn = document.getElementById("submitDayBtn");
// Expense - thêm mới
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

// Debt - thêm mới
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

// ========== KHỞI TẠO ==========
reportDate.value = getToday();

// Chỉ giữ formatInputMoney cho các input trong popup (không dùng setupAutoThousand)
[expenseAmount, debtAmount, paymentAmount].forEach(formatInputMoney);


function renderRecentPayments() {
  if (!recentPaymentWrap) return;
  if (!appData || !appData.recent || !appData.recent.customers || appData.recent.customers.length === 0) {
    recentPaymentWrap.innerHTML = '<div class="empty-text">Chưa có khách nợ</div>';
    return;
  }
  let html = "";
  appData.recent.customers.forEach(name => {
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

function selectPaymentCustomer(name) {
  paymentCustomer.value = name;
  const paymentDropdown = document.getElementById("paymentDropdown");
  if (paymentDropdown) paymentDropdown.classList.add("hidden");
  updatePaymentInfo();
  paymentAmount.focus();
}

// ========== AUTO SAVE REPORT (HOÀN CHỈNH - CÓ CHẶN NGÀY TƯƠNG LAI) ==========
function autoSaveReport() {
  const date = getCurrentDate();
  const today = getToday();
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  // ========== CHẶN NGÀY TƯƠNG LAI ==========
  if (date > today) {
    const report = getReport(date);
    if (bankInput) bankInput.value = (report.bank || 0).toLocaleString("vi-VN");
    if (cashInput) cashInput.value = (report.cash || 0).toLocaleString("vi-VN");
    if (reserveInput) reserveInput.value = (report.reserve || 0).toLocaleString("vi-VN");
    if (revenueInput) revenueInput.value = (report.revenue || 0).toLocaleString("vi-VN");
    if (grabInput) grabInput.value = (report.grab || 0).toLocaleString("vi-VN");
    alert(`⚠️ KHÔNG THỂ NHẬP DỮ LIỆU CHO NGÀY TƯƠNG LAI!\n\nNgày ${formatDisplayDate(date)} chưa xảy ra.`);
    showToast(`⚠️ Không thể nhập ngày tương lai`);
    return;
  }
  
  // Admin: luôn cho phép lưu
  if (isAdmin) {
    doSaveReport();
    return;
  }
  
  // KIỂM TRA NGÀY HÔM QUA ĐÃ CHỐT CHƯA (chỉ áp dụng cho ngày hôm nay)
  if (date === today) {
    if (!isYesterdayCompleted()) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      // Reset về giá trị cũ
      const report = getReport(date);
      if (bankInput) bankInput.value = (report.bank || 0).toLocaleString("vi-VN");
      if (cashInput) cashInput.value = (report.cash || 0).toLocaleString("vi-VN");
      if (reserveInput) reserveInput.value = (report.reserve || 0).toLocaleString("vi-VN");
      if (revenueInput) revenueInput.value = (report.revenue || 0).toLocaleString("vi-VN");
      if (grabInput) grabInput.value = (report.grab || 0).toLocaleString("vi-VN");
      
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

// ========== LOAD TODAY DATA (CHUẨN, KHÔNG NHÂN CHIA) ==========
function loadTodayData() {
  if (!appData) {
    console.error("appData chưa sẵn sàng");
    return;
  }
  const date = getCurrentDate();
  const report = getReport(date);
  
  // Hiển thị số thật đã format (không nhân chia)
  if (bankInput) bankInput.value = formatNumberForInput(report.bank || 0);
  if (cashInput) cashInput.value = formatNumberForInput(report.cash || 0);
  if (reserveInput) reserveInput.value = formatNumberForInput(report.reserve || 0);
  if (revenueInput) revenueInput.value = formatNumberForInput(report.revenue || 0);
  if (grabInput) grabInput.value = formatNumberForInput(report.grab || 0);
  
  // Các ô readonly
  if (expenseTotal) expenseTotal.innerText = formatMoney(calculateExpenseTotal(date));
  if (debtTotal) debtTotal.innerText = formatMoney(calculateDebtTotal(date));
  
  updateSubmitButtonStatus();
  updateTotalDebtDisplay();
  renderCustomerDebtList();
  checkMissingReport();
  addMissingReportButton();
}

// ========== SAVE REPORT (HOÀN CHỈNH - CÓ CHẶN NGÀY TƯƠNG LAI) ==========
function doSaveReport() {
  const date = getCurrentDate();
  const today = getToday();
  
  // ========== CHẶN NGÀY TƯƠNG LAI ==========
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
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
}

[bankInput, cashInput, reserveInput].forEach(input => {
  if (input) input.addEventListener("input", autoSaveReport);
});

// ========== KIỂM TRA NGÀY HÔM QUA ĐÃ CHỐT CHƯA ==========
function isYesterdayCompleted() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const report = getReport(yesterdayStr);
  return report.status === "completed";
}

// ========== KIỂM TRA TRƯỚC KHI THÊM DỮ LIỆU ==========
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

// ========== KIỂM TRA VÀ CẢNH BÁO CHỐT NGÀY ==========
let missingReportAlertShown = false;

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
    
    // Thay vì highlight dayStatus, highlight nút submit
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

// ========== SAVE PAYMENT (HOÀN CHỈNH - CÓ CHẶN NGÀY TƯƠNG LAI) ==========
savePaymentBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  // ========== CHẶN NGÀY TƯƠNG LAI ==========
  if (date > today) {
    alert(`⚠️ KHÔNG THỂ THANH TOÁN CHO NGÀY TƯƠNG LAI!\n\nNgày ${formatDisplayDate(date)} chưa xảy ra.`);
    return;
  }
  
  // KIỂM TRA NGÀY HÔM QUA ĐÃ CHỐT CHƯA
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
  if (amount > currentDebt) { 
    alert(`⚠️ Thanh toán vượt nợ! Số tiền tối đa: ${formatMoney(currentDebt)}`);
    return; 
  }

  appData.debtTransactions.push({
    id: createId("pay"),
    type: "payment",
    customer: customer,
    amount: amount,
    method: paymentMethod.value,
    date: date,
    deleted: false
  });

  addCategory("customers", customer);
  addRecent("customers", customer);
  saveData();
  
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentPayments();
  renderCustomerDebtList();
  
  updatePaymentInfo();
  paymentAmount.value = "";
  
  const newDebt = calculateCustomerDebt(customer);
  if (newDebt === 0) {
    showToast(`🎉 Đã thanh toán HẾT NỢ cho ${customer}!`);
    renderRecentPayments();
  } else {
    showToast(`✓ Đã thanh toán ${formatMoney(amount)}. Còn nợ: ${formatMoney(newDebt)}`);
  }
  
  paymentAmount.focus();
};

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
expenseAmount.addEventListener("keydown", (e) => { if (e.key === "Enter") saveExpenseBtn.click(); });
debtAmount.addEventListener("keydown", (e) => { if (e.key === "Enter") saveDebtBtn.click(); });
paymentAmount.addEventListener("keydown", (e) => { if (e.key === "Enter") savePaymentBtn.click(); });

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

  const date = getCurrentDate();
  const list = appData.expenses.filter(
    x => x.date === date && !x.deleted
  );

  let historyHtml = `
    <div class="popup-history-title">
      📋 Chi phí hôm nay
    </div>
  `;

  if (!list.length) {
    historyHtml += `
      <div class="empty-text">
        📭 Chưa có dữ liệu chi phí
      </div>
    `;
  } else {
    list.forEach(item => {
      historyHtml += `
        <div class="history-item">
          <div class="history-name">
            📦 ${item.name}
          </div>

          <div class="history-amount debt">
            ${formatMoney(item.amount)}
          </div>

          <div class="history-actions">
            <button
              class="action-btn edit-btn"
              onclick="editExpense('${item.id}')">
              ✏️
            </button>

            <button
              class="action-btn delete-btn"
              onclick="deleteExpense('${item.id}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    });
  }

  let historyBox = document.getElementById("expenseHistoryBox");

  if (!historyBox) {
    historyBox = document.createElement("div");
    historyBox.id = "expenseHistoryBox";

    document
      .querySelector("#expensePopup .popup-content")
      .appendChild(historyBox);
  }

  historyBox.innerHTML = historyHtml;

  openPopup("expensePopup");
};

openDebtHistory.onclick = (e) => {
  e.stopPropagation();

  const date = getCurrentDate();

  const list = appData.debtTransactions.filter(
    x => x.date === date && !x.deleted
  );

  let historyHtml = `
    <div class="popup-history-title">
      🧾 Công nợ hôm nay
    </div>
  `;

  if (!list.length) {
    historyHtml += `
      <div class="empty-text">
        📭 Chưa có công nợ phát sinh
      </div>
    `;
  } else {
    list.forEach(item => {
      const isDebt = item.type === "debt_add";

      historyHtml += `
        <div class="history-item">
          <div class="history-name">
            👤 ${item.customer || "Khách hàng"}
          </div>

          <div class="history-amount ${isDebt ? "debt" : "payment"}">
            ${isDebt ? "+" : "-"}${formatMoney(item.amount)}
          </div>

          <div class="history-actions">
            <button
              class="action-btn edit-btn"
              onclick="editDebt('${item.id}')">
              ✏️
            </button>

            <button
              class="action-btn delete-btn"
              onclick="deleteDebt('${item.id}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    });
  }

  let historyBox = document.getElementById("debtHistoryBox");

  if (!historyBox) {
    historyBox = document.createElement("div");
    historyBox.id = "debtHistoryBox";

    document
      .querySelector("#debtPopup .popup-content")
      .appendChild(historyBox);
  }

  historyBox.innerHTML = historyHtml;

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

  const customersWithDebt = [];
  allCustomers.forEach(customer => {
    const debt = calculateCustomerDebt(customer);
    if (debt > 0) {
      customersWithDebt.push({ name: customer, debt: debt });
    }
  });

  customersWithDebt.sort((a, b) => b.debt - a.debt);

  if (customersWithDebt.length === 0) {
    container.innerHTML = '<div class="empty-text">✅ Không có khách nợ</div>';
    return;
  }

  let html = '';
  customersWithDebt.forEach(customer => {
    html += `
      <div class="debt-item" onclick="showCustomerDebtDetail('${customer.name.replace(/'/g, "\\'")}')">
        <div class="debt-info">
          <span class="debt-name">👤 ${customer.name}</span>
        </div>
        <div class="debt-badge">Nợ ${formatMoney(customer.debt)}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function showCustomerDebtDetail(customerName) {
  const transactions = appData.debtTransactions
    .filter(t => !t.deleted && t.customer === customerName)
    .sort((a, b) => b.date.localeCompare(a.date));

  let balance = 0;
  let transactionHtml = '';

  transactions.forEach(t => {
    if (t.type === 'debt_add') {
      balance += t.amount;
      transactionHtml += `
        <div class="debt-transaction-item add">
          <div class="debt-transaction-date">📅 ${t.date}</div>
          <div class="debt-transaction-amount add">+ ${formatMoney(t.amount)}</div>
          <div class="debt-transaction-note">${t.note ? t.note.substring(0, 20) : 'Công nợ'}</div>
        </div>
      `;
    } else {
      balance -= t.amount;
      transactionHtml += `
        <div class="debt-transaction-item payment">
          <div class="debt-transaction-date">📅 ${t.date}</div>
          <div class="debt-transaction-amount payment">- ${formatMoney(t.amount)}</div>
          <div class="debt-transaction-note">${t.method === 'TM' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}</div>
        </div>
      `;
    }
  });

  const totalDebt = calculateCustomerDebt(customerName);

  const popupHtml = `
    <div class="debt-detail-summary">
      <div class="debt-detail-total">${formatMoney(totalDebt)}</div>
      <div class="debt-detail-label">Tổng nợ còn lại</div>
    </div>
    <div class="debt-transaction-list">
      ${transactionHtml || '<div class="empty-text">Chưa có giao dịch</div>'}
    </div>
    <div class="debt-detail-actions">
      <button class="primary-btn btn-payment" onclick="quickPaymentFromDebt('${customerName.replace(/'/g, "\\'")}')">💰 Thanh toán ngay</button>
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

function editExpense(id) {
  const item = appData.expenses.find(x => x.id === id);
  if (!item) { showToast("❌ Không tìm thấy chi phí"); return; }

  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");

  // Admin: luôn được sửa
  if (!isAdmin) {
    // Nhân viên: không sửa ngày đã gửi
    if (isCompleted) {
      alert("⚠️ Ngày này đã gửi, chỉ Quản lý mới được sửa!");
      return;
    }
    // Nhân viên: chỉ sửa ngày hôm nay
    if (!isToday) {
      alert("⚠️ Nhân viên chỉ được sửa dữ liệu của ngày hôm nay!");
      return;
    }
  }

  editingExpenseId = id;
  expensePopupTitle.innerText = "Sửa Chi Phí";
  
  if (expenseNameInput) expenseNameInput.value = item.name;
  if (expenseQty) expenseQty.value = item.qty ? item.qty.toLocaleString("vi-VN") : "";
  if (expenseAmount) expenseAmount.value = item.amount.toLocaleString("vi-VN");
  
  if (newExpenseInput) newExpenseInput.classList.add("hidden");
  openPopup("expensePopup");
  closePopup("detailPopup");
  setTimeout(() => expenseAmount.focus(), 100);
}

function deleteExpense(id) {
  const item = appData.expenses.find(x => x.id === id);
  if (!item) { showToast("❌ Không tìm thấy chi phí"); return; }

  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");

  if (!isToday && isCompleted && !(window.isAdminSync && window.isAdminSync())) {
    alert("⚠️ Ngày này đã chốt, chỉ Quản lý mới được xóa!");
    return;
  }

  if (confirm(`Bạn có chắc muốn xóa chi phí "${item.name}" - ${formatMoney(item.amount)}?`)) {
    // SOFT DELETE
    item.deleted = true;
    item._deletedAt = Date.now();
    item._deletedBy = firebase.auth().currentUser?.email || 'unknown';
    
    // 🔥 QUAN TRỌNG: Cập nhật cả trong mảng expenses
    const index = appData.expenses.findIndex(x => x.id === id);
    appData.expenses[index] = item;
    
    // Lưu và đồng bộ
    saveData();
    
    // Gọi force sync ngay lập tức
    if (typeof forceSync === 'function') {
      setTimeout(() => forceSync(), 100);
    }
    
    // Refresh UI
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    renderRecentExpenses();
    closePopup("detailPopup");
    showToast("✓ Đã xóa chi phí (đã đồng bộ)");
  }
}

function editDebt(id) {
  const item = appData.debtTransactions.find(x => x.id === id);
  if (!item) { showToast("❌ Không tìm thấy công nợ"); return; }

  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");

  if (!isToday && isCompleted && !(window.isAdminSync && window.isAdminSync())) {
    alert("⚠️ Ngày này đã chốt, chỉ Quản lý mới được sửa!");
    return;
  }

  editingDebtId = id;
  debtPopupTitle.innerText = "Sửa Công Nợ";
  
  // Điền dữ liệu cũ
  if (debtCustomerInput) debtCustomerInput.value = item.customer;
  if (debtAmount) debtAmount.value = item.amount.toLocaleString("vi-VN");
  if (debtNote) debtNote.value = item.note || "";
  
  selectedCustomerName = item.customer;
  if (newCustomerInput) newCustomerInput.classList.add("hidden");
  openPopup("debtPopup");
  closePopup("detailPopup");
  setTimeout(() => debtAmount.focus(), 100);
}

function deleteDebt(id) {
  const item = appData.debtTransactions.find(x => x.id === id);
  if (!item) { showToast("❌ Không tìm thấy công nợ"); return; }

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
    // SOFT DELETE
    item.deleted = true;
    item._deletedAt = Date.now();
    item._deletedBy = firebase.auth().currentUser?.email || 'unknown';
    
    // 🔥 Cập nhật trong mảng
    const index = appData.debtTransactions.findIndex(x => x.id === id);
    appData.debtTransactions[index] = item;
    
    // Lưu và đồng bộ
    saveData();
    
    if (typeof forceSync === 'function') {
      setTimeout(() => forceSync(), 100);
    }
    
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    closePopup("detailPopup");
    showToast(`✓ Đã xóa ${typeText} (đã đồng bộ)`);
  }
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

// ========== KIỂM TRA ĐỊNH KỲ ==========
setInterval(() => {
  checkMissingReport();
  addMissingReportButton();
}, 5000);

// ========== LOAD DRAFTS & INIT ==========
loadPaymentDraft();
loadDebtDraft();
loadExpenseDraft();
loadTodayData();

// ========== BIẾN CHO EXPENSE ==========
const expenseNameInput = document.getElementById("expenseNameInput");

// ========== RENDER RECENT EXPENSES (GỢI Ý) ==========
function renderRecentExpenses() {
  if (!recentExpenseWrap) return;
  if (!appData || !appData.recent || !appData.recent.expenses || appData.recent.expenses.length === 0) {
    recentExpenseWrap.innerHTML = '<div class="empty-text">Chưa có chi phí nào</div>';
    return;
  }
  let html = "";
  appData.recent.expenses.forEach(name => {
    if (name) {
      html += `<button class="recent-btn" onclick="setExpenseName('${name.replace(/'/g, "\\'")}')">📦 ${name}</button>`;
    }
  });
  recentExpenseWrap.innerHTML = html;
}

// Hàm chọn tên từ recent
window.setExpenseName = function(name) {
  if (expenseNameInput) expenseNameInput.value = name;
  if (expenseAmount) expenseAmount.focus();
  showToast(`✓ Đã chọn: ${name}`);
};

// ========== SAVE EXPENSE MỚI (HOÀN CHỈNH - CÓ CHẶN NGÀY TƯƠNG LAI) ==========
saveExpenseBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
  const report = getReport(date);
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  // ========== CHẶN NGÀY TƯƠNG LAI ==========
  if (date > today) {
    alert(`⚠️ KHÔNG THỂ NHẬP DỮ LIỆU CHO NGÀY TƯƠNG LAI!\n\nNgày ${formatDisplayDate(date)} chưa xảy ra.`);
    return;
  }
  
  // Kiểm tra ngày hôm qua đã gửi chưa (cho nhân viên)
  if (!isAdmin && date === today) {
    if (!canAddData()) return;
  }
  
  // KIỂM TRA QUYỀN NHÂN VIÊN
  if (!isAdmin) {
    // Nhân viên: KHÔNG được thêm vào ngày cũ đã gửi
    if (date !== today && report.status === "completed") {
      alert(`⚠️ Ngày ${formatDisplayDate(date)} đã được gửi!\n\nChỉ Quản lý mới được thêm dữ liệu vào ngày đã gửi.`);
      return;
    }
    // Nhân viên: KHÔNG được thêm vào ngày cũ (dù chưa gửi)
    if (date !== today) {
      alert(`⚠️ Nhân viên chỉ được thêm dữ liệu cho ngày hôm nay!\n\nVui lòng chọn ngày ${formatDisplayDate(today)} để thêm chi phí.`);
      return;
    }
  }
  
  // Admin: kiểm tra nếu ngày khác hôm nay và chưa chốt
  if (isAdmin && date !== today && report.status !== "completed") {
    alert(`⚠️ Ngày ${date} chưa được gửi! Vui lòng gửi ngày này trước khi thêm dữ liệu mới.`);
    return;
  }

  let name = expenseNameInput ? expenseNameInput.value.trim() : "";
  const qty = parseMoney(expenseQty.value);
  const amount = parseMoney(expenseAmount.value);

  if (qty < 0) { alert("Số lượng không thể âm"); return; }
  if (amount <= 0) { alert("Nhập số tiền"); return; }
  if (!name) { alert("Vui lòng nhập tên chi phí"); return; }

  // Thêm vào recent nếu là tên mới
  if (!appData.recent.expenses.includes(name)) {
    appData.recent.expenses.unshift(name);
    appData.recent.expenses = appData.recent.expenses.slice(0, 10);
    renderRecentExpenses();
  }
  if (!appData.categories.expenses.includes(name)) {
    appData.categories.expenses.push(name);
  }

  const currentUser = firebase.auth().currentUser;
  
  const data = {
    id: editingExpenseId || createId("exp"),
    date: date,
    name: name,
    qty: qty,
    amount: amount,
    deleted: false,
    _modifiedAt: Date.now(),
    _modifiedBy: currentUser?.email || 'unknown',
    _modifiedByDevice: deviceId
  };

  if (editingExpenseId) {
    const oldItem = appData.expenses.find(x => x.id === editingExpenseId);
    if (!oldItem) {
      showToast("❌ Không tìm thấy item cần sửa");
      return;
    }
    
    if (!isEditable(oldItem.date)) {
      alert("⚠️ Ngày này đã gửi, không thể sửa!");
      return;
    }
    
    const index = appData.expenses.findIndex(x => x.id === editingExpenseId);
    appData.expenses[index] = data;
    editingExpenseId = null;
    
    showToast(`✓ Đã sửa chi phí: ${name} - ${formatMoney(amount)}`);
  } else {
    appData.expenses.push(data);
    showToast(`✓ Đã thêm chi phí: ${name} - ${formatMoney(amount)}`);
  }

  saveData();
  
  if (typeof syncToFirebase === 'function') {
    setTimeout(() => syncToFirebase(), 100);
  }
  
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentExpenses();

  if (expenseNameInput) expenseNameInput.value = "";
  expenseAmount.value = "";
  expenseQty.value = "";
  
  closePopup("expensePopup");
}; 

// ========== BIẾN CHO DEBT ==========
const debtCustomerInput = document.getElementById("debtCustomerInput");

// ========== RENDER RECENT CUSTOMERS ==========
function renderRecentCustomers() {
  if (!recentCustomerWrap) return;
  if (!appData || !appData.recent || !appData.recent.customers || appData.recent.customers.length === 0) {
    recentCustomerWrap.innerHTML = '<div class="empty-text">Chưa có khách hàng</div>';
    return;
  }
  let html = "";
  appData.recent.customers.forEach(name => {
    if (name) {
      const debt = calculateCustomerDebt(name);
      html += `<button class="recent-btn" onclick="setCustomerName('${name.replace(/'/g, "\\'")}')" style="display: flex; justify-content: space-between; width: 100%;">
        <span>👤 ${name}</span>
        <span style="color: var(--danger);">${debt > 0 ? formatMoney(debt) : '✅'}</span>
      </button>`;
    }
  });
  recentCustomerWrap.innerHTML = html;
}
// ========== EVENT LISTENER CHO REVENUE VÀ GRAB ==========
if (revenueInput) {
  revenueInput.addEventListener("input", autoSaveReport);
}
if (grabInput) {
  grabInput.addEventListener("input", autoSaveReport);
}
// Hàm chọn khách hàng từ recent
window.setCustomerName = function(name) {
  if (debtCustomerInput) debtCustomerInput.value = name;
  if (debtAmount) debtAmount.focus();
  showToast(`✓ Đã chọn: ${name}`);
};

// ========== SAVE DEBT MỚI (HOÀN CHỈNH - CÓ CHẶN NGÀY TƯƠNG LAI) ==========
saveDebtBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
  const report = getReport(date);
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  
  // ========== CHẶN NGÀY TƯƠNG LAI ==========
  if (date > today) {
    alert(`⚠️ KHÔNG THỂ NHẬP DỮ LIỆU CHO NGÀY TƯƠNG LAI!\n\nNgày ${formatDisplayDate(date)} chưa xảy ra.`);
    return;
  }
  
  // Kiểm tra ngày hôm qua đã gửi chưa (cho nhân viên)
  if (!isAdmin && date === today) {
    if (!canAddData()) return;
  }
  
  // KIỂM TRA QUYỀN NHÂN VIÊN
  if (!isAdmin) {
    // Nhân viên: KHÔNG được thêm vào ngày cũ đã gửi
    if (date !== today && report.status === "completed") {
      alert(`⚠️ Ngày ${formatDisplayDate(date)} đã được gửi!\n\nChỉ Quản lý mới được thêm dữ liệu vào ngày đã gửi.`);
      return;
    }
    // Nhân viên: KHÔNG được thêm vào ngày cũ (dù chưa gửi)
    if (date !== today) {
      alert(`⚠️ Nhân viên chỉ được thêm dữ liệu cho ngày hôm nay!\n\nVui lòng chọn ngày ${formatDisplayDate(today)} để thêm công nợ.`);
      return;
    }
  }
  
  // Admin: kiểm tra nếu ngày khác hôm nay và chưa chốt
  if (isAdmin && date !== today && report.status !== "completed") {
    alert(`⚠️ Ngày ${date} chưa được gửi! Vui lòng gửi ngày này trước khi thêm dữ liệu mới.`);
    return;
  }

  let customer = debtCustomerInput ? debtCustomerInput.value.trim() : "";
  const amount = parseMoney(debtAmount.value);
  const note = debtNote.value;

  if (amount <= 0) { alert("Nhập số tiền"); return; }
  if (!customer) { alert("Vui lòng nhập tên khách hàng"); return; }

  // Thêm vào recent
  if (!appData.recent.customers.includes(customer)) {
    appData.recent.customers.unshift(customer);
    appData.recent.customers = appData.recent.customers.slice(0, 10);
    renderRecentCustomers();
    renderRecentPayments();
  }
  if (!appData.categories.customers.includes(customer)) {
    appData.categories.customers.push(customer);
  }

  const currentUser = firebase.auth().currentUser;
  
  const data = {
    id: editingDebtId || createId("debt"),
    type: "debt_add",
    customer: customer,
    amount: amount,
    note: note,
    date: date,
    deleted: false,
    _modifiedAt: Date.now(),
    _modifiedBy: currentUser?.email || 'unknown',
    _modifiedByDevice: deviceId
  };

  if (editingDebtId) {
    const oldItem = appData.debtTransactions.find(x => x.id === editingDebtId);
    if (!oldItem) {
      showToast("❌ Không tìm thấy item cần sửa");
      return;
    }
    
    if (!isEditable(oldItem.date)) {
      alert("⚠️ Ngày này đã gửi, không thể sửa!");
      return;
    }
    
    const index = appData.debtTransactions.findIndex(x => x.id === editingDebtId);
    appData.debtTransactions[index] = data;
    editingDebtId = null;
    
    showToast(`✓ Đã sửa công nợ: ${customer} - ${formatMoney(amount)}`);
  } else {
    appData.debtTransactions.push(data);
    showToast(`✓ Đã thêm công nợ: ${customer} - ${formatMoney(amount)}`);
  }

  saveData();
  
  if (typeof syncToFirebase === 'function') {
    setTimeout(() => syncToFirebase(), 100);
  }
  
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentCustomers();
  renderRecentPayments();
  renderCustomerDebtList();

  if (debtCustomerInput) debtCustomerInput.value = "";
  debtAmount.value = "";
  debtNote.value = "";
  
  closePopup("debtPopup");
};

// ========== SỬA LẠI EXPENSE FAB ==========
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

// ========== SỬA LẠI DEBT FAB ==========
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
// ========== NÚT GỬI / ĐÃ GỬI ==========
// ========== NÚT GỬI / ĐÃ GỬI ==========
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
    // Admin luôn có thể gửi, nhân viên chỉ gửi được ngày hôm nay
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

// Gán sự kiện click cho nút
const submitBtnElement = document.getElementById("submitDayBtn");
if (submitBtnElement) {
  submitBtnElement.onclick = async () => {
    const date = getCurrentDate();
    const today = getToday();
    const report = getReport(date);
    const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
    
    // Kiểm tra nếu đã gửi rồi
    if (report.status === "completed") {
      showToast("⚠️ Báo cáo ngày này đã được gửi rồi!");
      return;
    }
    
    // Nhân viên: chỉ được gửi ngày hôm nay
    if (!isAdmin && date !== today) {
      showToast("⚠️ Nhân viên chỉ được gửi báo cáo ngày hôm nay!");
      return;
    }
    
    // Nhân viên: kiểm tra ngày hôm qua đã gửi chưa
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
    
    // Chốt ngày (gửi báo cáo)
    report.status = "completed";
    saveData();
    loadTodayData();
    updateSubmitButtonStatus();
    showToast(`✓ Đã gửi báo cáo ngày ${formatDisplayDate(date)}`);
    
    // Gửi báo cáo Telegram
    const expenseTotalVal = calculateExpenseTotal(date);
    const debtTotalVal = calculateDebtTotal(date);
    const expenses = appData.expenses.filter(x => x.date === date && !x.deleted);
    const debts = appData.debtTransactions.filter(x => x.date === date && x.type === "debt_add" && !x.deleted);
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


// ========== XỬ LÝ NÚT SỐ TIỀN NHANH ==========
function setupQuickMoneyButtons() {
  // Nút số tiền nhanh cho Expense
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

  // Nút số tiền nhanh cho Debt
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

  // Nút số tiền nhanh cho Admin Expense
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

// Gọi hàm sau khi DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupQuickMoneyButtons);
} else {
  setupQuickMoneyButtons();
}