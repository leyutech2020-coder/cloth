const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'stylehub-dev-secret-change-in-production';
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'email, password, displayName are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  db.prepare('INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)').run(id, email, passwordHash, displayName);

  const token = jwt.sign({ id, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, email, displayName } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } });
});

// POST /api/auth/merchant/register
router.post('/merchant/register', (req, res) => {
  const { email, password, name, storeName, phone, address, city, lat, lng, description } = req.body;
  if (!email || !password || !name || !storeName) {
    return res.status(400).json({ error: 'email, password, name, storeName are required' });
  }

  const existing = db.prepare('SELECT id FROM merchants WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  db.prepare(`
    INSERT INTO merchants (id, name, email, password_hash, store_name, phone, address, city, lat, lng, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, email, passwordHash, storeName, phone || null, address || null, city || 'Tainan', lat || null, lng || null, description || null);

  const token = jwt.sign({ id, email, role: 'merchant' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, merchant: { id, email, name, storeName } });
});

// POST /api/auth/merchant/login
router.post('/merchant/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const merchant = db.prepare('SELECT * FROM merchants WHERE email = ?').get(email);
  if (!merchant || !bcrypt.compareSync(password, merchant.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: merchant.id, email: merchant.email, role: 'merchant' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, merchant: { id: merchant.id, email: merchant.email, name: merchant.name, storeName: merchant.store_name } });
});

// Middleware: authenticate JWT
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  if (req.user.role === 'merchant') {
    const m = db.prepare('SELECT id, name, email, store_name, phone, address, city, description, rating, review_count, tier FROM merchants WHERE id = ?').get(req.user.id);
    return res.json({ role: 'merchant', ...m });
  }
  const u = db.prepare('SELECT id, email, display_name, style_preferences FROM users WHERE id = ?').get(req.user.id);
  res.json({ role: 'user', ...u });
});

module.exports = router;
module.exports.authenticate = authenticate;
module.exports.JWT_SECRET = JWT_SECRET;
