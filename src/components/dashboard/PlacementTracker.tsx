import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckSquare, Square, Plus, Trash2, Calendar, ClipboardList, Save, Check } from 'lucide-react';

interface PlacementTrackerProps {
  currentUserId: string;
}

export const PlacementTracker: React.FC<PlacementTrackerProps> = ({ currentUserId }) => {
  // General Tasks States
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  // Application Follow-up States
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [notesInput, setNotesInput] = useState<{ [appId: string]: string }>({});
  const [savedStatus, setSavedStatus] = useState<{ [appId: string]: boolean }>({});

  useEffect(() => {
    fetchTasks();
    fetchApplications();
  }, []);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('placement_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching placement tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:job_id (
            job_title,
            company_name
          ),
          student:applicant_id (
            name,
            batch_number,
            courses:course_id (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
      
      // Initialize notes input map
      const initialNotes: { [appId: string]: string } = {};
      (data || []).forEach((app: any) => {
        initialNotes[app.id] = app.internal_notes || '';
      });
      setNotesInput(initialNotes);
    } catch (err) {
      console.error('Error fetching job applications for tracking:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('placement_tasks')
        .insert([{
          title: newTaskTitle.trim(),
          due_date: newTaskDue || null,
          status: 'todo'
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [data, ...prev]);
      setNewTaskTitle('');
      setNewTaskDue('');
    } catch (err: any) {
      alert(`❌ Failed to create task: ${err.message}`);
    }
  };

  const handleToggleTaskCompleted = async (task: any) => {
    const isCompleted = task.status === 'completed';
    const newStatus = isCompleted ? 'todo' : 'completed';

    try {
      const { error } = await supabase
        .from('placement_tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      console.error('Error toggling task completion:', err);
    }
  };

  const handleChangeTaskStatus = async (taskId: string, currentStatus: string) => {
    const statuses = ['todo', 'in_progress', 'waiting'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    try {
      const { error } = await supabase
        .from('placement_tasks')
        .update({ status: nextStatus })
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    } catch (err: any) {
      console.error('Error changing task status:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      const { error } = await supabase
        .from('placement_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: any) {
      alert(`❌ Failed to delete task: ${err.message}`);
    }
  };

  const handleUpdateAppStatus = async (appId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (error) throw error;
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      
      // Show saved check
      setSavedStatus(prev => ({ ...prev, [appId]: true }));
      setTimeout(() => setSavedStatus(prev => ({ ...prev, [appId]: false })), 2000);
    } catch (err: any) {
      alert(`❌ Failed to update status: ${err.message}`);
    }
  };

  const handleSaveAppNotes = async (appId: string) => {
    const noteText = notesInput[appId] || '';
    
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ internal_notes: noteText.trim() })
        .eq('id', appId);

      if (error) throw error;
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, internal_notes: noteText.trim() } : a));

      // Show saved check
      setSavedStatus(prev => ({ ...prev, [appId]: true }));
      setTimeout(() => setSavedStatus(prev => ({ ...prev, [appId]: false })), 2000);
    } catch (err: any) {
      alert(`❌ Failed to save notes: ${err.message}`);
    }
  };

  // Status styling helpers
  const getTaskStatusStyles = (status: string) => {
    switch (status) {
      case 'todo': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', text: 'To Do' };
      case 'in_progress': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', text: 'In Progress' };
      case 'waiting': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', text: 'Waiting' };
      case 'completed': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', text: 'Done' };
      default: return { bg: 'gray', color: 'gray', text: 'Unknown' };
    }
  };

  const getAppStatusStyles = (status: string) => {
    switch (status) {
      case 'requested': return { bg: '#cbd5e1', color: '#475569', label: 'Requested' };
      case 'cv_sent': return { bg: 'rgba(201, 156, 51, 0.15)', color: 'var(--primary-dark)', label: 'CV Shared' };
      case 'interview': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', label: 'Interview Scheduled' };
      case 'placed': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#059669', label: 'Hired / Placed' };
      case 'closed': return { bg: '#f1f5f9', color: '#94a3b8', label: 'Closed' };
      default: return { bg: 'gray', color: 'gray', label: status };
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
      
      {/* 📋 Column 1: Placement Task Checklist */}
      <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem', alignSelf: 'start' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ClipboardList size={18} className="text-primary" /> Placement To-Do List
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 1.2rem 0' }}>
          Checklist for coordination items (interview setups, employer contacts).
        </p>

        {/* Task Creation Form */}
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Add new task..."
            required
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            style={{
              flex: 1,
              minWidth: '180px',
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />
          <input
            type="date"
            value={newTaskDue}
            onChange={e => setNewTaskDue(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: 'var(--primary-dark)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 650,
              fontSize: '0.82rem'
            }}
          >
            <Plus size={16} />
          </button>
        </form>

        {/* Tasks List */}
        {loadingTasks ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
             No tasks in progress. Nice job!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {tasks.map(task => {
              const isCompleted = task.status === 'completed';
              const style = getTaskStatusStyles(task.status);
              
              return (
                <div 
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.8rem 1rem',
                    background: isCompleted ? 'rgba(16, 185, 129, 0.02)' : 'white',
                    border: isCompleted ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '10px',
                    gap: '0.8rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexGrow: 1, minWidth: 0 }}>
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTaskCompleted(task)}
                      style={{ background: 'none', border: 'none', padding: 0, color: isCompleted ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>

                    <div style={{ minWidth: 0, flexGrow: 1 }}>
                      <span 
                        style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          color: isCompleted ? 'var(--text-muted)' : 'var(--text-color)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          wordBreak: 'break-word',
                          display: 'block'
                        }}
                      >
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: '0.68rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem', fontWeight: 550 }}>
                          <Calendar size={10} /> Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side controls: status badge + delete button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    {!isCompleted && (
                      <button
                        onClick={() => handleChangeTaskStatus(task.id, task.status)}
                        style={{
                          fontSize: '0.68rem',
                          background: style.bg,
                          color: style.color,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '12px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          textAlign: 'center',
                          minWidth: '70px'
                        }}
                        title="Click to cycle status: To Do -> In Progress -> Waiting"
                      >
                        {style.text}
                      </button>
                    )}
                    
                    {isCompleted && (
                      <span 
                        style={{ 
                          fontSize: '0.68rem', 
                          background: style.bg, 
                          color: style.color, 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '12px', 
                          fontWeight: 700 
                        }}
                      >
                        {style.text}
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.1rem' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ⏳ Column 2: Application Tracker (In progress follow-ups) */}
      <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem', alignSelf: 'start' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ClipboardList size={18} className="text-primary" /> Application Actions Feed
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 1.2rem 0' }}>
          Track and log follow-ups for student placement request submissions.
        </p>

        {loadingApps ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading applications...</div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No student application requests found in system.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map(app => {
              const student = app.student || {};
              const job = app.job || {};
              const statusStyle = getAppStatusStyles(app.status);
              
              return (
                <div 
                  key={app.id} 
                  style={{
                    padding: '1rem',
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  {/* Top line: Student & Job summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-color)' }}>
                        {app.applicant_name} 
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.3rem' }}>
                          ({student.courses?.name ? `Batch ${student.batch_number} • ${student.courses.name}` : 'Alumnus'})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', fontWeight: 550 }}>
                        Applying for: <span style={{ color: 'var(--primary-dark)' }}>{job.job_title} @ {job.company_name}</span>
                      </div>
                    </div>

                    {/* Saved Indicators */}
                    {savedStatus[app.id] && (
                      <span style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: '0.65rem', gap: '0.1rem', fontWeight: 650 }}>
                        <Check size={12} /> Saved
                      </span>
                    )}
                  </div>

                  {/* Mid block: Status update & phone */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    {app.applicant_mobile && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        📞 {app.applicant_mobile}
                      </span>
                    )}

                    {/* Status Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
                      <select
                        value={app.status}
                        onChange={e => handleUpdateAppStatus(app.id, e.target.value)}
                        style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '6px',
                          border: `1px solid ${statusStyle.color}`,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="requested">Requested</option>
                        <option value="cv_sent">CV Shared</option>
                        <option value="interview">Interview Scheduled</option>
                        <option value="placed">Hired / Placed</option>
                        <option value="closed">Closed / Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Bottom block: Internal note box */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                    <input
                      type="text"
                      placeholder="Add internal notes (e.g. sent resume to HR)..."
                      value={notesInput[app.id] || ''}
                      onChange={e => setNotesInput(prev => ({ ...prev, [app.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleSaveAppNotes(app.id)}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        background: 'rgba(0,0,0,0.01)'
                      }}
                    />
                    <button
                      onClick={() => handleSaveAppNotes(app.id)}
                      title="Save note"
                      style={{
                        padding: '0.35rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgba(201,156,51,0.1)',
                        color: 'var(--primary-dark)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Save size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
