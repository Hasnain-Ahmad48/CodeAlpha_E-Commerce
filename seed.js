import path from 'path';
import { fileURLToPath } from 'url';
import { createDb } from './src/db.js';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = createDb(path.join(__dirname, 'data', 'ecommerce.db'));

const now = new Date().toISOString();

const products = [
  {
    name: 'Classic Tee',
    description: 'Soft cotton t-shirt. 100% combed cotton.',
    price_cents: 1999,
    image_url: 'https://picsum.photos/seed/tee/600/400',
    stock: 50,
  },
  {
    name: 'Denim Jacket',
    description: 'Rugged denim jacket for all seasons.',
    price_cents: 6999,
    image_url: 'https://picsum.photos/seed/denim/600/400',
    stock: 25,
  },
  {
    name: 'Sneakers',
    description: 'Comfortable everyday sneakers.',
    price_cents: 5499,
    image_url: 'https://picsum.photos/seed/sneakers/600/400',
    stock: 40,
  },
];

const insert = db.prepare('INSERT INTO products (id, name, description, price_cents, image_url, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
const del = db.prepare('DELETE FROM products');
const trx = db.transaction(() => {
  del.run();
  for (const p of products) {
    insert.run(uuid(), p.name, p.description, p.price_cents, p.image_url, p.stock, now);
  }
});
trx();

console.log('Seed complete: inserted', products.length, 'products');

