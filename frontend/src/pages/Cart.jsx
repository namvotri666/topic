import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { Trash2 } from 'lucide-react';
import './Cart.css';

const Cart = () => {
  const { cart, updateCartQuantity, removeFromCart } = useAppContext();
  const navigate = useNavigate();

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="cart-empty container flex-col items-center justify-center gap-4">
        <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-cart-2130356-1800917.png" alt="Empty Cart" />
        <h2>Your shopping cart is empty</h2>
        <Link to="/" className="btn-primary">Go Shopping Now</Link>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2 className="section-title">Shopping Cart</h2>
      
      <div className="cart-layout flex gap-4">
        <div className="cart-items flex-1 card">
          <div className="cart-header grid-row">
            <div className="col-product">Product</div>
            <div className="col-price">Unit Price</div>
            <div className="col-qty">Quantity</div>
            <div className="col-total">Total Price</div>
            <div className="col-action">Actions</div>
          </div>
          
          {cart.map(item => (
            <div key={item.product.productId} className="cart-item grid-row">
              <div className="col-product flex items-center gap-4">
                <img src={item.product.image} alt={item.product.name} />
                <span className="item-name">{item.product.name}</span>
              </div>
              <div className="col-price">${item.product.price.toLocaleString()}</div>
              <div className="col-qty">
                <div className="qty-control flex items-center">
                  <button onClick={() => updateCartQuantity(item.product.productId, item.quantity - 1)}>-</button>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={e => updateCartQuantity(item.product.productId, parseInt(e.target.value) || 1)}
                  />
                  <button onClick={() => updateCartQuantity(item.product.productId, item.quantity + 1)}>+</button>
                </div>
              </div>
              <div className="col-total highlight">${(item.product.price * item.quantity).toLocaleString()}</div>
              <div className="col-action">
                <button onClick={() => removeFromCart(item.product.productId)} className="btn-delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary card">
          <h3>Order Summary</h3>
          <div className="summary-row flex items-center justify-between">
            <span>Total ({cart.length} items):</span>
            <span className="summary-total highlight">${total.toLocaleString()}</span>
          </div>
          <button 
            className="btn-primary w-full btn-checkout"
            onClick={() => navigate('/checkout')}
          >
            Check Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
