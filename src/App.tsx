import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { Menu, X } from 'lucide-react';

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

  // Hide landing page navbar on private dashboard paths
  const hideNavbarPaths = ['/student/dashboard', '/admin/dashboard'];
  if (hideNavbarPaths.includes(location.pathname)) {
    return null;
  }

  return (
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
          <a href="#programs" onClick={(e) => handleNavScroll(e, 'programs')}>Programs</a>
          <Link to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link>
          <a href="#alumni" onClick={(e) => handleNavScroll(e, 'alumni')}>Alumni</a>
          <Link to="/admin" onClick={() => setMenuOpen(false)} className="btn btn-outline" style={{ padding: '0.5rem 1.5rem' }}>Login</Link>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
