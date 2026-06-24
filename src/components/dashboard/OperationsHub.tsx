import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ClipboardList, 
  Image, 
  Settings, 
  Plus, 
  Trash2, 
  GraduationCap, 
  UserCheck, 
  Upload, 
  CheckCircle2, 
  Briefcase 
} from 'lucide-react';
import { Course, ScoringInterval, Task, StaffProfile } from '../../lib/types';

interface OperationsHubProps {
  isLeadership: boolean;
  currentUser: StaffProfile | null;
  taskList: Task[];
  staffList: StaffProfile[];
  courses: Course[];
  intervalsList: ScoringInterval[];
  activeInterval: ScoringInterval | null;
  galleryItems: any[];
  partnersList: any[];
  visitorsList: any[];
  
  newCourseName: string;
  setNewCourseName: (val: string) => void;
  handleAddCourse: (e: React.FormEvent) => Promise<void>;
  
  newIntervalCourse: string;
  setNewIntervalCourse: (val: string) => void;
  newIntervalBatch: string;
  setNewIntervalBatch: (val: string) => void;
  newIntervalName: string;
  setNewIntervalName: (val: string) => void;
  handleAddInterval: (e: React.FormEvent) => Promise<void>;
  handleSetIntervalInactive: (id: string) => Promise<void>;
  handleToggleIntervalActiveStatus: (id: string, courseId: string, batchNumber: number) => Promise<void>;

  selectedConfigIntervalId: string;
  setSelectedConfigIntervalId: (val: string) => void;
  configStartDate: string;
  setConfigStartDate: (val: string) => void;
  configEndDate: string;
  setConfigEndDate: (val: string) => void;
  configWorkingDays: number;
  setConfigWorkingDays: (val: number) => void;
  configVocab: number;
  setConfigVocab: (val: number) => void;
  configSentences: number;
  setConfigSentences: (val: number) => void;
  configVlogs: number;
  setConfigVlogs: (val: number) => void;
  configReaction: number;
  setConfigReaction: (val: number) => void;
  configHadith: number;
  setConfigHadith: (val: number) => void;
  handleSaveIntervalTargets: (e: React.FormEvent) => Promise<void>;

  // Tasks
  taskTitle: string;
  setTaskTitle: (val: string) => void;
  taskDesc: string;
  setTaskDesc: (val: string) => void;
  taskType: 'daily' | 'one_off';
  setTaskType: (val: 'daily' | 'one_off') => void;
  taskAssignedTo: string;
  setTaskAssignedTo: (val: string) => void;
  taskDueDate: string;
  setTaskDueDate: (val: string) => void;
  handleCreateTask: (e: React.FormEvent) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleToggleTaskStatus: (taskId: string, currentStatus: string) => Promise<void>;
  
  // Website
  fetchWebsiteContent: () => void;
  
  filterCourse: string;
  filterBatch: string;
}

export const OperationsHub: React.FC<OperationsHubProps> = ({
  isLeadership,
  currentUser,
  taskList,
  staffList,
  courses,
  intervalsList,
  activeInterval,
  galleryItems,
  partnersList,
  visitorsList,
  newCourseName,
  setNewCourseName,
  handleAddCourse,
  newIntervalCourse,
  setNewIntervalCourse,
  newIntervalBatch,
  setNewIntervalBatch,
  newIntervalName,
  setNewIntervalName,
  handleAddInterval,
  handleSetIntervalInactive,
  handleToggleIntervalActiveStatus,
  selectedConfigIntervalId,
  setSelectedConfigIntervalId,
  configStartDate,
  setConfigStartDate,
  configEndDate,
  setConfigEndDate,
  configWorkingDays,
  setConfigWorkingDays,
  configVocab,
  setConfigVocab,
  configSentences,
  setConfigSentences,
  configVlogs,
  setConfigVlogs,
  configReaction,
  setConfigReaction,
  configHadith,
  setConfigHadith,
  handleSaveIntervalTargets,
  taskTitle,
  setTaskTitle,
  taskDesc,
  setTaskDesc,
  taskType,
  setTaskType,
  taskAssignedTo,
  setTaskAssignedTo,
  taskDueDate,
  setTaskDueDate,
  handleCreateTask,
  handleDeleteTask,
  handleToggleTaskStatus,
  fetchWebsiteContent,
  filterCourse,
  filterBatch
}) => {
  const [subTab, setSubTab] = useState<'intervals' | 'tasks' | 'website'>('intervals');

  const [websiteSubTab, setWebsiteSubTab] = useState<'gallery' | 'partners' | 'visitors'>('gallery');
  const [galleryUploading, setGalleryUploading] = useState(false);
  
  // Gallery states
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('activity');
  const [galleryFile, setGalleryFile] = useState<File | null>(null);

  // Partner states
  const [partnerName, setPartnerName] = useState('');
  const [partnerFile, setPartnerFile] = useState<File | null>(null);

  // Visitor states
  const [visitorName, setVisitorName] = useState('');
  const [visitorDesignation, setVisitorDesignation] = useState('');
  const [visitorOrganization, setVisitorOrganization] = useState('');
  const [visitorFile, setVisitorFile] = useState<File | null>(null);

  // Helper log activity
  const logActivity = async (actionType: string, details: string) => {
    if (!currentUser) return;
    try {
      await supabase.from('activity_logs').insert([
        {
          actor_id: currentUser.id,
          actor_name: currentUser.name,
          action_type: actionType,
          details: details
        }
      ]);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  // Upload file helper
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    setGalleryUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
      return null;
    } finally {
      setGalleryUploading(false);
    }
  };

  // Gallery handlers
  const handleUploadGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryFile || !galleryTitle) {
      alert('Please enter an image title and select a file.');
      return;
    }
    const url = await uploadFile(galleryFile, 'gallery');
    if (!url) return;

    const { error } = await supabase.from('gallery').insert([
      { title: galleryTitle, category: galleryCategory, image_url: url }
    ]);

    if (error) {
      alert(`Error saving gallery item: ${error.message}`);
    } else {
      await logActivity('gallery_added', `Uploaded new gallery image: "${galleryTitle}"`);
      setGalleryTitle('');
      setGalleryFile(null);
      const el = document.getElementById('gallery-file-input') as HTMLInputElement;
      if (el) el.value = '';
      fetchWebsiteContent();
    }
  };

  const handleDeleteGallery = async (id: string, imageUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) throw error;
      await logActivity('website_content_deleted', 'Deleted item from gallery');
      fetchWebsiteContent();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Partner handlers
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerFile || !partnerName) {
      alert('Please enter partner name and select a logo file.');
      return;
    }
    const url = await uploadFile(partnerFile, 'partners');
    if (!url) return;

    const { error } = await supabase.from('partners').insert([
      { name: partnerName, logo_url: url }
    ]);

    if (error) {
      alert(`Error saving partner: ${error.message}`);
    } else {
      await logActivity('partner_added', `Added new partner logo: "${partnerName}"`);
      setPartnerName('');
      setPartnerFile(null);
      const el = document.getElementById('partner-file-input') as HTMLInputElement;
      if (el) el.value = '';
      fetchWebsiteContent();
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this partner?')) return;
    try {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      await logActivity('website_content_deleted', 'Deleted partner');
      fetchWebsiteContent();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Visitor handlers
  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorFile || !visitorName || !visitorDesignation) {
      alert('Please enter visitor details and select a photo file.');
      return;
    }
    const url = await uploadFile(visitorFile, 'visitors');
    if (!url) return;

    const { error } = await supabase.from('visitors').insert([
      { 
        name: visitorName, 
        designation: visitorDesignation, 
        organization: visitorOrganization, 
        image_url: url 
      }
    ]);

    if (error) {
      alert(`Error saving visitor: ${error.message}`);
    } else {
      await logActivity('guest_added', `Added new visiting guest profile: "${visitorName}"`);
      setVisitorName('');
      setVisitorDesignation('');
      setVisitorOrganization('');
      setVisitorFile(null);
      const el = document.getElementById('visitor-file-input') as HTMLInputElement;
      if (el) el.value = '';
      fetchWebsiteContent();
    }
  };

  const handleDeleteVisitor = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this visitor?')) return;
    try {
      const { error } = await supabase.from('visitors').delete().eq('id', id);
      if (error) throw error;
      await logActivity('guest_deleted', 'Deleted visiting guest profile');
      fetchWebsiteContent();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (!isLeadership) {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem', border: '1px solid rgba(239,68,68,0.15)' }}>
        <p style={{ color: '#dc2626' }}>Only leadership accounts can access the Operations Hub.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Sub-Tabs Nav */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.02)',
        padding: '0.35rem',
        borderRadius: '12px',
        alignSelf: 'flex-start',
        border: '1px solid rgba(0,0,0,0.04)',
        marginBottom: '0.5rem'
      }}>
        <button
          onClick={() => setSubTab('intervals')}
          style={{
            padding: '0.5rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'intervals' ? 'white' : 'transparent',
            color: subTab === 'intervals' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'intervals' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Settings size={15} /> Academic & Terms
        </button>
        <button
          onClick={() => setSubTab('tasks')}
          style={{
            padding: '0.5rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'tasks' ? 'white' : 'transparent',
            color: subTab === 'tasks' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'tasks' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <ClipboardList size={15} /> Staff Duty Board
        </button>
        <button
          onClick={() => setSubTab('website')}
          style={{
            padding: '0.5rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'website' ? 'white' : 'transparent',
            color: subTab === 'website' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'website' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Image size={15} /> Website Content
        </button>
      </div>

      {/* Tab Panels */}
      {subTab === 'intervals' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Manage Courses Panel */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <GraduationCap size={18} className="text-primary" /> Manage Courses
            </h3>
            
            <form onSubmit={handleAddCourse} style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.2rem' }}>
              <input 
                type="text" 
                value={newCourseName} 
                onChange={(e) => setNewCourseName(e.target.value)} 
                className="form-input" 
                placeholder="e.g. OET Language Coaching" 
                required 
                style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', outline: 'none', flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                Create
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.2rem' }}>Existing Course Roster</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {courses.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.85rem' }}>
                    <span>{c.name}</span>
                    <code style={{ fontSize: '0.7rem', opacity: 0.6 }}>{c.id.substring(0,8)}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Manage Scoring Intervals (Scoreboard resets) */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ClipboardList size={18} className="text-primary" /> Scoreboard Intervals & Terms
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1.2rem' }}>Add intervals to reset scoreboard. Previous scores remain archived.</p>

            <form onSubmit={handleAddInterval} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Course</label>
                <select 
                  value={newIntervalCourse} 
                  onChange={(e) => setNewIntervalCourse(e.target.value)} 
                  style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                  required
                >
                  <option value="">- Select Course -</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Batch Number</label>
                  <input 
                    type="number" 
                    value={newIntervalBatch} 
                    onChange={(e) => setNewIntervalBatch(e.target.value)} 
                    style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                    placeholder="e.g. 25" 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Interval Name</label>
                  <input 
                    type="text" 
                    value={newIntervalName} 
                    onChange={(e) => setNewIntervalName(e.target.value)} 
                    style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                    placeholder="e.g. Term 2" 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.55rem' }}>
                Archive Scores & Reset Leaderboard
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.2rem' }}>All Intervals History</h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {intervalsList.map(int => {
                  const cName = courses.find(c => c.id === int.course_id)?.name || 'Course';
                  return (
                    <div key={int.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem', background: 'rgba(0,0,0,0.015)', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div>
                        <strong>{int.name}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cName} (B-{int.batch_number})</div>
                      </div>
                      {int.is_active ? (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>Active</span>
                          <button 
                            onClick={() => handleSetIntervalInactive(int.id)} 
                            className="btn btn-outline" 
                            style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem', color: '#dc2626', borderColor: '#fca5a5', background: 'rgba(239,68,68,0.02)' }}
                          >
                            Deactivate
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleToggleIntervalActiveStatus(int.id, int.course_id, int.batch_number)} 
                          className="btn btn-outline" 
                          style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}
                        >
                          Set Active
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Period Target Configurations */}
            {intervalsList.filter(i => i.course_id === filterCourse && i.batch_number === parseInt(filterBatch)).length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Settings size={15} className="text-primary" /> Period Target Configurations
                </h4>
                
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Select Academic Period</label>
                  <select 
                    value={selectedConfigIntervalId}
                    onChange={(e) => setSelectedConfigIntervalId(e.target.value)}
                    style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                  >
                    <option value="">- Select -</option>
                    {intervalsList
                      .filter(i => i.course_id === filterCourse && i.batch_number === parseInt(filterBatch))
                      .map(int => (
                        <option key={int.id} value={int.id}>
                          {int.name} {int.is_active ? '⭐️ (Active)' : '(Archived)'}
                        </option>
                      ))}
                  </select>
                </div>

                <form onSubmit={handleSaveIntervalTargets} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>Start Date</label>
                      <input 
                        type="date" 
                        value={configStartDate} 
                        onChange={(e) => setConfigStartDate(e.target.value)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>End Date</label>
                      <input 
                        type="date" 
                        value={configEndDate} 
                        onChange={(e) => setConfigEndDate(e.target.value)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>Working Days</label>
                      <input 
                        type="number" 
                        value={configWorkingDays} 
                        onChange={(e) => setConfigWorkingDays(parseInt(e.target.value) || 0)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                        min={1}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>Vocab Target</label>
                      <input 
                        type="number" 
                        value={configVocab} 
                        onChange={(e) => setConfigVocab(parseInt(e.target.value) || 0)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>Sentences Target</label>
                      <input 
                        type="number" 
                        value={configSentences} 
                        onChange={(e) => setConfigSentences(parseInt(e.target.value) || 0)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>Vlogs Target</label>
                      <input 
                        type="number" 
                        value={configVlogs} 
                        onChange={(e) => setConfigVlogs(parseInt(e.target.value) || 0)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>Video Reactions</label>
                      <input 
                        type="number" 
                        value={configReaction} 
                        onChange={(e) => setConfigReaction(parseInt(e.target.value) || 0)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.2rem', display: 'block' }}>Hadith Target</label>
                      <input 
                        type="number" 
                        value={configHadith} 
                        onChange={(e) => setConfigHadith(parseInt(e.target.value) || 0)} 
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem', width: '100%' }}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '0.45rem' }}>
                    Save Term Parameters
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'tasks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Create Task Form */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={18} className="text-primary" /> Assign Staff Duty
            </h3>
            
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Task Title</label>
                <input 
                  type="text" 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)} 
                  style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                  placeholder="e.g. Check WhatsApp Sentences submissions"
                  required
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Description (Optional)</label>
                <textarea 
                  value={taskDesc} 
                  onChange={(e) => setTaskDesc(e.target.value)} 
                  style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none', height: '60px', resize: 'vertical' }}
                  placeholder="Enter details..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Task Type</label>
                  <select 
                    value={taskType} 
                    onChange={(e) => setTaskType(e.target.value as any)}
                    style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                  >
                    <option value="daily">Daily Checklist</option>
                    <option value="one_off">One-Off Assignment</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Assign To</label>
                  <select 
                    value={taskAssignedTo} 
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                    required
                  >
                    <option value="">- Select Staff -</option>
                    {staffList.filter(s => s.status === 'active').map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
                    ))}
                  </select>
                </div>
              </div>

              {taskType === 'one_off' && (
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Due Date</label>
                  <input 
                    type="date" 
                    value={taskDueDate} 
                    onChange={(e) => setTaskDueDate(e.target.value)} 
                    style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.55rem' }}>
                Assign Task
              </button>
            </form>
          </div>

          {/* Task Board Columns */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ClipboardList size={18} className="text-primary" /> Active Task List
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '420px', overflowY: 'auto' }}>
              {taskList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No staff tasks assigned.</p>
              ) : (
                taskList.map(task => (
                  <div key={task.id} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid var(--primary)', borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{task.title}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        To: <strong>{staffList.find(s => s.id === task.assigned_to)?.name || 'Staff'}</strong> • Type: <span style={{ textTransform: 'capitalize' }}>{task.task_type}</span>
                        {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                      </div>
                      <div style={{ marginTop: '0.3rem' }}>
                        <button
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.3rem',
                            background: task.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
                            color: task.status === 'completed' ? '#16a34a' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          Status: {task.status.replace('_', ' ')}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => { if (window.confirm('Delete this task?')) handleDeleteTask(task.id); }}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'website' && (
        <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.8rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Image Gallery & Dynamic Web Content</h3>
            
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', padding: '0.25rem', borderRadius: '8px', gap: '0.2rem' }}>
              {(['gallery', 'partners', 'visitors'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setWebsiteSubTab(tab)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    background: websiteSubTab === tab ? 'white' : 'transparent',
                    color: websiteSubTab === tab ? 'var(--primary-dark)' : 'var(--text-muted)',
                    boxShadow: websiteSubTab === tab ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {websiteSubTab === 'gallery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <form onSubmit={handleUploadGallery} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.015)', padding: '0.8rem', borderRadius: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Image Title" 
                  value={galleryTitle}
                  onChange={(e) => setGalleryTitle(e.target.value)}
                  required
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                />
                <select
                  value={galleryCategory}
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none', background: 'white' }}
                >
                  <option value="activity">Activity</option>
                  <option value="mock_interview">Mock Interview</option>
                  <option value="cultural">Cultural / Event</option>
                </select>
                <input 
                  type="file" 
                  id="gallery-file-input"
                  accept="image/*" 
                  onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
                  required
                  style={{ fontSize: '0.8rem', outline: 'none' }}
                />
                <button type="submit" disabled={galleryUploading} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                  <Upload size={14} /> {galleryUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </form>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.8rem' }}>
                {galleryItems.map(item => (
                  <div key={item.id} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', aspectRatio: '4/3' }}>
                    <img 
                      src={item.image_url} 
                      alt="Gallery Item" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button
                      onClick={() => handleDeleteGallery(item.id, item.image_url)}
                      style={{
                        position: 'absolute', top: '0.3rem', right: '0.3rem', background: 'rgba(220,38,38,0.85)',
                        border: 'none', borderRadius: '4px', color: 'white', padding: '0.2rem', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {websiteSubTab === 'partners' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <form onSubmit={handleCreatePartner} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.015)', padding: '0.8rem', borderRadius: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Partner Name" 
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  required
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                />
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Logo Image:</label>
                <input 
                  type="file" 
                  id="partner-file-input"
                  accept="image/*"
                  onChange={(e) => setPartnerFile(e.target.files?.[0] || null)}
                  required
                  style={{ fontSize: '0.8rem', outline: 'none' }}
                />
                <button type="submit" disabled={galleryUploading} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                  {galleryUploading ? 'Uploading...' : 'Add Partner'}
                </button>
              </form>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.8rem' }}>
                {partnersList.map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.6rem', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', position: 'relative' }}>
                    <img src={p.image_url} alt={p.name} style={{ height: '35px', maxWidth: '100%', objectFit: 'contain', marginBottom: '0.35rem' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</span>
                    <button
                      onClick={() => handleDeletePartner(p.id)}
                      style={{
                        position: 'absolute', top: '0.2rem', right: '0.2rem', background: 'none',
                        border: 'none', color: '#dc2626', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {websiteSubTab === 'visitors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <form onSubmit={handleCreateVisitor} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(0,0,0,0.015)', padding: '0.8rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    placeholder="Visitor Name" 
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    required
                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Designation" 
                    value={visitorDesignation}
                    onChange={(e) => setVisitorDesignation(e.target.value)}
                    required
                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none', flex: 1 }}
                  />
                  <input 
                    type="text" 
                    placeholder="Organization / Company" 
                    value={visitorOrganization}
                    onChange={(e) => setVisitorOrganization(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none', flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Photo Image File:</label>
                  <input 
                    type="file" 
                    id="visitor-file-input"
                    accept="image/*"
                    onChange={(e) => setVisitorFile(e.target.files?.[0] || null)}
                    required
                    style={{ fontSize: '0.8rem', outline: 'none' }}
                  />
                  <button type="submit" disabled={galleryUploading} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {galleryUploading ? 'Uploading...' : 'Add Guest/Mentor'}
                  </button>
                </div>
              </form>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                {visitorsList.map(v => (
                  <div key={v.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.8rem', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', position: 'relative', background: 'white' }}>
                    <img src={v.image_url} alt={v.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.5rem' }} />
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{v.name}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary-dark)', textAlign: 'center', marginTop: '0.1rem' }}>{v.designation}</span>
                    {v.organization && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>{v.organization}</span>}
                    <button
                      onClick={() => handleDeleteVisitor(v.id)}
                      style={{
                        position: 'absolute', top: '0.3rem', right: '0.3rem', background: 'none',
                        border: 'none', color: '#dc2626', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
