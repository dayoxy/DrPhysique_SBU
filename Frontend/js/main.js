// frontend/js/main.js
const API_BASE = 'http://127.0.0.1:8000';

function getToken() {
  return localStorage.getItem('token') || null;
}

async function fetchJSON(url, opts = {}) {
  const headers = opts.headers || {};
  if (!headers['Content-Type'] && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {...opts, headers});
  return res;
}

function nairaFmt(num) {
  return '₦' + Number(num).toLocaleString();
}
