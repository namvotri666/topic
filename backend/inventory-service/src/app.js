const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock DB
let inventory = [
  { productId: "1", name: "Apple iPhone 15 Pro Max", price: 1199, availableStock: 50, reservedStock: 0, image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=400" },
  { productId: "2", name: "Sony WH-1000XM5 Wireless Headphones", price: 348, availableStock: 120, reservedStock: 0, image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400" },
  { productId: "3", name: "MacBook Pro 16-inch M3 Max", price: 3499, availableStock: 15, reservedStock: 0, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400" },
  { productId: "4", name: "Nintendo Switch OLED", price: 349, availableStock: 200, reservedStock: 0, image: "https://images.unsplash.com/photo-1617260517953-228d96d98c25?auto=format&fit=crop&q=80&w=400" },
  { productId: "5", name: "Logitech MX Master 3S", price: 99, availableStock: 80, reservedStock: 0, image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400" },
  { productId: "6", name: "Keychron Q1 Pro", price: 199, availableStock: 0, reservedStock: 0, image: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=400" },
  { productId: "7", name: "iPad Air 5th Gen", price: 599, availableStock: 30, reservedStock: 0, image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&q=80&w=400" },
  { productId: "8", name: "Samsung Galaxy S24 Ultra", price: 1299, availableStock: 45, reservedStock: 0, image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=400" },
  { productId: "9", name: "AirPods Pro 2nd Gen", price: 249, availableStock: 150, reservedStock: 0, image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=400" },
  { productId: "10", name: "Dell XPS 15", price: 1899, availableStock: 25, reservedStock: 0, image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400" }
];

// GET /inventory
app.get('/inventory', (req, res) => {
  res.json(inventory);
});

// POST /inventory/reserve
app.post('/inventory/reserve', (req, res) => {
  const { items } = req.body;
  // items: [{ productId, quantity }]
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Invalid payload format' });
  }

  // Check if all items exist and have enough stock
  let allAvailable = true;
  for (const item of items) {
    const product = inventory.find(p => p.productId === item.productId);
    if (!product || product.availableStock < item.quantity) {
      allAvailable = false;
      break;
    }
  }

  if (!allAvailable) {
    return res.status(400).json({ success: false, message: 'Not enough stock or product not found' });
  }

  // Reserve stock
  for (const item of items) {
    const product = inventory.find(p => p.productId === item.productId);
    product.availableStock -= item.quantity;
    product.reservedStock += item.quantity;
  }

  res.json({ success: true, message: 'Inventory reserved successfully' });
});

// POST /inventory/release
app.post('/inventory/release', (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Invalid payload format' });
  }

  // Rollback logic: add back to available, remove from reserved
  for (const item of items) {
    const product = inventory.find(p => p.productId === item.productId);
    if (product) {
      product.availableStock += item.quantity;
      product.reservedStock = Math.max(0, product.reservedStock - item.quantity);
    }
  }

  res.json({ success: true, message: 'Inventory released (compensated) successfully' });
});

const PORT = 5004;
app.listen(PORT, () => {
  console.log(`Inventory service running on port ${PORT}`);
});
