import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDb } from './src/db.js';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { productsRouter } from './src/routes/products.js';
import { authRouter } from './src/routes/auth.js';
import { cartRouter } from './src/routes/cart.js';
import { orderRouter } from './src/routes/orders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Global middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Lightweight auth/session middleware
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
app.use((req, res, next) => {
  // Ensure guest session id exists (non-httpOnly so frontend can not read it; we keep it readable only by server by leaving httpOnly off)
  if (!req.cookies.session_id) {
    res.cookie('session_id', uuid(), { sameSite: 'lax', secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 });
  }
  // Best-effort decode of JWT to attach req.user
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.sub, email: payload.email };
    } catch {}
  }
  next();
});

// Initialize DB (synchronous for better-sqlite3)
const db = createDb(path.join(__dirname, 'data', 'ecommerce.db'));
app.set('db', db);

// API routes
app.use('/api/products', (req, res, next) => { req.db = db; next(); }, productsRouter);
app.use('/api/auth', (req, res, next) => { req.db = db; next(); }, authRouter);
app.use('/api/cart', (req, res, next) => { req.db = db; next(); }, cartRouter);
app.use('/api/orders', (req, res, next) => { req.db = db; next(); }, orderRouter);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to SPA index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

