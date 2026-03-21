import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (email && password) {
      setLoading(true);
      setError('');
      
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/');
        console.log(result.user);
      } else {
        setError(result.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-header">
        <div className="container">
          <h1 className="login-logo">Shopee</h1>
        </div>
      </div>
      <div className="login-body">
        <div className="container login-container">
          <div className="login-banner">
            <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800" alt="Shopping Concept" className="banner-img" />
          </div>
          <div className="login-form-wrapper card">
            <h2>Log In</h2>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleLogin} className="login-form flex-col gap-4">
              <input 
                type="text" 
                placeholder="Email or Username (e.g., john@shopee.mock)" 
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'LOGGING IN...' : 'LOG IN'}
              </button>
            </form>
            <div className="login-footer">
              <a href="#">Forgot Password?</a>
            </div>
            <div className="login-footer" style={{fontSize: '0.8rem', color: '#666', marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
              <b>Mock Accounts (Password: <code>password123</code>):</b><br/>
              john@shopee.mock<br/>
              jane@shopee.mock<br/>
              bob@shopee.mock
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
