import { api, centsToUsd } from './api.js';

const listEl = document.getElementById('product-list');

async function load(){
  const products = await api('/api/products');
  listEl.innerHTML = products.map(p => `
    <article class="card">
      <img src="${p.image_url || 'https://picsum.photos/seed/default/600/400'}" alt="${p.name}">
      <div class="card-body">
        <h3>${p.name}</h3>
        <div class="muted">${p.description.substring(0, 80)}...</div>
        <div class="price">${centsToUsd(p.price_cents)}</div>
        <a class="btn" href="/product.html?id=${p.id}">View</a>
      </div>
    </article>
  `).join('');
}

load().catch(e => { listEl.innerHTML = `<p class="muted">${e.message}</p>`; });

