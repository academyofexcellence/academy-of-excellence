import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import { Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

const Gallery = lazy(() => import('./pages/Gallery'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));

const PageLoadingSpinner = () => (
  <div style={{
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.2rem',
    background: 'var(--bg-light)',
    fontFamily: "'Outfit', sans-serif"
  }}>
    <div style={{
      width: '46px',
      height: '46px',
      border: '3px solid rgba(201, 156, 51, 0.18)',
      borderTopColor: 'var(--primary)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <div style={{
      fontSize: '0.95rem',
      fontWeight: 700,
      color: 'var(--primary-dark)',
      letterSpacing: '0.3px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem'
    }}>
      <span>Academy of Excellence</span>
    </div>
  </div>
);

const Navigation = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavScroll = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setMenuOpen(false);
    if (window.location.pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  // Hide landing page navbar on private dashboard and custom verification paths
  if (location.pathname.startsWith('/student/dashboard') || location.pathname.startsWith('/admin/dashboard') || location.pathname.startsWith('/verify')) {
    return null;
  }

  return (
    <nav className="navbar" style={{
      background: 'rgba(253, 251, 247, 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(201, 156, 51, 0.18)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="nav-brand" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img 
            src="https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg" 
            alt="Academy of Excellence Logo" 
            style={{ height: '64px', objectFit: 'contain' }} 
          />
        </Link>
        
        <button 
          className="nav-menu-toggle" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Navigation Menu"
          style={{ 
            background: 'rgba(201, 156, 51, 0.08)', 
            border: '1px solid rgba(201, 156, 51, 0.2)', 
            borderRadius: '10px',
            color: 'var(--primary-dark)', 
            cursor: 'pointer',
            padding: '0.45rem',
            outline: 'none',
            display: 'none'
          }}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>

        <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <a href="#about" onClick={(e) => handleNavScroll(e, 'about')}>About</a>
          <a href="#values" onClick={(e) => handleNavScroll(e, 'values')}>Values</a>
          <a href="#programs" onClick={(e) => handleNavScroll(e, 'programs')}>Programs</a>
          <Link to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link>
          <a href="#alumni" onClick={(e) => handleNavScroll(e, 'alumni')}>Alumni & Placements</a>
          <Link to="/verify" onClick={() => setMenuOpen(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <ShieldCheck size={16} /> Verify Certificate
          </Link>
          <Link 
            to="/admin" 
            onClick={() => setMenuOpen(false)} 
            className="btn btn-primary" 
            style={{ 
              padding: '0.55rem 1.4rem', 
              fontSize: '0.88rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(201, 156, 51, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            Academy Portal <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <Navigation />
      <Suspense fallback={<PageLoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="/verify/*" element={<VerifyCertificate />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
