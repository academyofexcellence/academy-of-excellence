import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Camera } from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
}

const Gallery = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      // Temporary mock data so the page looks beautiful before Supabase is connected
      const mockData: GalleryItem[] = [
        { id: '1', title: 'Team Building Activity', category: 'activity', image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80' },
        { id: '2', title: 'Creative Session', category: 'activity', image_url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80' },
        { id: '3', title: 'Mock Interview Prep', category: 'mock_interview', image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80' },
        { id: '4', title: 'Group Discussion', category: 'activity', image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80' },
      ];
      
      try {
        const { data } = await supabase.from('gallery').select('*');
        if (data && data.length > 0) {
          setItems(data);
        } else {
          setItems(mockData); 
        }
      } catch (err) {
        // If Supabase is not connected yet, show mock data
        setItems(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh' }}>
      <div className="container">
        <div className="text-center mb-4">
          <div style={{ display: 'inline-block', background: 'var(--primary-light)', color: 'white', padding: '1.2rem', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 10px 20px rgba(201,156,51,0.2)' }}>
            <Camera size={40} />
          </div>
          <h1 className="heading-xl">Life at <span className="text-primary">Academy</span></h1>
          <p className="subtitle mt-2">Learning beyond the classroom, our activity sessions spark creativity, teamwork, and confidence.</p>
        </div>

        {loading ? (
          <div className="text-center py-5">Loading gallery...</div>
        ) : (
          <div className="grid grid-2" style={{ gap: '2rem' }}>
            {items.map(item => (
              <div key={item.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '300px', 
                    backgroundImage: `url(${item.image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'transform 0.5s ease'
                  }}
                  className="gallery-img"
                />
                <div style={{ padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700 }}>
                    {item.category.replace('_', ' ')}
                  </span>
                  <h3 style={{ marginTop: '0.5rem' }}>{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        .glass-card:hover .gallery-img {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default Gallery;
