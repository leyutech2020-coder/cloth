const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate } = require('./auth');

const router = express.Router();

// GET /api/merchants — list merchants
router.get('/', (req, res) => {
  const { city, search } = req.query;
  let sql = 'SELECT id, name, store_name, city, address, lat, lng, description, rating, review_count FROM merchants WHERE 1=1';
  const params = [];

  if (city) {
    sql += ' AND city = ?';
    params.push(city);
  }
  if (search) {
    sql += ' AND (store_name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY rating DESC';
  const merchants = db.prepare(sql).all(...params);
  res.json({ merchants });
});

// GET /api/merchants/:id — merchant profile
router.get('/:id', (req, res) => {
  const merchant = db.prepare(
    'SELECT id, name, store_name, city, address, lat, lng, description, rating, review_count FROM merchants WHERE id = ?'
  ).get(req.params.id);
  if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

  const productCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE merchant_id = ? AND is_active = 1').get(req.params.id).c;
  res.json({ ...merchant, productCount });
});

// POST /api/merchants/products — add product (merchant auth required)
router.post('/products', authenticate, (req, res) => {
  if (req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'Merchant access required' });
  }

  const { name, category, price, imageUrl, description, sizes, colors, stock } = req.body;
  if (!name || !category || !price || !imageUrl) {
    return res.status(400).json({ error: 'name, category, price, imageUrl are required' });
  }

  const validCategories = ['tops', 'bottoms', 'shoes', 'accessories'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO products (id, merchant_id, name, category, price, image_url, description, sizes, colors, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, name, category, parseInt(price), imageUrl, description || null, sizes || null, colors || null, parseInt(stock) || 0);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json(product);
});

// PUT /api/merchants/products/:id — update product
router.put('/products/:id', authenticate, (req, res) => {
  if (req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'Merchant access required' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND merchant_id = ?').get(req.params.id, req.user.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { name, price, description, sizes, colors, stock, isActive } = req.body;
  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      price = COALESCE(?, price),
      description = COALESCE(?, description),
      sizes = COALESCE(?, sizes),
      colors = COALESCE(?, colors),
      stock = COALESCE(?, stock),
      is_active = COALESCE(?, is_active)
    WHERE id = ? AND merchant_id = ?
  `).run(
    name || null, price ? parseInt(price) : null, description || null,
    sizes || null, colors || null, stock != null ? parseInt(stock) : null,
    isActive != null ? (isActive ? 1 : 0) : null,
    req.params.id, req.user.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/merchants/products/:id — soft delete
router.delete('/products/:id', authenticate, (req, res) => {
  if (req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'Merchant access required' });
  }

  const result = db.prepare('UPDATE products SET is_active = 0 WHERE id = ? AND merchant_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

// GET /api/merchants/dashboard/stats — merchant dashboard stats
router.get('/dashboard/stats', authenticate, (req, res) => {
  if (req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'Merchant access required' });
  }

  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE merchant_id = ? AND is_active = 1').get(req.user.id).c;
  const totalTryOns = db.prepare('SELECT COALESCE(SUM(try_on_count), 0) as c FROM products WHERE merchant_id = ?').get(req.user.id).c;
  const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM products WHERE merchant_id = ? AND is_active = 1 GROUP BY category').all(req.user.id);

  res.json({ totalProducts, totalTryOns, byCategory });
});

module.exports = router;
