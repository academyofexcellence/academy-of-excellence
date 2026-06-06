import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { Menu, X } from 'lucide-react';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="nav-brand" onClick={() => setMenuOpen(false)}>
            <img 
              src="https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg" 
              alt="Academy of Excellence Logo" 
              style={{ height: '70px', objectFit: 'contain' }} 
            />
          </Link>
          
          <button 
            className="nav-menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Menu"
            style={{ 
              display: 'none', 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-main)', 
              cursor: 'pointer',
              padding: '0.5rem',
              outline: 'none'
            }}
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/programs" onClick={() => setMenuOpen(false)}>Programs</Link>
            <Link to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link>
            <Link to="/alumni" onClick={() => setMenuOpen(false)}>Alumni</Link>
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="btn btn-outline" style={{ padding: '0.5rem 1.5rem' }}>Admin Login</Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
