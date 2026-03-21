import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Pre-load user from local storage to avoid flicker, will be strictly verified immediately after
  const initialUser = JSON.parse(localStorage.getItem('shopee_saga_user') || 'null');
  
  const [user, setUser] = useState(initialUser); 
  const [cart, setCart] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null); // { sagaId, orderId }
  const timeoutRef = useRef(null);

  // Restore session from localStorage and auto-logout in 5 mins
  useEffect(() => {
    const savedToken = localStorage.getItem('shopee_saga_token');
    if (savedToken) {
      verifyToken(savedToken);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startAutoLogoutTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // 5 minutes = 300,000 ms
    timeoutRef.current = setTimeout(() => {
      console.log('Session expired, auto logging out...');
      logout();
      // Reload page to redirect safely
      window.location.href = '/login';
    }, 5 * 60 * 1000);
  };

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        startAutoLogoutTimer();
      } else {
        // Token expired or invalid on backend
        logout();
      }
    } catch(err) {
      console.error('Session verify failed', err);
      // Keep existing user if just an internet hiccup, 
      // but the timer will still log them out accurately or they can just browse.
    }
  };

  // Verify user against Customer Service login endpoint
  const login = async (email, password) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('shopee_saga_token', data.token);
        localStorage.setItem('shopee_saga_user', JSON.stringify(data.user));
        startAutoLogoutTimer();
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message || "Invalid credentials" };
      }
    } catch(err) {
      console.error("Login Error:", err);
      return { success: false, message: "Server connection failed" };
    }
  };

  const logout = () => {
    setUser(null);
    setCart([]);
    setCurrentOrder(null);
    localStorage.removeItem('shopee_saga_token');
    localStorage.removeItem('shopee_saga_user');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const addToCart = (product, quantity) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.productId === product.productId);
      if (existing) {
        return prev.map(item => 
          item.product.productId === product.productId 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    setCart(prev => {
      if (quantity <= 0) return prev.filter(item => item.product.productId !== productId);
      return prev.map(item => 
        item.product.productId === productId ? { ...item, quantity } : item
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.productId !== productId));
  };

  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{
      user, login, logout,
      cart, addToCart, updateCartQuantity, removeFromCart, clearCart,
      currentOrder, setCurrentOrder
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
