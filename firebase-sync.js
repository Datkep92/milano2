// ========== FIREBASE SYNC ĐƠN GIẢN ==========
// KHÔNG khai báo database ở đây (đã có trong firebase-config.js)

let isSyncing = false;

// Hàm đồng bộ lên Firebase
async function syncToFirebase() {
  if (isSyncing) return;
  
  isSyncing = true;
  
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    
    if (data) {
      // Lấy user hiện tại
      const user = firebase.auth().currentUser;
      if (!user) {
        console.log("Chưa đăng nhập, không thể đồng bộ");
        isSyncing = false;
        return;
      }
      
      // Đồng bộ theo từng user
      await database.ref(`cafeData/${user.uid}`).set({
        ...data,
        lastSync: firebase.database.ServerValue.TIMESTAMP
      });
      
      console.log("✓ Đã đồng bộ lên Firebase");
    }
  } catch (error) {
    console.error("Lỗi đồng bộ:", error);
  } finally {
    isSyncing = false;
  }
}

// Ghi đè hàm saveData
const originalSaveData = saveData;
window.saveData = function() {
  originalSaveData();
  syncToFirebase();
};

// Tải dữ liệu từ Firebase
async function loadFromFirebase() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      console.log("Chưa đăng nhập");
      return;
    }
    
    const snapshot = await database.ref(`cafeData/${user.uid}`).once('value');
    const firebaseData = snapshot.val();
    
    if (firebaseData && Object.keys(firebaseData).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseData));
      window.appData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      
      if (typeof loadTodayData === 'function') loadTodayData();
      if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
      if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
      if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
      
      console.log("✓ Đã tải dữ liệu từ Firebase");
    }
  } catch (error) {
    console.error("Lỗi tải Firebase:", error);
  }
}

// Export để dùng từ file khác
window.loadFromFirebase = loadFromFirebase;
window.syncToFirebase = syncToFirebase;