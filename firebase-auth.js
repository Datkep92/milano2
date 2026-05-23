// ========== HỆ THỐNG ĐĂNG NHẬP ==========

// DOM elements
const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerConfirmPassword = document.getElementById("registerConfirmPassword");
const registerBtn = document.getElementById("registerBtn");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");
const userInfo = document.getElementById("userInfo");

// Hàm lấy device ID
function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

// Lưu thông tin đăng nhập vào database
async function saveLoginInfo(user) {
  const deviceId = getDeviceId();
  const loginInfo = {
    uid: user.uid,
    email: user.email,
    deviceId: deviceId,
    lastLogin: firebase.database.ServerValue.TIMESTAMP,
    userAgent: navigator.userAgent,
    lastActive: firebase.database.ServerValue.TIMESTAMP
  };
  
  try {
    await database.ref(`users/${user.uid}/devices/${deviceId}`).set(loginInfo);
    await database.ref(`users/${user.uid}/profile/lastLogin`).set(firebase.database.ServerValue.TIMESTAMP);
    console.log("✓ Đã lưu thông tin đăng nhập");
  } catch (error) {
    console.error("Lỗi lưu thông tin đăng nhập:", error);
  }
}

// Đăng nhập
async function login(email, password) {
  try {
    if (loginError) loginError.innerText = "";
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    
    // Lưu thông tin đăng nhập
    await saveLoginInfo(user);
    
    // Lưu trạng thái
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userUid", user.uid);
    
    // Hiển thị app
    showApp(user);
    
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    let message = "Đăng nhập thất bại";
    switch (error.code) {
      case 'auth/user-not-found':
        message = "Email không tồn tại";
        break;
      case 'auth/wrong-password':
        message = "Sai mật khẩu";
        break;
      case 'auth/invalid-email':
        message = "Email không hợp lệ";
        break;
      case 'auth/too-many-requests':
        message = "Quá nhiều lần thử, vui lòng thử lại sau";
        break;
    }
    if (loginError) loginError.innerText = message;
  }
}



// Đăng xuất
async function logout() {
  try {
    const user = auth.currentUser;
    if (user) {
      const deviceId = getDeviceId();
      await database.ref(`users/${user.uid}/devices/${deviceId}/lastLogout`).set(firebase.database.ServerValue.TIMESTAMP);
    }
    
    await auth.signOut();
    
    // Xóa trạng thái
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userUid");
    
    // Ẩn app, hiện login
    hideApp();
    
    showToast("✓ Đã đăng xuất");
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
  }
}












// Kiểm tra trạng thái đăng nhập khi load trang
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Đã đăng nhập
    showApp(user);
  } else {
    // Chưa đăng nhập
    hideApp();
  }
});

// Kiểm tra xem có user nào chưa (tài khoản đầu tiên là admin)
async function checkFirstUser() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("Chưa đăng nhập");
      return;
    }
    
    // Kiểm tra xem user này đã có role chưa
    const roleSnapshot = await database.ref(`users/${user.uid}/role`).once('value');
    const existingRole = roleSnapshot.val();
    
    if (existingRole) {
      console.log("User đã có role:", existingRole);
      return;
    }
    
    // Nếu chưa có role, kiểm tra tổng số user
    const usersSnapshot = await database.ref('users').once('value');
    const userCount = usersSnapshot.numChildren();
    
    // Nếu chưa có user nào (hoặc chỉ có user hiện tại chưa có role), set làm admin
    if (userCount === 0 || (userCount === 1 && !existingRole)) {
      await database.ref(`users/${user.uid}/role`).set(ROLES.ADMIN);
      await database.ref(`users/${user.uid}/profile/role`).set(ROLES.ADMIN);
      console.log("✓ Tài khoản được set làm ADMIN");
      
      // Reload để cập nhật giao diện
      if (typeof window.location !== 'undefined') {
        window.location.reload();
      }
    } else {
      // User thường, set làm staff
      await database.ref(`users/${user.uid}/role`).set(ROLES.STAFF);
      await database.ref(`users/${user.uid}/profile/role`).set(ROLES.STAFF);
      console.log("✓ Tài khoản được set làm STAFF");
    }
  } catch (error) {
    console.error("Lỗi kiểm tra user đầu tiên:", error);
    // Không hiển thị alert để tránh làm phiền user
  }
}

async function register(email, password, confirmPassword) {
  try {
    if (registerError) registerError.innerText = "";
    
    if (password !== confirmPassword) {
      registerError.innerText = "Mật khẩu xác nhận không khớp";
      return;
    }
    
    if (password.length < 6) {
      registerError.innerText = "Mật khẩu phải có ít nhất 6 ký tự";
      return;
    }
    
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;
    
    // Mặc định là STAFF (sẽ được cập nhật sau bởi checkFirstUser)
    const role = ROLES.STAFF;
    
    // Tạo user profile
    await database.ref(`users/${user.uid}/profile`).set({
      email: user.email,
      role: role,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      lastLogin: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Set role
    await database.ref(`users/${user.uid}/role`).set(role);
    
    // Lưu thông tin thiết bị
    await saveLoginInfo(user);
    
    // Lưu trạng thái
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userUid", user.uid);
    
    // Hiển thị app
    showApp(user);
    
    // Kiểm tra và set admin nếu là user đầu tiên
    await checkFirstUser();
    
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    let message = "Đăng ký thất bại";
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = "Email đã được sử dụng";
        break;
      case 'auth/invalid-email':
        message = "Email không hợp lệ";
        break;
      case 'auth/weak-password':
        message = "Mật khẩu phải có ít nhất 6 ký tự";
        break;
    }
    if (registerError) registerError.innerText = message;
  }
}


  
  // Hiển thị app, ẩn login
function showApp(user) {
  const loginScreen = document.getElementById("loginScreen");
  const appContainer = document.getElementById("appContainer");
  
  if (loginScreen) {
    loginScreen.classList.add("hidden");
    loginScreen.style.display = "none"; // Force ẩn
  }
  if (appContainer) {
    appContainer.classList.remove("hidden");
    appContainer.style.display = "block"; // Force hiển thị
  }
  
  if (userInfo) userInfo.innerText = user.email;
  
  // Tải dữ liệu
  if (typeof loadFromFirebase === 'function') loadFromFirebase();
}

// Ẩn app, hiện login
function hideApp() {
  const loginScreen = document.getElementById("loginScreen");
  const appContainer = document.getElementById("appContainer");
  
  if (loginScreen) {
    loginScreen.classList.remove("hidden");
    loginScreen.style.display = "flex";
  }
  if (appContainer) {
    appContainer.classList.add("hidden");
    appContainer.style.display = "none";
  }
}