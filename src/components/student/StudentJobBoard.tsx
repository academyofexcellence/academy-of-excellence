import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentProfile } from '../../lib/types';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  PlusCircle, 
  FileText,
  UserCheck,
  Building,
  HelpCircle
} from 'lucide-react';

interface StudentJobBoardProps {
  currentStudent: StudentProfile;
}

export const StudentJobBoard: React.FC<StudentJobBoardProps> = ({ currentStudent }) => {
  const [subTab, setSubTab] = useState<'browse' | 'post' | 'my-posts' | 'my-apps'>('browse');
  
  // Data States
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Job Post Form State
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState<'office' | 'remote' | 'hybrid' | 'field'>('office');
  const [salary, setSalary] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [description, setDescription] = useState('');
  const [postingJob, setPostingJob] = useState(false);
  const [postMessage, setPostMessage] = useState('');

  // Application Request State (Modal)
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [appMessage, setAppMessage] = useState('');
  const [appMobile, setAppMobile] = useState(currentStudent.mobile_number || '');
  const [submittingApp, setSubmittingApp] = useState(false);

  useEffect(() => {
    fetchJobsAndApplications();
  }, [currentStudent.id]);

  const fetchJobsAndApplications = async () => {
    setLoading(true);
    try {
      // Query jobs (RLS automatically filters: status = approved OR posted_by = current_user)
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          job_applications (
            id,
            applicant_id,
            message,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error loading job board data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !companyName || !contactNumber) {
      alert('Job Title, Company Name, and Contact Number are required.');
      return;
    }

    setPostingJob(true);
    setPostMessage('');
    try {
      // 1. Insert public post details
      const { data, error } = await supabase
        .from('job_posts')
        .insert([{
          job_title: jobTitle,
          company_name: companyName,
          location: location || null,
          work_mode: workMode,
          salary: salary || null,
          description: description || null,
          posted_by: currentStudent.id, // Trigger overrides securely
          poster_name: currentStudent.name, // Trigger overrides securely
          poster_role: 'alumni' // Trigger overrides securely
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create job post.');

      // 2. Insert private contact details (Write-only for student)
      const { error: contactErr } = await supabase
        .from('job_contact_info')
        .insert([{
          job_id: data.id,
          contact_number: contactNumber
        }]);

      if (contactErr) throw contactErr;

      setPostMessage('🎉 Job posted successfully! It will appear on the feed once an admin approves it.');
      
      // Reset form
      setJobTitle('');
      setCompanyName('');
      setLocation('');
      setWorkMode('office');
      setSalary('');
      setContactNumber('');
      setDescription('');
      
      // Reload lists
      fetchJobsAndApplications();
      
      // Switch tab after 2.5s
      setTimeout(() => {
        setSubTab('my-posts');
        setPostMessage('');
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setPostMessage(`❌ Failed to post job: ${err.message}`);
    } finally {
      setPostingJob(false);
    }
  };

  const handleOpenRequestModal = (job: any) => {
    setSelectedJob(job);
    setAppMessage('');
    setAppMobile(currentStudent.mobile_number || '');
  };

  const handleConfirmRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setSubmittingApp(true);
    try {
      const { error } = await supabase
        .from('job_applications')
        .insert([{
          job_id: selectedJob.id,
          applicant_mobile: appMobile,
          message: appMessage
        }]);

      if (error) throw error;

      alert('✅ Application request submitted to placement cell!');
      setSelectedJob(null);
      fetchJobsAndApplications();
    } catch (err: any) {
      alert(`❌ Failed to submit application request: ${err.message}`);
    } finally {
      setSubmittingApp(false);
    }
  };

  // Lists filtering
  const approvedJobs = jobs.filter(j => j.status === 'approved');
  const myPosts = jobs.filter(j => j.posted_by === currentStudent.id);
  const myApplications = jobs.filter(j => j.job_applications?.some((app: any) => app.applicant_id === currentStudent.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxWidth: '880px', margin: '0 auto' }}>
      
      {/* Tab Selector */}
      <div style={{ 
        display: 'flex', 
        gap: '0.4rem', 
        flexWrap: 'wrap', 
        background: 'rgba(0,0,0,0.02)', 
        padding: '0.4rem', 
        borderRadius: '10px', 
        border: '1px solid rgba(0,0,0,0.04)' 
      }}>
        <button
          onClick={() => setSubTab('browse')}
          style={{
            flex: '1 1 auto', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
            background: subTab === 'browse' ? 'white' : 'transparent',
            color: subTab === 'browse' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'browse' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          🔍 Browse Jobs
        </button>
        {currentStudent.status === 'alumni' && (
          <button
            onClick={() => setSubTab('post')}
            style={{
              flex: '1 1 auto', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              background: subTab === 'post' ? 'white' : 'transparent',
              color: subTab === 'post' ? 'var(--primary-dark)' : 'var(--text-muted)',
              boxShadow: subTab === 'post' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            ➕ Post a Job
          </button>
        )}
        {currentStudent.status === 'alumni' && (
          <button
            onClick={() => setSubTab('my-posts')}
            style={{
              flex: '1 1 auto', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              background: subTab === 'my-posts' ? 'white' : 'transparent',
              color: subTab === 'my-posts' ? 'var(--primary-dark)' : 'var(--text-muted)',
              boxShadow: subTab === 'my-posts' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            📋 My Posts ({myPosts.length})
          </button>
        )}
        <button
          onClick={() => setSubTab('my-apps')}
          style={{
            flex: '1 1 auto', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
            background: subTab === 'my-apps' ? 'white' : 'transparent',
            color: subTab === 'my-apps' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'my-apps' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          🎓 My Requests ({myApplications.length})
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading jobs...</div>
      )}

      {!loading && (
        <div style={{ minHeight: '300px' }}>
          
          {/* BROWSE JOBS SUB-TAB */}
          {subTab === 'browse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {approvedJobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '12px', fontSize: '0.85rem' }}>
                  No jobs active in the feed currently. Check back later!
                </div>
              ) : (
                approvedJobs.map(job => {
                  const myAppRecord = job.job_applications?.find((app: any) => app.applicant_id === currentStudent.id);
                  const hasRequested = !!myAppRecord;

                  return (
                    <div 
                      key={job.id} 
                      className="glass-card" 
                      style={{ 
                        border: '1px solid rgba(201, 156, 51, 0.12)', 
                        padding: '1.2rem',
                        background: 'white',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{job.job_title}</h4>
                          <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--primary-dark)' }}>{job.company_name}</span>
                        </div>
                        
                        {/* Request action */}
                        {hasRequested ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                            <CheckCircle2 size={14} /> Requested
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenRequestModal(job)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '50px', cursor: 'pointer' }}
                          >
                            Request Job
                          </button>
                        )}
                      </div>

                      {/* Info tags */}
                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#4b5563', marginBottom: '0.8rem' }}>
                        {job.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <MapPin size={12} className="text-primary" /> {job.location}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', textTransform: 'capitalize' }}>
                          <Briefcase size={12} className="text-primary" /> {job.work_mode}
                        </div>
                        {job.salary && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <DollarSign size={12} className="text-primary" /> {job.salary}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                          <Clock size={12} className="text-primary" /> {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Description */}
                      {job.description && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', background: '#fafafa', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                          {job.description}
                        </p>
                      )}
                      
                      {/* Employer Contact Privacy Notice */}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontStyle: 'italic' }}>
                        🔒 Employer contact details are stored privately. Staff will coordinate your profile upon request.
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* POST A JOB SUB-TAB */}
          {subTab === 'post' && currentStudent.status === 'alumni' && (
            <div className="glass-card" style={{ border: '1px solid rgba(201,156,51,0.15)', padding: '1.5rem', background: 'white' }}>
              <div style={{ marginBottom: '1.2rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.6rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>➕ Share a Job Opportunity</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                  Submit a job opening from your company. It will be reviewed by admin staff before showing on the feed.
                </p>
              </div>

              {postMessage && (
                <div style={{ 
                  padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: 600,
                  background: postMessage.includes('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  color: postMessage.includes('❌') ? '#dc2626' : '#16a34a'
                }}>
                  {postMessage}
                </div>
              )}

              <form onSubmit={handlePostJob}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Job Title *</label>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Graphic Designer"
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Company Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Pixel Studio"
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Place/Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Remote / Cochin"
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Work Mode</label>
                    <select
                      value={workMode}
                      onChange={(e) => setWorkMode(e.target.value as any)}
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', background: 'white' }}
                    >
                      <option value="office">Office / On-Site</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="field">Field / Travel</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Salary Range</label>
                    <input
                      type="text"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="e.g. 20,000 - 25,000"
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-dark)' }}>📞 Employer Contact Number *</label>
                    <input
                      type="text"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="e.g. +91 9895000000"
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.3)', fontSize: '0.85rem', fontWeight: 'bold' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Job Details / Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe job requirements, roles, key skills required, and application instructions."
                    rows={4}
                    style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button 
                    type="submit" 
                    disabled={postingJob}
                    className="btn btn-primary" 
                    style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '50px', cursor: 'pointer' }}
                  >
                    {postingJob ? 'Submitting...' : 'Submit Job Post'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MY POSTS SUB-TAB */}
          {subTab === 'my-posts' && currentStudent.status === 'alumni' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '12px', fontSize: '0.85rem' }}>
                  You haven't posted any jobs yet. Share openings to help other scholars!
                </div>
              ) : (
                myPosts.map(job => (
                  <div 
                    key={job.id} 
                    className="glass-card" 
                    style={{ 
                      border: '1px solid rgba(201, 156, 51, 0.12)', 
                      padding: '1.2rem',
                      background: 'white',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{job.job_title}</h4>
                        <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--primary-dark)' }}>{job.company_name}</span>
                      </div>
                      
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                        background: job.status === 'approved' ? 'rgba(34,197,94,0.1)' : job.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: job.status === 'approved' ? '#16a34a' : job.status === 'pending' ? '#d97706' : '#dc2626'
                      }}>
                        {job.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                      {job.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                          <MapPin size={12} className="text-primary" /> {job.location}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', textTransform: 'capitalize' }}>
                        <Briefcase size={12} className="text-primary" /> {job.work_mode}
                      </div>
                      {job.salary && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                          <DollarSign size={12} className="text-primary" /> {job.salary}
                        </div>
                      )}
                    </div>

                    {job.description && (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', background: '#fafafa', padding: '0.5rem', borderRadius: '6px' }}>
                        {job.description}
                      </p>
                    )}

                    <div style={{ borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '0.6rem', marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      🔒 Applications are tracked by Admins/Staff. Registered students can request application processing directly.
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MY APPLICATIONS (REQUESTS) SUB-TAB */}
          {subTab === 'my-apps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myApplications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '12px', fontSize: '0.85rem' }}>
                  You haven't requested to apply for any jobs yet. Check Browse Jobs!
                </div>
              ) : (
                myApplications.map(job => {
                  const myApp = job.job_applications?.find((app: any) => app.applicant_id === currentStudent.id);
                  
                  return (
                    <div 
                      key={job.id} 
                      className="glass-card" 
                      style={{ 
                        border: '1px solid rgba(201, 156, 51, 0.12)', 
                        padding: '1.2rem',
                        background: 'white',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{job.job_title}</h4>
                          <span style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--primary-dark)' }}>{job.company_name}</span>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                          <CheckCircle2 size={14} /> Requested
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                        {job.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <MapPin size={12} className="text-primary" /> {job.location}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', textTransform: 'capitalize' }}>
                          <Briefcase size={12} className="text-primary" /> {job.work_mode}
                        </div>
                        {job.salary && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <DollarSign size={12} className="text-primary" /> {job.salary}
                          </div>
                        )}
                        {myApp && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <Clock size={12} className="text-primary" /> Requested: {new Date(myApp.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {myApp?.message && (
                        <div style={{ fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                          <strong>My Message:</strong> "{myApp.message}"
                        </div>
                      )}
                      
                      <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600, marginTop: '0.6rem' }}>
                        ℹ️ Placement cell admins will verify your profile and coordinate with {job.company_name}.
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      )}

      {/* CONFIRM REQUEST APPLICATION MODAL */}
      {selectedJob && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem'
        }}>
          <div className="glass-card" style={{
            background: 'white', border: '1px solid rgba(201, 156, 51, 0.2)',
            padding: '1.5rem', width: '100%', maxWidth: '480px', borderRadius: '16px'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              💼 Request Job Placement
            </h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Confirm your contact details below. Placement staff will forward your profile to <strong>{selectedJob.company_name}</strong> for the <strong>{selectedJob.job_title}</strong> position.
            </p>

            <form onSubmit={handleConfirmRequest}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>My Contact Number *</label>
                <input
                  type="text"
                  required
                  value={appMobile}
                  onChange={(e) => setAppMobile(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Optional Message to Admin / Employer</label>
                <textarea
                  value={appMessage}
                  onChange={(e) => setAppMessage(e.target.value)}
                  placeholder="e.g. Mention why you are interested or highlight key skills."
                  rows={3}
                  style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedJob(null)} 
                  className="btn btn-outline" 
                  style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', borderRadius: '50px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingApp}
                  className="btn btn-primary" 
                  style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '50px', cursor: 'pointer' }}
                >
                  {submittingApp ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
