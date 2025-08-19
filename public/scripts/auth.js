import { api } from './api.js';

const regForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');

regForm.onsubmit = async (e) => {
  e.preventDefault();
  const form = new FormData(regForm);
  const payload = Object.fromEntries(form.entries());
  try{
    await api('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    alert('Registered and logged in. You can now checkout.');
    location.href = '/products.html';
  }catch(err){ alert(err.message); }
};

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const form = new FormData(loginForm);
  const payload = Object.fromEntries(form.entries());
  try{
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    alert('Logged in');
    location.href = '/products.html';
  }catch(err){ alert(err.message); }
};

