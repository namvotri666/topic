import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { MapPin, CreditCard } from 'lucide-react';
import './Checkout.css';

const Checkout = () => {
  const { user, cart, clearCart, setCurrentOrder } = useAppContext();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [simulateFailureAt, setSimulateFailureAt] = useState('none');
  const [isProcessing, setIsProcessing] = useState(false);

  if (cart.length === 0) {
    return <Navigate to="/cart" />;
  }

  const totalItemPrice = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const shippingFee = 15;
  const totalPayment = totalItemPrice + shippingFee;

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    // Map cart items to backend expectation
    const payloadItems = cart.map(item => ({
      productId: item.product.productId,
      quantity: item.quantity,
      price: item.product.price
    }));

    const payload = {
      customerId: user.id || "C001",
      items: payloadItems,
      paymentMethod,
      shippingAddress: user.defaultAddress || user.address || "Local 123",
      simulateFailureAt
    };

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      // Even if it failed (400), saga was executed and logged
      setCurrentOrder({
        sagaId: data.sagaId,
        orderId: data.orderId,
        total: totalPayment,
        isFailureFlow: !data.success
      });

      clearCart();
      navigate('/order-status');

    } catch (err) {
      console.error(err);
      alert("Checkout failed entirely (Orchestrator might be down)");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-container">
      <h2 className="section-title">Checkout</h2>

      <div className="checkout-section card address-section">
        <div className="section-header flex items-center gap-2">
          <MapPin color="var(--primary)" />
          <h3>Delivery Address</h3>
        </div>
        <div className="address-content">
          <strong>{user.name}</strong> ({user.phone})
          <p>{user.defaultAddress || user.address}</p>
        </div>
      </div>

      <div className="checkout-section card products-section">
        <div className="section-header">
          <h3>Products Ordered</h3>
        </div>
        <div className="checkout-items">
          <div className="checkout-header grid-row">
            <div className="col-product">Product</div>
            <div className="col-price">Unit Price</div>
            <div className="col-qty">Amount</div>
            <div className="col-total">Item Subtotal</div>
          </div>
          {cart.map(item => (
            <div key={item.product.productId} className="checkout-item grid-row">
              <div className="col-product flex items-center gap-4">
                <img src={item.product.image} alt={item.product.name} />
                <span>{item.product.name}</span>
              </div>
              <div className="col-price">${item.product.price.toLocaleString()}</div>
              <div className="col-qty">{item.quantity}</div>
              <div className="col-total">${(item.product.price * item.quantity).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="checkout-layout grid-2">
        <div className="checkout-section card payment-section">
          <div className="section-header flex items-center gap-2">
            <CreditCard color="var(--primary)" />
            <h3>Payment & Saga Simulation</h3>
          </div>
          <div className="payment-options flex flex-col gap-2">
            <label className={`payment-option ${simulateFailureAt === 'none' ? 'active' : ''}`}>
              <input type="radio" checked={simulateFailureAt === 'none'} onChange={() => { setPaymentMethod('COD'); setSimulateFailureAt('none'); }} />
              Success Flow (COD / No failures)
            </label>
            {/* <label className={`payment-option error-trigger ${simulateFailureAt === 'inventory' ? 'active' : ''}`}>
              <input type="radio" checked={simulateFailureAt === 'inventory'} onChange={() => setSimulateFailureAt('inventory')} />
              Force Failure at <strong>Inventory</strong> (Rollback Order)
            </label>
            <label className={`payment-option error-trigger ${simulateFailureAt === 'payment' ? 'active' : ''}`}>
              <input type="radio" checked={simulateFailureAt === 'payment'} onChange={() => { setPaymentMethod('CREDIT'); setSimulateFailureAt('payment'); }} />
              Force Failure at <strong>Payment</strong> (Rollback Inventory, Order)
            </label>
             <label className={`payment-option error-trigger ${simulateFailureAt === 'shipping' ? 'active' : ''}`}>
              <input type="radio" checked={simulateFailureAt === 'shipping'} onChange={() => setSimulateFailureAt('shipping')} />
              Force Failure at <strong>Shipping</strong> (Rollback Payment, Inv, Order)
            </label> */}
          </div>
        </div>

        <div className="checkout-section card total-section">
          <div className="total-row flex justify-between">
            <span>Merchandise Subtotal:</span>
            <span>${totalItemPrice.toLocaleString()}</span>
          </div>
          <div className="total-row flex justify-between">
            <span>Shipping Total:</span>
            <span>${shippingFee.toLocaleString()}</span>
          </div>
          <div className="total-row final-total flex justify-between items-center">
            <span>Total Payment:</span>
            <span className="payment-amount">${totalPayment.toLocaleString()}</span>
          </div>

          <button
            className="btn-primary w-full btn-place-order"
            onClick={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Saga...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
