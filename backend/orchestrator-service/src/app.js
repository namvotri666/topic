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

  let nguoiMua = "Khách Hàng";
  let currentAmount = 0;

  try {
    // 1. Lấy thông tin khách hàng và kiểm tra amount
    const customerRes = await axios.get(`${CUSTOMER_URL}/customers/${customerId}`);
    const customer = customerRes.data;
    nguoiMua = customer.name;
    currentAmount = customer.amount || 0;

    // Tạo đơn hàng (PENDING)
    const orderRes = await axios.post(`${ORDER_URL}/orders`, { customerId, items, totalAmount });
    orderId = orderRes.data.order.id;
    const maDon = `${orderId}-${nguoiMua.replace(/\s+/g, '')}`;

    logSaga(sagaId, orderId, 'RUNNING', 'ORDER_CREATED');

    // 2. Kiểm tra amount
    if (currentAmount >= totalAmount) {
      let paymentDone = false;
      let inventoryDone = false;

      try {
        // gọi payment service để trừ tiền
        logSaga(sagaId, orderId, 'RUNNING', 'PROCESSING_PAYMENT');
        await axios.post(`${PAYMENT_URL}/payments/pay`, { orderId, customerId, amount: totalAmount, method: paymentMethod, simulateFailureAt });
        paymentDone = true;
        logSaga(sagaId, orderId, 'RUNNING', 'PAYMENT_COMPLETED');

        // trừ balance thật sự ở customer-service
        await axios.patch(`${CUSTOMER_URL}/customers/${customerId}/amount`, { delta: -totalAmount });
        currentAmount -= totalAmount;

        // gọi inventory service để trừ kho hoặc giữ chỗ
        logSaga(sagaId, orderId, 'RUNNING', 'RESERVING_INVENTORY');
        if (simulateFailureAt === 'inventory') throw new Error("Thử nghiệm lỗi kho hàng");
        await axios.post(`${INVENTORY_URL}/inventory/reserve`, { items });
        inventoryDone = true;
        logSaga(sagaId, orderId, 'RUNNING', 'INVENTORY_RESERVED');

        // cập nhật đơn hàng thành THANH_CONG
        await axios.patch(`${ORDER_URL}/orders/${orderId}/status`, { status: 'THANH_CONG' });
        logSaga(sagaId, orderId, 'COMPLETED', 'ORDER_CONFIRMED');

        // trả response thành công
        return res.status(200).json({
          donHang: { nguoiMua, trangThai: "THANH_CONG" },
          thanhToan: [
            { maDon, trangThai: "DA_TRU_TIEN" }
          ],
          lichSuKho: [
            { maDon, trangThai: "TRU_KHO_THANH_CONG" }
          ],
          khachHang: {
            ten: nguoiMua,
            amount: currentAmount
          },
          message: "Thanh toán thành công"
        });

      } catch (error) {
        // 4. Nếu có lỗi ở các bước sau
        logSaga(sagaId, orderId, 'FAILED', 'COMPENSATING');
        await axios.patch(`${ORDER_URL}/orders/${orderId}/status`, { status: 'THAT_BAI' });

        const hoanTienArr = [];
        const lichSuKhoArr = [];

        if (paymentDone) {
          logSaga(sagaId, orderId, 'COMPENSATING', 'REFUNDING_PAYMENT');
          await axios.post(`${PAYMENT_URL}/payments/refund`, { orderId }).catch(e => console.error(e.message));
          
          // Hoàn lại tiền thật sự
          await axios.patch(`${CUSTOMER_URL}/customers/${customerId}/amount`, { delta: totalAmount }).catch(e => console.error(e.message));
          currentAmount += totalAmount;

          hoanTienArr.push({ maDon, trangThai: "DA_HOAN_TIEN" });
          logSaga(sagaId, orderId, 'COMPENSATING', 'PAYMENT_REFUNDED');
        } else {
          hoanTienArr.push({ maDon, trangThai: "THAT_BAI" });
        }

        if (inventoryDone) {
          logSaga(sagaId, orderId, 'COMPENSATING', 'RELEASING_INVENTORY');
          await axios.post(`${INVENTORY_URL}/inventory/release`, { items }).catch(e => console.error(e.message));
          lichSuKhoArr.push({ maDon, trangThai: "ROLLBACK" });
          logSaga(sagaId, orderId, 'COMPENSATING', 'INVENTORY_RELEASED');
        } else {
          lichSuKhoArr.push({ maDon, trangThai: "THAT_BAI" });
        }

        logSaga(sagaId, orderId, 'COMPENSATED', 'SAGA_ROLLED_BACK');
        return res.status(400).json({
          donHang: { nguoiMua, trangThai: "THAT_BAI" },
          hoanTien: hoanTienArr,
          lichSuKho: lichSuKhoArr,
          khachHang: {
            ten: nguoiMua,
            amount: currentAmount
          },
          message: "Thanh toán thất bại"
        });
      }
    } else {
      // 4. Nếu amount < tongTien
      logSaga(sagaId, orderId, 'FAILED', 'SAGA_FAILED_INSUFFICIENT_FUNDS');
      await axios.patch(`${ORDER_URL}/orders/${orderId}/status`, { status: 'THAT_BAI' });

      return res.status(400).json({
        donHang: { nguoiMua, trangThai: "THAT_BAI" },
        hoanTien: [
          { maDon, trangThai: "THAT_BAI" }
        ],
        lichSuKho: [
          { maDon, trangThai: "THAT_BAI" }
        ],
        khachHang: {
          ten: nguoiMua,
          amount: currentAmount
        },
        message: "Thanh toán thất bại: Số dư không đủ"
      });
    }
  } catch (error) {
    const errorMsg = error.response ? (error.response.data.message || error.response.data) : error.message;
    logSaga(sagaId, orderId, 'FAILED', 'SAGA_FAILED', errorMsg);
    
    // Nếu chưa tạo đơn thì dùng mảng rỗng
    const maDon = orderId ? `${orderId}-${nguoiMua.replace(/\s+/g, '')}` : `UNKNOWN-${nguoiMua.replace(/\s+/g, '')}`;

    return res.status(500).json({
      donHang: { nguoiMua, trangThai: "THAT_BAI" },
      hoanTien: [],
      lichSuKho: [],
      khachHang: {
        ten: nguoiMua,
        amount: currentAmount
      },
      message: "Lỗi hệ thống: " + errorMsg
    });
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
