import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div style={{ paddingTop: '150px', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', height: 'max-content' }}>
        <h2 className="heading-lg text-center mb-4">Admin <span className="text-primary">Login</span></h2>
        
        {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary mt-4" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <strong>First time? Create your Admin account:</strong>
          </p>
          <ol style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '1.5rem', margin: 0 }}>
            <li>Go to your Supabase Dashboard</li>
            <li>Click "Authentication" on the left menu</li>
            <li>Click "Add User" (top right)</li>
            <li>Enter your email and a password</li>
            <li>Use those here to log in!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
