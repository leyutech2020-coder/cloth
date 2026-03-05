const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { createMerchant } = require('../models/schema');

// List merchants
router.get('/', (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const merchants = store.findAll('merchants', filter);
  res.json({ success: true, data: merchants });
});

// Get merchant by ID
router.get('/:id', (req, res) => {
  const merchant = store.findById('merchants', req.params.id);
  if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });
  res.json({ success: true, data: merchant });
});

// Create merchant
router.post('/', (req, res) => {
  const merchant = createMerchant(req.body);
  store.insert('merchants', merchant);
  res.status(201).json({ success: true, data: merchant });
});

// Update merchant
router.put('/:id', (req, res) => {
  const updated = store.update('merchants', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Merchant not found' });
  res.json({ success: true, data: updated });
});

// Delete merchant
router.delete('/:id', (req, res) => {
  const deleted = store.delete('merchants', req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Merchant not found' });
  res.json({ success: true });
});

// Get merchant dashboard stats
router.get('/:id/stats', (req, res) => {
  const merchantId = req.params.id;
  const merchant = store.findById('merchants', merchantId);
  if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });

  const products = store.count('products', { merchantId });
  const orders = store.count('orders', { merchantId });
  const agents = store.count('ai_agents', { merchantId });
  const tryOnSessions = store.count('tryon_sessions', { merchantId });

  res.json({
    success: true,
    data: {
      merchant: merchant.name,
      products,
      orders,
      aiAgents: agents,
      tryOnSessions,
    },
  });
});

module.exports = router;
