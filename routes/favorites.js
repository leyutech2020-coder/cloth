const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate } = require('./auth');

const router = express.Router();

// GET /api/favorites — list user's favorites
router.get('/', authenticate, (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ error: 'User access required' });
  }

  const favorites = db.prepare(`
    SELECT f.id as favorite_id, f.created_at as favorited_at,
           p.id, p.name, p.category, p.price, p.image_url, p.merchant_id,
           m.store_name as merchant_name
    FROM favorites f
    JOIN products p ON f.product_id = p.id
    JOIN merchants m ON p.merchant_id = m.id
    WHERE f.user_id = ? AND p.is_active = 1
    ORDER BY f.created_at DESC
  `).all(req.user.id);

  res.json({ favorites });
});

// POST /api/favorites — add to favorites
router.post('/', authenticate, (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ error: 'User access required' });
  }

  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });

  const product = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
  if (existing) return res.json({ success: true, already: true });

  const id = uuid();
  db.prepare('INSERT INTO favorites (id, user_id, product_id) VALUES (?, ?, ?)').run(id, req.user.id, productId);
  res.status(201).json({ success: true, id });
});

// DELETE /api/favorites/:productId — remove from favorites
router.delete('/:productId', authenticate, (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ error: 'User access required' });
  }

  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json({ success: true });
});

// POST /api/outfits — save outfit combination
router.post('/outfits', authenticate, (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ error: 'User access required' });
  }

  const { name, topId, bottomId, shoeId, resultImage } = req.body;
  const id = uuid();
  db.prepare(`
    INSERT INTO outfits (id, user_id, name, top_id, bottom_id, shoe_id, result_image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, name || 'My Outfit', topId || null, bottomId || null, shoeId || null, resultImage || null);

  res.status(201).json({ success: true, id });
});

// GET /api/outfits — list saved outfits
router.get('/outfits', authenticate, (req, res) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ error: 'User access required' });
  }

  const outfits = db.prepare(`
    SELECT o.*,
      t.name as top_name, t.image_url as top_image,
      b.name as bottom_name, b.image_url as bottom_image,
      s.name as shoe_name, s.image_url as shoe_image
    FROM outfits o
    LEFT JOIN products t ON o.top_id = t.id
    LEFT JOIN products b ON o.bottom_id = b.id
    LEFT JOIN products s ON o.shoe_id = s.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);

  res.json({ outfits });
});

module.exports = router;
