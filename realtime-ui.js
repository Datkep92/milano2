// ========== REALTIME UI - SỬ DỤNG RENDERALLUI ==========

let uiListenersInitialized = false;
let activeListeners = [];
let refreshTimer = null;
let pendingRefreshData = {
  hasReport: false,
  hasExpenses: false,
  hasDebts: false,
  hasMetadata: false
};

// Hàm refresh gộp - gọi renderAllUI 1 lần duy nhất
function scheduleUIRefresh(type) {
  // Đánh dấu loại cần refresh
  if (type === 'report') pendingRefreshData.hasReport = true;
  if (type === 'expenses') pendingRefreshData.hasExpenses = true;
  if (type === 'debts') pendingRefreshData.hasDebts = true;
  if (type === 'metadata') pendingRefreshData.hasMetadata = true;
  
  // Clear timer cũ
  if (refreshTimer) clearTimeout(refreshTimer);
  
  // Đặt timer mới - chỉ 100ms
  refreshTimer = setTimeout(() => {
    const types = [];
    if (pendingRefreshData.hasReport) types.push('báo cáo');
    if (pendingRefreshData.hasExpenses) types.push('chi phí');
    if (pendingRefreshData.hasDebts) types.push('công nợ');
    if (pendingRefreshData.hasMetadata) types.push('danh mục');
    
    console.log(`📡 Cập nhật từ thiết bị khác: ${types.join(', ')}`);
    
    // GỌI HÀM RENDER TOÀN BỘ UI TỪ CORE.JS
    if (typeof renderAllUI === 'function') {
      renderAllUI();
    } else {
      console.error("❌ renderAllUI không tồn tại!");
    }
    
    // Reset flags
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
          scheduleUIRefresh('metadata');
        }
      }
    }
  };
  
  const ref = database.ref(path);
  ref.on('value', callback);
  activeListeners.push({ ref, callback });
}

// Lắng nghe báo cáo
function listenToCurrentReport() {
  const today = getToday();
  const [year, month, day] = today.split('-');
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  const path = `cafeData/${user.uid}/reports/${year}/${month}/${day}`;
  const callback = (snapshot) => {
    const reportData = snapshot.val();
    if (reportData && !window._isRealtimeUpdate) {
      console.log(`📡 Nhận báo cáo ngày ${today} từ thiết bị khác`);
      
      let localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!localData) localData = { reports: {}, expenses: [], debtTransactions: [] };
      if (!localData.reports) localData.reports = {};
      
      localData.reports[today] = reportData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
      window.appData = localData;
      
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
      console.log(`📡 Nhận chi phí ngày ${today} từ thiết bị khác`);
      
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
      console.log(`📡 Nhận công nợ ngày ${today} từ thiết bị khác`);
      
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
  
  console.log("✅ Realtime UI đã sẵn sàng - UI sẽ tự động cập nhật qua renderAllUI()");
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