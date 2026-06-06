import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Gallery form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('activity');
  const [imageUrl, setImageUrl] = useState('');
  
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
    } else {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Adding...');
    
    const { error } = await supabase.from('gallery').insert([
      { title, category, image_url: imageUrl }
    ]);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('✅ Successfully added to Gallery!');
      setTitle('');
      setImageUrl('');
    }
    
    setTimeout(() => setMessage(''), 4000);
  };

  if (loading) return <div style={{ paddingTop: '150px', textAlign: 'center' }}>Loading Admin...</div>;

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh' }}>
      <div className="container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 className="heading-lg">Admin <span className="text-primary">Dashboard</span></h1>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        {message && (
          <div style={{ padding: '1rem', background: 'var(--primary-light)', color: 'var(--text-main)', borderRadius: '8px', marginBottom: '2rem', fontWeight: 'bold' }}>
            {message}
          </div>
        )}

        <div className="grid grid-2">
          {/* Add Gallery Item Form */}
          <div className="glass-card">
            <h3><Plus size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }}/> Add to Gallery</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Upload images for Activity Sessions or Mock Interviews.</p>
            
            <form onSubmit={handleAddGallery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Image URL</label>
                <input 
                  type="url" 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  placeholder="e.g. Mock Interview with HR"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="activity">Activity Session</option>
                  <option value="mock_interview">Mock Interview</option>
                </select>
              </div>
              
              <button type="submit" className="btn btn-primary mt-2" style={{ justifyContent: 'center' }}>Save to Gallery</button>
            </form>
          </div>

          <div className="glass-card" style={{ opacity: 0.6, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>More Forms Coming Soon</h3>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              Soon you will be able to add Placements, Testimonials, and Faculty members from here exactly the same way.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
