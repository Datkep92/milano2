const STORAGE_KEY = "cafe_manager_full_v1";

let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  reports:{},
  expenses:[],
  debtTransactions:[],
  categories:{
    expenses:[],
    customers:[]
  },
  recent:{
    expenses:[],
    customers:[]
  }
};

let editingExpenseId = null;
let editingDebtId = null;

let toastTimeout;
const toast = document.getElementById("toast");

function showToast(message){
  clearTimeout(toastTimeout);
  if (toast) {
    toast.innerText = message;
    toast.classList.add("show");
    toastTimeout = setTimeout(()=>{
      toast.classList.remove("show");
    }, 1200);
  } else {
    alert(message);
  }
}

function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function createId(prefix="id"){
  return prefix + "_" + Date.now();
}

function parseMoney(value){
  return Number(String(value).replace(/\./g,"").replace(/,/g,"")) || 0;
}

function formatMoney(value){
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
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
  const reportDateElem = document.getElementById("reportDate");
  if (reportDateElem) {
    return reportDateElem.value;
  }
  return getToday();
}

function formatDisplayDate(dateString){
  if (!dateString) return "";
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function getReport(date){
  if(!appData.reports[date]){
    appData.reports[date] = {
      bank:0,
      cash:0,
      reserve:0,
      status:"draft"
    };
  }
  return appData.reports[date];
}

function openPopup(id){
  const popup = document.getElementById(id);
  if (popup) {
    popup.classList.remove("popup--hidden");
  }
}

function closePopup(id){
  const popup = document.getElementById(id);
  if (popup) {
    popup.classList.add("popup--hidden");
  }
}

function calculateExpenseTotal(date){
  return appData.expenses
    .filter(x => x.date === date && !x.deleted)
    .reduce((a,b)=>a+b.amount,0);
}

function calculateDebtTotal(date){
  return appData.debtTransactions
    .filter(x => x.date === date && x.type === "debt_add" && !x.deleted)
    .reduce((a,b)=>a+b.amount,0);
}

function calculateCustomerDebt(customer){
  let balance = 0;
  appData.debtTransactions
    .filter(x => x.customer === customer && !x.deleted)
    .forEach(item=>{
      if(item.type === "debt_add"){
        balance += item.amount;
      }else{
        balance -= item.amount;
      }
    });
  return balance;
}

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
  if (!input || !dropdown) return;
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

function isEditable(date){
  const today = getToday();
  if(date === today) return true;
  const report = getReport(date);
  
  if (report.status === "completed") {
    return window.isAdminSync ? window.isAdminSync() : false;
  }
  return true;
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