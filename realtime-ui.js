// ========== REALTIME UI - FIX UI KHÔNG RENDER ==========

let uiListenersInitialized = false;
let activeListeners = [];
let refreshTimer = null;
let pendingRefreshData = {
  hasReport: false,
  hasExpenses: false,
  hasDebts: false,
  hasMetadata: false
};

// Hàm render UI trực tiếp - CÓ LOG CHI TIẾT
function renderUINow() {
  console.log("🔄 === BẮT ĐẦU RENDER UI ===");
  
  const today = getToday();
  const currentDate = reportDate ? reportDate.value : today;
  
  // KIỂM TRA DỮ LIỆU TRONG appData
  console.log("📊 appData hiện tại:", {
    version: appData?._version,
    reportsCount: Object.keys(appData?.reports || {}).length,
    expensesCount: appData?.expenses?.length || 0,
    debtsCount: appData?.debtTransactions?.length || 0
  });
  
  // 1. Cập nhật loadTodayData
  if (typeof loadTodayData === 'function') {
    console.log("📌 Gọi loadTodayData()");
    loadTodayData();
  } else {
    console.error("❌ loadTodayData không tồn tại!");
  }
  
  // 2. Cập nhật danh sách công nợ
  if (typeof renderCustomerDebtList === 'function') {
    console.log("📌 Gọi renderCustomerDebtList()");
    renderCustomerDebtList();
  }
  
  // 3. Cập nhật tổng công nợ
  if (typeof updateTotalDebtDisplay === 'function') {
    console.log("📌 Gọi updateTotalDebtDisplay()");
    updateTotalDebtDisplay();
  }
  
  // 4. Cập nhật manager dashboard
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'managerTab' && typeof renderManagerDashboard === 'function') {
    console.log("📌 Gọi renderManagerDashboard()");
    renderManagerDashboard();
  }
  
  // 5. Cập nhật recent lists
  if (typeof renderRecentExpenses === 'function') {
    console.log("📌 Gọi renderRecentExpenses()");
    renderRecentExpenses();
  }
  if (typeof renderRecentCustomers === 'function') {
    console.log("📌 Gọi renderRecentCustomers()");
    renderRecentCustomers();
  }
  
  // 6. TRỰC TIẾP CẬP NHẬT DOM
  console.log("📌 Cập nhật DOM trực tiếp...");
  
  const report = appData?.reports?.[currentDate];
  const expenseTotal = calculateExpenseTotal ? calculateExpenseTotal(currentDate) : 0;
  const debtTotal = calculateDebtTotal ? calculateDebtTotal(currentDate) : 0;
  
  // Cập nhật expense total
  const expenseTotalEl = document.getElementById("expenseTotal");
  if (expenseTotalEl) {
    const newValue = formatMoney(expenseTotal);
    console.log(`  - expenseTotal: ${expenseTotalEl.innerText} → ${newValue}`);
    expenseTotalEl.innerText = newValue;
  }
  
  // Cập nhật debt total
  const debtTotalEl = document.getElementById("debtTotal");
  if (debtTotalEl) {
    const newValue = formatMoney(debtTotal);
    console.log(`  - debtTotal: ${debtTotalEl.innerText} → ${newValue}`);
    debtTotalEl.innerText = newValue;
  }
  
  // Cập nhật day status
  const dayStatus = document.getElementById("dayStatus");
  if (dayStatus && report) {
    const newStatus = report.status === "completed" ? "🟢 Đã chốt" : "🟡 Đang nhập";
    console.log(`  - dayStatus: ${dayStatus.innerHTML} → ${newStatus}`);
    dayStatus.innerHTML = newStatus;
  }
  
  // Cập nhật các input
  const bankInput = document.getElementById("bankInput");
  const cashInput = document.getElementById("cashInput");
  const reserveInput = document.getElementById("reserveInput");
  
  if (bankInput && report) {
    const newValue = (report.bank || 0).toLocaleString("vi-VN");
    console.log(`  - bankInput: ${bankInput.value} → ${newValue}`);
    bankInput.value = newValue;
  }
  if (cashInput && report) {
    const newValue = (report.cash || 0).toLocaleString("vi-VN");
    console.log(`  - cashInput: ${cashInput.value} → ${newValue}`);
    cashInput.value = newValue;
  }
  if (reserveInput && report) {
    const newValue = (report.reserve || 0).toLocaleString("vi-VN");
    console.log(`  - reserveInput: ${reserveInput.value} → ${newValue}`);
    reserveInput.value = newValue;
  }
  
  // Cập nhật tổng nợ tất cả khách
  const totalDebtAll = document.getElementById("totalDebtAll");
  if (totalDebtAll && typeof calculateTotalDebtAll === 'function') {
    const newValue = formatMoney(calculateTotalDebtAll());
    console.log(`  - totalDebtAll: ${totalDebtAll.innerText} → ${newValue}`);
    totalDebtAll.innerText = newValue;
  }
  
  console.log("✅ === RENDER UI HOÀN TẤT ===");
}

// Hàm refresh gộp
function scheduleUIRefresh(type) {
  if (type === 'report') pendingRefreshData.hasReport = true;
  if (type === 'expenses') pendingRefreshData.hasExpenses = true;
  if (type === 'debts') pendingRefreshData.hasDebts = true;
  if (type === 'metadata') pendingRefreshData.hasMetadata = true;
  
  if (refreshTimer) clearTimeout(refreshTimer);
  
  refreshTimer = setTimeout(() => {
    const types = [];
    if (pendingRefreshData.hasReport) types.push('báo cáo');
    if (pendingRefreshData.hasExpenses) types.push('chi phí');
    if (pendingRefreshData.hasDebts) types.push('công nợ');
    if (pendingRefreshData.hasMetadata) types.push('danh mục');
    
    console.log(`📡 Cập nhật từ thiết bị khác: ${types.join(', ')}`);
    renderUINow();
    
    pendingRefreshData = {
      hasReport: false,
      hasExpenses: false,
      hasDebts: false,
      hasMetadata: false
    };
    refreshTimer = null;
  }, 100);
}

// Lắng nghe metadata
function listenToMetadata() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  const path = `cafeData/${user.uid}/metadata`;
  const callback = (snapshot) => {
    const metadata = snapshot.val();
    if (metadata && !window._isRealtimeUpdate) {
      console.log("📡 Nhận metadata từ thiết bị khác");
      
      const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (localData) {
        let changed = false;
        
        if (metadata.categories && JSON.stringify(localData.categories) !== JSON.stringify(metadata.categories)) {
          localData.categories = metadata.categories;
          changed = true;
        }
        
        if (metadata.recent && JSON.stringify(localData.recent) !== JSON.stringify(metadata.recent)) {
          localData.recent = metadata.recent;
          changed = true;
        }
        
        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
          window.appData = localData;
          
          if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
          if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
          if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
          
          scheduleUIRefresh('metadata');
        }
      }
    }
  };
  
  const ref = database.ref(path);
  ref.on('value', callback);
  activeListeners.push({ ref, callback });
}

// Lắng nghe báo cáo - QUAN TRỌNG: Cập nhật đúng appData
function listenToCurrentReport() {
  const today = getToday();
  const [year, month, day] = today.split('-');
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  const path = `cafeData/${user.uid}/reports/${year}/${month}/${day}`;
  const callback = (snapshot) => {
    const reportData = snapshot.val();
    if (reportData && !window._isRealtimeUpdate) {
      console.log(`📡 Nhận báo cáo ngày ${today} từ thiết bị khác:`, reportData);
      
      // Lấy dữ liệu hiện tại
      let localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!localData) localData = { reports: {}, expenses: [], debtTransactions: [] };
      if (!localData.reports) localData.reports = {};
      
      // Cập nhật report
      localData.reports[today] = reportData;
      
      // Lưu lại
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      window.appData = localData;
      
      console.log("✅ Đã cập nhật appData.reports[" + today + "] =", reportData);
      
      scheduleUIRefresh('report');
    }
  };
  
  const ref = database.ref(path);
  ref.on('value', callback);
  activeListeners.push({ ref, callback });
}

// Lắng nghe chi phí
function listenToCurrentExpenses() {
  const today = getToday();
  const [year, month, day] = today.split('-');
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  const path = `cafeData/${user.uid}/expenses/${year}/${month}/${day}`;
  const callback = (snapshot) => {
    const expensesMap = snapshot.val();
    if (!window._isRealtimeUpdate) {
      console.log(`📡 Nhận chi phí ngày ${today} từ thiết bị khác:`, expensesMap);
      
      let localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!localData) localData = { reports: {}, expenses: [], debtTransactions: [] };
      
      // Xóa cũ
      localData.expenses = (localData.expenses || []).filter(e => e.date !== today);
      
      // Thêm mới
      if (expensesMap) {
        Object.entries(expensesMap).forEach(([id, exp]) => {
          if (!exp.deleted) {
            localData.expenses.push({ id, date: today, ...exp });
          }
        });
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      window.appData = localData;
      
      console.log(`✅ Đã cập nhật ${localData.expenses.filter(e => e.date === today).length} expenses cho ngày ${today}`);
      
      scheduleUIRefresh('expenses');
    }
  };
  
  const ref = database.ref(path);
  ref.on('value', callback);
  activeListeners.push({ ref, callback });
}

// Lắng nghe công nợ
function listenToCurrentDebts() {
  const today = getToday();
  const [year, month, day] = today.split('-');
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  const path = `cafeData/${user.uid}/debtTransactions/${year}/${month}/${day}`;
  const callback = (snapshot) => {
    const debtsMap = snapshot.val();
    if (!window._isRealtimeUpdate) {
      console.log(`📡 Nhận công nợ ngày ${today} từ thiết bị khác:`, debtsMap);
      
      let localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!localData) localData = { reports: {}, expenses: [], debtTransactions: [] };
      
      // Xóa cũ
      localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== today);
      
      // Thêm mới
      if (debtsMap) {
        Object.entries(debtsMap).forEach(([id, debt]) => {
          if (!debt.deleted) {
            localData.debtTransactions.push({ id, date: today, ...debt });
          }
        });
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      window.appData = localData;
      
      console.log(`✅ Đã cập nhật ${localData.debtTransactions.filter(d => d.date === today).length} debts cho ngày ${today}`);
      
      scheduleUIRefresh('debts');
    }
  };
  
  const ref = database.ref(path);
  ref.on('value', callback);
  activeListeners.push({ ref, callback });
}

// Khởi tạo
function initRealtimeUI() {
  if (uiListenersInitialized) {
    console.log("⏭️ Realtime UI đã khởi tạo");
    return;
  }
  
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("⏭️ Chưa đăng nhập");
    return;
  }
  
  console.log("📡 Khởi tạo Realtime UI...");
  
  cleanupRealtimeUI();
  
  listenToMetadata();
  listenToCurrentReport();
  listenToCurrentExpenses();
  listenToCurrentDebts();
  
  uiListenersInitialized = true;
  
  console.log("✅ Realtime UI đã sẵn sàng");
}

// Dọn dẹp
function cleanupRealtimeUI() {
  activeListeners.forEach(({ ref, callback }) => {
    if (ref && callback) {
      ref.off('value', callback);
    }
  });
  activeListeners = [];
  uiListenersInitialized = false;
  
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// Export
window.initRealtimeUI = initRealtimeUI;
window.cleanupRealtimeUI = cleanupRealtimeUI;
window.renderUINow = renderUINow;