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
const userInfoSpan = document.getElementById("userInfo");

// Hàm lấy device ID
function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

// Lưu thông tin đăng nhập
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

// Kiểm tra user đầu tiên
async function checkFirstUser(user) {
  try {
    if (!user) return;
    
    const roleSnapshot = await database.ref(`users/${user.uid}/role`).once('value');
    if (roleSnapshot.exists()) {
      console.log("User đã có role:", roleSnapshot.val());
      return;
    }
    
    const usersSnapshot = await database.ref('users').once('value');
    let userCount = 0;
    usersSnapshot.forEach(() => userCount++);
    
    const role = userCount === 1 ? ROLES.ADMIN : ROLES.STAFF;
    
    await database.ref(`users/${user.uid}/role`).set(role);
    await database.ref(`users/${user.uid}/profile/role`).set(role);
    console.log(`✓ Set role ${role} cho user ${user.email}`);
  } catch (error) {
    console.error("Lỗi kiểm tra user đầu tiên:", error);
  }
}

// Đăng nhập
async function login(email, password) {
  try {
    if (loginError) loginError.innerText = "";
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    
    await saveLoginInfo(user);
    await checkFirstUser(user);
    
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userUid", user.uid);
    
    showApp(user);
    
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    let message = "Đăng nhập thất bại";
    switch (error.code) {
      case 'auth/user-not-found': message = "Email không tồn tại"; break;
      case 'auth/wrong-password': message = "Sai mật khẩu"; break;
      case 'auth/invalid-email': message = "Email không hợp lệ"; break;
      case 'auth/too-many-requests': message = "Quá nhiều lần thử"; break;
    }
    if (loginError) loginError.innerText = message;
  }
}

// Đăng ký
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
    
    const role = ROLES.STAFF;
    
    await database.ref(`users/${user.uid}/profile`).set({
      email: user.email,
      role: role,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      lastLogin: firebase.database.ServerValue.TIMESTAMP
    });
    
    await database.ref(`users/${user.uid}/role`).set(role);
    await saveLoginInfo(user);
    await checkFirstUser(user);
    
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userUid", user.uid);
    
    showApp(user);
    
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    let message = "Đăng ký thất bại";
    switch (error.code) {
      case 'auth/email-already-in-use': message = "Email đã được sử dụng"; break;
      case 'auth/invalid-email': message = "Email không hợp lệ"; break;
      case 'auth/weak-password': message = "Mật khẩu phải có ít nhất 6 ký tự"; break;
    }
    if (registerError) registerError.innerText = message;
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
    
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userUid");
    
    hideApp();
    showToast("✓ Đã đăng xuất");
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
  }
}

// Hiển thị app
function showApp(user) {
  console.log("showApp called", user);
  
  // Ẩn login bằng class riêng
  if (loginScreen) {
    loginScreen.classList.remove("login-screen--visible");
    loginScreen.classList.add("login-screen--hidden");
  }
  
  // Hiện app bằng class riêng
  if (appContainer) {
    appContainer.classList.remove("app-container--hidden");
    appContainer.classList.add("app-container--visible");
  }
  
  if (userInfoSpan) {
    userInfoSpan.innerHTML = `<span class="user-name">${user.email}</span>`;
  }
  
  // Cập nhật trạng thái admin
  if (typeof updateAdminStatus === 'function') {
    updateAdminStatus();
  }
  
  // Tải dữ liệu
  setTimeout(() => {
    if (typeof loadTodayData === 'function') loadTodayData();
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
    if (typeof loadFromFirebase === 'function') loadFromFirebase();
  }, 100);
}

// Ẩn app
function hideApp() {
  console.log("hideApp called");
  
  // Hiện login
  if (loginScreen) {
    loginScreen.classList.remove("login-screen--hidden");
    loginScreen.classList.add("login-screen--visible");
  }
  
  // Ẩn app
  if (appContainer) {
    appContainer.classList.remove("app-container--visible");
    appContainer.classList.add("app-container--hidden");
  }
}

// Chuyển đổi form
if (showRegister) {
  showRegister.onclick = () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    if (loginForm) loginForm.classList.add("hidden-form");
    if (registerForm) registerForm.classList.remove("hidden-form");
    if (loginError) loginError.innerText = "";
    if (registerError) registerError.innerText = "";
  };
}

if (showLogin) {
  showLogin.onclick = () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    if (registerForm) registerForm.classList.add("hidden-form");
    if (loginForm) loginForm.classList.remove("hidden-form");
    if (loginError) loginError.innerText = "";
    if (registerError) registerError.innerText = "";
  };
}

// Gán sự kiện
if (loginBtn) {
  loginBtn.onclick = () => {
    const email = loginEmail?.value.trim() || "";
    const password = loginPassword?.value || "";
    if (email && password) {
      login(email, password);
    } else if (loginError) {
      loginError.innerText = "Vui lòng nhập email và mật khẩu";
    }
  };
}

if (registerBtn) {
  registerBtn.onclick = () => {
    const email = registerEmail?.value.trim() || "";
    const password = registerPassword?.value || "";
    const confirm = registerConfirmPassword?.value || "";
    if (email && password) {
      register(email, password, confirm);
    } else if (registerError) {
      registerError.innerText = "Vui lòng nhập đầy đủ thông tin";
    }
  };
}

if (logoutBtn) {
  logoutBtn.onclick = logout;
}

// Enter để submit
if (loginPassword) {
  loginPassword.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && loginBtn) loginBtn.click();
  });
}
if (registerConfirmPassword) {
  registerConfirmPassword.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && registerBtn) registerBtn.click();
  });
}

// Theo dõi auth state
auth.onAuthStateChanged(async (user) => {
  console.log("Auth state changed:", user ? user.email : "null");
  if (user) {
    await checkFirstUser(user);
    showApp(user);
  } else {
    hideApp();
  }
});