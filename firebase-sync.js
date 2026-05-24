// ========== FIREBASE SYNC PRO - DÙNG CHUNG DỮ LIỆU ==========

const STORE_ID = "milano_coffee_259"; // Mã cửa hàng cố định - TẤT CẢ USER DÙNG CHUNG

let isSyncing = false;
let syncQueue = [];
let deviceId = null;
let syncDebounceTimer = null;
let isLoading = false;
let isInitialized = false;
let currentUserId = null;

// Flags
window._isRealtimeUpdate = false;
window._syncVersion = 0;

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

// ========== SYNC LÊN FIREBASE - DÙNG STORE_ID CHUNG ==========
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
    
    // Lấy role của user
    const role = await getUserRole(user.uid);
    const isAdminUser = role === ROLES.ADMIN;
    
    // Chỉ ADMIN mới có quyền ghi dữ liệu lên Firebase
    if (!isAdminUser) {
      console.log("⚠️ Nhân viên không có quyền ghi dữ liệu lên server");
      isSyncing = false;
      return;
    }
    
    console.log(`🔄 Admin ${user.email} đang đồng bộ dữ liệu lên server...`);
    
    // Lấy tất cả ngày có dữ liệu thay đổi
    const allDates = new Set();
    
    Object.keys(localData.reports || {}).forEach(date => allDates.add(date));
    (localData.expenses || []).forEach(exp => { if (exp.date) allDates.add(exp.date); });
    (localData.debtTransactions || []).forEach(debt => { if (debt.date) allDates.add(debt.date); });
    
    // Sync từng ngày
    const syncPromises = [];
    
    for (const date of allDates) {
      const [year, month, day] = date.split('-');
      
      // Sync report
      if (localData.reports[date]) {
        const promise = database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).set({
          ...localData.reports[date],
          _syncedAt: firebase.database.ServerValue.TIMESTAMP,
          _syncedBy: user.uid,
          _syncedByEmail: user.email
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
        const promise = database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).set(expensesMap);
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
        const promise = database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).set(debtsMap);
        syncPromises.push(promise);
      }
    }
    
    // Sync metadata
    const metadata = {
      version: localData._version || 0,
      lastSync: firebase.database.ServerValue.TIMESTAMP,
      syncedBy: user.uid,
      syncedByEmail: user.email,
      categories: localData.categories,
      recent: localData.recent
    };
    syncPromises.push(database.ref(`cafeData/${STORE_ID}/metadata`).set(metadata));
    
    await Promise.all(syncPromises);
    
    console.log(`✅ Admin đã đồng bộ ${syncPromises.length} mục lên server (v${localData._version})`);
    
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

// ========== TẢI DỮ LIỆU TỪ FIREBASE - TỪ STORE_ID CHUNG ==========
async function loadFromFirebase() {
  if (isLoading) {
    console.log("⏭️ Đang load, bỏ qua");
    return false;
  }
  
  isLoading = true;
  
  try {
    const user = firebase.auth().currentUser;
    if (!user) return false;
    
    const role = await getUserRole(user.uid);
    const isAdminUser = role === ROLES.ADMIN;
    
    console.log(`📥 ${isAdminUser ? 'Admin' : 'Nhân viên'} đang tải dữ liệu từ server...`);
    
    // Tải metadata từ STORE_ID chung
    const metadataSnap = await database.ref(`cafeData/${STORE_ID}/metadata`).once('value');
    const metadata = metadataSnap.val() || {};
    
    // Nếu chưa có dữ liệu trên server, khởi tạo mới
    if (Object.keys(metadata).length === 0 && isAdminUser) {
      console.log("📝 Chưa có dữ liệu trên server, khởi tạo mới...");
      const emptyData = {
        _version: 1,
        _lastModified: Date.now(),
        reports: {},
        expenses: [],
        debtTransactions: [],
        categories: { expenses: [], customers: [] },
        recent: { expenses: [], customers: [] }
      };
      saveToLocal(emptyData, true);
      await syncToFirebase();
      isLoading = false;
      return true;
    }
    
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
    
    // Tải từng ngày từ STORE_ID chung
    for (const date of dates) {
      const [year, month, day] = date.split('-');
      
      const [reportSnap, expensesSnap, debtsSnap] = await Promise.all([
        database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).once('value'),
        database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).once('value'),
        database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).once('value')
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

// ========== REALTIME LISTENER - LẮNG NGHE TRÊN STORE_ID CHUNG ==========
function setupRealtimeListener() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  console.log("📡 Đang thiết lập realtime listener trên dữ liệu chung...");
  
  // Lắng nghe tất cả thay đổi trên STORE_ID chung
  const allDataRef = database.ref(`cafeData/${STORE_ID}`);
  
  allDataRef.on('child_changed', async (snapshot) => {
    if (window._isRealtimeUpdate) return;
    
    const path = snapshot.key;
    if (path === 'metadata') {
      // Cập nhật metadata
      const metadata = snapshot.val();
      if (metadata) {
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
            if (typeof renderAllUI === 'function') renderAllUI();
          }
        }
      }
      return;
    }
    
    // Phân tích path: reports/2024/01/01, expenses/2024/01/01, debtTransactions/2024/01/01
    const parts = path.split('/');
    if (parts.length >= 4) {
      const type = parts[0];
      const year = parts[1];
      const month = parts[2];
      const day = parts[3];
      const changedDate = `${year}-${month}-${day}`;
      
      console.log(`📡 Phát hiện thay đổi từ ${type} ngày ${changedDate}`);
      
      window._isRealtimeUpdate = true;
      
      try {
        // Tải dữ liệu mới của ngày này
        const [reportSnap, expensesSnap, debtsSnap] = await Promise.all([
          database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).once('value')
        ]);
        
        const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        
        // Cập nhật report
        const newReport = reportSnap.val();
        if (newReport) {
          if (!localData.reports) localData.reports = {};
          localData.reports[changedDate] = newReport;
        }
        
        // Cập nhật expenses
        const newExpensesMap = expensesSnap.val() || {};
        localData.expenses = (localData.expenses || []).filter(e => e.date !== changedDate);
        Object.entries(newExpensesMap).forEach(([id, exp]) => {
          if (!exp.deleted) {
            localData.expenses.push({ id, date: changedDate, ...exp });
          }
        });
        
        // Cập nhật debts
        const newDebtsMap = debtsSnap.val() || {};
        localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== changedDate);
        Object.entries(newDebtsMap).forEach(([id, debt]) => {
          if (!debt.deleted) {
            localData.debtTransactions.push({ id, date: changedDate, ...debt });
          }
        });
        
        localData._version = (localData._version || 0) + 1;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
        window.appData = localData;
        
        // Render lại UI
        if (typeof renderAllUI === 'function') {
          renderAllUI();
        }
        
      } catch (error) {
        console.error("Lỗi xử lý realtime:", error);
      } finally {
        setTimeout(() => { window._isRealtimeUpdate = false; }, 500);
      }
    }
  });
  
  console.log("✅ Realtime listener đã sẵn sàng trên dữ liệu chung");
  
  window._realtimeRef = allDataRef;
}

// ========== GHI ĐÈ SAVEDATA ==========
const originalSaveData = window.saveData || function() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appData));
};

window.saveData = function() {
  if (window._isRealtimeUpdate) {
    console.log("⏭️ Bỏ qua save (đang realtime update)");
    return;
  }
  
  if (window.appData) {
    window.appData._version = (window.appData._version || 0) + 1;
    window.appData._lastModified = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.appData));
  }
  
  if (originalSaveData !== window.saveData) {
    originalSaveData();
  }
  
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
  
  console.log("🚀 Firebase Sync Pro - Dùng chung dữ liệu đã sẵn sàng");
}

// ========== CLEANUP ==========
function cleanupFirebaseSync() {
  if (window._realtimeRef) {
    window._realtimeRef.off();
    window._realtimeRef = null;
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
  if (typeof renderAllUI === 'function') renderAllUI();
  if (typeof showToast === 'function') showToast("✅ Đồng bộ hoàn tất");
}

// ========== EXPORT ==========
window.initFirebaseSync = initFirebaseSync;
window.loadFromFirebase = loadFromFirebase;
window.syncToFirebase = syncToFirebase;
window.forceSync = forceSync;
window.cleanupFirebaseSync = cleanupFirebaseSync;

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