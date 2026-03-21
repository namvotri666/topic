import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { ShoppingCart } from 'lucide-react';
import './Products.css';

const ProductList = () => {
  const { addToCart } = useAppContext();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState({});
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/inventory`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Error fetching inventory:", err));
  }, []);

  const handleQtyChange = (id, value) => {
    const val = Math.max(1, parseInt(value) || 1);
    setQuantities(prev => ({ ...prev, [id]: val }));
  };

  const getQty = (id) => quantities[id] || 1;

  const handleAddToCart = (product) => {
    addToCart(product, getQty(product.productId));
    setQuantities(prev => ({ ...prev, [product.productId]: 1 }));
  };

  const handleBuyNow = (product) => {
    addToCart(product, getQty(product.productId));
    navigate('/cart');
  };

  return (
    <div className="products-container">
      <h2 className="section-title">Recommended products</h2>
      <div className="products-grid">
        {products.map(product => (
          <div key={product.productId} className="product-card card card-hover flex-col">
            <div className="product-image-wrapper">
              <img src={product.image} alt={product.name} className="product-image" />
              {product.availableStock === 0 && <span className="out-of-stock">Sold Out</span>}
            </div>
            <div className="product-info flex-col justify-between flex-1">
              <div>
                <h3 className="product-name" title={product.name}>{product.name}</h3>
                <div className="product-price">${product.price.toLocaleString()}</div>
                <div className="product-stock">Stock: {product.availableStock}</div>
              </div>
              
              <div className="product-actions">
                <div className="qty-control flex items-center">
                  <button onClick={() => handleQtyChange(product.productId, getQty(product.productId) - 1)}>-</button>
                  <input 
                    type="number" 
                    value={getQty(product.productId)} 
                    onChange={e => handleQtyChange(product.productId, e.target.value)}
                    min="1"
                    max={product.availableStock}
                  />
                  <button onClick={() => handleQtyChange(product.productId, getQty(product.productId) + 1)}>+</button>
                </div>
                
                <div className="btn-group flex gap-2">
                  <button 
                    className="btn-outline flex-1" 
                    onClick={() => handleAddToCart(product)}
                    disabled={product.availableStock === 0}
                  >
                    <ShoppingCart size={16} /> Add
                  </button>
                  <button 
                    className="btn-primary flex-1" 
                    onClick={() => handleBuyNow(product)}
                    disabled={product.availableStock === 0}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>No products available or Backend is down.</p>}
      </div>
    </div>
  );
};

export default ProductList;
