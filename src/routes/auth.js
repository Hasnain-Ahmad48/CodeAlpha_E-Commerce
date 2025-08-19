import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'Missing fields' });
  const existing = req.db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ message: 'Email already in use' });
  const password_hash = await bcrypt.hash(password, 10);
  const id = uuid();
  const now = new Date().toISOString();
  req.db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase(), password_hash, name, now);
  const token = jwt.sign({ sub: id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ id, email, name });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
  const user = req.db.prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
  // If there is a guest cart (session_id) without user_id, associate it with this user
  const sessionId = req.cookies.session_id || null;
  if (sessionId) {
    const cart = req.db.prepare('SELECT id, user_id FROM carts WHERE session_id = ?').get(sessionId);
    if (cart && !cart.user_id) {
      req.db.prepare('UPDATE carts SET user_id = ? WHERE id = ?').run(user.id, cart.id);
    }
  }
  res.json({ id: user.id, email: user.email, name: user.name });
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

export function requireAuth(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

