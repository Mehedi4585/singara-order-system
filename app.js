import { db } from './firebase-config.js';
import { ref, set, get, child, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const ADMIN_PASS = "admin123"; // change as needed
const PRICE_PER_SINGARA = 12;
const ORDERS_KEY = "singara_orders_v2";
const PAYMENTS_KEY = "singara_payments_v2";

/* ======================
   UTIL: date helpers
   ====================== */
function todayISO(){ 
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function formatDateBN(datetimeStr){
  try{
    const dt = new Date(datetimeStr);
    return dt.toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });
  }catch(e){
    return datetimeStr;
  }
}
function todayLabelText(){
  const d = new Date();
  return d.toLocaleDateString('bn-BD', { timeZone:'Asia/Dhaka' });
}
document.getElementById('todayLabel').textContent = todayLabelText();

/* ======================
   STORAGE helpers
   ====================== */
function loadOrders(){
  return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
}
function saveOrders(list){
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}
function loadPayments(){
  return JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "{}");
}
function savePayments(obj){
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(obj));
}

/* ======================
   ORDER: save & UI
   ====================== */
async function saveOrder(name, qty, note){
  const now = new Date();
  const order = {
    id: 'o' + Date.now(),
    name: name,
    quantity: parseInt(qty,10),
    price: parseInt(qty,10) * PRICE_PER_SINGARA,
    note: note || "",
    isoDate: todayISO(),
    time: now.toISOString()
  };

  // save to localStorage
  const orders = loadOrders();
  orders.push(order);
  saveOrders(orders);

  // save to Firebase
  try{
    await push(ref(db, 'orders/'), order);
  }catch(e){
    console.error('Firebase saveOrder error:', e);
  }

  return order;
}

function resetOrderForm(){
  document.getElementById("orderForm").reset();
  document.getElementById("quantity").value = 1;
}

function renderTodayUserSummaryFor(name){
  const area = document.getElementById('todayUserSummary');
  if(!name) { area.style.display='none'; return; }
  const orders = loadOrders().filter(o => o.name.trim().toLowerCase() === name.trim().toLowerCase() && o.isoDate === todayISO());
  if(orders.length === 0){
    area.style.display='none';
    return;
  }
  const total = orders.reduce((s,o)=> s + o.quantity, 0);
  area.innerHTML = `আজকে তুমি মোট <strong>${total}</strong> পিস অর্ড করেছে। (${orders.length} টি ট্রানজ্যাকশন)।`;
  area.style.display = 'block';
}

/* ======================
   ORDER FORM SUBMIT
   ====================== */
document.getElementById('orderForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const name = document.getElementById('userName').value.trim();
  const qty = document.getElementById('quantity').value;
  const note = document.getElementById('note').value.trim();
  const msg = document.getElementById('orderMessage');

  msg.style.display='none';
  msg.classList.remove('success','error');

  if(!name || !qty || parseInt(qty,10) <= 0){
    msg.textContent = "অনুগ্রহ করে নাম এবং সঠিক পরিমাণ লিখুন।";
    msg.classList.add('error'); msg.style.display='block';
    return;
  }

  const order = await saveOrder(name, qty, note);

  msg.innerHTML = `✅ ${name}, আপনার ${qty} পিস সিঙ্গারা অর্ডার নেওয়া হয়েছে! মোট: <strong>${order.price} টাকা</strong>.`;
  msg.classList.add('success'); msg.style.display='block';

  renderTodayUserSummaryFor(name);

  setTimeout(()=>{ msg.style.display='none'; msg.classList.remove('success'); }, 4000);
  document.getElementById('quantity').value = 1;

  if(document.getElementById('adminPanelView').style.display !== 'none'){
    renderAdminReport();
  }
});

/* ======================
   ADMIN PANEL FUNCTIONS
   ====================== */
function showUserPanel(){
  document.getElementById('adminLoginView').style.display = 'block';
  document.getElementById('adminPanelView').style.display = 'none';
  document.getElementById('paymentPanelView').style.display = 'none';
}
function showAdminLogin(){
  document.getElementById('adminLoginView').style.display = 'block';
  document.getElementById('adminPanelView').style.display = 'none';
  document.getElementById('paymentPanelView').style.display = 'none';
  document.getElementById('adminLoginMsg').style.display = 'none';
  document.getElementById('adminPassInput').value = '';
}
function showAdminPanel(){
  document.getElementById('adminLoginView').style.display = 'none';
  document.getElementById('adminPanelView').style.display = 'block';
  document.getElementById('paymentPanelView').style.display = 'none';
  renderAdminReport();
}
function showPaymentPanel(){
  document.getElementById('adminLoginView').style.display = 'none';
  document.getElementById('adminPanelView').style.display = 'none';
  document.getElementById('paymentPanelView').style.display = 'block';
  renderPaymentTable();
}
function logoutAdmin(){
  showUserPanel();
}

function loginAdmin(){
  const pass = document.getElementById('adminPassInput').value;
  const msg = document.getElementById('adminLoginMsg');
  if(pass === ADMIN_PASS){
    msg.style.display='none';
    showAdminPanel();
  } else {
    msg.textContent = "ভুল অ্যাডমিন পাসওয়ার্ড।";
    msg.style.display='block';
  }
}

/* ======================
   ADMIN REPORT & PAYMENTS
   ====================== */
function renderAdminReport(){
  const orders = loadOrders();
  const payments = loadPayments();
  const grouped = {};
  orders.forEach(o=>{
    if(!grouped[o.name]) grouped[o.name] = { totalQty:0, totalBill:0, orders:[] };
    grouped[o.name].totalQty += o.quantity;
    grouped[o.name].totalBill += o.price;
    grouped[o.name].orders.push(o);
  });

  let html = '';
  html += `<table>
    <tr><th>নাম</th><th>মোট পিস</th><th>মোট বিল</th><th>আজকের (পিস)</th><th>সর্বমোট পে</th><th>বাকি/রিটার্ন</th></tr>`;

  const names = Object.keys(grouped).sort((a,b)=> a.localeCompare(b));
  if(names.length === 0){
    html += `<tr><td colspan="6" style="text-align:center;color:#94a3b8">এখনও কোনো অর্ডার নেই।</td></tr>`;
  } else {
    names.forEach(name=>{
      const g = grouped[name];
      const totalPaid = (payments[name] || []).reduce((s,p)=> s + p.amount, 0);
      const diff = totalPaid - g.totalBill;
      const todayQty = g.orders.filter(x=> x.isoDate === todayISO()).reduce((s,x)=> s + x.quantity, 0);
      html += `<tr>
        <td>${name}</td>
        <td>${g.totalQty} পিস</td>
        <td>${g.totalBill} টাকা</td>
        <td>${todayQty} পিস</td>
        <td>${totalPaid} টাকা</td>
        <td class="${diff>=0?'positive':'negative'}">${diff>=0?('রিটার্ন '+diff+' ৳'):('বাকি '+Math.abs(diff)+' ৳')}</td>
      </tr>`;
    });
  }
  html += `</table>`;

  document.getElementById('orderSummary').innerHTML = html;
}

function escapeId(s){ return s.replace(/[^a-zA-Z0-9\-_]/g, '_'); }

async function addQuickPayment(){
  const name = document.getElementById('quickPayName').value;
  const amount = parseInt(document.getElementById('quickPayAmount').value || 0, 10);
  if(!name){ alert('নাম সিলেক্ট করুন'); return; }
  if(!amount || amount <= 0){ alert('সঠিক পরিমাণ দিন'); return; }

  const payments = loadPayments();
  if(!payments[name]) payments[name] = [];
  const payment = { id:'p'+Date.now(), amount: amount, time: new Date().toISOString() };
  payments[name].push(payment);
  savePayments(payments);

  // Firebase
  try{
    await push(ref(db, `payments/${name}/`), payment);
  }catch(e){ console.error('Firebase addQuickPayment error:', e); }

  document.getElementById('quickPayAmount').value = '';
  renderAdminReport();
  renderPaymentTable();
}

/* ======================
   INIT
   ====================== */
(function init(){
  document.getElementById('todayLabel').textContent = todayLabelText();
  showUserPanel();
  document.getElementById('userName').addEventListener('input', (e)=>{
    renderTodayUserSummaryFor(e.target.value.trim());
  });
  renderAdminReport();
})();
