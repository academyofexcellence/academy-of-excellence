import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Image, Briefcase, Users, Upload, Trash2 } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gallery' | 'partners' | 'visitors'>('gallery');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Lists data states
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);

  // Gallery form states
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('activity');
  const [galleryFile, setGalleryFile] = useState<File | null>(null);

  // Partner form states
  const [partnerName, setPartnerName] = useState('');
  const [partnerFile, setPartnerFile] = useState<File | null>(null);

  // Visitor form states
  const [visitorName, setVisitorName] = useState('');
  const [visitorDesignation, setVisitorDesignation] = useState('');
  const [visitorOrganization, setVisitorOrganization] = useState('');
  const [visitorFile, setVisitorFile] = useState<File | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
    } else {
      setLoading(false);
      fetchDashboardData();
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch Gallery
      const { data: galleryData } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
      if (galleryData) setGalleryItems(galleryData);

      // Fetch Partners
      const { data: partnersData } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });
      if (partnersData) setPartnersList(partnersData);

      // Fetch Visitors
      const { data: visitorsData } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false });
      if (visitorsData) setVisitorsList(visitorsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  // Helper to upload file directly to Supabase Storage
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload file to the 'gallery-images' bucket
      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Storage Upload error:', err);
      setMessage(`❌ Upload failed: ${err.message || err}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Delete handler for all types of content
  const handleDelete = async (id: string, tableName: string, imageUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    setMessage('Deleting item...');
    try {
      // 1. Delete from database
      const { error: dbError } = await supabase.from(tableName).delete().eq('id', id);
      if (dbError) throw dbError;

      // 2. Delete from storage (if url is valid)
      const pathParts = imageUrl.split('/gallery-images/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        const { error: storageError } = await supabase.storage
          .from('gallery-images')
          .remove([filePath]);
        if (storageError) {
          console.warn('Storage file deletion warning:', storageError);
        }
      }

      setMessage('✅ Item successfully deleted!');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Delete error:', err);
      setMessage(`❌ Delete failed: ${err.message || err}`);
    }
    
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryFile) {
      setMessage('❌ Please select an image file to upload.');
      return;
    }
    
    setMessage('Uploading image to Supabase Storage...');
    const url = await uploadFile(galleryFile, 'gallery');
    if (!url) return;

    setMessage('Saving gallery record to database...');
    const { error } = await supabase.from('gallery').insert([
      { title: galleryTitle, category: galleryCategory, image_url: url }
    ]);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage('✅ Successfully added to Gallery!');
      setGalleryTitle('');
      setGalleryFile(null);
      const fileInput = document.getElementById('gallery-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchDashboardData();
    }
    
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerFile) {
      setMessage('❌ Please select a partner logo file.');
      return;
    }

    setMessage('Uploading logo to Supabase Storage...');
    const url = await uploadFile(partnerFile, 'partners');
    if (!url) return;

    setMessage('Saving partner record to database...');
    const { error } = await supabase.from('partners').insert([
      { name: partnerName, logo_url: url }
    ]);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage('✅ Successfully added Partner!');
      setPartnerName('');
      setPartnerFile(null);
      const fileInput = document.getElementById('partner-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchDashboardData();
    }

    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorFile) {
      setMessage('❌ Please select a guest photo file.');
      return;
    }

    setMessage('Uploading photo to Supabase Storage...');
    const url = await uploadFile(visitorFile, 'visitors');
    if (!url) return;

    setMessage('Saving visitor record to database...');
    const { error } = await supabase.from('visitors').insert([
      { 
        name: visitorName, 
        designation: visitorDesignation, 
        organization: visitorOrganization, 
        image_url: url 
      }
    ]);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage('✅ Successfully added Guest/Mentor!');
      setVisitorName('');
      setVisitorDesignation('');
      setVisitorOrganization('');
      setVisitorFile(null);
      const fileInput = document.getElementById('visitor-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchDashboardData();
    }

    setTimeout(() => setMessage(''), 4000);
  };

  if (loading) return <div style={{ paddingTop: '150px', textAlign: 'center' }}>Loading Admin...</div>;

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', background: 'var(--bg-light)' }}>
      <div className="container" style={{ maxWidth: '850px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 className="heading-lg" style={{ margin: 0 }}>Admin <span className="text-primary">Dashboard</span></h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.3rem' }}>Manage the dynamic contents of your website</p>
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,156,51,0.2)', marginBottom: '2rem', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('gallery')}
            style={{
              padding: '0.8rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'gallery' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'gallery' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Image size={18} /> Gallery
          </button>
          
          <button 
            onClick={() => setActiveTab('partners')}
            style={{
              padding: '0.8rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'partners' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'partners' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Briefcase size={18} /> Partners
          </button>

          <button 
            onClick={() => setActiveTab('visitors')}
            style={{
              padding: '0.8rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'visitors' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'visitors' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={18} /> Guests & Mentors
          </button>
        </div>

        {message && (
          <div style={{ padding: '1rem', background: 'rgba(201, 156, 51, 0.1)', border: '1px solid rgba(201, 156, 51, 0.2)', color: 'var(--text-main)', borderRadius: '10px', marginBottom: '2rem', fontWeight: 600, fontSize: '0.95rem' }}>
            {message}
          </div>
        )}

        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', boxShadow: '0 10px 30px rgba(201,156,51,0.05)', marginBottom: '3rem' }}>
          {/* TAB 1: Gallery */}
          {activeTab === 'gallery' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image className="text-primary" /> Add to Gallery</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Upload images from mock interviews, seminars, and classroom events.</p>
              
              <form onSubmit={handleAddGallery} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Image File</label>
                  <input 
                    type="file" 
                    id="gallery-file-input"
                    accept="image/*"
                    onChange={(e) => setGalleryFile(e.target.files ? e.target.files[0] : null)}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Event Title</label>
                  <input 
                    type="text" 
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Mock Interview with HR Managers"
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Category</label>
                  <select 
                    value={galleryCategory} 
                    onChange={(e) => setGalleryCategory(e.target.value)}
                    className="form-input"
                  >
                    <option value="activity">Activity Session</option>
                    <option value="mock_interview">Mock Interview</option>
                  </select>
                </div>
                
                <button type="submit" className="btn btn-primary mt-2" style={{ justifyContent: 'center' }} disabled={uploading}>
                  <Upload size={18} /> {uploading ? 'Uploading File...' : 'Upload & Save to Gallery'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Partners */}
          {activeTab === 'partners' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase className="text-primary" /> Add Industrial Partner</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Upload logos of companies where graduates are placed or affiliated with the academy.</p>
              
              <form onSubmit={handleAddPartner} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Logo File</label>
                  <input 
                    type="file" 
                    id="partner-file-input"
                    accept="image/*"
                    onChange={(e) => setPartnerFile(e.target.files ? e.target.files[0] : null)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Company / Partner Name</label>
                  <input 
                    type="text" 
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Amazon Arabic Support"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary mt-2" style={{ justifyContent: 'center' }} disabled={uploading}>
                  <Upload size={18} /> {uploading ? 'Uploading File...' : 'Upload & Save Partner'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Visitors */}
          {activeTab === 'visitors' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users className="text-primary" /> Add Guest or Mentor</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Showcase guests, leaders, and mentors who visited the academy.</p>
              
              <form onSubmit={handleAddVisitor} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Photo File</label>
                  <input 
                    type="file" 
                    id="visitor-file-input"
                    accept="image/*"
                    onChange={(e) => setVisitorFile(e.target.files ? e.target.files[0] : null)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Guest Name</label>
                  <input 
                    type="text" 
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Dr. Faisal Basheer"
                    required
                  />
                </div>

                <div className="grid grid-2" style={{ gap: '1.5rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Designation / Title</label>
                    <input 
                      type="text" 
                      value={visitorDesignation}
                      onChange={(e) => setVisitorDesignation(e.target.value)}
                      className="form-input"
                      placeholder="e.g. Native Arab Professor"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Organization / Company</label>
                    <input 
                      type="text" 
                      value={visitorOrganization}
                      onChange={(e) => setVisitorOrganization(e.target.value)}
                      className="form-input"
                      placeholder="e.g. University of Riyadh"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary mt-2" style={{ justifyContent: 'center' }} disabled={uploading}>
                  <Upload size={18} /> {uploading ? 'Uploading File...' : 'Upload & Save Guest Details'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Existing Items Management Lists */}
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(201,156,51,0.1)', paddingBottom: '0.8rem' }}>
            Existing {activeTab === 'gallery' ? 'Gallery Items' : activeTab === 'partners' ? 'Partners' : 'Guests & Mentors'}
          </h2>

          {/* GALLERY LIST */}
          {activeTab === 'gallery' && (
            <div>
              {galleryItems.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No gallery items uploaded yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.5rem' }}>
                  {galleryItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        style={{ width: '100%', height: '100px', objectFit: 'cover' }} 
                      />
                      <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
                        <div>
                          <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.2rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>
                            {item.title}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary-dark)', fontWeight: 600, textTransform: 'uppercase' }}>
                            {item.category.replace('_', ' ')}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDelete(item.id, 'gallery', item.image_url)}
                          style={{ marginTop: '0.8rem', background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PARTNERS LIST */}
          {activeTab === 'partners' && (
            <div>
              {partnersList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No partners added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {partnersList.map(partner => (
                    <div key={partner.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.2rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img 
                          src={partner.logo_url} 
                          alt={partner.name} 
                          style={{ height: '35px', maxWidth: '100px', objectFit: 'contain' }} 
                        />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{partner.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDelete(partner.id, 'partners', partner.logo_url)}
                        className="btn btn-outline"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.3rem' }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VISITORS LIST */}
          {activeTab === 'visitors' && (
            <div>
              {visitorsList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No guests added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                  {visitorsList.map(visitor => (
                    <div key={visitor.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.2rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <img 
                        src={visitor.image_url} 
                        alt={visitor.name} 
                        style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-light)', marginBottom: '0.8rem' }} 
                      />
                      <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.2rem 0', fontWeight: 700 }}>{visitor.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', fontWeight: 600, margin: 0 }}>{visitor.designation}</p>
                      {visitor.organization && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>{visitor.organization}</p>
                      )}
                      <button 
                        onClick={() => handleDelete(visitor.id, 'visitors', visitor.image_url)}
                        style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
