const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let shipments = [];

// POST /shipping/create
app.post('/shipping/create', (req, res) => {
  const { orderId, customerId, address, simulateFailureAt } = req.body;
  
  if (simulateFailureAt === 'shipping') {
    return res.status(400).json({ success: false, message: 'Shipping failed (Simulated)' });
  }
  
  const shipment = {
    id: 'SHP-' + uuidv4(),
    orderId,
    customerId,
    address,
    status: 'CREATED',
    createdAt: new Date().toISOString()
  };
  
  shipments.push(shipment);
  res.status(201).json({ success: true, shipment });
});

// POST /shipping/cancel
app.post('/shipping/cancel', (req, res) => {
  const { orderId } = req.body;
  const shipment = shipments.find(s => s.orderId === orderId);
  
  if (shipment) {
    shipment.status = 'CANCELLED';
    return res.status(200).json({ success: true, message: 'Shipment cancelled', shipment });
  }
  
  res.status(404).json({ success: false, message: 'Shipment not found' });
});

// GET /shipping
app.get('/shipping', (req, res) => {
  res.json(shipments);
});

// GET /shipping/:orderId
app.get('/shipping/:orderId', (req, res) => {
  const shipment = shipments.find(s => s.orderId === req.params.orderId);
  if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
  res.json(shipment);
});

// PATCH /shipping/:id/status
app.patch('/shipping/:id/status', (req, res) => {
  const { status } = req.body;
  const shipment = shipments.find(s => s.id === req.params.id);
  
  if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
  
  shipment.status = status;
  res.json({ success: true, shipment });
});

const PORT = 5005;
app.listen(PORT, () => {
  console.log(`Shipping service running on port ${PORT}`);
});
