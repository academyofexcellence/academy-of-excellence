import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Calendar, Users, Copy, Check, Trash2 } from 'lucide-react';

export const MeetingMinutes: React.FC = () => {
  const [minutes, setMinutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form States
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendees, setAttendees] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMinutes();
  }, []);

  const fetchMinutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select('*')
        .order('meeting_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMinutes(data || []);
    } catch (err) {
      console.error('Error fetching meeting minutes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .insert([{
          title: title.trim(),
          meeting_date: date,
          attendees: attendees.trim() || null,
          content: content.trim()
        }])
        .select()
        .single();

      if (error) throw error;
      setMinutes(prev => [data, ...prev]);
      
      // Reset form
      setTitle('');
      setAttendees('');
      setContent('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      alert(`❌ Failed to save meeting minutes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMinutes = async (id: string) => {
    if (!confirm('Are you sure you want to delete these meeting minutes?')) return;

    try {
      const { error } = await supabase
        .from('meeting_minutes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMinutes(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(`❌ Failed to delete minutes: ${err.message}`);
    }
  };

  const handleCopyMinutes = (record: any) => {
    const formattedDate = new Date(record.meeting_date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const textToCopy = `📝 MEETING MINUTES
📌 Title: ${record.title}
📅 Date: ${formattedDate}
👥 Attendees: ${record.attendees || 'Not specified'}

-----------------------------------------
${record.content}
-----------------------------------------
Shared from Academy of Excellence Portal`;

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedId(record.id);
        setTimeout(() => setCopiedId(null), 2500);
      })
      .catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
  };

  // Client-side search for performance
  const filteredMinutes = minutes.filter(m => {
    const query = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(query) ||
      (m.attendees && m.attendees.toLowerCase().includes(query)) ||
      m.content.toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
      
      {/* 📝 Left Column: Log New Minutes */}
      <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem', alignSelf: 'start' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
          📝 Log Meeting Minutes
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 1.2rem 0' }}>
          Record placement meetings or phone call minutes. Quick-copy for sharing on WhatsApp or email.
        </p>

        <form onSubmit={handleSaveMinutes} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>Meeting Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Call with GCC Translation Manager"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>Meeting Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>Attendees</label>
              <input
                type="text"
                placeholder="e.g. Omar, MD, Tariq"
                value={attendees}
                onChange={e => setAttendees(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>Minutes / Discussion Details *</label>
            <textarea
              required
              rows={8}
              placeholder="Write what was discussed, decisions made, action items..."
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !title.trim() || !content.trim()}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary-dark)',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              opacity: (saving || !title.trim() || !content.trim()) ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : '💾 Save Meeting Minutes'}
          </button>
        </form>
      </div>

      {/* 📚 Right Column: Past Meeting Records & Search */}
      <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem', alignSelf: 'start' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
          📚 Archive & Copy Minutes
        </h3>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1.2rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search past logs by title, attendees, content..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.6rem 0.45rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading archive...</div>
        ) : filteredMinutes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No meeting records found matching your query.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {filteredMinutes.map(record => (
              <div 
                key={record.id}
                style={{
                  padding: '1rem',
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  position: 'relative'
                }}
              >
                {/* Header Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)' }}>
                    {record.title}
                  </h4>
                  <button
                    onClick={() => handleDeleteMinutes(record.id)}
                    style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.1rem', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Metadata */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Calendar size={12} /> {new Date(record.meeting_date).toLocaleDateString()}
                  </span>
                  {record.attendees && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Users size={12} /> {record.attendees}
                    </span>
                  )}
                </div>

                {/* Details Content Box */}
                <div 
                  style={{ 
                    fontSize: '0.8rem', 
                    color: '#374151', 
                    background: 'rgba(0,0,0,0.01)', 
                    padding: '0.6rem 0.8rem', 
                    borderRadius: '8px', 
                    border: '1px dashed rgba(0,0,0,0.05)',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}
                >
                  {record.content}
                </div>

                {/* Copy Button Action */}
                <button
                  onClick={() => handleCopyMinutes(record)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    padding: '0.4rem',
                    borderRadius: '6px',
                    background: copiedId === record.id ? '#10b981' : 'rgba(201,156,51,0.08)',
                    color: copiedId === record.id ? 'white' : 'var(--primary-dark)',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {copiedId === record.id ? (
                    <>
                      <Check size={12} /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy Meeting Minutes
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
