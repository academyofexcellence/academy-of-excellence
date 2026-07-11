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

  const getYouTubeId = (url: string) => {
    try {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v') || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
      }
      return videoId;
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          setItems(data);
        }
      } catch (err) {
        console.error('Error fetching gallery:', err);
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
        ) : items.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            No media items uploaded yet. Admin can upload images and link YouTube videos from the dashboard.
          </div>
        ) : (
          <div className="grid grid-2" style={{ gap: '2rem' }}>
            {items.map(item => {
              const isVideo = item.image_url && (item.image_url.includes('youtube.com') || item.image_url.includes('youtu.be'));
              const videoId = isVideo ? getYouTubeId(item.image_url) : '';
              const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : '';

              return (
                <div key={item.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {isVideo ? (
                    <div style={{ height: '300px', width: '100%', overflow: 'hidden', background: '#000' }}>
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={embedUrl} 
                        title={item.title} 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                        style={{ border: 'none' }}
                      />
                    </div>
                  ) : (
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
                  )}
                  <div style={{ padding: '1.5rem' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700 }}>
                      {item.category.replace('_', ' ')} {isVideo && '• 🎥 Video'}
                    </span>
                    <h3 style={{ marginTop: '0.5rem' }}>{item.title}</h3>
                  </div>
                </div>
              );
            })}
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
