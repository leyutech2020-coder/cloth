const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { createCategory } = require('../models/schema');

router.get('/', (req, res) => {
  const { merchantId } = req.query;
  const filter = merchantId ? { merchantId } : {};
  res.json({ success: true, data: store.findAll('categories', filter) });
});

router.post('/', (req, res) => {
  const category = createCategory(req.body);
  store.insert('categories', category);
  res.status(201).json({ success: true, data: category });
});

router.put('/:id', (req, res) => {
  const updated = store.update('categories', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Category not found' });
  res.json({ success: true, data: updated });
});

router.delete('/:id', (req, res) => {
  const deleted = store.delete('categories', req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Category not found' });
  res.json({ success: true });
});

module.exports = router;
