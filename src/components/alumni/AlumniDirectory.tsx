import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, BookOpen, ExternalLink, MessageCircle, Mail } from 'lucide-react';

interface AlumniDirectoryProps {
  currentUserId: string;
}

export const AlumniDirectory: React.FC<AlumniDirectoryProps> = ({ currentUserId }) => {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Client-side filter states (avoids querying database repeatedly)
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [mentoringOnly, setMentoringOnly] = useState(false);
  
  // Client-side pagination limit to avoid DOM overloading
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    setVisibleCount(24);
  }, [search, batchFilter, courseFilter, mentoringOnly]);
  
  // Available batches and courses for filter dropdowns
  const [batches, setBatches] = useState<number[]>([]);
  const [courses, setCourses] = useState<string[]>([]);

  useEffect(() => {
    fetchAlumniData();
  }, []);

  const fetchAlumniData = async () => {
    setLoading(true);
    try {
      // Query alumni profiles and join student and course details
      const { data, error } = await supabase
        .from('alumni_profiles')
        .select(`
          *,
          student:student_id (
            id,
            name,
            email,
            batch_number,
            whatsapp_number,
            courses:course_id (
              name
            )
          )
        `);

      if (error) throw error;

      const records = data || [];
      setAlumni(records);

      // Extract unique batches and courses for filter options
      const uniqueBatches = Array.from(
        new Set(records.map(r => r.student?.batch_number).filter(Boolean))
      ).sort((a: any, b: any) => a - b) as number[];

      const uniqueCourses = Array.from(
        new Set(records.map(r => r.student?.courses?.name).filter(Boolean))
      ).sort() as string[];

      setBatches(uniqueBatches);
      setCourses(uniqueCourses);
    } catch (err) {
      console.error('Error fetching alumni directory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Perform client-side filtering to save database query resources
  const filteredAlumni = alumni.filter(item => {
    const student = item.student || {};
    const matchesSearch = 
      student.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.current_job_title?.toLowerCase().includes(search.toLowerCase()) ||
      item.current_company?.toLowerCase().includes(search.toLowerCase()) ||
      item.skills_learned?.toLowerCase().includes(search.toLowerCase()) ||
      item.current_work_location?.toLowerCase().includes(search.toLowerCase());

    const matchesBatch = !batchFilter || student.batch_number?.toString() === batchFilter;
    const matchesCourse = !courseFilter || student.courses?.name === courseFilter;
    const matchesMentoring = !mentoringOnly || item.is_open_to_mentoring;

    return matchesSearch && matchesBatch && matchesCourse && matchesMentoring;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 🔍 Search & Filters Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.2rem', 
          border: '1px solid rgba(201, 156, 51, 0.15)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, company, skills, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem 0.6rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: 'white'
            }}
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b} value={b}>Batch {b}</option>
            ))}
          </select>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: 'white'
            }}
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Mentoring Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={mentoringOnly}
              onChange={e => setMentoringOnly(e.target.checked)}
              style={{ accentColor: 'var(--primary-dark)' }}
            />
            <span>Open to Mentoring</span>
          </label>

          {/* Refresh Button */}
          <button
            onClick={fetchAlumniData}
            disabled={loading}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(201, 156, 51, 0.3)',
              background: 'rgba(201, 156, 51, 0.05)',
              color: 'var(--primary-dark)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Loading...' : '🔄 Reload'}
          </button>
        </div>
      </div>

      {/* 📇 Alumni Cards Grid */}
      {loading && alumni.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading network profiles...</div>
      ) : filteredAlumni.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No alumni profiles match your search criteria.
        </div>
      ) : (
        <>
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1.2rem' 
            }}
          >
          {filteredAlumni.slice(0, visibleCount).map((item) => {
            const student = item.student || {};
            const isEmployed = item.employment_status === 'employed' || item.employment_status === 'employed_looking';
            
            return (
              <div 
                key={item.student_id} 
                className="glass-card" 
                style={{ 
                  padding: '1.2rem', 
                  border: '1px solid rgba(201, 156, 51, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default'
                }}
              >
                <div>
                  {/* Top Bar: Name & Batch */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' }}>
                        {student.name}
                      </h4>
                      <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 550 }}>
                        {student.courses?.name} • Batch {student.batch_number}
                      </p>
                    </div>

                    {/* Mentoring Badge */}
                    {item.is_open_to_mentoring && (
                      <span 
                        style={{ 
                          fontSize: '0.62rem', 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          color: '#10b981', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '12px',
                          fontWeight: 700
                        }}
                      >
                        🎓 Mentor
                      </span>
                    )}
                  </div>

                  {/* Career Info */}
                  <div style={{ marginTop: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.8rem' }}>
                    {isEmployed ? (
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-color)' }}>
                          💼 {item.current_job_title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          🏢 {item.current_company}
                        </div>
                        {item.current_work_location && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            📍 {item.current_work_location}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        🎓 Higher Studies / Seeking Opportunities
                      </div>
                    )}
                  </div>

                  {/* Expertise/Skills */}
                  {item.skills_learned && (
                    <div style={{ marginTop: '0.8rem' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Expertise
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                        {item.skills_learned.split(',').map((skill: string, index: number) => (
                          <span 
                            key={index} 
                            style={{ 
                              fontSize: '0.68rem', 
                              background: 'rgba(0,0,0,0.03)', 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '4px',
                              color: 'var(--text-color)' 
                            }}
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Social Connect Footer */}
                {item.show_contact_links && (
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      marginTop: '0.5rem', 
                      borderTop: '1px solid rgba(0,0,0,0.04)', 
                      paddingTop: '0.8rem' 
                    }}
                  >
                    {/* LinkedIn */}
                    {item.linkedin_url && (
                      <a 
                        href={item.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          padding: '0.4rem',
                          borderRadius: '6px',
                          background: '#0a66c2',
                          color: 'white',
                          textDecoration: 'none',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      >
                        <ExternalLink size={12} />
                        LinkedIn
                      </a>
                    )}

                    {/* WhatsApp */}
                    {student.whatsapp_number && (
                      <a 
                        href={`https://wa.me/${student.whatsapp_number.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          padding: '0.4rem',
                          borderRadius: '6px',
                          background: '#25d366',
                          color: 'white',
                          textDecoration: 'none',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      >
                        <MessageCircle size={12} />
                        WhatsApp
                      </a>
                    )}

                    {/* Email if other links not present */}
                    {(!item.linkedin_url && !student.whatsapp_number && student.email) && (
                      <a 
                        href={`mailto:${student.email}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          padding: '0.4rem',
                          borderRadius: '6px',
                          background: '#cbd5e1',
                          color: '#334155',
                          textDecoration: 'none',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      >
                        <Mail size={12} />
                        Email
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
          {filteredAlumni.length > visibleCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={() => setVisibleCount(prev => prev + 24)}
                className="btn btn-outline"
                style={{
                  borderColor: 'var(--primary-dark)',
                  color: 'var(--primary-dark)',
                  padding: '0.6rem 2rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '50px',
                  cursor: 'pointer'
                }}
              >
                Load More Alumni ({filteredAlumni.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
