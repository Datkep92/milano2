// ========== FIREBASE SYNC V2 - HOÀN CHỈNH ==========
// Nguyên tắc: Firebase là MASTER, localStorage là CACHE

const STORE_ID = "milano_coffee_259";
const SYNC_DEBOUNCE_MS = 500;
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

// Cache structure
let cache = {
  data: {
    reports: {},
    expenses: [],
    adminExpenses: [],
    debtTransactions: []
  },
  lastSyncTime: 0,
  lastServerVersion: 0,
  categories: { expenses: [], adminExpenses: [], customers: [] },
  recent: { expenses: [], adminExpenses: [], customers: [] }
};

let deviceId = null;
let syncDebounceTimer = null;
let isInitialized = false;
let pendingSyncQueue = [];
let isOnline = navigator.onLine;
let realtimeListeners = {};
let isRealtimeUpdate = false;

// ========== KHỞI TẠO DEVICE ID ==========
function initDeviceId() {
  deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

// ========== ĐỌC CACHE ==========
function loadCache() {
  const cached = localStorage.getItem(STORAGE_KEY + "_cache");
  if (cached && cached !== "undefined" && cached !== "null") {
    try {
      const parsed = JSON.parse(cached);
      cache = {
        data: parsed.data || { reports: {}, expenses: [], adminExpenses: [], debtTransactions: [] },
        lastSyncTime: parsed.lastSyncTime || 0,
        lastServerVersion: parsed.lastServerVersion || 0,
        categories: parsed.categories || { expenses: [], adminExpenses: [], customers: [] },
        recent: parsed.recent || { expenses: [], adminExpenses: [], customers: [] }
      };
      console.log("📦 Đã đọc cache, lastSyncTime:", cache.lastSyncTime);
    } catch (e) {
      console.error("Lỗi đọc cache:", e);
    }
  }
  
  // Đồng bộ với appData
  if (typeof appData !== 'undefined') {
    appData.expenses = cache.data.expenses;
    appData.adminExpenses = cache.data.adminExpenses;
    appData.debtTransactions = cache.data.debtTransactions;
    appData.reports = cache.data.reports;
    appData.categories = cache.categories;
    appData.recent = cache.recent;
  }
  
  return cache;
}

// ========== LƯU CACHE ==========
function saveCache() {
  const cacheToSave = {
    data: {
      reports: cache.data.reports || {},
      expenses: cache.data.expenses || [],
      adminExpenses: cache.data.adminExpenses || [],
      debtTransactions: cache.data.debtTransactions || []
    },
    lastSyncTime: cache.lastSyncTime || Date.now(),
    lastServerVersion: cache.lastServerVersion || 0,
    categories: cache.categories || { expenses: [], adminExpenses: [], customers: [] },
    recent: cache.recent || { expenses: [], adminExpenses: [], customers: [] }
  };
  
  localStorage.setItem(STORAGE_KEY + "_cache", JSON.stringify(cacheToSave));
  
  // Đồng bộ với appData
  if (typeof appData !== 'undefined') {
    appData.expenses = cacheToSave.data.expenses;
    appData.adminExpenses = cacheToSave.data.adminExpenses;
    appData.debtTransactions = cacheToSave.data.debtTransactions;
    appData.reports = cacheToSave.data.reports;
    appData.categories = cacheToSave.categories;
    appData.recent = cacheToSave.recent;
  }
  
  console.log("💾 Đã lưu cache, expenses:", cache.data.expenses.length);
}

// ========== TẠO ID DUY NHẤT ==========
function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ========== TẢI DỮ LIỆU TỪ FIREBASE ==========
async function loadFromFirebase(retryCount = 0) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return false;
    
    console.log("📥 Đang tải dữ liệu từ Firebase...");
    
    // Lấy metadata trước
    const metadataSnap = await database.ref(`cafeData/${STORE_ID}/metadata`).once('value');
    const metadata = metadataSnap.val() || {};
    
    // Lấy version mới nhất từ server
    const serverVersion = metadata.version || 0;
    
    // Nếu không có thay đổi, bỏ qua
    if (serverVersion <= cache.lastServerVersion && cache.lastServerVersion > 0) {
      console.log(`⏭️ Không có thay đổi (server: ${serverVersion}, cache: ${cache.lastServerVersion})`);
      return true;
    }
    
    // Lấy tất cả ngày có dữ liệu (60 ngày gần nhất)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const startDate = sixtyDaysAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    const newData = {
      reports: {},
      expenses: [],
      adminExpenses: [],
      debtTransactions: []
    };
    
    const batchSize = 10;
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      await Promise.all(batch.map(async (date) => {
        const [year, month, day] = date.split('-');
        
        const [reportSnap, expensesSnap, adminExpensesSnap, debtsSnap] = await Promise.all([
          database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}`).once('value'),
          database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).once('value')
        ]);
        
        const report = reportSnap.val();
        if (report && Object.keys(report).length > 0) {
          newData.reports[date] = report;
        }
        
        const expensesMap = expensesSnap.val() || {};
        for (const [id, exp] of Object.entries(expensesMap)) {
          if (!exp.deleted) {
            newData.expenses.push({ id, businessDate: date, ...exp });
          }
        }
        
        const adminExpensesMap = adminExpensesSnap.val() || {};
        for (const [id, exp] of Object.entries(adminExpensesMap)) {
          if (!exp.deleted) {
            newData.adminExpenses.push({ id, businessDate: date, ...exp });
          }
        }
        
        const debtsMap = debtsSnap.val() || {};
        for (const [id, debt] of Object.entries(debtsMap)) {
          if (!debt.deleted) {
            newData.debtTransactions.push({ id, businessDate: date, ...debt });
          }
        }
      }));
    }
    
    // Cập nhật cache
    cache.data = newData;
    cache.lastSyncTime = Date.now();
    cache.lastServerVersion = serverVersion;
    cache.categories = metadata.categories || cache.categories;
    cache.recent = metadata.recent || cache.recent;
    
    saveCache();
    
    console.log(`✅ Đã tải: ${Object.keys(newData.reports).length} reports, ${newData.expenses.length} expenses`);
    return true;
    
  } catch (error) {
    console.error("❌ Lỗi tải:", error);
    if (retryCount < MAX_RETRY_COUNT) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return loadFromFirebase(retryCount + 1);
    }
    return false;
  }
}

// ========== LƯU LÊN FIREBASE DÙNG TRANSACTION ==========
async function saveToFirebase(type, id, newData, oldVersion) {
  const user = firebase.auth().currentUser;
  if (!user) {
    pendingSyncQueue.push({ type, id, newData, oldVersion, timestamp: Date.now() });
    console.log(`📴 Offline: đã lưu vào queue (${type}/${id})`);
    return false;
  }
  
  try {
    const businessDate = newData.businessDate;
    const [year, month, day] = businessDate.split('-');
    let path = '';
    
    if (type === 'expense') {
      path = `cafeData/${STORE_ID}/expenses/${year}/${month}/${day}/${id}`;
    } else if (type === 'debt') {
      path = `cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}/${id}`;
    } else if (type === 'adminExpense') {
      path = `cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}/${id}`;
    } else if (type === 'report') {
      path = `cafeData/${STORE_ID}/reports/${year}/${month}/${day}`;
    } else {
      return false;
    }
    
    const ref = database.ref(path);
    
    // Dùng transaction để tránh conflict
    const result = await ref.transaction((currentData) => {
      if (currentData === null) {
        return newData;
      }
      
      // Kiểm tra version conflict
      if (oldVersion !== undefined && currentData.version !== oldVersion) {
        console.warn(`⚠️ Conflict: local version ${oldVersion} != server version ${currentData.version}`);
        return undefined;
      }
      
      // Tăng version và cập nhật
      newData.version = (currentData.version || 0) + 1;
      newData.updatedAt = Date.now();
      newData.updatedBy = user.uid;
      
      return newData;
    });
    
    if (result.committed) {
      console.log(`✅ Đã lưu ${type}/${id} (version ${newData.version})`);
      return true;
    } else {
      console.warn(`⚠️ Conflict ở ${type}/${id}, đang reload...`);
      await loadFromFirebase();
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Lỗi lưu ${type}/${id}:`, error);
    return false;
  }
}

// ========== SOFT DELETE ==========
async function softDeleteItem(type, id, businessDate) {
  const user = firebase.auth().currentUser;
  if (!user) return false;
  
  const [year, month, day] = businessDate.split('-');
  let path = '';
  
  if (type === 'expense') {
    path = `cafeData/${STORE_ID}/expenses/${year}/${month}/${day}/${id}`;
  } else if (type === 'debt') {
    path = `cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}/${id}`;
  } else {
    return false;
  }
  
  const ref = database.ref(path);
  
  const result = await ref.transaction((currentData) => {
    if (!currentData) return undefined;
    
    currentData.deleted = true;
    currentData.deletedAt = Date.now();
    currentData.deletedBy = user.uid;
    currentData.version = (currentData.version || 0) + 1;
    
    return currentData;
  });
  
  if (result.committed) {
    console.log(`🗑️ Đã soft delete ${type}/${id}`);
    return true;
  }
  return false;
}

// ========== API PUBLIC ==========
async function createExpense(data) {
  const id = generateId('exp');
  const user = firebase.auth().currentUser;
  const timestamp = Date.now();
  
  const newData = {
    id: id,
    name: data.name,
    amount: data.amount,
    qty: data.qty || 1,
    businessDate: data.businessDate,
    version: 1,
    deleted: false,
    createdAt: timestamp,
    createdBy: user?.uid || 'unknown',
    updatedAt: timestamp,
    updatedBy: user?.uid || 'unknown'
  };
  
  // Lưu vào cache trước
  cache.data.expenses.push({ id, businessDate: data.businessDate, ...newData });
  saveCache();
  
  // Sync lên Firebase
  const success = await saveToFirebase('expense', id, newData, 0);
  if (!success && !isOnline) {
    pendingSyncQueue.push({ type: 'expense', id, newData, oldVersion: 0 });
  }
  
  refreshUIAfterUpdate();
  return { id, success };
}

async function updateExpense(id, updates, oldVersion) {
  const index = cache.data.expenses.findIndex(e => e.id === id);
  if (index === -1) return false;
  
  const updatedData = { ...cache.data.expenses[index], ...updates };
  delete updatedData.id;
  delete updatedData.businessDate;
  
  updatedData.updatedAt = Date.now();
  updatedData.version = oldVersion + 1;
  
  // Cập nhật cache
  cache.data.expenses[index] = { ...cache.data.expenses[index], ...updates, version: oldVersion + 1 };
  saveCache();
  
  const success = await saveToFirebase('expense', id, updatedData, oldVersion);
  if (!success && !isOnline) {
    pendingSyncQueue.push({ type: 'expense', id, newData: updatedData, oldVersion });
  }
  
  refreshUIAfterUpdate();
  return success;
}

async function deleteExpense(id, businessDate) {
  // Xóa khỏi cache
  cache.data.expenses = cache.data.expenses.filter(e => e.id !== id);
  saveCache();
  
  const success = await softDeleteItem('expense', id, businessDate);
  refreshUIAfterUpdate();
  return success;
}

async function createDebt(data) {
  const id = generateId('debt');
  const user = firebase.auth().currentUser;
  const timestamp = Date.now();
  
  const newData = {
    id: id,
    customer: data.customer,
    amount: data.amount,
    type: data.type || 'debt_add',
    note: data.note || '',
    method: data.method || '',
    businessDate: data.businessDate,
    version: 1,
    deleted: false,
    createdAt: timestamp,
    createdBy: user?.uid || 'unknown',
    updatedAt: timestamp,
    updatedBy: user?.uid || 'unknown'
  };
  
  cache.data.debtTransactions.push({ id, businessDate: data.businessDate, ...newData });
  saveCache();
  
  const success = await saveToFirebase('debt', id, newData, 0);
  refreshUIAfterUpdate();
  return { id, success };
}

async function updateDebt(id, updates, oldVersion) {
  const index = cache.data.debtTransactions.findIndex(d => d.id === id);
  if (index === -1) return false;
  
  const updatedData = { ...cache.data.debtTransactions[index], ...updates };
  delete updatedData.id;
  delete updatedData.businessDate;
  
  updatedData.updatedAt = Date.now();
  updatedData.version = oldVersion + 1;
  
  cache.data.debtTransactions[index] = { ...cache.data.debtTransactions[index], ...updates, version: oldVersion + 1 };
  saveCache();
  
  const success = await saveToFirebase('debt', id, updatedData, oldVersion);
  refreshUIAfterUpdate();
  return success;
}

async function deleteDebt(id, businessDate) {
  cache.data.debtTransactions = cache.data.debtTransactions.filter(d => d.id !== id);
  saveCache();
  
  const success = await softDeleteItem('debt', id, businessDate);
  refreshUIAfterUpdate();
  return success;
}

// ========== KHỞI TẠO LẠI CACHE TỪ APP DATA (CHO COMPATIBLE) ==========
function rebuildCacheFromAppData() {
  if (typeof appData !== 'undefined') {
    cache.data.expenses = appData.expenses || [];
    cache.data.adminExpenses = appData.adminExpenses || [];
    cache.data.debtTransactions = appData.debtTransactions || [];
    cache.data.reports = appData.reports || {};
    cache.categories = appData.categories || { expenses: [], adminExpenses: [], customers: [] };
    cache.recent = appData.recent || { expenses: [], adminExpenses: [], customers: [] };
    saveCache();
    console.log("🔄 Đã rebuild cache từ appData");
  }
}

// ========== XỬ LÝ OFFLINE QUEUE ==========
async function flushOfflineQueue() {
  if (!isOnline || pendingSyncQueue.length === 0) return;
  
  console.log(`📡 Đang xử lý ${pendingSyncQueue.length} tác vụ trong queue...`);
  const queue = [...pendingSyncQueue];
  pendingSyncQueue = [];
  
  for (const task of queue) {
    if (task.type === 'expense') {
      await saveToFirebase('expense', task.id, task.newData, task.oldVersion);
    } else if (task.type === 'debt') {
      await saveToFirebase('debt', task.id, task.newData, task.oldVersion);
    }
  }
  
  console.log("✅ Đã xử lý xong offline queue");
}

// ========== LẮNG NGHE ONLINE/OFFLINE ==========
window.addEventListener('online', async () => {
  console.log("🌐 Đã kết nối lại mạng");
  isOnline = true;
  await loadFromFirebase();
  await flushOfflineQueue();
  refreshUIAfterUpdate();
});

window.addEventListener('offline', () => {
  console.log("📴 Mất kết nối mạng");
  isOnline = false;
});

// ========== XỬ LÝ TAB NGỦ ==========
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden) {
    console.log("👁️ Tab được mở lại, đang tải dữ liệu mới...");
    await loadFromFirebase();
    refreshUIAfterUpdate();
  }
});

// ========== REFRESH UI ==========
function refreshUIAfterUpdate() {
  if (isRealtimeUpdate) return;
  
  console.log("🔄 Refresh UI...");
  
  if (typeof updateBodyAdminClass === 'function') updateBodyAdminClass();
  if (typeof loadTodayData === 'function') loadTodayData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
  if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
  if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
  if (typeof renderRecentAdminExpenses === 'function') renderRecentAdminExpenses();
  if (typeof updateTotalDebtDisplay === 'function') updateTotalDebtDisplay();
  if (typeof updateSubmitButtonStatus === 'function') updateSubmitButtonStatus();
  if (typeof refreshExpensePopupUI === 'function') refreshExpensePopupUI();
  if (typeof refreshDebtPopupUI === 'function') refreshDebtPopupUI();
}

// ========== REALTIME LISTENER ==========
function setupRealtimeListener() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  Object.keys(realtimeListeners).forEach(key => {
    if (realtimeListeners[key]) realtimeListeners[key]();
  });
  realtimeListeners = {};
  
  console.log("📡 Đang thiết lập realtime listener...");
  
  const basePath = `cafeData/${STORE_ID}`;
  
  // Lắng nghe metadata
  const metadataRef = database.ref(`${basePath}/metadata`);
  realtimeListeners['metadata'] = metadataRef.on('value', async (snapshot) => {
    if (isRealtimeUpdate) return;
    isRealtimeUpdate = true;
    
    const metadata = snapshot.val();
    if (metadata) {
      let changed = false;
      
      if (metadata.categories && JSON.stringify(cache.categories) !== JSON.stringify(metadata.categories)) {
        cache.categories = metadata.categories;
        changed = true;
      }
      if (metadata.recent && JSON.stringify(cache.recent) !== JSON.stringify(metadata.recent)) {
        cache.recent = metadata.recent;
        changed = true;
      }
      if (metadata.version && metadata.version > cache.lastServerVersion) {
        cache.lastServerVersion = metadata.version;
        changed = true;
      }
      
      if (changed) {
        saveCache();
        refreshUIAfterUpdate();
      }
    }
    
    setTimeout(() => { isRealtimeUpdate = false; }, 500);
  });
  
  console.log("✅ Realtime listener đã sẵn sàng");
}

// ========== KHỞI TẠO ==========
async function initFirebaseSyncV2() {
  if (isInitialized) return;
  
  initDeviceId();
  loadCache();
  
  // Nếu cache rỗng, thử rebuild từ appData cũ
  if (cache.data.expenses.length === 0 && typeof appData !== 'undefined' && appData.expenses && appData.expenses.length > 0) {
    rebuildCacheFromAppData();
  }
  
  const user = firebase.auth().currentUser;
  if (user) {
    await loadFromFirebase();
    setupRealtimeListener();
    await flushOfflineQueue();
    isInitialized = true;
    console.log("🚀 Firebase Sync V2 đã sẵn sàng");
    refreshUIAfterUpdate();
  }
}

function cleanupFirebaseSync() {
  Object.keys(realtimeListeners).forEach(key => {
    if (realtimeListeners[key]) realtimeListeners[key]();
  });
  realtimeListeners = {};
  isInitialized = false;
}

// ========== EXPORT ==========
window.initFirebaseSyncV2 = initFirebaseSyncV2;
window.cleanupFirebaseSync = cleanupFirebaseSync;
window.createExpense = createExpense;
window.updateExpense = updateExpense;
window.deleteExpense = deleteExpense;
window.createDebt = createDebt;
window.updateDebt = updateDebt;
window.deleteDebt = deleteDebt;
window.loadFromFirebase = loadFromFirebase;
window.saveCache = saveCache;
window.getCache = () => cache;

// Lắng nghe auth state
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    if (!isInitialized) initFirebaseSyncV2();
  } else {
    cleanupFirebaseSync();
    isInitialized = false;
  }
});