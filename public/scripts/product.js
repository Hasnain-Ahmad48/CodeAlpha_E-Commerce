import { api, centsToUsd } from './api.js';

const el = document.getElementById('product-detail');
const params = new URLSearchParams(location.search);
const id = params.get('id');

async function load(){
  const p = await api(`/api/products/${id}`);
  el.innerHTML = `
    <div class="product-detail">
      <img src="${p.image_url}" alt="${p.name}" style="width:100%; max-height:420px; object-fit:cover; border-radius:.75rem; border:1px solid #1e2430;"/>
      <div>
        <h1>${p.name}</h1>
        <div class="price">${centsToUsd(p.price_cents)}</div>
        <p class="muted">${p.description}</p>
        <div class="row">
          <input id="qty" type="number" min="1" max="${p.stock}" value="1" style="width:100px" />
          <button id="add" class="btn">Add to cart</button>
        </div>
        <div class="muted" style="margin-top:.5rem">In stock: ${p.stock}</div>
      </div>
    </div>`;
  document.getElementById('add').onclick = async () => {
    const quantity = parseInt(document.getElementById('qty').value, 10) || 1;
    try{
      await api('/api/cart/add', { method: 'POST', body: JSON.stringify({ product_id: id, quantity }) });
      alert('Added to cart');
    }catch(e){ alert(e.message); }
  };
}

load().catch(e => { el.innerHTML = `<p class="muted">${e.message}</p>`; });

