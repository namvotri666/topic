const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const CUSTOMER_URL = 'http://customer-service:5001';
const ORDER_URL = 'http://order-service:5002';
const PAYMENT_URL = 'http://payment-service:5003';
const INVENTORY_URL = 'http://inventory-service:5004';
const SHIPPING_URL = 'http://shipping-service:5005';

let sagas = [];

const logSaga = (sagaId, orderId, status, currentStep, message = '') => {
  let saga = sagas.find(s => s.sagaId === sagaId);
  if (!saga) {
    saga = { sagaId, orderId, status, currentStep, history: [], errorMessage: '' };
    sagas.push(saga);
  } else {
    saga.status = status;
    saga.currentStep = currentStep;
  }

  if (message) saga.errorMessage = message;
  saga.history.push(currentStep);
  console.log(`[SAGA ${sagaId}] ${currentStep} - Status: ${status}`);
};

const forwardRequest = async (req, res, targetUrl) => {
  try {
    const config = {
      method: req.method,
      url: targetUrl,
      headers: { Authorization: req.headers.authorization || '' },
      ...(req.method !== 'GET' && { data: req.body })
    };
    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Customer Service Gateway
app.post('/login', (req, res) => forwardRequest(req, res, `${CUSTOMER_URL}/login`));
app.get('/me', (req, res) => forwardRequest(req, res, `${CUSTOMER_URL}/me`));
app.get('/customers', (req, res) => forwardRequest(req, res, `${CUSTOMER_URL}/customers`));
app.get('/customers/:id', (req, res) => forwardRequest(req, res, `${CUSTOMER_URL}/customers/${req.params.id}`));

// Inventory Service Gateway
app.get('/inventory', (req, res) => forwardRequest(req, res, `${INVENTORY_URL}/inventory`));

// Order Service Gateway
app.get('/orders', (req, res) => forwardRequest(req, res, `${ORDER_URL}/orders`));
app.get('/orders/:id', (req, res) => forwardRequest(req, res, `${ORDER_URL}/orders/${req.params.id}`));

// Shipping Service Gateway
app.get('/shipping', (req, res) => forwardRequest(req, res, `${SHIPPING_URL}/shipping`));
app.get('/shipping/:orderId', (req, res) => forwardRequest(req, res, `${SHIPPING_URL}/shipping/${req.params.orderId}`));


// ==========================================
// SAGA ORCHESTRATION ROUTES
// ==========================================

// POST /checkout
app.post('/checkout', async (req, res) => {
  const { customerId, items, paymentMethod, shippingAddress, simulateFailureAt } = req.body;
  const sagaId = 'SAGA-' + uuidv4().substring(0, 8).toUpperCase();

  logSaga(sagaId, null, 'STARTED', 'SAGA_STARTED');

  let orderId = null;
  const totalAmount = items.reduce((acc, item) => acc + ((item.price || 100) * item.quantity), 0);

  try {
    // 1. Create Order (PENDING)
    logSaga(sagaId, null, 'RUNNING', 'CREATING_ORDER');
    const orderRes = await axios.post(`${ORDER_URL}/orders`, { customerId, items, totalAmount });
    orderId = orderRes.data.order.id;
    const saga = sagas.find(s => s.sagaId === sagaId);
    if (saga) saga.orderId = orderId;
    logSaga(sagaId, orderId, 'RUNNING', 'ORDER_CREATED');

    // 2. Reserve Inventory
    logSaga(sagaId, orderId, 'RUNNING', 'RESERVING_INVENTORY');
    if (simulateFailureAt === 'inventory') throw new Error('Inventory reservation failed');
    await axios.post(`${INVENTORY_URL}/inventory/reserve`, { items });
    logSaga(sagaId, orderId, 'RUNNING', 'INVENTORY_RESERVED');

    // 3. Process Payment
    logSaga(sagaId, orderId, 'RUNNING', 'PROCESSING_PAYMENT');
    await axios.post(`${PAYMENT_URL}/payments/pay`, { orderId, customerId, amount: totalAmount, method: paymentMethod, simulateFailureAt });
    logSaga(sagaId, orderId, 'RUNNING', 'PAYMENT_COMPLETED');

    // 4. Create Shipment
    logSaga(sagaId, orderId, 'RUNNING', 'CREATING_SHIPMENT');
    await axios.post(`${SHIPPING_URL}/shipping/create`, { orderId, customerId, address: shippingAddress, simulateFailureAt });
    logSaga(sagaId, orderId, 'RUNNING', 'SHIPPING_CREATED');

    // 5. Confirm Order
    await axios.patch(`${ORDER_URL}/orders/${orderId}/status`, { status: 'CONFIRMED' });
    logSaga(sagaId, orderId, 'COMPLETED', 'ORDER_CONFIRMED');

    res.status(200).json({ success: true, sagaId, orderId, message: 'Checkout completed successfully' });

  } catch (error) {
    const errorMsg = error.response ? (error.response.data.message || error.response.data) : error.message;
    logSaga(sagaId, orderId, 'FAILED', 'COMPENSATING', errorMsg);

    // START COMPENSATION
    try {
      const history = sagas.find(s => s.sagaId === sagaId).history;

      if (history.includes('PAYMENT_COMPLETED')) {
        logSaga(sagaId, orderId, 'COMPENSATING', 'REFUNDING_PAYMENT');
        await axios.post(`${PAYMENT_URL}/payments/refund`, { orderId }).catch(e => console.error(e.message));
        logSaga(sagaId, orderId, 'COMPENSATING', 'PAYMENT_REFUNDED');
      }

      if (history.includes('INVENTORY_RESERVED')) {
        logSaga(sagaId, orderId, 'COMPENSATING', 'RELEASING_INVENTORY');
        await axios.post(`${INVENTORY_URL}/inventory/release`, { items }).catch(e => console.error(e.message));
        logSaga(sagaId, orderId, 'COMPENSATING', 'INVENTORY_RELEASED');
      }

      if (orderId) {
        logSaga(sagaId, orderId, 'COMPENSATING', 'CANCELLING_ORDER');
        await axios.post(`${ORDER_URL}/orders/${orderId}/cancel`).catch(e => console.error(e.message));
        logSaga(sagaId, orderId, 'COMPENSATING', 'ORDER_CANCELLED');
      }

      logSaga(sagaId, orderId, 'COMPENSATED', 'SAGA_ROLLED_BACK');
      res.status(400).json({ success: false, sagaId, orderId, message: errorMsg + ' - Saga compensated' });

    } catch (compError) {
      logSaga(sagaId, orderId, 'FAILED', 'COMPENSATION_FAILED', compError.message);
      res.status(500).json({ success: false, sagaId, orderId, message: 'Saga failed and compensation failed' });
    }
  }
});

// GET /sagas
app.get('/sagas', (req, res) => {
  res.json(sagas);
});

// GET /sagas/:id
app.get('/sagas/:id', (req, res) => {
  const saga = sagas.find(s => s.sagaId === req.params.id);
  if (!saga) return res.status(404).json({ success: false, message: 'Saga not found' });
  res.json(saga);
});

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`Orchestrator gateway running on port ${PORT}`);
});
