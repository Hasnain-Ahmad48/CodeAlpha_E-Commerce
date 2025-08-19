import express from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth } from './auth.js';

export const orderRouter = express.Router();

orderRouter.post('/', requireAuth, (req, res) => {
  const userId = req.user.id;
  const cart = req.db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId);
  if (!cart) return res.status(400).json({ message: 'Cart is empty' });
  const items = req.db.prepare(`
    SELECT ci.product_id, ci.quantity, p.price_cents, p.stock
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?
  `).all(cart.id);
  if (items.length === 0) return res.status(400).json({ message: 'Cart is empty' });

  // Validate stock
  for (const item of items) {
    if (item.quantity > item.stock) return res.status(400).json({ message: 'Insufficient stock for an item' });
  }

  const total = items.reduce((acc, it) => acc + it.price_cents * it.quantity, 0);
  const orderId = uuid();
  const now = new Date().toISOString();
  const insertOrder = req.db.prepare('INSERT INTO orders (id, user_id, total_cents, created_at) VALUES (?, ?, ?, ?)');
  const insertItem = req.db.prepare('INSERT INTO order_items (id, order_id, product_id, quantity, price_cents) VALUES (?, ?, ?, ?, ?)');
  const decStock = req.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const clearCart = req.db.prepare('DELETE FROM cart_items WHERE cart_id = ?');

  const trx = req.db.transaction(() => {
    insertOrder.run(orderId, userId, total, now);
    for (const it of items) {
      insertItem.run(uuid(), orderId, it.product_id, it.quantity, it.price_cents);
      decStock.run(it.quantity, it.product_id);
    }
    clearCart.run(cart.id);
  });
  trx();

  res.status(201).json({ id: orderId, total_cents: total, created_at: now });
});

orderRouter.get('/', requireAuth, (req, res) => {
  const userId = req.user.id;
  const orders = req.db.prepare('SELECT id, total_cents, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const itemsStmt = req.db.prepare(`
    SELECT oi.order_id, oi.product_id, p.name, oi.quantity, oi.price_cents
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `);
  for (const order of orders) {
    order.items = itemsStmt.all(order.id);
  }
  res.json(orders);
});

