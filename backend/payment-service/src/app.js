const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let payments = [];

// POST /payments/pay
app.post('/payments/pay', (req, res) => {
  const { orderId, customerId, amount, method, simulateFailureAt } = req.body;
  
  if (simulateFailureAt === 'payment') {
    return res.status(400).json({ success: false, message: 'Payment failed (Simulated)' });
  }
  
  const payment = {
    id: 'PAY-' + uuidv4(),
    orderId,
    customerId,
    amount,
    method,
    status: 'PAID',
    createdAt: new Date().toISOString()
  };
  
  payments.push(payment);
  res.status(200).json({ success: true, payment });
});

// POST /payments/refund
app.post('/payments/refund', (req, res) => {
  const { orderId } = req.body;
  
  const payment = payments.find(p => p.orderId === orderId && p.status === 'PAID');
  
  if (payment) {
    payment.status = 'REFUNDED';
    return res.status(200).json({ success: true, message: 'Payment refunded', payment });
  }
  
  res.status(404).json({ success: false, message: 'Valid payment not found for refund' });
});

// GET /payments
app.get('/payments', (req, res) => {
  res.json(payments);
});

// GET /payments/:orderId
app.get('/payments/:orderId', (req, res) => {
  const payment = payments.find(p => p.orderId === req.params.orderId);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  res.json(payment);
});

const PORT = 5003;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
