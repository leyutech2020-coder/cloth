const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { createProduct } = require('../models/schema');

// List products (optionally filter by merchant, category, status)
router.get('/', (req, res) => {
  const { merchantId, categoryId, status } = req.query;
  const filter = {};
  if (merchantId) filter.merchantId = merchantId;
  if (categoryId) filter.categoryId = categoryId;
  if (status) filter.status = status;
  const products = store.findAll('products', filter);
  res.json({ success: true, data: products });
});

// Get product by ID
router.get('/:id', (req, res) => {
  const product = store.findById('products', req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  res.json({ success: true, data: product });
});

// Create product
router.post('/', (req, res) => {
  if (!req.body.merchantId) {
    return res.status(400).json({ success: false, error: 'merchantId is required' });
  }
  const product = createProduct(req.body);
  store.insert('products', product);
  res.status(201).json({ success: true, data: product });
});

// Update product
router.put('/:id', (req, res) => {
  const updated = store.update('products', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });
  res.json({ success: true, data: updated });
});

// Delete product
router.delete('/:id', (req, res) => {
  const deleted = store.delete('products', req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Product not found' });
  res.json({ success: true });
});

// Get products for try-on (grouped by category type)
router.get('/merchant/:merchantId/tryon', (req, res) => {
  const products = store.findAll('products', {
    merchantId: req.params.merchantId,
    status: 'active',
  });
  const categories = store.findAll('categories', { merchantId: req.params.merchantId });

  const grouped = {};
  for (const cat of categories) {
    grouped[cat.type] = {
      category: cat,
      products: products.filter(p => p.categoryId === cat.id),
    };
  }

  res.json({ success: true, data: grouped });
});

module.exports = router;
