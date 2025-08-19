import express from 'express';
import { v4 as uuid } from 'uuid';

export const productsRouter = express.Router();

productsRouter.get('/', (req, res) => {
  const list = req.db.prepare('SELECT id, name, description, price_cents, image_url, stock FROM products ORDER BY created_at DESC').all();
  res.json(list);
});

productsRouter.get('/:id', (req, res) => {
  const product = req.db.prepare('SELECT id, name, description, price_cents, image_url, stock FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

// Admin-only in real apps; kept open for demo simplicity
productsRouter.post('/', (req, res) => {
  const { name, description, price_cents, image_url, stock } = req.body;
  if (!name || !description || !Number.isInteger(price_cents)) {
    return res.status(400).json({ message: 'Invalid body' });
  }
  const id = uuid();
  const now = new Date().toISOString();
  req.db.prepare(
    'INSERT INTO products (id, name, description, price_cents, image_url, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, description, price_cents, image_url || null, stock ?? 0, now);
  res.status(201).json({ id });
});

