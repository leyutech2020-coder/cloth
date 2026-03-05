const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { createOrder } = require('../models/schema');

// List orders
router.get('/', (req, res) => {
  const { merchantId, status, customerId } = req.query;
  const filter = {};
  if (merchantId) filter.merchantId = merchantId;
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;
  const orders = store.findAll('orders', filter);
  res.json({ success: true, data: orders });
});

// Get order by ID
router.get('/:id', (req, res) => {
  const order = store.findById('orders', req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  res.json({ success: true, data: order });
});

// Create order
router.post('/', (req, res) => {
  if (!req.body.merchantId) {
    return res.status(400).json({ success: false, error: 'merchantId is required' });
  }

  // Calculate total from items
  let totalAmount = 0;
  const items = (req.body.items || []).map(item => {
    const product = store.findById('products', item.productId);
    const unitPrice = item.unitPrice || (product ? product.price : 0);
    totalAmount += unitPrice * (item.quantity || 1);
    return { ...item, unitPrice };
  });

  const order = createOrder({
    ...req.body,
    items,
    totalAmount,
  });
  store.insert('orders', order);
  res.status(201).json({ success: true, data: order });
});

// Update order status
router.put('/:id', (req, res) => {
  const updated = store.update('orders', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Order not found' });
  res.json({ success: true, data: updated });
});

module.exports = router;
