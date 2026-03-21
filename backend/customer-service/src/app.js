const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'shopee-saga-super-secret';
const TOKEN_EXPIRES_IN = '5m';

const customers = [
  { id: "C001", name: "John Buyer", email: "john@shopee.mock", password: "password123", phone: "0123456789", defaultAddress: "123 Nguyen Trai, Ha Noi", avatar: "https://ui-avatars.com/api/?name=John+Buyer&background=ee4d2d&color=fff", balance: 1000000 },
  { id: "C002", name: "Jane Smith", email: "jane@shopee.mock", password: "password123", phone: "0987654321", defaultAddress: "456 Le Loi, Ho Chi Minh", avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=ee4d2d&color=fff", balance: 2000000 },
  { id: "C003", name: "Bob Johnson", email: "bob@shopee.mock", password: "password123", phone: "0333222111", defaultAddress: "789 Tran Phu, Da Nang", avatar: "https://ui-avatars.com/api/?name=Bob+Johnson&background=ee4d2d&color=fff", balance: 3000000 }
];

// Authentication Middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ success: false, message: 'No token provided' });

  const token = authHeader.split(' ')[1]; // "Bearer <token>"
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = decoded; // { id, email, iat, exp }
    next();
  });
};

// POST /login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const customer = customers.find(c => c.email === email);
  if (!customer || customer.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Exclude password from the profile payload
  const { password: _, ...customerProfile } = customer;

  // Generate Token (expires in 5 minutes)
  const token = jwt.sign(
    { id: customer.id, email: customer.email },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  res.json({ success: true, token, user: customerProfile });
});

// GET /me (Protected) - Gets currently logged in user implicitly from token
app.get('/me', requireAuth, (req, res) => {
  const customer = customers.find(c => c.id === req.user.id);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  
  const { password, ...customerProfile } = customer;
  res.json({ success: true, user: customerProfile });
});

// GET /customers
app.get('/customers', (req, res) => {
  // Strip passwords out before returning
  const safeCustomers = customers.map(({ password, ...c }) => c);
  res.json(safeCustomers);
});

// GET /customers/:id
app.get('/customers/:id', (req, res) => {
  const customer = customers.find(c => c.id === req.params.id);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  
  const { password, ...customerProfile } = customer;
  res.json(customerProfile);
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Customer service running on port ${PORT}`);
});
