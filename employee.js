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
const expenseQty = document.getElementById("expenseQty");
const expenseAmount = document.getElementById("expenseAmount");
const recentExpenseWrap = document.getElementById("recentExpenseWrap");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");

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

[bankInput, cashInput, reserveInput, expenseAmount, debtAmount, paymentAmount].forEach(formatInputMoney);

// ========== RENDER RECENT ==========
function renderRecentExpenses() {
  if (!recentExpenseWrap) return;
  if (!appData || !appData.recent || !appData.recent.expenses || appData.recent.expenses.length === 0) {
    recentExpenseWrap.innerHTML = '<div class="empty-text">Chưa có chi phí nào</div>';
    return;
  }
  let html = "";
  appData.recent.expenses.forEach(name => {
    if (name) {
      html += `<button class="recent-btn" onclick="selectExpenseRecent('${name.replace(/'/g, "\\'")}')">📦 ${name}</button>`;
    }
  });
  recentExpenseWrap.innerHTML = html;
}

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
      html += `<button class="recent-btn" onclick="selectRecentCustomer('${name.replace(/'/g, "\\'")}')" style="display: flex; justify-content: space-between; width: 100%;">
        <span>👤 ${name}</span>
        <span style="color: var(--danger);">${debt > 0 ? formatMoney(debt) : '✅'}</span>
      </button>`;
    }
  });
  recentCustomerWrap.innerHTML = html;
}

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
  // Đóng dropdown nếu đang mở
  const paymentDropdown = document.getElementById("paymentDropdown");
  if (paymentDropdown) paymentDropdown.classList.add("hidden");
  updatePaymentInfo();
  paymentAmount.focus();
}

// ========== LOAD TODAY DATA ==========
function loadTodayData() {
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

// ========== AUTO SAVE REPORT ==========
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
    bank: parseMoney(bankInput.value),
    cash: parseMoney(cashInput.value),
    reserve: parseMoney(reserveInput.value),
    status: getReport(date).status
  };
  saveData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
}

[bankInput, cashInput, reserveInput].forEach(input => {
  if (input) input.addEventListener("input", autoSaveReport);
});

function checkMissingReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split("T")[0];
  const report = appData.reports[date];
  if (!report || report.status !== "completed") {
    showToast("⚠️ Hôm qua chưa chốt báo cáo");
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

// ========== EXPENSE FAB ==========
expenseFab.onclick = () => {
  editingExpenseId = null;
  expensePopupTitle.innerText = "Thêm Chi Phí";
  renderRecentExpenses();
  selectedExpenseName = "";
  if (newExpenseName) newExpenseName.value = "";
  if (newExpenseInput) newExpenseInput.classList.add("hidden");
  openPopup("expensePopup");
  setTimeout(() => {
    if (expenseAmount) expenseAmount.focus();
  }, 100);
};

// ========== EXPENSE - THÊM MỚI ==========
// Expense - Thêm mới bằng prompt
if (addNewExpenseBtn) {
  addNewExpenseBtn.onclick = () => {
    const newName = prompt('📝 Nhập tên nguyên liệu mới:', '');
    if (newName && newName.trim()) {
      const name = newName.trim();
      selectedExpenseName = name;
      // Thêm vào danh sách recent
      if (!appData.recent.expenses.includes(name)) {
        appData.recent.expenses.unshift(name);
        appData.recent.expenses = appData.recent.expenses.slice(0, 10);
      }
      if (!appData.categories.expenses.includes(name)) {
        appData.categories.expenses.push(name);
      }
      saveData();
      renderRecentExpenses();
      expenseAmount.focus();
      showToast(`✓ Đã thêm và chọn: ${name}`);
    }
  };
}

if (newExpenseName) {
  newExpenseName.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const name = newExpenseName.value.trim();
      if (name) {
        selectedExpenseName = name;
        newExpenseInput.classList.add("hidden");
        newExpenseName.value = "";
        expenseAmount.focus();
        showToast(`✓ Đã thêm mới: ${name}`);
      }
    }
  });
}

// ========== SAVE EXPENSE ==========
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

  const name = selectedExpenseName;
  const qty = parseMoney(expenseQty.value);
  const amount = parseMoney(expenseAmount.value);

  if (qty < 0) { alert("Số lượng không thể âm"); return; }
  if (amount <= 0) { alert("Nhập số tiền"); return; }
  if (!name) { alert("Vui lòng chọn hoặc thêm tên nguyên liệu"); return; }

  const data = {
    id: editingExpenseId || createId("exp"),
    date: date,
    name: name,
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

  addCategory("expenses", name);
  addRecent("expenses", name);
  saveData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentExpenses();
  showToast("✓ Đã lưu chi phí");

  // Reset
  expenseAmount.value = "";
  expenseQty.value = "";
  selectedExpenseName = "";
  if (newExpenseName) newExpenseName.value = "";
  if (newExpenseInput) newExpenseInput.classList.add("hidden");
  expenseAmount.focus();
};

// ========== DEBT FAB ==========
debtFab.onclick = () => {
  editingDebtId = null;
  debtPopupTitle.innerText = "Thêm Công Nợ";
  renderRecentCustomers();
  selectedCustomerName = "";
  if (newCustomerName) newCustomerName.value = "";
  if (newCustomerInput) newCustomerInput.classList.add("hidden");
  openPopup("debtPopup");
  setTimeout(() => {
    if (debtAmount) debtAmount.focus();
  }, 100);
};

// Debt - Thêm mới bằng prompt
if (addNewCustomerBtn) {
  addNewCustomerBtn.onclick = () => {
    const newName = prompt('📝 Nhập tên khách hàng mới:', '');
    if (newName && newName.trim()) {
      const name = newName.trim();
      selectedCustomerName = name;
      // Thêm vào danh sách recent
      if (!appData.recent.customers.includes(name)) {
        appData.recent.customers.unshift(name);
        appData.recent.customers = appData.recent.customers.slice(0, 10);
      }
      if (!appData.categories.customers.includes(name)) {
        appData.categories.customers.push(name);
      }
      saveData();
      renderRecentCustomers();
      renderRecentPayments();
      debtAmount.focus();
      showToast(`✓ Đã thêm và chọn: ${name}`);
    }
  };
}

if (newCustomerName) {
  newCustomerName.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const name = newCustomerName.value.trim();
      if (name) {
        selectedCustomerName = name;
        newCustomerInput.classList.add("hidden");
        newCustomerName.value = "";
        debtAmount.focus();
        showToast(`✓ Đã thêm mới: ${name}`);
      }
    }
  });
}

// ========== SAVE DEBT ==========
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

  const customer = selectedCustomerName;
  const amount = parseMoney(debtAmount.value);
  const note = debtNote.value;

  if (amount <= 0) { alert("Nhập số tiền"); return; }
  if (!customer) { alert("Vui lòng chọn hoặc thêm tên khách hàng"); return; }

  const data = {
    id: editingDebtId || createId("debt"),
    type: "debt_add",
    customer: customer,
    amount: amount,
    note: note,
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

  addCategory("customers", customer);
  addRecent("customers", customer);
  saveData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentCustomers();
  showToast("✓ Đã lưu công nợ");

  // Reset
  debtAmount.value = "";
  debtNote.value = "";
  selectedCustomerName = "";
  if (newCustomerName) newCustomerName.value = "";
  if (newCustomerInput) newCustomerInput.classList.add("hidden");
  debtAmount.focus();
};

// ========== PAYMENT FAB ==========
paymentFab.onclick = () => {
  renderRecentPayments();
  if (paymentCustomer) paymentCustomer.value = "";
  updatePaymentInfo();
  openPopup("paymentPopup");
  setTimeout(() => {
    if (paymentCustomer) paymentCustomer.focus();
  }, 100);
};

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
  
  // Đổi màu nếu còn lại = 0 (hết nợ)
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

savePaymentBtn.onclick = () => {
  const date = getCurrentDate();
  const today = getToday();
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

  // Lưu giao dịch
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
  
  // Cập nhật UI
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  loadTodayData();
  renderRecentPayments();
  renderCustomerDebtList();
  
  // Cập nhật lại thông tin nợ (vẫn giữ tên khách)
  updatePaymentInfo();
  
  // Reset số tiền nhưng GIỮ TÊN KHÁCH
  paymentAmount.value = "";
  
  // Hiển thị thông báo
  const newDebt = calculateCustomerDebt(customer);
  if (newDebt === 0) {
    showToast(`🎉 Đã thanh toán HẾT NỢ cho ${customer}!`);
    // Có thể xóa tên khách khỏi danh sách recent payment nếu muốn
    renderRecentPayments();
  } else {
    showToast(`✓ Đã thanh toán ${formatMoney(amount)}. Còn nợ: ${formatMoney(newDebt)}`);
  }
  
  // Focus vào ô số tiền để nhập tiếp
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

// ========== XEM CHI TIẾT CHI PHÍ HÔM NAY (ở tab Nhân Viên) ==========
// ========== XEM CHI TIẾT CHI PHÍ HÔM NAY ==========
openExpenseHistory.onclick = (e) => {
  e.stopPropagation();

  const date = getCurrentDate();

  let html = "";
  const list = appData.expenses.filter(
    x => x.date === date && !x.deleted
  );

  detailTitle.innerText =
    `📋 Chi Phí Ngày ${formatDisplayDate(date)}`;

  if (!list.length) {

    html = `
      <div class="empty-text">
        📭 Chưa có dữ liệu chi phí
      </div>
    `;

  } else {

    list.forEach(item => {

      html += `
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
              onclick="editExpense('${item.id}')"
              title="Sửa">
              ✏️
            </button>

            <button
              class="action-btn delete-btn"
              onclick="deleteExpense('${item.id}')"
              title="Xóa">
              🗑️
            </button>

          </div>

        </div>
      `;
    });
  }

  detailContent.innerHTML = html;
  openPopup("detailPopup");
};


// ========== XEM CHI TIẾT CÔNG NỢ PHÁT SINH HÔM NAY ==========
openDebtHistory.onclick = (e) => {
  e.stopPropagation();

  const date = getCurrentDate();

  let html = "";
  const list = appData.debtTransactions.filter(
    x => x.date === date && !x.deleted
  );

  detailTitle.innerText =
    `🧾 Công Nợ Phát Sinh Ngày ${formatDisplayDate(date)}`;

  if (!list.length) {

    html = `
      <div class="empty-text">
        📭 Chưa có công nợ phát sinh
      </div>
    `;

  } else {

    list.forEach(item => {

      const isDebt = item.type === "debt_add";

      html += `
        <div class="history-item">

          <div class="history-name">
            ${item.customer || "Khách hàng"}
          </div>

          <div class="history-amount ${isDebt ? "debt" : "payment"}">
            ${isDebt ? "+" : "-"}${formatMoney(item.amount)}
          </div>

          <div class="history-actions">

            <button
              class="action-btn edit-btn"
              onclick="editDebt('${item.id}')"
              title="Sửa">
              ✏️
            </button>

            <button
              class="action-btn delete-btn"
              onclick="deleteDebt('${item.id}')"
              title="Xóa">
              🗑️
            </button>

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



// ========== EDIT/DELETE FUNCTIONS ==========
function editExpense(id) {
  const item = appData.expenses.find(x => x.id === id);
  if (!item) { showToast("❌ Không tìm thấy chi phí"); return; }

  const today = getToday();
  const isToday = (item.date === today);
  const report = getReport(item.date);
  const isCompleted = (report.status === "completed");

  if (!isToday && isCompleted && !(window.isAdminSync && window.isAdminSync())) {
    alert("⚠️ Ngày này đã chốt, chỉ Quản lý mới được sửa!");
    return;
  }

  editingExpenseId = id;
  expensePopupTitle.innerText = "Sửa Chi Phí";
  selectedExpenseName = item.name;
  expenseQty.value = item.qty ? item.qty.toLocaleString("vi-VN") : "";
  expenseAmount.value = item.amount.toLocaleString("vi-VN");
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
  selectedCustomerName = item.customer;
  debtAmount.value = item.amount.toLocaleString("vi-VN");
  debtNote.value = item.note || "";
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
    item.deleted = true;
    saveData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    loadTodayData();
    closePopup("detailPopup");
    showToast("✓ Đã xóa công nợ");
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
// Thêm hàm tính tổng công nợ tất cả khách hàng
function calculateTotalDebtAll() {
  const allCustomers = new Set();
  
  // Lấy tất cả khách hàng
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

// Cập nhật hiển thị tổng công nợ
function updateTotalDebtDisplay() {
  const totalDebtElement = document.getElementById("totalDebtAll");
  if (totalDebtElement) {
    totalDebtElement.innerText = formatMoney(calculateTotalDebtAll());
  }
}

// Gọi trong loadTodayData
const originalLoadTodayData = loadTodayData;
loadTodayData = function() {
  originalLoadTodayData();
  updateTotalDebtDisplay();
  renderCustomerDebtList();
};
// ========== LOAD DRAFTS & INIT ==========
loadPaymentDraft();
loadDebtDraft();
loadExpenseDraft();
loadTodayData();