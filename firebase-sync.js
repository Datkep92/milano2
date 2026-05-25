// ========== FIREBASE SYNC PRO - DÙNG CHUNG DỮ LIỆU (CÓ ADMIN EXPENSES) ==========
// ĐÃ SỬA LỖI ĐỒNG BỘ 2 CHIỀU

const STORE_ID = "milano_coffee_259"; // Mã cửa hàng cố định - TẤT CẢ USER DÙNG CHUNG

let isSyncing = false;
let syncQueue = [];
let deviceId = null;
let syncDebounceTimer = null;
let isLoading = false;
let isInitialized = false;
let currentUserId = null;
let realtimeListenerRef = null; // Tham chiếu để cleanup

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
    
    const role = await getUserRole(user.uid);
    const isAdminUser = role === ROLES.ADMIN;
    
    console.log(`🔄 ${isAdminUser ? 'Admin' : 'Nhân viên'} đang đồng bộ...`);
    
    // Lấy tất cả ngày có dữ liệu thay đổi
    const allDates = new Set();
    
    Object.keys(localData.reports || {}).forEach(date => allDates.add(date));
    (localData.expenses || []).forEach(exp => { if (exp.date) allDates.add(exp.date); });
    (localData.adminExpenses || []).forEach(exp => { if (exp.date) allDates.add(exp.date); });
    (localData.debtTransactions || []).forEach(debt => { if (debt.date) allDates.add(debt.date); });
    
    const updates = {};
    const deletes = {}; // 🔥 Lưu các path cần xóa
    
    for (const date of allDates) {
      const [year, month, day] = date.split('-');
      
      // Sync report
      if (localData.reports[date]) {
        const reportPath = `cafeData/${STORE_ID}/reports/${year}/${month}/${day}`;
        updates[reportPath] = {
          ...localData.reports[date],
          _syncedAt: firebase.database.ServerValue.TIMESTAMP,
          _syncedBy: user.uid,
          _syncedByEmail: user.email,
          _syncedByRole: role,
          _syncedByDevice: deviceId
        };
      }
      
      // 🔥 Sync expenses - XỬ LÝ CẢ XÓA
      const dayExpenses = (localData.expenses || []).filter(e => e.date === date);
      const remoteExpenseIds = new Set();
      
      for (const exp of dayExpenses) {
        const expPath = `cafeData/${STORE_ID}/expenses/${year}/${month}/${day}/${exp.id}`;
        remoteExpenseIds.add(exp.id);
        
        if (exp.deleted) {
          // ⚠️ NẾU BỊ XÓA: Set deleted = true trên Firebase
          updates[expPath] = {
            ...exp,
            deleted: true,
            _deletedAt: Date.now(),
            _deletedBy: user.email,
            _deletedByDevice: deviceId,
            _modifiedAt: Date.now(),
            _modifiedBy: user.email,
            _modifiedByDevice: deviceId
          };
        } else {
          // Cập nhật bình thường
          updates[expPath] = {
            name: exp.name,
            amount: exp.amount,
            qty: exp.qty || 0,
            deleted: false,
            _modifiedAt: exp._modifiedAt || Date.now(),
            _modifiedBy: user.email,
            _modifiedByRole: role,
            _modifiedByDevice: deviceId
          };
        }
      }
      
      // 🔥 Sync debts - XỬ LÝ CẢ XÓA
      const dayDebts = (localData.debtTransactions || []).filter(d => d.date === date);
      
      for (const debt of dayDebts) {
        const debtPath = `cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}/${debt.id}`;
        
        if (debt.deleted) {
          // Đánh dấu đã xóa trên Firebase
          updates[debtPath] = {
            ...debt,
            deleted: true,
            _deletedAt: Date.now(),
            _deletedBy: user.email,
            _deletedByDevice: deviceId,
            _modifiedAt: Date.now(),
            _modifiedBy: user.email,
            _modifiedByDevice: deviceId
          };
        } else {
          updates[debtPath] = {
            customer: debt.customer,
            amount: debt.amount,
            type: debt.type,
            note: debt.note || '',
            method: debt.method || '',
            deleted: false,
            _modifiedAt: debt._modifiedAt || Date.now(),
            _modifiedBy: user.email,
            _modifiedByRole: role,
            _modifiedByDevice: deviceId
          };
        }
      }
      
      // 🔥 Sync adminExpenses
      const dayAdminExpenses = (localData.adminExpenses || []).filter(e => e.date === date);
      
      for (const exp of dayAdminExpenses) {
        const expPath = `cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}/${exp.id}`;
        
        if (exp.deleted) {
          updates[expPath] = {
            ...exp,
            deleted: true,
            _deletedAt: Date.now(),
            _deletedBy: user.email,
            _deletedByDevice: deviceId
          };
        } else {
          updates[expPath] = {
            name: exp.name,
            amount: exp.amount,
            qty: exp.qty || 0,
            deleted: false,
            _modifiedAt: exp._modifiedAt || Date.now(),
            _modifiedBy: user.email,
            _modifiedByRole: role,
            _modifiedByDevice: deviceId
          };
        }
      }
    }
    
    // Thực hiện cập nhật
    if (Object.keys(updates).length > 0) {
      await database.ref().update(updates);
      console.log(`✅ Đã đồng bộ ${Object.keys(updates).length} thay đổi lên server`);
    }
    
    // ========== THÊM MỚI: SYNC METADATA (categories và recent) ==========
    try {
      const metadataRef = database.ref(`cafeData/${STORE_ID}/metadata`);
      
      await metadataRef.transaction((currentData) => {
        // Chuẩn bị dữ liệu metadata từ local
        const localCategories = localData.categories || { expenses: [], adminExpenses: [], customers: [] };
        const localRecent = localData.recent || { expenses: [], adminExpenses: [], customers: [] };
        
        // Nếu chưa có metadata trên server, tạo mới
        if (currentData === null) {
          console.log("📝 Tạo mới metadata trên server");
          return {
            version: Date.now(),
            lastSync: firebase.database.ServerValue.TIMESTAMP,
            syncedBy: user.uid,
            syncedByEmail: user.email,
            syncedByDevice: deviceId,
            categories: localCategories,
            recent: localRecent
          };
        }
        
        // MERGE categories (gộp danh sách, không ghi đè)
        const mergedCategories = {
          expenses: [...new Set([
            ...(currentData.categories?.expenses || []),
            ...(localCategories.expenses || [])
          ])],
          adminExpenses: [...new Set([
            ...(currentData.categories?.adminExpenses || []),
            ...(localCategories.adminExpenses || [])
          ])],
          customers: [...new Set([
            ...(currentData.categories?.customers || []),
            ...(localCategories.customers || [])
          ])]
        };
        
        // MERGE recent (ưu tiên giữ thứ tự mới nhất)
        const mergedRecent = {
          expenses: [...new Set([
            ...(localRecent.expenses || []),
            ...(currentData.recent?.expenses || [])
          ])].slice(0, 10),
          adminExpenses: [...new Set([
            ...(localRecent.adminExpenses || []),
            ...(currentData.recent?.adminExpenses || [])
          ])].slice(0, 10),
          customers: [...new Set([
            ...(localRecent.customers || []),
            ...(currentData.recent?.customers || [])
          ])].slice(0, 10)
        };
        
        // Kiểm tra xem có thay đổi gì không
        const categoriesChanged = JSON.stringify(mergedCategories) !== JSON.stringify(currentData.categories);
        const recentChanged = JSON.stringify(mergedRecent) !== JSON.stringify(currentData.recent);
        
        if (!categoriesChanged && !recentChanged) {
          console.log("⏭️ Metadata không thay đổi, bỏ qua sync");
          return undefined; // Không có thay đổi, hủy transaction
        }
        
        console.log(`📝 Cập nhật metadata: adminExpenses categories: ${mergedCategories.adminExpenses.length}, recent: ${mergedRecent.adminExpenses.length}`);
        
        return {
          version: Date.now(),
          lastSync: firebase.database.ServerValue.TIMESTAMP,
          syncedBy: user.uid,
          syncedByEmail: user.email,
          syncedByDevice: deviceId,
          categories: mergedCategories,
          recent: mergedRecent
        };
      });
      
      console.log(`✅ Đã đồng bộ metadata (categories + recent) lên server`);
      
    } catch (metadataError) {
      console.error("❌ Lỗi sync metadata:", metadataError);
      // Không throw error để các update khác vẫn tiếp tục
    }
    
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
// Thêm vào cuối file employee.js hoặc firebase-sync.js
window.forceSyncNow = async function() {
  if (typeof showToast === 'function') {
    showToast("🔄 Đang đồng bộ dữ liệu...");
  }
  
  if (typeof syncToFirebase === 'function') {
    await syncToFirebase();
  }
  
  if (typeof loadFromFirebase === 'function') {
    await loadFromFirebase();
  }
  
  // Refresh toàn bộ UI
  if (typeof loadTodayData === 'function') loadTodayData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
  if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
  if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
  
  if (typeof showToast === 'function') {
    showToast("✅ Đồng bộ hoàn tất!");
  }
};

// Thêm nút đồng bộ thủ công (tùy chọn)
const syncBtn = document.createElement('button');
syncBtn.id = 'manualSyncBtn';
syncBtn.innerHTML = '🔄 Đồng bộ';
syncBtn.style.cssText = 'position:fixed; bottom:80px; right:16px; z-index:999; background:var(--primary); color:white; border:none; border-radius:50px; padding:10px 16px; font-size:12px; box-shadow:0 2px 8px rgba(0,0,0,0.2); cursor:pointer;';
syncBtn.onclick = () => window.forceSyncNow();
document.body.appendChild(syncBtn);
// ========== TẢI DỮ LIỆU TỪ FIREBASE ==========
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
        adminExpenses: [],
        debtTransactions: [],
        categories: { expenses: [], adminExpenses: [], customers: [] },
        recent: { expenses: [], adminExpenses: [], customers: [] }
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
    const adminExpenses = [];
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
      
      const [reportSnap, expensesSnap, adminExpensesSnap, debtsSnap] = await Promise.all([
        database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).once('value'),
        database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).once('value'),
        database.ref(`cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}`).once('value'),
        database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).once('value')
      ]);
      
      const report = reportSnap.val();
      if (report) {
        // Loại bỏ các trường metadata trước khi lưu
        const cleanReport = { ...report };
        delete cleanReport._syncedAt;
        delete cleanReport._syncedBy;
        delete cleanReport._syncedByEmail;
        delete cleanReport._syncedByRole;
        delete cleanReport._syncedByDevice;
        reports[date] = cleanReport;
      }
      
      const expensesMap = expensesSnap.val() || {};
      Object.entries(expensesMap).forEach(([id, exp]) => {
        if (!exp.deleted) {
          const cleanExp = { ...exp };
          delete cleanExp._modifiedBy;
          delete cleanExp._modifiedByRole;
          delete cleanExp._modifiedByDevice;
          expenses.push({ id, date, ...cleanExp });
        }
      });
      
      const adminExpensesMap = adminExpensesSnap.val() || {};
      Object.entries(adminExpensesMap).forEach(([id, exp]) => {
        if (!exp.deleted) {
          const cleanExp = { ...exp };
          delete cleanExp._modifiedBy;
          delete cleanExp._modifiedByRole;
          delete cleanExp._modifiedByDevice;
          adminExpenses.push({ id, date, ...cleanExp });
        }
      });
      
      const debtsMap = debtsSnap.val() || {};
      Object.entries(debtsMap).forEach(([id, debt]) => {
        if (!debt.deleted) {
          const cleanDebt = { ...debt };
          delete cleanDebt._modifiedBy;
          delete cleanDebt._modifiedByRole;
          delete cleanDebt._modifiedByDevice;
          debts.push({ id, date, ...cleanDebt });
        }
      });
    }
    
    const structuredData = {
      _version: metadata.version || 1,
      _lastModified: Date.now(),
      _lastModifiedBy: deviceId,
      reports: reports,
      expenses: expenses,
      adminExpenses: adminExpenses,
      debtTransactions: debts,
      categories: metadata.categories || { expenses: [], adminExpenses: [], customers: [] },
      recent: metadata.recent || { expenses: [], adminExpenses: [], customers: [] }
    };
    
    saveToLocal(structuredData, true);
    
    console.log(`✅ Đã tải: ${Object.keys(reports).length} reports, ${expenses.length} expenses, ${adminExpenses.length} adminExpenses, ${debts.length} debts`);
    
    isLoading = false;
    return true;
    
  } catch (error) {
    console.error("❌ Lỗi tải:", error);
    isLoading = false;
    return false;
  }
}

// ========== REALTIME LISTENER - CHỈ MỘT LISTENER DUY NHẤT ==========
// ========== REALTIME LISTENER NÂNG CAO ==========
function setupRealtimeListener() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  // Cleanup listener cũ
  if (realtimeListenerRef) {
    realtimeListenerRef.off();
    realtimeListenerRef = null;
  }
  
  console.log("📡 Đang thiết lập realtime listener nâng cao...");
  
  // Lắng nghe tất cả thay đổi trên STORE_ID chung
  const allDataRef = database.ref(`cafeData/${STORE_ID}`);
  realtimeListenerRef = allDataRef;
  
  // ========== LẮNG NGHE CHILD_CHANGED (cập nhật) ==========
  allDataRef.on('child_changed', async (snapshot) => {
    if (window._isRealtimeUpdate) {
      console.log("⏭️ Bỏ qua realtime (đang xử lý)");
      return;
    }
    
    const changedData = snapshot.val();
    const path = snapshot.key;
    
    // Bỏ qua nếu dữ liệu đến từ chính thiết bị này
    if (changedData && (changedData._syncedByDevice === deviceId || changedData._modifiedByDevice === deviceId)) {
      console.log(`⏭️ Bỏ qua self-update từ device ${deviceId}`);
      return;
    }
    
    console.log(`📡 Phát hiện thay đổi tại: ${path}`);
    
    window._isRealtimeUpdate = true;
    
    try {
      await handleRealtimeUpdate(path, changedData);
    } catch (error) {
      console.error("❌ Lỗi xử lý realtime:", error);
    } finally {
      setTimeout(() => { 
        window._isRealtimeUpdate = false; 
      }, 500);
    }
  });
  
  // ========== LẮNG NGHE CHILD_ADDED (thêm mới) ==========
  allDataRef.on('child_added', async (snapshot) => {
    if (window._isRealtimeUpdate) return;
    
    const addedData = snapshot.val();
    const path = snapshot.key;
    
    if (addedData && addedData._modifiedByDevice === deviceId) return;
    
    console.log(`📡 Phát hiện thêm mới tại: ${path}`);
    
    window._isRealtimeUpdate = true;
    
    try {
      await handleRealtimeUpdate(path, addedData);
    } catch (error) {
      console.error("❌ Lỗi xử lý realtime add:", error);
    } finally {
      setTimeout(() => { 
        window._isRealtimeUpdate = false; 
      }, 500);
    }
  });
  
  // ========== LẮNG NGHE CHILD_REMOVED (xóa) ==========
  allDataRef.on('child_removed', async (snapshot) => {
    if (window._isRealtimeUpdate) return;
    
    const removedPath = snapshot.key;
    
    console.log(`📡 Phát hiện xóa tại path: ${removedPath}`);
    
    window._isRealtimeUpdate = true;
    
    try {
      await handleRealtimeRemoval(removedPath);
    } catch (error) {
      console.error("❌ Lỗi xử lý realtime remove:", error);
    } finally {
      setTimeout(() => { 
        window._isRealtimeUpdate = false; 
      }, 500);
    }
  });
  
  console.log("✅ Realtime listener nâng cao đã sẵn sàng");
}

// ========== XỬ LÝ CẬP NHẬT/NHẬP DỮ LIỆU ==========
async function handleRealtimeUpdate(path, data) {
  const parts = path.split('/');
  
  // Xử lý metadata
  if (path === 'metadata') {
    const metadata = data;
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
          refreshUIAfterUpdate();
        }
      }
    }
    return;
  }
  
  // Xử lý reports, expenses, adminExpenses, debtTransactions
  if (parts.length >= 4) {
    const type = parts[0];
    const year = parts[1];
    const month = parts[2];
    const day = parts[3];
    const itemId = parts[4];
    const changedDate = `${year}-${month}-${day}`;
    
    console.log(`📡 Xử lý ${type} ngày ${changedDate} ${itemId ? `ID: ${itemId}` : ''}`);
    
    // Tải lại dữ liệu mới nhất của ngày này
    const [reportSnap, expensesSnap, adminExpensesSnap, debtsSnap] = await Promise.all([
      database.ref(`cafeData/${STORE_ID}/reports/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${STORE_ID}/expenses/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${STORE_ID}/adminExpenses/${year}/${month}/${day}`).once('value'),
      database.ref(`cafeData/${STORE_ID}/debtTransactions/${year}/${month}/${day}`).once('value')
    ]);
    
    const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    // Cập nhật report
    const newReport = reportSnap.val();
    if (newReport) {
      if (!localData.reports) localData.reports = {};
      const cleanReport = { ...newReport };
      delete cleanReport._syncedAt;
      delete cleanReport._syncedBy;
      delete cleanReport._syncedByEmail;
      delete cleanReport._syncedByRole;
      delete cleanReport._syncedByDevice;
      localData.reports[changedDate] = cleanReport;
    } else if (localData.reports && localData.reports[changedDate]) {
      delete localData.reports[changedDate];
    }
    
    // 🔥 Cập nhật expenses - XÓA CÁC ITEM CŨ, THAY BẰNG DỮ LIỆU MỚI TỪ SERVER
    localData.expenses = (localData.expenses || []).filter(e => e.date !== changedDate);
    
    const newExpensesMap = expensesSnap.val() || {};
    Object.entries(newExpensesMap).forEach(([id, exp]) => {
      // ⚠️ QUAN TRỌNG: Chỉ thêm item nếu chưa bị xóa
      if (!exp.deleted) {
        const cleanExp = { ...exp };
        delete cleanExp._modifiedBy;
        delete cleanExp._modifiedByRole;
        delete cleanExp._modifiedByDevice;
        localData.expenses.push({ id, date: changedDate, ...cleanExp });
      }
      // Nếu exp.deleted === true thì KHÔNG thêm vào (đã xóa trên server)
    });
    
    // 🔥 Cập nhật adminExpenses tương tự
    localData.adminExpenses = (localData.adminExpenses || []).filter(e => e.date !== changedDate);
    const newAdminExpensesMap = adminExpensesSnap.val() || {};
    Object.entries(newAdminExpensesMap).forEach(([id, exp]) => {
      if (!exp.deleted) {
        const cleanExp = { ...exp };
        delete cleanExp._modifiedBy;
        delete cleanExp._modifiedByRole;
        delete cleanExp._modifiedByDevice;
        localData.adminExpenses.push({ id, date: changedDate, ...cleanExp });
      }
    });
    
    // 🔥 Cập nhật debts - XÓA CÁC ITEM CŨ, THAY BẰNG DỮ LIỆU MỚI TỪ SERVER
    localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== changedDate);
    const newDebtsMap = debtsSnap.val() || {};
    Object.entries(newDebtsMap).forEach(([id, debt]) => {
      if (!debt.deleted) {
        const cleanDebt = { ...debt };
        delete cleanDebt._modifiedBy;
        delete cleanDebt._modifiedByRole;
        delete cleanDebt._modifiedByDevice;
        localData.debtTransactions.push({ id, date: changedDate, ...cleanDebt });
      }
    });
    
    // Cập nhật version
    localData._version = (localData._version || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    window.appData = localData;
    
    // Hiển thị thông báo
    const action = data ? (data.deleted ? "xóa" : "cập nhật") : "cập nhật";
    showToast(`📡 Đã ${action} dữ liệu ngày ${formatDisplayDate(changedDate)}`);
    refreshUIAfterUpdate();
  }
}

// ========== XỬ LÝ XÓA DỮ LIỆU ==========
async function handleRealtimeRemoval(path) {
  const parts = path.split('/');
  
  if (parts.length >= 4) {
    const type = parts[0];
    const year = parts[1];
    const month = parts[2];
    const day = parts[3];
    const changedDate = `${year}-${month}-${day}`;
    
    console.log(`📡 Xử lý xóa ${type} ngày ${changedDate}`);
    
    const localData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    // Xóa toàn bộ dữ liệu của ngày đó khỏi local
    if (type === 'reports' && localData.reports) {
      delete localData.reports[changedDate];
    } else if (type === 'expenses') {
      localData.expenses = (localData.expenses || []).filter(e => e.date !== changedDate);
    } else if (type === 'adminExpenses') {
      localData.adminExpenses = (localData.adminExpenses || []).filter(e => e.date !== changedDate);
    } else if (type === 'debtTransactions') {
      localData.debtTransactions = (localData.debtTransactions || []).filter(d => d.date !== changedDate);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    window.appData = localData;
    
    showToast(`📡 Đã xóa dữ liệu ngày ${formatDisplayDate(changedDate)}`);
    refreshUIAfterUpdate();
  }
}

// Helper: Refresh UI sau khi cập nhật dữ liệu (ĐÃ THÊM DOANH THU)
function refreshUIAfterUpdate() {
  // Cập nhật lại toàn bộ UI
  if (typeof loadTodayData === 'function') loadTodayData();
  if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
  if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
  if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
  if (typeof renderRecentAdminExpenses === 'function') renderRecentAdminExpenses();
  if (typeof updateTotalDebtDisplay === 'function') updateTotalDebtDisplay();
  
  // ========== THÊM MỚI: Cập nhật lại doanh thu trên UI ==========
  const currentDate = getCurrentDate();
  const revenueElement = document.getElementById("revenueTotal");
  if (revenueElement && typeof calculateRevenueTotal === 'function') {
    revenueElement.innerText = formatMoney(calculateRevenueTotal(currentDate));
  }
  
  const managerRevenueElement = document.getElementById("managerRevenue");
  if (managerRevenueElement && typeof calculateRevenueInRange === 'function' && window.currentRange) {
    const revenue = calculateRevenueInRange(window.currentRange);
    managerRevenueElement.innerText = formatMoney(revenue);
  }
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
    window.appData._lastModifiedBy = deviceId;
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
  if (realtimeListenerRef) {
    realtimeListenerRef.off();
    realtimeListenerRef = null;
  }
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncQueue = [];
  isSyncing = false;
  isLoading = false;
  isInitialized = false;
  window._isRealtimeUpdate = false;
}

// ========== FORCE SYNC ==========
async function forceSync() {
  if (typeof showToast === 'function') showToast("🔄 Đang đồng bộ...");
  await syncToFirebase();
  await loadFromFirebase();
  refreshUIAfterUpdate();
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