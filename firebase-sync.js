// ========== FIREBASE SYNC PRO - REALTIME HOÀN HẢO ==========

let isSyncing = false;
let syncQueue = [];
let deviceId = null;
let syncDebounceTimer = null;
let isLoading = false;
let isInitialized = false;
let realtimeCallback = null;

// Flags
window._isRealtimeUpdate = false;
window._lastSyncVersion = 0;

// Khởi tạo device ID
function initDeviceId() {
  deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

// Lưu vào LocalStorage
function saveToLocal(data, skipVersion = false) {
  if (!data) return;
  
  if (!skipVersion) {
    data._version = (data._version || 0) + 1;
    data._lastModified = Date.now();
    data._lastModifiedBy = deviceId;
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.appData = data;
  
  if (typeof ensureAppDataStructure === 'function') {
    ensureAppDataStructure();
  }
  
  return data._version;
}

// ========== LẤY DỮ LIỆU THEO NGÀY ==========
async function loadDataByDate(date) {
  const user = firebase.auth().currentUser;
  if (!user) return null;
  
  const [year, month, day] = date.split('-');
  
  try {
    // Lấy report
    const reportSnap = await database.ref(`cafeData/${user.uid}/reports/${year}/${month}/${day}`).once('value');
    const report = reportSnap.val();
    
    // Lấy expenses
    const expensesSnap = await database.ref(`cafeData/${user.uid}/expenses/${year}/${month}/${day}`).once('value');
    const expensesMap = expensesSnap.val() || {};
    const expenses = Object.entries(expensesMap).map(([id, exp]) => ({
      id, date, ...exp
    })).filter(e => !e.deleted);
    
    // Lấy debts
    const debtsSnap = await database.ref(`cafeData/${user.uid}/debtTransactions/${year}/${month}/${day}`).once('value');
    const debtsMap = debtsSnap.val() || {};
    const debts = Object.entries(debtsMap).map(([id, debt]) => ({
      id, date, ...debt
    })).filter(d => !d.deleted);
    
    return { report, expenses, debts };
  } catch (error) {
    console.error(`Lỗi tải data ngày ${date}:`, error);
    return null;
  }
}

// ========== SYNC LÊN FIREBASE ==========
async function syncToFirebase() {
  if (window._isRealtimeUpdate) {
    console.log("⏭️ Bỏ qua sync (đang nhận dữ liệu từ realtime)");
    return;
  }
  
  if (isSyncing) {
    return new Promise((resolve) => {
      syncQueue.push(resolve);
    });
  }
  
  isSyncing = true;
  
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!localData) return;
    
    // Lấy tất cả ngày có dữ liệu thay đổi
    const allDates = new Set();
    
    // Từ reports
    Object.keys(localData.reports || {}).forEach(date => allDates.add(date));
    
    // Từ expenses
    (localData.expenses || []).forEach(exp => {
      if (exp.date) allDates.add(exp.date);
    });
    
    // Từ debts
    (localData.debtTransactions || []).forEach(debt => {
      if (debt.date) allDates.add(debt.date);
    });
    
    // Sync từng ngày
    const syncPromises = [];
    
    for (const date of allDates) {
      const [year, month, day] = date.split('-');
      
      // Sync report
      if (localData.reports[date]) {
        const promise = database.ref(`cafeData/${user.uid}/reports/${year}/${month}/${day}`).set({
          ...localData.reports[date],
          _syncedAt: firebase.database.ServerValue.TIMESTAMP,
          _syncedFrom: deviceId
        });
        syncPromises.push(promise);
      }
      
      // Sync expenses
      const dayExpenses = (localData.expenses || []).filter(e => e.date === date && !e.deleted);
      if (dayExpenses.length > 0) {
        const expensesMap = {};
        dayExpenses.forEach(exp => {
          expensesMap[exp.id] = {
            name: exp.name,
            amount: exp.amount,
            qty: exp.qty || 0,
            deleted: exp.deleted || false,
            _modifiedAt: exp._modifiedAt || Date.now()
          };
        });
        const promise = database.ref(`cafeData/${user.uid}/expenses/${year}/${month}/${day}`).set(expensesMap);
        syncPromises.push(promise);
      }
      
      // Sync debts
      const dayDebts = (localData.debtTransactions || []).filter(d => d.date === date && !d.deleted);
      if (dayDebts.length > 0) {
        const debtsMap = {};
        dayDebts.forEach(debt => {
          debtsMap[debt.id] = {
            customer: debt.customer,
            amount: debt.amount,
            type: debt.type,
            note: debt.note || '',
            method: debt.method || '',
            deleted: debt.deleted || false,
            _modifiedAt: debt._modifiedAt || Date.now()
          };
        });
        const promise = database.ref(`cafeData/${user.uid}/debtTransactions/${year}/${month}/${day}`).set(debtsMap);
        syncPromises.push(promise);
      }
    }
    
    // Sync metadata
    const metadata = {
      version: localData._version || 0,
      lastSync: firebase.database.ServerValue.TIMESTAMP,
      syncedFrom: deviceId,
      categories: localData.categories,
      recent: localData.recent
    };
    syncPromises.push(database.ref(`cafeData/${user.uid}/metadata`).set(metadata));
    
    await Promise.all(syncPromises);
    
    console.log(`✅ Đã sync ${syncPromises.length} mục lên Firebase (v${localData._version})`);
    
  } catch (error) {
    console.error("❌ Lỗi sync:", error);
  } finally {
    isSyncing = false;
    if (syncQueue.length > 0) {
      const resolve = syncQueue.shift();
      setTimeout(() => syncToFirebase().then(resolve), 100);
    }
  }
}

// ========== CẬP NHẬT DỮ LIỆU TỪ REMOTE ==========
async function applyRemoteUpdate(remoteData, changedDate = null) {
  const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  let needRefresh = false;
  
  // Nếu có ngày cụ thể, chỉ cập nhật ngày đó
  if (changedDate) {
    const [year, month, day] = changedDate.split('-');
    const user = firebase.auth().currentUser;
    if (!user) return false;
    
    // Tải dữ liệu mới nhất của ngày đó
    const [reportSnap, expensesSnap, debtsSnap] = await Promise.all([
      database.ref(`cafeData/${user.uid}/reports/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${user.uid}/expenses/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${user.uid}/debtTransactions/${year}/${month}/${day}`).once('value')
    ]);
    
    // Cập nhật report
    const newReport = reportSnap.val();
    if (newReport) {
      if (!localData.reports) localData.reports = {};
      localData.reports[changedDate] = newReport;
      needRefresh = true;
    }
    
    // Cập nhật expenses
    const newExpensesMap = expensesSnap.val() || {};
    localData.expenses = (localData.expenses || []).filter(e => e.date !== changedDate);
    Object.entries(newExpensesMap).forEach(([id, exp]) => {
      if (!exp.deleted) {
        localData.expenses.push({ id, date: changedDate, ...exp });
      }
    });
    needRefresh = true;
    
    // Cập nhật debts
    const newDebtsMap = debtsSnap.val() || {};
    localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== changedDate);
    Object.entries(newDebtsMap).forEach(([id, debt]) => {
      if (!debt.deleted) {
        localData.debtTransactions.push({ id, date: changedDate, ...debt });
      }
    });
    needRefresh = true;
    
  } else if (remoteData && remoteData.metadata) {
    // Cập nhật metadata (categories, recent)
    if (remoteData.metadata.categories) {
      localData.categories = remoteData.metadata.categories;
      needRefresh = true;
    }
    if (remoteData.metadata.recent) {
      localData.recent = remoteData.metadata.recent;
      needRefresh = true;
    }
  }
  
  if (needRefresh) {
    localData._version = (localData._version || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    window.appData = localData;
    return true;
  }
  
  return false;
}

// ========== REALTIME LISTENER - TỰ ĐỘNG CẬP NHẬT UI ==========
function setupRealtimeListener() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  console.log("📡 Đang thiết lập realtime listener...");
  
  // Lắng nghe metadata (categories, recent)
  const metadataRef = database.ref(`cafeData/${user.uid}/metadata`);
  metadataRef.on('value', async (snapshot) => {
    if (window._isRealtimeUpdate) return;
    
    const metadata = snapshot.val();
    if (!metadata) return;
    
    window._isRealtimeUpdate = true;
    
    try {
      const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      let changed = false;
      
      if (metadata.categories && JSON.stringify(localData?.categories) !== JSON.stringify(metadata.categories)) {
        if (localData) localData.categories = metadata.categories;
        changed = true;
      }
      
      if (metadata.recent && JSON.stringify(localData?.recent) !== JSON.stringify(metadata.recent)) {
        if (localData) localData.recent = metadata.recent;
        changed = true;
      }
      
      if (changed && localData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
        window.appData = localData;
        
        // Cập nhật UI phần liên quan
        if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
        if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
        if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
        
        console.log("📡 Đã cập nhật metadata từ thiết bị khác");
      }
    } finally {
      setTimeout(() => { window._isRealtimeUpdate = false; }, 500);
    }
  });
  
  // Lắng nghe tất cả các ngày (real-time)
  // Cách này lắng nghe toàn bộ thay đổi
  const allDataRef = database.ref(`cafeData/${user.uid}`);
  allDataRef.on('child_changed', async (snapshot) => {
    if (window._isRealtimeUpdate) return;
    
    const path = snapshot.key;
    if (path === 'metadata') return; // Đã xử lý riêng
    
    // Phân tích path: reports/2024/01/01, expenses/2024/01/01, debtTransactions/2024/01/01
    const parts = path.split('/');
    if (parts.length >= 4) {
      const type = parts[0]; // reports, expenses, debtTransactions
      const year = parts[1];
      const month = parts[2];
      const day = parts[3];
      const changedDate = `${year}-${month}-${day}`;
      
      console.log(`📡 Phát hiện thay đổi tại: ${type} ngày ${changedDate}`);
      
      window._isRealtimeUpdate = true;
      
      try {
        // Tải dữ liệu mới của ngày này
        const [reportSnap, expensesSnap, debtsSnap] = await Promise.all([
          database.ref(`cafeData/${user.uid}/reports/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${user.uid}/expenses/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${user.uid}/debtTransactions/${year}/${month}/${day}`).once('value')
        ]);
        
        const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        let needUIUpdate = false;
        
        // Cập nhật report
        const newReport = reportSnap.val();
        if (newReport) {
          if (!localData.reports) localData.reports = {};
          localData.reports[changedDate] = newReport;
          needUIUpdate = true;
        }
        
        // Cập nhật expenses
        const newExpensesMap = expensesSnap.val() || {};
        localData.expenses = (localData.expenses || []).filter(e => e.date !== changedDate);
        Object.entries(newExpensesMap).forEach(([id, exp]) => {
          if (!exp.deleted) {
            localData.expenses.push({ id, date: changedDate, ...exp });
          }
        });
        needUIUpdate = true;
        
        // Cập nhật debts
        const newDebtsMap = debtsSnap.val() || {};
        localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== changedDate);
        Object.entries(newDebtsMap).forEach(([id, debt]) => {
          if (!debt.deleted) {
            localData.debtTransactions.push({ id, date: changedDate, ...debt });
          }
        });
        needUIUpdate = true;
        
        if (needUIUpdate) {
          localData._version = (localData._version || 0) + 1;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
          window.appData = localData;
          
          // HIỂN THỊ UI NGAY LẬP TỨC
          console.log(`📡 Cập nhật UI ngày ${changedDate} từ thiết bị khác`);
          
          // Gọi refresh UI (debounce để tránh gọi nhiều lần)
          if (window._refreshTimer) clearTimeout(window._refreshTimer);
          window._refreshTimer = setTimeout(() => {
            if (typeof refreshUIAfterRealtime === 'function') {
              refreshUIAfterRealtime(changedDate);
            }
            window._refreshTimer = null;
          }, 100);
        }
        
      } catch (error) {
        console.error("Lỗi xử lý realtime:", error);
      } finally {
        setTimeout(() => { window._isRealtimeUpdate = false; }, 300);
      }
    }
  });
  
  console.log("✅ Realtime listener đã sẵn sàng");
  
  // Lưu để cleanup
  window._realtimeRefs = { metadataRef, allDataRef };
}

// ========== REFRESH UI SAU REALTIME ==========
function refreshUIAfterRealtime(changedDate) {
  const today = getToday();
  
  console.log(`🔄 Cập nhật UI (ngày thay đổi: ${changedDate})`);
  
  // Nếu ngày thay đổi là hôm nay hoặc ngày đang xem
  if (changedDate === today || changedDate === reportDate?.value) {
    if (typeof loadTodayData === 'function') {
      loadTodayData();
    }
  }
  
  // Cập nhật danh sách công nợ
  if (typeof renderCustomerDebtList === 'function') {
    renderCustomerDebtList();
  }
  
  // Cập nhật tổng công nợ
  if (typeof updateTotalDebtDisplay === 'function') {
    updateTotalDebtDisplay();
  }
  
  // Cập nhật manager dashboard nếu đang mở
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'managerTab' && typeof renderManagerDashboard === 'function') {
    renderManagerDashboard();
  }
  
  // Hiển thị thông báo (chỉ khi tab đang active)
  if (document.hasFocus()) {
    showToast(`📡 Đã cập nhật dữ liệu mới từ thiết bị khác`);
  }
}

// ========== TẢI DỮ LIỆU BAN ĐẦU ==========
async function loadFromFirebase() {
  if (isLoading) {
    console.log("⏭️ Đang load, bỏ qua");
    return false;
  }
  
  isLoading = true;
  
  try {
    const user = firebase.auth().currentUser;
    if (!user) return false;
    
    console.log("📥 Đang tải dữ liệu từ Firebase...");
    
    // Tải metadata
    const metadataSnap = await database.ref(`cafeData/${user.uid}/metadata`).once('value');
    const metadata = metadataSnap.val() || {};
    
    // Tải dữ liệu 3 tháng gần nhất
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const reports = {};
    const expenses = [];
    const debts = [];
    
    // Tạo mảng các ngày cần tải
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    // Tải từng ngày
    for (const date of dates) {
      const [year, month, day] = date.split('-');
      
      const [reportSnap, expensesSnap, debtsSnap] = await Promise.all([
        database.ref(`cafeData/${user.uid}/reports/${year}/${month}/${day}`).once('value'),
        database.ref(`cafeData/${user.uid}/expenses/${year}/${month}/${day}`).once('value'),
        database.ref(`cafeData/${user.uid}/debtTransactions/${year}/${month}/${day}`).once('value')
      ]);
      
      const report = reportSnap.val();
      if (report) reports[date] = report;
      
      const expensesMap = expensesSnap.val() || {};
      Object.entries(expensesMap).forEach(([id, exp]) => {
        if (!exp.deleted) {
          expenses.push({ id, date, ...exp });
        }
      });
      
      const debtsMap = debtsSnap.val() || {};
      Object.entries(debtsMap).forEach(([id, debt]) => {
        if (!debt.deleted) {
          debts.push({ id, date, ...debt });
        }
      });
    }
    
    const structuredData = {
      _version: metadata.version || 1,
      _lastModified: Date.now(),
      _lastModifiedBy: deviceId,
      reports: reports,
      expenses: expenses,
      debtTransactions: debts,
      categories: metadata.categories || { expenses: [], customers: [] },
      recent: metadata.recent || { expenses: [], customers: [] }
    };
    
    saveToLocal(structuredData, true);
    
    console.log(`✅ Đã tải: ${Object.keys(reports).length} reports, ${expenses.length} expenses, ${debts.length} debts`);
    
    isLoading = false;
    return true;
    
  } catch (error) {
    console.error("❌ Lỗi tải:", error);
    isLoading = false;
    return false;
  }
}

// ========== GHI ĐÈ SAVEDATA ==========
const originalSaveData = window.saveData || function() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appData));
};

window.saveData = function() {
  // KHÔNG sync khi đang nhận dữ liệu từ realtime
  if (window._isRealtimeUpdate) {
    console.log("⏭️ Bỏ qua save (đang realtime update)");
    return;
  }
  
  // Lưu local
  if (window.appData) {
    window.appData._version = (window.appData._version || 0) + 1;
    window.appData._lastModified = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appData));
  }
  
  // Gọi original
  if (originalSaveData !== window.saveData) {
    originalSaveData();
  }
  
  // Debounce sync
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncToFirebase();
  }, 500);
};

// ========== KHỞI TẠO ==========
async function initFirebaseSync() {
  if (isInitialized) {
    console.log("⏭️ Firebase Sync đã khởi tạo");
    return;
  }
  
  initDeviceId();
  
  const user = firebase.auth().currentUser;
  if (user) {
    await loadFromFirebase();
    setupRealtimeListener();
    isInitialized = true;
  }
  
  console.log("🚀 Firebase Sync Pro đã sẵn sàng");
}

// ========== CLEANUP ==========
function cleanupFirebaseSync() {
  if (window._realtimeRefs) {
    if (window._realtimeRefs.metadataRef) window._realtimeRefs.metadataRef.off();
    if (window._realtimeRefs.allDataRef) window._realtimeRefs.allDataRef.off();
    window._realtimeRefs = null;
  }
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncQueue = [];
  isSyncing = false;
  isLoading = false;
  isInitialized = false;
}

// ========== FORCE SYNC ==========
async function forceSync() {
  if (typeof showToast === 'function') showToast("🔄 Đang đồng bộ...");
  await syncToFirebase();
  await loadFromFirebase();
  if (typeof refreshUIAfterRealtime === 'function') refreshUIAfterRealtime(getToday());
  if (typeof showToast === 'function') showToast("✅ Đồng bộ hoàn tất");
}

// ========== EXPORT ==========
window.initFirebaseSync = initFirebaseSync;
window.loadFromFirebase = loadFromFirebase;
window.syncToFirebase = syncToFirebase;
window.forceSync = forceSync;
window.cleanupFirebaseSync = cleanupFirebaseSync;
window.refreshUIAfterRealtime = refreshUIAfterRealtime;

// Lắng nghe auth state
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    if (!isInitialized) {
      initFirebaseSync();
    }
  } else {
    cleanupFirebaseSync();
    isInitialized = false;
  }
});