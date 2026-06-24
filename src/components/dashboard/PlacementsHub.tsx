import React, { useState } from 'react';
import { GraduationCap, UserCheck, Users, Award, Download, Search } from 'lucide-react';
import { Course } from '../../lib/types';

interface PlacementsHubProps {
  alumniProfiles: any[];
  courses: Course[];
  loadingAlumni: boolean;
  handleExportAlumniCSV: () => void;
}

export const PlacementsHub: React.FC<PlacementsHubProps> = ({
  alumniProfiles,
  courses,
  loadingAlumni,
  handleExportAlumniCSV
}) => {
  const [placementSearch, setPlacementSearch] = useState('');
  const [placementFilterCourse, setPlacementFilterCourse] = useState('');
  const [placementFilterBatch, setPlacementFilterBatch] = useState('');
  const [placementFilterStatus, setPlacementFilterStatus] = useState('');
  const [placementFilterLocation, setPlacementFilterLocation] = useState('');
  const [placementFilterGradOnly, setPlacementFilterGradOnly] = useState<'graduated' | 'all' | 'active'>('graduated');

  // Filter alumni
  const filtered = alumniProfiles.filter(alumnus => {
    const matchesSearch = 
      alumnus.name.toLowerCase().includes(placementSearch.toLowerCase()) ||
      alumnus.email.toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.hometown || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.house_name || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.street || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.locality || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.district || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.mobile_number || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.whatsapp_number || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.total_experience_years || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.experience_details || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.career?.skills_learned || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.career?.current_job_title || '').toLowerCase().includes(placementSearch.toLowerCase()) ||
      (alumnus.career?.current_company || '').toLowerCase().includes(placementSearch.toLowerCase());

    const matchesCourse = placementFilterCourse === '' || alumnus.course_id === placementFilterCourse;
    const matchesBatch = placementFilterBatch === '' || alumnus.batch_number === parseInt(placementFilterBatch);
    const matchesStatus = placementFilterStatus === '' || alumnus.career?.employment_status === placementFilterStatus;
    const matchesLocPref = placementFilterLocation === '' || alumnus.career?.preferred_location === placementFilterLocation;
    const matchesGrad = 
      placementFilterGradOnly === 'all' ? true :
      placementFilterGradOnly === 'graduated' ? alumnus.status === 'alumni' :
      alumnus.status !== 'alumni';

    return matchesSearch && matchesCourse && matchesBatch && matchesStatus && matchesLocPref && matchesGrad;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'rgba(201, 156, 51, 0.1)', color: 'var(--primary-dark)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Alumni</h4>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {alumniProfiles.filter(p => p.status === 'alumni').length}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employed</h4>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {alumniProfiles.filter(p => p.status === 'alumni' && (p.career?.employment_status === 'employed' || p.career?.employment_status === 'employed_looking')).length}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Looking for Job</h4>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {alumniProfiles.filter(p => p.status === 'alumni' && (p.career?.employment_status === 'unemployed_looking' || p.career?.employment_status === 'employed_looking')).length}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'rgba(201, 156, 51, 0.1)', color: 'var(--primary-dark)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employment Rate</h4>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {(() => {
                const totalAlumni = alumniProfiles.filter(p => p.status === 'alumni').length;
                if (totalAlumni === 0) return '0%';
                const employed = alumniProfiles.filter(p => p.status === 'alumni' && (p.career?.employment_status === 'employed' || p.career?.employment_status === 'employed_looking')).length;
                return `${Math.round((employed / totalAlumni) * 100)}%`;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.8rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>🎓 Alumni & Placements Register</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
              Structured directories of graduation cohorts, spouses, and career preferences.
            </p>
          </div>
          <button onClick={handleExportAlumniCSV} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'var(--primary)', color: 'var(--primary-dark)', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Filters Block */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.015)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Register</label>
            <input
              type="text"
              value={placementSearch}
              onChange={(e) => setPlacementSearch(e.target.value)}
              placeholder="Search hometown, role, name, phone, spouse, skills..."
              style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
            />
          </div>

          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Course</label>
            <select
              value={placementFilterCourse}
              onChange={(e) => setPlacementFilterCourse(e.target.value)}
              style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 80px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Batch</label>
            <select
              value={placementFilterBatch}
              onChange={(e) => setPlacementFilterBatch(e.target.value)}
              style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
            >
              <option value="">All</option>
              {[...Array(30)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Batch {i + 1}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Job Search Status</label>
            <select
              value={placementFilterStatus}
              onChange={(e) => setPlacementFilterStatus(e.target.value)}
              style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
            >
              <option value="">All Statuses</option>
              <option value="unemployed_looking">Looking for Job (Unemployed)</option>
              <option value="employed_looking">Looking for Job (Employed)</option>
              <option value="employed">Employed (Not Looking)</option>
              <option value="higher_studies">Higher Studies</option>
              <option value="unemployed_not_looking">Not Looking</option>
            </select>
          </div>

          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Graduation</label>
            <select
              value={placementFilterGradOnly}
              onChange={(e) => setPlacementFilterGradOnly(e.target.value as any)}
              style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
            >
              <option value="graduated">Graduates Only</option>
              <option value="all">All Students</option>
              <option value="active">Active Only</option>
            </select>
          </div>
        </div>

        {loadingAlumni ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading profiles...</div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '12px', fontSize: '0.85rem' }}>
                No register matches found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)', background: 'var(--bg-light)' }}>
                      <th style={{ padding: '0.8rem', fontWeight: 700 }}>Graduate Info</th>
                      <th style={{ padding: '0.8rem', fontWeight: 700 }}>Structured Address</th>
                      <th style={{ padding: '0.8rem', fontWeight: 700 }}>Contacts</th>
                      <th style={{ padding: '0.8rem', fontWeight: 700 }}>Employment Details</th>
                      <th style={{ padding: '0.8rem', fontWeight: 700 }}>Preferences & Experience</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(alumnus => {
                      const statusLabel = 
                        alumnus.career?.employment_status === 'employed' ? 'Employed' : 
                        alumnus.career?.employment_status === 'employed_looking' ? 'Employed (Looking)' : 
                        alumnus.career?.employment_status === 'unemployed_looking' ? 'Looking for Job' : 
                        alumnus.career?.employment_status === 'higher_studies' ? 'Higher Studies' : 'Not Looking';
                      
                      const statusColor = 
                        alumnus.career?.employment_status === 'employed' ? '#16a34a' : 
                        alumnus.career?.employment_status === 'employed_looking' ? '#7c3aed' : 
                        alumnus.career?.employment_status === 'unemployed_looking' ? '#2563eb' : '#475569';

                      const statusBg = 
                        alumnus.career?.employment_status === 'employed' ? 'rgba(22, 163, 74, 0.1)' : 
                        alumnus.career?.employment_status === 'employed_looking' ? 'rgba(124, 58, 237, 0.1)' : 
                        alumnus.career?.employment_status === 'unemployed_looking' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(71, 85, 105, 0.1)';

                      const locPrefLabel = 
                        alumnus.career?.preferred_location === 'near_home' ? 'Near Home' : 
                        alumnus.career?.preferred_location === 'india' ? 'In India' : 
                        alumnus.career?.preferred_location === 'abroad' ? 'Abroad' : 'Anywhere';

                      return (
                        <tr key={alumnus.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          <td style={{ padding: '0.8rem', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>{alumnus.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{alumnus.email}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--primary-dark)', marginTop: '0.2rem' }}>{alumnus.courses?.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Batch {alumnus.batch_number} • Roll {alumnus.roll_number || 'N/A'}</div>
                            {alumnus.status !== 'alumni' && (
                              <span style={{ display: 'inline-block', fontSize: '0.65rem', background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '0.05rem 0.3rem', borderRadius: '4px', marginTop: '0.2rem', fontWeight: 700 }}>
                                Active (Not Graduated)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.8rem', verticalAlign: 'top', color: '#475569', lineHeight: '1.4' }}>
                            {alumnus.house_name && <div><strong>House:</strong> {alumnus.house_name}</div>}
                            {alumnus.street && <div><strong>Street:</strong> {alumnus.street}</div>}
                            {alumnus.locality && <div><strong>Locality/PO:</strong> {alumnus.locality}</div>}
                            {alumnus.district && <div><strong>District:</strong> {alumnus.district}</div>}
                            {alumnus.state && <div><strong>State:</strong> {alumnus.state} {alumnus.pincode ? ` - ${alumnus.pincode}` : ''}</div>}
                            {alumnus.hometown && <div style={{ fontSize: '0.7rem', fontStyle: 'italic', marginTop: '0.15rem', color: 'var(--text-muted)' }}>Hometown: {alumnus.hometown}</div>}
                            {!alumnus.house_name && !alumnus.street && !alumnus.district && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No address logged.</span>}
                          </td>
                          <td style={{ padding: '0.8rem', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {alumnus.mobile_number && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 650 }}>
                                  <span>📞</span>
                                  <a href={`tel:${alumnus.mobile_number}`} style={{ color: 'inherit', textDecoration: 'none' }}>{alumnus.mobile_number}</a>
                                </div>
                              )}
                              {alumnus.whatsapp_number && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <span>💬</span>
                                  <a 
                                    href={`https://wa.me/${alumnus.whatsapp_number.replace(/[^0-9]/g, '').length === 10 ? '91' : ''}${alumnus.whatsapp_number.replace(/[^0-9]/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 700 }}
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              )}
                              {alumnus.career?.linkedin_url && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <span>🔗</span>
                                  <a 
                                    href={alumnus.career.linkedin_url.startsWith('http') ? alumnus.career.linkedin_url : `https://${alumnus.career.linkedin_url}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                                  >
                                    LinkedIn
                                  </a>
                                </div>
                              )}
                              {!alumnus.mobile_number && !alumnus.whatsapp_number && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No contacts.</span>}
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem', verticalAlign: 'top' }}>
                            <span style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px', background: statusBg, color: statusColor, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                              {statusLabel}
                            </span>
                            {(alumnus.career?.employment_status === 'employed' || alumnus.career?.employment_status === 'employed_looking') && (
                              <div style={{ fontSize: '0.75rem', lineHeight: '1.3' }}>
                                <div><strong>Role:</strong> {alumnus.career.current_job_title || 'N/A'}</div>
                                <div><strong>Employer:</strong> {alumnus.career.current_company || 'N/A'}</div>
                              </div>
                            )}
                            {alumnus.career?.marital_status === 'married' && (
                              <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed rgba(0,0,0,0.06)', lineHeight: '1.3' }}>
                                <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>💍 Spouse Details</div>
                                <div>Name: {alumnus.career.spouse_name || 'N/A'}</div>
                                {alumnus.career.spouse_profession && <div>Work: {alumnus.career.spouse_profession}</div>}
                                {alumnus.career.spouse_company && <div>Co: {alumnus.career.spouse_company}</div>}
                                {alumnus.career.spouse_work_location && <div>Loc: {alumnus.career.spouse_work_location}</div>}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.8rem', verticalAlign: 'top', lineHeight: '1.3' }}>
                            <div>Pref: <span style={{ fontWeight: 650 }}>{locPrefLabel}</span></div>
                            {alumnus.career?.preferred_roles && <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>Roles: {alumnus.career.preferred_roles}</div>}
                            {alumnus.total_experience_years && (
                              <div style={{ fontSize: '0.75rem', marginTop: '0.3rem', background: '#f0fdf4', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(22,101,52,0.1)' }}>
                                <div style={{ fontWeight: 700, color: '#16a34a' }}>💼 Experience ({alumnus.total_experience_years})</div>
                                {alumnus.experience_details && <div style={{ fontSize: '0.7rem', marginTop: '0.1rem', color: '#4b5563' }}>{alumnus.experience_details}</div>}
                              </div>
                            )}
                            {alumnus.career?.skills_learned && (
                              <div style={{ fontSize: '0.75rem', marginTop: '0.3rem', background: '#f8fafc', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.02)' }}>
                                <strong>Skills:</strong> {alumnus.career.skills_learned}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
