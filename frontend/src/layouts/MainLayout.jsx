import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, LogOut } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import './MainLayout.css';

const MainLayout = () => {
  const { user, cart, logout } = useAppContext();
  const navigate = useNavigate();

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout-wrapper">
      <header className="header">
        <div className="container flex items-center justify-between header-content">
          <Link to="/" className="logo">
            Shopee
          </Link>
          
          <div className="search-bar">
            <input type="text" placeholder="Search for products, brands..." className="search-input" />
            <button className="search-btn">
              <Search size={20} />
            </button>
          </div>

          <div className="header-actions flex items-center gap-4">
            <Link to="/cart" className="cart-icon-wrapper">
              <ShoppingCart size={28} color="white" />
              {cartItemsCount > 0 && <span className="cart-badge">{cartItemsCount}</span>}
            </Link>
            <div className="user-profile flex items-center gap-2">
              <img src={user.avatar} alt="avatar" className="avatar" />
              
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-username">@{user.username}</span>
              </div>

              <button onClick={handleLogout} className="logout-btn" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content container">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
