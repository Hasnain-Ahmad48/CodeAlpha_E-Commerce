import { api, centsToUsd } from './api.js';

const itemsEl = document.getElementById('cart-items');
const summaryEl = document.getElementById('cart-summary');
const checkoutBtn = document.getElementById('checkout-btn');

async function load(){
  const cart = await api('/api/cart');
  if (!cart.items.length) {
    itemsEl.innerHTML = '<p class="muted">Your cart is empty.</p>';
    summaryEl.innerHTML = '';
    checkoutBtn.disabled = true;
    return;
  }
  checkoutBtn.disabled = false;
  itemsEl.innerHTML = cart.items.map(it => `
    <div class="cart-item">
      <img src="${it.image_url}" alt="${it.name}" />
      <div>
        <div>${it.name}</div>
        <div class="muted">${centsToUsd(it.price_cents)}</div>
      </div>
      <div>
        <input type="number" min="0" value="${it.quantity}" style="width:80px" data-id="${it.product_id}" class="qty" />
      </div>
      <div>${centsToUsd(it.price_cents * it.quantity)}</div>
    </div>
  `).join('');
  summaryEl.innerHTML = `
    <div>Total</div>
    <strong>${centsToUsd(cart.total_cents)}</strong>
  `;

  itemsEl.querySelectorAll('.qty').forEach(input => {
    input.addEventListener('change', async (e) => {
      const product_id = e.target.getAttribute('data-id');
      const quantity = parseInt(e.target.value, 10);
      try{
        await api('/api/cart/update', { method: 'POST', body: JSON.stringify({ product_id, quantity })});
        await load();
      }catch(err){ alert(err.message); }
    });
  });
}

checkoutBtn.onclick = async () => {
  try{
    await api('/api/orders', { method: 'POST' });
    alert('Order placed!');
    await load();
  }catch(e){
    alert(e.message + '\nPlease login to checkout.');
    location.href = '/auth.html';
  }
};

load().catch(e => { itemsEl.innerHTML = `<p class="muted">${e.message}</p>`; });

