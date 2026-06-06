import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Image, Briefcase, Users, Upload } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gallery' | 'partners' | 'visitors'>('gallery');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  
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
    }

    setTimeout(() => setMessage(''), 4000);
  };

  if (loading) return <div style={{ paddingTop: '150px', textAlign: 'center' }}>Loading Admin...</div>;

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', background: 'var(--bg-light)' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        
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

        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', boxShadow: '0 10px 30px rgba(201,156,51,0.05)' }}>
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
      </div>
    </div>
  );
};

export default AdminDashboard;
