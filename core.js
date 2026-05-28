const STORAGE_KEY = "cafe_manager_full_v1";

// Khởi tạo dữ liệu mặc định
const defaultData = {
  reports: {},
  expenses: [],
  adminExpenses: [],
  debtTransactions: [],
  categories: {
    expenses: [],
    adminExpenses: [],
    customers: []
  },
  recent: {
    expenses: [],
    adminExpenses: [],
    customers: []
  }
};

// Tạo biến toàn cục DUY NHẤT trên window
window.AppData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData;

// Tạo alias appData để code cũ vẫn chạy (tham chiếu đến cùng object)
var appData = window.AppData;

// Đảm bảo window.appData cũng trỏ đến cùng object (để firebase-sync dùng)
window.appData = window.AppData;

let editingExpenseId = null;
let editingDebtId = null;
let editingAdminExpenseId = null;

let toastTimeout;
const toast = document.getElementById("toast");

function showToast(message){
  clearTimeout(toastTimeout);
  toast.innerText = message;
  toast.classList.add("show");
  toastTimeout = setTimeout(()=>{
    toast.classList.remove("show");
  },1200);
}

// ========== HÀM TÍNH DOANH THU ==========

// Tính tổng doanh thu của một ngày (Tiền mặt + Chuyển khoản)
function calculateRevenueTotal(date) {
  if (!appData || !appData.reports) return 0;
  const report = appData.reports[date];
  if (!report) return 0;
  
  const cash = parseMoney(report.cash || 0);
  const bank = parseMoney(report.bank || 0);
  return cash + bank;
}

// Export các hàm ra window
window.calculateRevenueTotal = calculateRevenueTotal;

// ========== SAVE DATA (CÓ VERSION) ==========
function saveData(){
  if (window._isRealtimeUpdate) {
    console.log("⏭️ Bỏ qua save (đang realtime update)");
    return;
  }
  // Tăng global version để theo dõi thay đổi
  if (appData) {
    appData._globalVersion = (appData._globalVersion || 0) + 1;
    appData._lastModified = Date.now();
    appData._lastModifiedBy = localStorage.getItem("deviceId") || 'unknown';
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function createId(prefix="id"){
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
}

function parseMoney(value){
  if (!value) return 0;
  return Number(String(value).replace(/[^0-9]/g, "")) || 0;
}

function formatInputMoney(input){
  if (!input) return;
  input.addEventListener("input",()=>{
    let value = parseMoney(input.value);
    if(input.value.trim() === ""){
      input.value = "";
    }else{
      input.value = value.toLocaleString("vi-VN");
    }
  });
}

function getToday(){
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentDate(){
  return reportDate ? reportDate.value : getToday();
}

function formatDisplayDate(dateString){
  if (!dateString) return "";
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

// Tính tổng chi phí nhân viên
function calculateExpenseTotal(date){
  if (!appData || !appData.expenses) return 0;
  return appData.expenses
    .filter(x => x.date === date && !x.deleted)
    .reduce((a,b)=>a + (b.amount || 0), 0);
}

// Tính tổng chi phí quản lý
function calculateAdminExpenseTotal(date){
  if (!appData || !appData.adminExpenses) return 0;
  return appData.adminExpenses
    .filter(x => x.date === date && !x.deleted)
    .reduce((a,b)=>a + (b.amount || 0), 0);
}

// Tính tổng công nợ phát sinh
function calculateDebtTotal(date){
  if (!appData || !appData.debtTransactions) return 0;
  return appData.debtTransactions
    .filter(x => x.date === date && x.type === "debt_add" && !x.deleted)
    .reduce((a,b)=>a + (b.amount || 0), 0);
}

// Tính công nợ của khách hàng
function calculateCustomerDebt(customer){
  if (!appData || !appData.debtTransactions) return 0;
  let balance = 0;
  appData.debtTransactions
    .filter(x => x.customer === customer && !x.deleted)
    .forEach(item=>{
      if(item.type === "debt_add"){
        balance += item.amount || 0;
      }else{
        balance -= item.amount || 0;
      }
    });
  return balance;
}

function getReport(date){
  if (!appData || !appData.reports) {
    return { bank:0, cash:0, reserve:0, revenue:0, grab:0, status:"draft" };
  }
  if(!appData.reports[date]){
    appData.reports[date] = {
      bank:0,
      cash:0,
      reserve:0,
      revenue:0,
      grab:0,
      status:"draft"
    };
  }
  return appData.reports[date];
}

// Tính tổng doanh thu trong kỳ (tính theo cash + bank - THỰC THU)
function calculateRevenueInRange(range) {
  let totalRevenue = 0;
  if (!appData || !appData.reports) return 0;
  
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range)) {
      const cash = parseMoney(report.cash || 0);
      const bank = parseMoney(report.bank || 0);
      totalRevenue += (cash + bank);
    }
  });
  return totalRevenue;
}

// Tính tổng Grab trong kỳ
function calculateGrabInRange(range) {
  let total = 0;
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range)) {
      total += parseMoney(report.grab || 0);
    }
  });
  return total;
}

// Lấy chi tiết doanh thu theo ngày
function getRevenueDetails(range) {
  const details = [];
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range) && (report.revenue || 0) > 0) {
      details.push({ date, amount: parseMoney(report.revenue) });
    }
  });
  return details.sort((a,b) => b.date.localeCompare(a.date));
}

// Lấy chi tiết Grab theo ngày
function getGrabDetails(range) {
  const details = [];
  Object.entries(appData.reports).forEach(([date, report]) => {
    if (isDateInRange(date, range) && (report.grab || 0) > 0) {
      details.push({ date, amount: parseMoney(report.grab) });
    }
  });
  return details.sort((a,b) => b.date.localeCompare(a.date));
}

// ========== ĐẢM BẢO CẤU TRÚC DỮ LIỆU ==========
function ensureAppDataStructure() {
  if (!appData) {
    appData = {
      reports: {},
      expenses: [],
      adminExpenses: [],
      debtTransactions: [],
      categories: { expenses: [], adminExpenses: [], customers: [] },
      recent: { expenses: [], adminExpenses: [], customers: [] }
    };
  }
  
  if (!appData.reports) appData.reports = {};
  if (!appData.expenses) appData.expenses = [];
  if (!appData.adminExpenses) appData.adminExpenses = [];
  if (!appData.debtTransactions) appData.debtTransactions = [];
  
  if (!appData.categories) appData.categories = { expenses: [], adminExpenses: [], customers: [] };
  if (!appData.categories.expenses) appData.categories.expenses = [];
  if (!appData.categories.adminExpenses) appData.categories.adminExpenses = [];
  if (!appData.categories.customers) appData.categories.customers = [];
  
  if (!appData.recent) appData.recent = { expenses: [], adminExpenses: [], customers: [] };
  if (!appData.recent.expenses) appData.recent.expenses = [];
  if (!appData.recent.adminExpenses) appData.recent.adminExpenses = [];
  if (!appData.recent.customers) appData.recent.customers = [];
  
  // Đảm bảo mỗi report có revenue và grab
  Object.keys(appData.reports).forEach(date => {
    const report = appData.reports[date];
    if (report.revenue === undefined) report.revenue = 0;
    if (report.grab === undefined) report.grab = 0;
  });
}

ensureAppDataStructure();

// ========== POPUP ==========
function openPopup(id){
  const popup = document.getElementById(id);
  if(popup) {
    popup.classList.remove("hidden");
    
    setTimeout(() => {
      const handleClickOutside = (e) => {
        if (e.target === popup) {
          closePopup(id);
          document.removeEventListener('click', handleClickOutside);
        }
      };
      popup.addEventListener('click', handleClickOutside);
      popup._clickOutsideHandler = handleClickOutside;
    }, 0);
  }
}

function closePopup(id){
  const popup = document.getElementById(id);
  if(popup) {
    popup.classList.add("hidden");
    if(popup._clickOutsideHandler) {
      popup.removeEventListener('click', popup._clickOutsideHandler);
      delete popup._clickOutsideHandler;
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openPopups = document.querySelectorAll('.popup:not(.hidden)');
    openPopups.forEach(popup => {
      closePopup(popup.id);
    });
  }
});

function addCategory(type,name){
  if(!name) return;
  if(!appData.categories[type].includes(name)){
    appData.categories[type].push(name);
  }
}

function addRecent(type,name){
  appData.recent[type] = appData.recent[type].filter(x => x !== name);
  appData.recent[type].unshift(name);
  appData.recent[type] = appData.recent[type].slice(0,5);
}

function renderDropdown(input, dropdown, list){
  const keyword = input.value.trim().toLowerCase();
  const unique = [...new Set(list)];
  const sorted = unique.sort((a,b)=>{
    const recentA = appData.recent.expenses.indexOf(a);
    const recentB = appData.recent.expenses.indexOf(b);
    if(recentA === -1) return 1;
    if(recentB === -1) return -1;
    return recentA - recentB;
  });
  let html = "";
  sorted
    .filter(x => x.toLowerCase().includes(keyword))
    .slice(0,20)
    .forEach(item=>{
      html += `<div class="dropdown-item">${item}</div>`;
    });
  if(keyword && !sorted.includes(input.value.trim())){
    html += `<div class="dropdown-item">+ Tạo mới "${input.value.trim()}"</div>`;
  }
  dropdown.innerHTML = html;
}

function getPeriodRange(dateString){
  const d = new Date(dateString);
  let start, end;
  if(d.getDate() >= 20){
    start = new Date(d.getFullYear(), d.getMonth(), 20);
    end = new Date(d.getFullYear(), d.getMonth()+1, 19);
  }else{
    start = new Date(d.getFullYear(), d.getMonth()-1, 20);
    end = new Date(d.getFullYear(), d.getMonth(), 19);
  }
  return { start, end };
}

function isInPeriod(date,period){
  const d = new Date(date);
  return d >= period.start && d <= period.end;
}

// ========== KIỂM TRA QUYỀN ==========
function isEditable(date) {
  const today = getToday();
  const isAdmin = window.isAdminSync ? window.isAdminSync() : false;
  if (isAdmin) return true;
  if (date === today) return true;
  return false;
}

function isAddable(date){
  const today = getToday();
  if(date === today) return true;
  const report = getReport(date);
  if (report.status === "completed") {
    return window.isAdminSync ? window.isAdminSync() : false;
  }
  return false;
}

// ========== FORMAT TIỀN ==========
function formatMoney(value) {
  if (value === undefined || value === null) return "0đ";
  return Number(value).toLocaleString("vi-VN") + "đ";
}

function formatNumberForInput(value) {
  if (value === undefined || value === null) return "";
  return Number(value).toLocaleString("vi-VN");
}

// ========== SETUP MONEY INPUTS ==========
function setupMoneyInputs() {
  const moneyInputs = [
    'cashInput', 'bankInput', 'reserveInput',
    'expenseAmount', 'debtAmount', 'adminExpenseAmount',
    'paymentAmount', 'grabInput', 'revenueInput',
  ];
  
  moneyInputs.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.addEventListener('blur', function() {
      let num = parseMoney(this.value);
      if (num > 0) {
        this.value = num.toLocaleString('vi-VN');
      } else {
        this.value = '';
      }
    });
    
    newInput.addEventListener('focus', function() {
      let num = parseMoney(this.value);
      if (num > 0) {
        this.value = num.toString();
      } else {
        this.value = '';
      }
    });
    
    newInput.addEventListener('keypress', function(e) {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });
  });
}

// Tính tổng công nợ tất cả khách hàng
function calculateTotalDebtAll() {
  if (!appData || !appData.debtTransactions) return 0;
  
  const allCustomers = new Set();
  if (appData.categories?.customers) {
    appData.categories.customers.forEach(c => allCustomers.add(c));
  }
  if (appData.recent?.customers) {
    appData.recent.customers.forEach(c => allCustomers.add(c));
  }
  appData.debtTransactions.forEach(t => {
    if (!t.deleted && t.customer) allCustomers.add(t.customer);
  });
  
  let total = 0;
  allCustomers.forEach(customer => {
    total += calculateCustomerDebt(customer);
  });
  return total;
}

// ========== RENDER TOÀN BỘ UI ==========
function renderAllUI() {
  console.log("🎨 renderAllUI() - Đang render toàn bộ giao diện...");
  
  const currentDate = getCurrentDate();
  
  if (typeof loadTodayData === 'function') loadTodayData();
  if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
  
  const totalDebtElement = document.getElementById("totalDebtAll");
  if (totalDebtElement) {
    totalDebtElement.innerText = formatMoney(calculateTotalDebtAll());
  }
  
  const activeTab = document.querySelector('.tab-content.active')?.id;
  if (activeTab === 'managerTab') {
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard();
  }
  
  if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
  if (typeof renderRecentCustomers === 'function') renderRecentCustomers();
  if (typeof renderRecentAdminExpenses === 'function') renderRecentAdminExpenses();
  
  const report = appData?.reports?.[currentDate];
  
  const expenseTotalEl = document.getElementById("expenseTotal");
  if (expenseTotalEl) {
    expenseTotalEl.innerText = formatMoney(calculateExpenseTotal(currentDate));
  }
  
  const debtTotalEl = document.getElementById("debtTotal");
  if (debtTotalEl) {
    debtTotalEl.innerText = formatMoney(calculateDebtTotal(currentDate));
  }
  
  const dayStatus = document.getElementById("dayStatus");
  if (dayStatus && report) {
    dayStatus.innerHTML = report.status === "completed" ? "🟢 Đã chốt" : "🟡 Đang nhập";
  }
  
  const bankInput = document.getElementById("bankInput");
  const cashInput = document.getElementById("cashInput");
  const reserveInput = document.getElementById("reserveInput");
  
  if (bankInput && report) bankInput.value = formatNumberForInput(report.bank || 0);
  if (cashInput && report) cashInput.value = formatNumberForInput(report.cash || 0);
  if (reserveInput && report) reserveInput.value = formatNumberForInput(report.reserve || 0);
  
  console.log("✅ renderAllUI() - Hoàn tất!");
}

function refreshUIData() {
  console.log("🔄 refreshUIData() - Cập nhật dữ liệu...");
  if (typeof loadTodayData === 'function') loadTodayData();
  if (typeof renderCustomerDebtList === 'function') renderCustomerDebtList();
  const totalDebtElement = document.getElementById("totalDebtAll");
  if (totalDebtElement) {
    totalDebtElement.innerText = formatMoney(calculateTotalDebtAll());
  }
}

// ========== BLOCK MOBILE ZOOM ==========
document.addEventListener("gesturestart", function(e){
  e.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener("touchend", function(e){
  const now = Date.now();
  if(now - lastTouchEnd <= 300){
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

function initDefaultData() {
  if (!appData || Object.keys(appData).length === 0) {
    appData = {
      reports: {},
      expenses: [],
      adminExpenses: [],
      debtTransactions: [],
      categories: { expenses: [], adminExpenses: [], customers: [] },
      recent: { expenses: [], adminExpenses: [], customers: [] }
    };
    saveData();
  }
  ensureAppDataStructure();
}

initDefaultData();
setupMoneyInputs();

// Export
window.renderAllUI = renderAllUI;
window.refreshUIData = refreshUIData;
window.calculateTotalDebtAll = calculateTotalDebtAll;
window.calculateAdminExpenseTotal = calculateAdminExpenseTotal;
window.calculateRevenueInRange = calculateRevenueInRange;
window.calculateGrabInRange = calculateGrabInRange;
window.getRevenueDetails = getRevenueDetails;
window.getGrabDetails = getGrabDetails;
window.formatMoney = formatMoney;
window.formatNumberForInput = formatNumberForInput;
window.parseMoney = parseMoney;
window.showToast = showToast;