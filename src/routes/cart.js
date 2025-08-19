import express from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth } from './auth.js';

export const cartRouter = express.Router();

function getOrCreateCart(db, userId, sessionId) {
  let cart = db.prepare('SELECT id FROM carts WHERE (user_id IS ? AND session_id IS ?) OR user_id = ? OR session_id = ?')
    .get(userId || null, sessionId || null, userId || null, sessionId || null);
  if (!cart) {
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO carts (id, user_id, session_id, created_at) VALUES (?, ?, ?, ?)')
      .run(id, userId || null, sessionId || null, now);
    cart = { id };
  }
  return cart;
}

cartRouter.get('/', (req, res) => {
  const sessionId = req.cookies.session_id || null;
  const userId = req.user?.id || null;
  const cart = getOrCreateCart(req.db, userId, sessionId);
  const items = req.db.prepare(`
    SELECT ci.id, ci.product_id, p.name, p.price_cents, p.image_url, ci.quantity
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?
  `).all(cart.id);
  const total = items.reduce((acc, it) => acc + it.price_cents * it.quantity, 0);
  res.json({ id: cart.id, items, total_cents: total });
});

cartRouter.post('/add', (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ message: 'Invalid body' });
  const product = req.db.prepare('SELECT id, stock FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const sessionId = req.cookies.session_id || null;
  const userId = req.user?.id || null;
  const cart = getOrCreateCart(req.db, userId, sessionId);
  const existing = req.db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cart.id, product_id);
  const newQty = (existing?.quantity || 0) + quantity;
  if (newQty > product.stock) return res.status(400).json({ message: 'Insufficient stock' });
  if (existing) {
    req.db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    req.db.prepare('INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES (?, ?, ?, ?)')
      .run(uuid(), cart.id, product_id, quantity);
  }
  res.json({ ok: true });
});

cartRouter.post('/update', (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ message: 'Invalid body' });
  const sessionId = req.cookies.session_id || null;
  const userId = req.user?.id || null;
  const cart = getOrCreateCart(req.db, userId, sessionId);
  const item = req.db.prepare('SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cart.id, product_id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (quantity === 0) {
    req.db.prepare('DELETE FROM cart_items WHERE id = ?').run(item.id);
  } else {
    const product = req.db.prepare('SELECT stock FROM products WHERE id = ?').get(product_id);
    if (quantity > product.stock) return res.status(400).json({ message: 'Insufficient stock' });
    req.db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, item.id);
  }
  res.json({ ok: true });
});

cartRouter.post('/clear', (req, res) => {
  const sessionId = req.cookies.session_id || null;
  const userId = req.user?.id || null;
  const cart = getOrCreateCart(req.db, userId, sessionId);
  req.db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
  res.json({ ok: true });
});

