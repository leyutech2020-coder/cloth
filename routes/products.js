const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/products — list products with filters
router.get('/', (req, res) => {
  const { category, merchant_id, search, sort, limit, offset } = req.query;
  let sql = 'SELECT p.*, m.store_name as merchant_name, m.city as merchant_city FROM products p JOIN merchants m ON p.merchant_id = m.id WHERE p.is_active = 1';
  const params = [];

  if (category) {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (merchant_id) {
    sql += ' AND p.merchant_id = ?';
    params.push(merchant_id);
  }
  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (sort === 'price_asc') sql += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
  else if (sort === 'popular') sql += ' ORDER BY p.try_on_count DESC';
  else sql += ' ORDER BY p.created_at DESC';

  const lim = Math.min(parseInt(limit) || 50, 100);
  const off = parseInt(offset) || 0;
  sql += ' LIMIT ? OFFSET ?';
  params.push(lim, off);

  const products = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get().c;

  res.json({ products, total, limit: lim, offset: off });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, m.store_name as merchant_name, m.city as merchant_city, m.address as merchant_address
    FROM products p JOIN merchants m ON p.merchant_id = m.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// GET /api/products/categories/summary
router.get('/categories/summary', (_req, res) => {
  const summary = db.prepare(`
    SELECT category, COUNT(*) as count, MIN(price) as min_price, MAX(price) as max_price
    FROM products WHERE is_active = 1
    GROUP BY category
  `).all();
  res.json(summary);
});

module.exports = router;
