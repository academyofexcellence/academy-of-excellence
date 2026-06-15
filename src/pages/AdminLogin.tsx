import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const AdminLogin = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed.');

      // Check user profile status
      const { data: profile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('status')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        // Fallback: If it's the very first user (no trigger profile yet), they might be the default admin.
        // Let's check if the profiles table is empty or if they are superuser.
        // But for safety, sign out and throw error.
        await supabase.auth.signOut();
        throw new Error('Staff profile not found. Please contact administration.');
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        if (profile.status === 'pending') {
          throw new Error('Your account is pending approval by management.');
        } else {
          throw new Error('Your account has been deactivated. Please contact management.');
        }
      }

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
            designation: designation,
          },
        },
      });

      if (signUpError) throw signUpError;
      
      setSuccessMsg('🎉 Registration successful! Your account is pending approval by the MD or GM.');
      
      // Reset registration inputs
      setEmail('');
      setPassword('');
      setFullName('');
      setDesignation('');
      setIsRegistering(false);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '150px', paddingBottom: '60px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }} className="bg-grid-pattern">
      <div className="hero-blob animate-float-1" style={{ top: '-10%', right: '-5%' }}></div>
      <div className="hero-blob animate-float-2" style={{ bottom: '-15%', left: '-10%' }}></div>
      
      <div className="glass-card" style={{ maxWidth: '450px', width: '90%', height: 'max-content', zIndex: 10, border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 20px 50px rgba(201, 156, 51, 0.1)' }}>
        
        {/* Toggle Buttons */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', padding: '0.3rem', borderRadius: '50px', marginBottom: '2rem' }}>
          <button 
            onClick={() => { setIsRegistering(false); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '0.7rem',
              borderRadius: '50px',
              border: 'none',
              background: !isRegistering ? 'white' : 'transparent',
              color: !isRegistering ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: !isRegistering ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s'
            }}
          >
            <LogIn size={16} /> Login
          </button>
          
          <button 
            onClick={() => { setIsRegistering(true); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '0.7rem',
              borderRadius: '50px',
              border: 'none',
              background: isRegistering ? 'white' : 'transparent',
              color: isRegistering ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: isRegistering ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s'
            }}
          >
            <UserPlus size={16} /> Register Staff
          </button>
        </div>

        <h2 className="heading-lg text-center mb-2" style={{ fontSize: '1.75rem' }}>
          Operations <span className="text-primary">{isRegistering ? 'Registration' : 'Portal'}</span>
        </h2>
        <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {isRegistering ? 'Create your staff account to join the operations roster.' : 'Sign in to access your staff dashboard or management desk.'}
        </p>
        
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} /> {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}
        
        <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Designation / Job Name</label>
                <input 
                  type="text" 
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                  placeholder="e.g. Arabic Translator / Office Admin"
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
              placeholder="name@aoeonline.net"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.8rem 2.8rem 0.8rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  outline: 'none',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary mt-2" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Processing...' : isRegistering ? 'Register & Request Access' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
