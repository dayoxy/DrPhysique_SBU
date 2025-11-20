// Frontend single-file SPA script (merged logic from main.js, staff.js, admin.js)
const API_BASE = '';
const tokenKey = 'token';

function getToken(){ return localStorage.getItem(tokenKey) || null; }
function setToken(t){ if(t) localStorage.setItem(tokenKey,t); else localStorage.removeItem(tokenKey); }

async function api(path, opts={}){
  opts.headers = opts.headers || {};
  if(!opts.headers['Content-Type'] && !(opts.body instanceof FormData)) opts.headers['Content-Type']='application/json';
  const token = getToken(); if(token) opts.headers['Authorization'] = `Bearer ${token}`;
  return fetch(API_BASE + path, opts);
}

function showView(name){ document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); const el=document.getElementById('view-'+name); if(el) el.classList.add('active'); }
function setAuthUI(user){ const navStaff=document.getElementById('nav-staff'), navAdmin=document.getElementById('nav-admin'), logout=document.getElementById('logoutBtn'); if(!user){ navStaff.style.display='none'; navAdmin.style.display='none'; logout.style.display='none'; } else{ logout.style.display='inline-block'; navStaff.style.display=(user.role==='staff' || user.role==='admin')? 'inline-block':'none'; navAdmin.style.display=(user.role==='admin')? 'inline-block':'none'; } }

async function login(username,password){ const body = new URLSearchParams(); body.set('username', username.trim()); body.set('password', password); const res = await fetch(API_BASE + '/token', { method:'POST', body }); if(!res.ok) throw await res.json(); const data = await res.json(); setToken(data.access_token); return data; }

async function getCurrentUser(){ const res = await api('/me'); if(!res.ok) throw new Error('not-auth'); return res.json(); }

function logout(){ setToken(null); setAuthUI(null); location.hash = '#/login'; }

async function loadSbus(){ const res = await fetch(API_BASE + '/sbus'); if(!res.ok) return []; const sbus = await res.json(); const selects = ['sbu']; selects.forEach(id=>{ const sel = document.getElementById(id); if(!sel) return; sel.innerHTML=''; sbus.forEach(s=>{ const opt=document.createElement('option'); opt.value=s.id; opt.textContent=s.name; sel.appendChild(opt); }); }); const list = document.getElementById('sbu-list'); if(list){ list.innerHTML=''; sbus.forEach(s=>{ const li=document.createElement('li'); li.innerHTML=`<a href="#">${s.name}</a>`; list.appendChild(li); }); } }

document.addEventListener('DOMContentLoaded', async ()=>{
  // wire login
  document.getElementById('loginForm').addEventListener('submit', async e=>{
    e.preventDefault(); const u=document.getElementById('login-username').value; const p=document.getElementById('login-password').value; try{ await login(u,p); const user=await getCurrentUser(); setAuthUI(user); location.hash = user.role==='admin'? '#/admin':'#/staff'; }catch(err){ document.getElementById('loginError').textContent = err.detail || (err.message || 'Login failed'); }
  });

  document.getElementById('logoutBtn').addEventListener('click', ()=>logout());

  // sales submit
  const salesForm = document.getElementById('sales-form'); if(salesForm){ salesForm.addEventListener('submit', async e=>{ e.preventDefault(); const sbu_id = parseInt(document.getElementById('sbu').value); const amount = parseFloat(document.getElementById('sales-amount').value); const day = parseInt(document.getElementById('sales-day').value); const r = await api('/staff/submit/sale',{ method:'POST', body: JSON.stringify({ sbu_id, amount, day }) }); if(r.ok){ alert('Sales submitted'); e.target.reset(); } else { const err = await r.json(); alert(JSON.stringify(err)); } }); }

  // create employee (admin)
  const empForm = document.getElementById('create-employee-form'); if(empForm){ empForm.addEventListener('submit', async e=>{ e.preventDefault(); const body = { username: document.getElementById('new-username').value.trim(), password: document.getElementById('new-password').value, role: document.getElementById('new-role').value }; const r = await api('/admin/create-employee',{ method:'POST', body: JSON.stringify(body) }); if(r.ok){ alert('Employee created'); e.target.reset(); } else { const err = await r.json(); alert(JSON.stringify(err)); } }); }

  // currency update
  const curForm = document.getElementById('currency-form'); if(curForm){ curForm.addEventListener('submit', async e=>{ e.preventDefault(); const body = { sales_rate: parseFloat(document.getElementById('sales-rate').value), expense_rate: parseFloat(document.getElementById('expense-rate').value), budget_rate: parseFloat(document.getElementById('budget-rate').value) }; const r = await api('/admin/currency',{ method:'POST', body: JSON.stringify(body) }); if(r.ok) alert('Currency saved'); else alert('Failed'); }); }

  // routing
  async function route(){ const hash = (location.hash||'#/login').replace('#/',''); if(hash==='login'){ showView('login'); return; }
    const token = getToken(); if(!token){ location.hash = '#/login'; return; }
    try{ const user = await getCurrentUser(); setAuthUI(user); if(hash==='staff'){ if(user.role!=='staff' && user.role!=='admin'){ alert('not authorized'); location.hash='#/login'; return; } showView('staff'); await loadSbus(); document.getElementById('staff-name').textContent = user.username; }
      else if(hash==='admin'){ if(user.role!=='admin'){ alert('admin only'); location.hash='#/login'; return; } showView('admin'); document.getElementById('admin-name').textContent = user.username; await loadSbus(); }
      else { location.hash = '#/login'; }
    }catch(err){ logout(); }
  }

  window.addEventListener('hashchange', route);
  route();
});
