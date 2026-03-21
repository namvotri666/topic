const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock DB
let orders = [];

// POST /orders
app.post('/orders', (req, res) => {
  const { customerId, items, totalAmount } = req.body;
  
  const newOrder = {
    id: 'O' + Date.now(),
    customerId,
    items,
    totalAmount,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  
  orders.push(newOrder);
  res.status(201).json({ success: true, order: newOrder });
});

// GET /orders
app.get('/orders', (req, res) => {
  res.json(orders);
});

// GET /orders/:id
app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json(order);
});

// PATCH /orders/:id/status
app.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const order = orders.find(o => o.id === req.params.id);
  
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  
  order.status = status;
  res.json({ success: true, order });
});

// POST /orders/:id/cancel
app.post('/orders/:id/cancel', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  
  order.status = 'CANCELLED';
  res.json({ success: true, message: 'Order cancelled', order });
});

const PORT = 5002;
app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});
