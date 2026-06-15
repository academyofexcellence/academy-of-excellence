import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Image, 
  Briefcase, 
  Users, 
  Upload, 
  Trash2, 
  Activity, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ClipboardList, 
  Plus, 
  UserCheck,
  ListChecks
} from 'lucide-react';

interface StaffProfile {
  id: string;
  email: string;
  name: string;
  designation: string;
  role: 'staff' | 'gm' | 'md' | 'director';
  status: 'pending' | 'active' | 'inactive';
}

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  task_type: 'daily' | 'one_off';
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  staff_profiles?: StaffProfile; // Assigned staff details
}

interface DailyLog {
  id: string;
  task_id: string;
  completed_by: string;
  completed_date: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(null);

  // Tab navigation states
  const [staffTab, setStaffTab] = useState<'checklist' | 'one_off' | 'history'>('checklist');
  const [adminTab, setAdminTab] = useState<'kpis' | 'tasks' | 'roster' | 'logs' | 'website'>('kpis');
  const [websiteSubTab, setWebsiteSubTab] = useState<'gallery' | 'partners' | 'visitors'>('gallery');

  // UI State Messages
  const [message, setMessage] = useState('');
  
  // Data States
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  
  // Website Content Management States (carried over)
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form States - Task Creation
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<'daily' | 'one_off'>('one_off');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Form States - Website (carried over)
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('activity');
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerFile, setPartnerFile] = useState<File | null>(null);
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
      return;
    }

    try {
      // Fetch user profile info
      const { data: profile, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        throw new Error('Staff profile details not found.');
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        navigate('/admin');
        return;
      }

      setCurrentUser(profile);
      setAuthLoading(false);

      // Load specific dashboard data based on role
      if (profile.role === 'staff') {
        fetchStaffWorkspaceData(profile.id);
      } else {
        fetchLeadershipDashboardData();
      }
    } catch (err) {
      console.error(err);
      await supabase.auth.signOut();
      navigate('/admin');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

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

  // --- STAFF WORKSPACE FETCHES ---
  const fetchStaffWorkspaceData = async (staffId: string) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch tasks assigned to current staff
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          *,
          staff_profiles:assigned_to (name, designation)
        `)
        .eq('assigned_to', staffId)
        .order('created_at', { ascending: false });

      if (tasks) setTaskList(tasks);

      // Fetch daily task logs completed by current user today
      const { data: logs } = await supabase
        .from('daily_task_logs')
        .select('*')
        .eq('completed_by', staffId)
        .eq('completed_date', todayStr);

      if (logs) setDailyLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  // --- LEADERSHIP DASHBOARD FETCHES ---
  const fetchLeadershipDashboardData = async () => {
    try {
      // 1. Fetch Staff Roster
      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('name', { ascending: true });
      if (staff) setStaffList(staff);

      // 2. Fetch Tasks (All tasks + join assignee)
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          *,
          staff_profiles:assigned_to (name, designation)
        `)
        .order('created_at', { ascending: false });
      if (tasks) setTaskList(tasks);

      // 3. Fetch daily logs for today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: logs } = await supabase
        .from('daily_task_logs')
        .select('*')
        .eq('completed_date', todayStr);
      if (logs) setDailyLogs(logs);

      // 4. Fetch Activity Logs
      const { data: actLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);
      if (actLogs) setActivityLogs(actLogs);

      // 5. Fetch Website Content (Gallery, Partners, Guests)
      fetchWebsiteContent();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchWebsiteContent = async () => {
    const { data: galleryData } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    if (galleryData) setGalleryItems(galleryData);

    const { data: partnersData } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    if (partnersData) setPartnersList(partnersData);

    const { data: visitorsData } = await supabase.from('visitors').select('*').order('created_at', { ascending: false });
    if (visitorsData) setVisitorsList(visitorsData);
  };

  // --- STAFF ACTIONS ---

  // Complete a Daily Checklist Task
  const toggleDailyTask = async (taskId: string, isChecked: boolean) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (isChecked) {
        // Mark as completed
        const { error } = await supabase
          .from('daily_task_logs')
          .insert([{ task_id: taskId, completed_by: currentUser.id, completed_date: todayStr }]);
        
        if (error) throw error;

        const task = taskList.find(t => t.id === taskId);
        await logActivity('task_completed', `Checked off daily task: "${task?.title || 'Unknown'}"`);
      } else {
        // Uncheck / Remove completion
        const { error } = await supabase
          .from('daily_task_logs')
          .delete()
          .eq('task_id', taskId)
          .eq('completed_date', todayStr)
          .eq('completed_by', currentUser.id);

        if (error) throw error;

        const task = taskList.find(t => t.id === taskId);
        await logActivity('task_uncompleted', `Unchecked daily task: "${task?.title || 'Unknown'}"`);
      }
      fetchStaffWorkspaceData(currentUser.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Action failed: ${err.message}`);
    }
  };

  // Update Status of one-off task
  const updateOneOffTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      const task = taskList.find(t => t.id === taskId);
      await logActivity('task_status_updated', `Updated status of task "${task?.title || 'Unknown'}" to "${newStatus.replace('_', ' ')}"`);
      
      setMessage('✅ Task status updated successfully!');
      fetchStaffWorkspaceData(currentUser.id);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to update: ${err.message}`);
    }
  };


  // --- LEADERSHIP ACTIONS ---

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setMessage('Creating task...');
    try {
      const taskData: any = {
        title: taskTitle,
        description: taskDesc,
        task_type: taskType,
        assigned_to: taskAssignee || null,
        assigned_by: currentUser.id,
        status: 'pending'
      };

      if (taskType === 'one_off' && taskDueDate) {
        taskData.due_date = taskDueDate;
      }

      const { error } = await supabase.from('tasks').insert([taskData]);
      if (error) throw error;

      // Log activity
      const staffName = staffList.find(s => s.id === taskAssignee)?.name || 'Unassigned';
      await logActivity('task_created', `Assigned new ${taskType} task: "${taskTitle}" to staff "${staffName}"`);

      setMessage('✅ Task successfully assigned!');
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskDueDate('');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Task creation failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const taskObj = taskList.find(t => t.id === taskId);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;

      await logActivity('task_deleted', `Deleted task "${taskObj?.title || 'Unknown'}"`);
      setMessage('✅ Task deleted successfully.');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to delete task: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Manage Staff Roles, Designations & Status
  const handleUpdateStaff = async (staffId: string, role: string, designation: string, status: string) => {
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ role, designation, status })
        .eq('id', staffId);

      if (error) throw error;

      const targetStaff = staffList.find(s => s.id === staffId);
      await logActivity('staff_profile_updated', `Updated staff member ${targetStaff?.name} (Role: ${role}, Status: ${status}, Title: ${designation})`);

      setMessage('✅ Staff profile updated successfully!');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Profile update failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };


  // --- WEBSITE CONTENT ACTIONS (Carried over) ---

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    setUploading(true);
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
      console.error('Storage Upload error:', err);
      setMessage(`❌ Upload failed: ${err.message}`);
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
      await logActivity('gallery_added', `Uploaded new gallery image: "${galleryTitle}"`);
      setMessage('✅ Successfully added to Gallery!');
      setGalleryTitle('');
      setGalleryFile(null);
      const fileInput = document.getElementById('gallery-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchWebsiteContent();
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
      await logActivity('partner_added', `Added new partner logo: "${partnerName}"`);
      setMessage('✅ Successfully added Partner!');
      setPartnerName('');
      setPartnerFile(null);
      const fileInput = document.getElementById('partner-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchWebsiteContent();
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
      await logActivity('guest_added', `Added new visiting guest profile: "${visitorName}"`);
      setMessage('✅ Successfully added Guest/Mentor!');
      setVisitorName('');
      setVisitorDesignation('');
      setVisitorOrganization('');
      setVisitorFile(null);
      const fileInput = document.getElementById('visitor-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchWebsiteContent();
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleDeleteWebsiteItem = async (id: string, tableName: string, imageUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this website item?')) return;
    
    setMessage('Deleting item...');
    try {
      const { error: dbError } = await supabase.from(tableName).delete().eq('id', id);
      if (dbError) throw dbError;

      const pathParts = imageUrl.split('/gallery-images/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from('gallery-images').remove([filePath]);
      }

      await logActivity('website_content_deleted', `Deleted item from table: "${tableName}"`);
      setMessage('✅ Item successfully deleted!');
      fetchWebsiteContent();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Delete failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };


  if (authLoading || !currentUser) {
    return <div style={{ paddingTop: '150px', textAlign: 'center' }}>Verifying Staff Access credentials...</div>;
  }

  const isLeadership = currentUser.role !== 'staff';

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', background: 'var(--bg-light)' }} className="bg-grid-pattern">
      <div className="container" style={{ maxWidth: '1100px' }}>
        
        {/* Welcome Section */}
        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.15)', boxShadow: 'var(--glass-shadow)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge" style={{ background: 'rgba(201, 156, 51, 0.15)', color: 'var(--primary-dark)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Operations Center • {currentUser.role}
            </span>
            <h1 className="heading-lg" style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1.8rem' }}>Welcome, {currentUser.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Title: <strong>{currentUser.designation || 'Staff Member'}</strong> • System ID: <code style={{ fontSize: '0.8rem' }}>{currentUser.id.substring(0,8)}</code>
            </p>
          </div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', color: '#dc2626', borderColor: '#fca5a5' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Global Toast Message */}
        {message && (
          <div style={{ padding: '1rem', background: 'rgba(201, 156, 51, 0.1)', border: '1px solid rgba(201, 156, 51, 0.2)', color: 'var(--text-main)', borderRadius: '10px', marginBottom: '2rem', fontWeight: 600, fontSize: '0.95rem' }}>
            {message}
          </div>
        )}

        {/* =========================================================================
            SECTION A: STAFF VIEW
            ========================================================================= */}
        {!isLeadership && (
          <div>
            {/* Staff Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,156,51,0.2)', marginBottom: '2rem', gap: '0.5rem' }}>
              <button 
                onClick={() => setStaffTab('checklist')}
                style={{
                  padding: '0.8rem 1.5rem', background: 'none', border: 'none',
                  borderBottom: staffTab === 'checklist' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: staffTab === 'checklist' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <ListChecks size={18} /> Daily Checklist
              </button>
              
              <button 
                onClick={() => setStaffTab('one_off')}
                style={{
                  padding: '0.8rem 1.5rem', background: 'none', border: 'none',
                  borderBottom: staffTab === 'one_off' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: staffTab === 'one_off' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Calendar size={18} /> One-Off Assignments
              </button>
              
              <button 
                onClick={() => setStaffTab('history')}
                style={{
                  padding: '0.8rem 1.5rem', background: 'none', border: 'none',
                  borderBottom: staffTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: staffTab === 'history' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Clock size={18} /> My Log History
              </button>
            </div>

            {/* TAB: Daily Checklist */}
            {staffTab === 'checklist' && (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Daily Task Checklist</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Repeatable maintenance items assigned to you. Reset daily.</p>

                {taskList.filter(t => t.task_type === 'daily').length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    <CheckCircle2 size={40} style={{ color: 'var(--primary-light)', marginBottom: '0.8rem' }} />
                    <p>No daily tasks currently assigned to your roster.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {taskList.filter(t => t.task_type === 'daily').map(task => {
                      const isCompletedToday = dailyLogs.some(log => log.task_id === task.id);
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '1.2rem', background: isCompletedToday ? 'rgba(34,197,94,0.05)' : 'white', border: isCompletedToday ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', gap: '1rem', transition: 'all 0.2s' }}>
                          <input 
                            type="checkbox" 
                            checked={isCompletedToday}
                            onChange={(e) => toggleDailyTask(task.id, e.target.checked)}
                            style={{ width: '22px', height: '22px', accentColor: 'var(--primary)', cursor: 'pointer', marginTop: '0.2rem' }}
                          />
                          <div style={{ flexGrow: 1 }}>
                            <h4 style={{ textDecoration: isCompletedToday ? 'line-through' : 'none', color: isCompletedToday ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '1.05rem', fontWeight: 650, margin: 0 }}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem', margin: 0 }}>
                                {task.description}
                              </p>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', background: isCompletedToday ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)', color: isCompletedToday ? '#16a34a' : 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '50px', fontWeight: 600 }}>
                            {isCompletedToday ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: One-Off Tasks */}
            {staffTab === 'one_off' && (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>One-Off Assignments</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Specific assignments with due dates set by MD / GM.</p>

                {taskList.filter(t => t.task_type === 'one_off').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No individual tasks currently assigned.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {taskList.filter(t => t.task_type === 'one_off').map(task => (
                      <div key={task.id} style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ flex: '1 1 300px' }}>
                          <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{task.title}</h4>
                          {task.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem', marginBottom: '0.8rem' }}>{task.description}</p>}
                          
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626', fontWeight: 600 }}>
                              <Calendar size={14} /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              Assigned by: Management
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status</label>
                          <select 
                            value={task.status} 
                            onChange={(e) => updateOneOffTaskStatus(task.id, e.target.value as any)}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.3)', outline: 'none', background: 'white', fontWeight: 600 }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: History */}
            {staffTab === 'history' && (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Log History</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Below are the records of task updates you completed recently.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {taskList.filter(t => t.status === 'completed').map(task => (
                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.9rem' }}>
                      <div>
                        <strong>{task.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>One-Off task</div>
                      </div>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Completed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            SECTION B: LEADERSHIP VIEWS (GM, MD, DIRECTOR)
            ========================================================================= */}
        {isLeadership && (
          <div>
            {/* Leadership Control Panel Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,156,51,0.2)', marginBottom: '2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setAdminTab('kpis')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'kpis' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'kpis' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Activity size={16} /> Overview
              </button>
              
              <button 
                onClick={() => setAdminTab('tasks')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'tasks' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'tasks' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <ClipboardList size={16} /> Manage Tasks
              </button>

              <button 
                onClick={() => setAdminTab('roster')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'roster' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'roster' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <UserCheck size={16} /> Staff Roster
              </button>

              <button 
                onClick={() => setAdminTab('logs')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'logs' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'logs' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Activity size={16} /> Activity Logs
              </button>

              <button 
                onClick={() => setAdminTab('website')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'website' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'website' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Image size={16} /> Website Management
              </button>
            </div>

            {/* TAB: KPI Overview */}
            {adminTab === 'kpis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="grid grid-3" style={{ gap: '1.5rem' }}>
                  <div className="glass-card text-center" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Daily Tasks Done Today</h4>
                    <p style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--primary-dark)' }}>
                      {dailyLogs.length} / {taskList.filter(t => t.task_type === 'daily').length}
                    </p>
                    <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Active checklist monitoring</span>
                  </div>

                  <div className="glass-card text-center" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Pending One-Off Tasks</h4>
                    <p style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0', color: '#dc2626' }}>
                      {taskList.filter(t => t.task_type === 'one_off' && t.status !== 'completed').length}
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned to staff roster</span>
                  </div>

                  <div className="glass-card text-center" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Registered Staff</h4>
                    <p style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0', color: '#1e3a8a' }}>
                      {staffList.filter(s => s.status === 'active').length}
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{staffList.filter(s => s.status === 'pending').length} pending approval</span>
                  </div>
                </div>

                {/* Dashboard Shortcut lists */}
                <div className="grid grid-2" style={{ gap: '2rem' }}>
                  <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} className="text-primary" /> Daily Task Status (Today)</h3>
                    {taskList.filter(t => t.task_type === 'daily').map(task => {
                      const completed = dailyLogs.some(log => log.task_id === task.id);
                      return (
                        <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <span style={{ fontSize: '0.95rem' }}>{task.title}</span>
                          <span style={{ color: completed ? '#16a34a' : '#ea580c', fontWeight: 600, fontSize: '0.85rem' }}>
                            {completed ? '✓ Completed' : '✕ Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} className="text-primary" /> Pending Registrations</h3>
                    {staffList.filter(s => s.status === 'pending').length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No new signups waiting for approval.</p>
                    ) : (
                      staffList.filter(s => s.status === 'pending').map(staff => (
                        <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{staff.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{staff.designation}</div>
                          </div>
                          <button onClick={() => setAdminTab('roster')} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
                            Review Profile
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Manage Tasks (Create and Delete Tasks) */}
            {adminTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Task Creation Form */}
                <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={20} className="text-primary" /> Create & Assign Task</h3>
                  
                  <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Task Title</label>
                      <input 
                        type="text" 
                        value={taskTitle} 
                        onChange={(e) => setTaskTitle(e.target.value)} 
                        className="form-input" 
                        placeholder="e.g. Switch off all ACs and lights in ground classroom"
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Task Description / Instructions (Optional)</label>
                      <textarea 
                        value={taskDesc} 
                        onChange={(e) => setTaskDesc(e.target.value)} 
                        className="form-input" 
                        placeholder="Provide details about classrooms, keys, lock codes etc."
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Task Schedule Type</label>
                      <select 
                        value={taskType} 
                        onChange={(e) => setTaskType(e.target.value as any)} 
                        className="form-input"
                      >
                        <option value="daily">Daily Repeated Task</option>
                        <option value="one_off">One-Off Specific Date Task</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Assign To Staff Member</label>
                      <select 
                        value={taskAssignee} 
                        onChange={(e) => setTaskAssignee(e.target.value)} 
                        className="form-input"
                        required
                      >
                        <option value="">Select Assignee...</option>
                        {staffList.filter(s => s.status === 'active').map(staff => (
                          <option key={staff.id} value={staff.id}>{staff.name} ({staff.designation || 'Staff'})</option>
                        ))}
                      </select>
                    </div>

                    {taskType === 'one_off' && (
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Due Date</label>
                        <input 
                          type="date" 
                          value={taskDueDate} 
                          onChange={(e) => setTaskDueDate(e.target.value)} 
                          className="form-input" 
                          required={taskType === 'one_off'} 
                        />
                      </div>
                    )}

                    <div style={{ gridColumn: 'span 2' }}>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Create & Assign Task
                      </button>
                    </div>
                  </form>
                </div>

                {/* Existing Tasks List */}
                <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Active Tasks & Duties</h3>
                  
                  {taskList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tasks created yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {taskList.map(task => (
                        <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'rgba(0,0,0,0.015)', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: task.task_type === 'daily' ? 'rgba(201, 156, 51, 0.15)' : 'rgba(0,0,0,0.05)', color: task.task_type === 'daily' ? 'var(--primary-dark)' : 'var(--text-main)', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', marginRight: '0.5rem' }}>
                              {task.task_type}
                            </span>
                            <strong style={{ fontSize: '1.05rem' }}>{task.title}</strong>
                            {task.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>{task.description}</p>}
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                              Assignee: <strong>{task.staff_profiles?.name || 'Unassigned'} ({task.staff_profiles?.designation || 'Staff'})</strong>
                              {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', background: task.status === 'completed' ? 'rgba(34,197,94,0.1)' : task.status === 'in_progress' ? 'rgba(234,88,12,0.1)' : 'rgba(0,0,0,0.05)', color: task.status === 'completed' ? '#16a34a' : task.status === 'in_progress' ? '#ea580c' : 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '50px', fontWeight: 600 }}>
                              {task.status.replace('_', ' ')}
                            </span>
                            
                            <button onClick={() => handleDeleteTask(task.id)} className="btn btn-outline" style={{ padding: '0.5rem', color: '#dc2626', borderColor: '#fca5a5' }} title="Delete Task">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Staff Roster Management */}
            {adminTab === 'roster' && (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Staff Roster & Job Titles</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Approve new signups, update designations, promote roles, or deactivate profiles.</p>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)', paddingBottom: '0.8rem' }}>
                        <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Staff Name</th>
                        <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Email Address</th>
                        <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Designation (Job Title)</th>
                        <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Access Role</th>
                        <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '1rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map(staff => {
                        // We use a small local state wrapper for each row
                        return (
                          <StaffRow 
                            key={staff.id} 
                            staff={staff} 
                            onUpdate={handleUpdateStaff}
                            isSelf={staff.id === currentUser.id}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: Activity Logs Monitor */}
            {adminTab === 'logs' && (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Institute Activity Logs</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Audit trail of staff operations, logouts, and assignment updates.</p>

                {activityLogs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No activity records found.</p>
                ) : (
                  <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.5rem' }}>
                    {activityLogs.map(log => (
                      <div key={log.id} style={{ display: 'flex', padding: '0.8rem', background: 'rgba(0,0,0,0.01)', borderLeft: '3px solid var(--primary)', borderRadius: '0 8px 8px 0', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{log.actor_name}</strong>: {log.details}
                          <span style={{ color: 'var(--primary-dark)', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.5rem', textTransform: 'uppercase' }}>
                            ({log.action_type})
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Website Management (Original panels) */}
            {adminTab === 'website' && (
              <div>
                {/* Website Sub Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '2rem', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setWebsiteSubTab('gallery')}
                    style={{
                      padding: '0.6rem 1.2rem', background: 'none', border: 'none',
                      borderBottom: websiteSubTab === 'gallery' ? '2px solid var(--primary)' : '2px solid transparent',
                      color: websiteSubTab === 'gallery' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    Gallery Images
                  </button>
                  <button 
                    onClick={() => setWebsiteSubTab('partners')}
                    style={{
                      padding: '0.6rem 1.2rem', background: 'none', border: 'none',
                      borderBottom: websiteSubTab === 'partners' ? '2px solid var(--primary)' : '2px solid transparent',
                      color: websiteSubTab === 'partners' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    Partners Logos
                  </button>
                  <button 
                    onClick={() => setWebsiteSubTab('visitors')}
                    style={{
                      padding: '0.6rem 1.2rem', background: 'none', border: 'none',
                      borderBottom: websiteSubTab === 'visitors' ? '2px solid var(--primary)' : '2px solid transparent',
                      color: websiteSubTab === 'visitors' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    Guests & Mentors
                  </button>
                </div>

                <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', marginBottom: '3rem' }}>
                  
                  {/* Gallery Sub-panel */}
                  {websiteSubTab === 'gallery' && (
                    <div>
                      <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image className="text-primary" /> Add to Gallery</h2>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Upload images from mock interviews, seminars, and classroom events.</p>
                      
                      <form onSubmit={handleAddGallery} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Select Image File</label>
                          <input type="file" id="gallery-file-input" accept="image/*" onChange={(e) => setGalleryFile(e.target.files ? e.target.files[0] : null)} className="form-input" required />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Event Title</label>
                          <input type="text" value={galleryTitle} onChange={(e) => setGalleryTitle(e.target.value)} className="form-input" placeholder="e.g. Mock Interview with HR Managers" required />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Category</label>
                          <select value={galleryCategory} onChange={(e) => setGalleryCategory(e.target.value)} className="form-input">
                            <option value="activity">Activity Session</option>
                            <option value="mock_interview">Mock Interview</option>
                          </select>
                        </div>
                        <button type="submit" className="btn btn-primary mt-2" disabled={uploading}>
                          <Upload size={16} /> {uploading ? 'Uploading...' : 'Save to Gallery'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Partners Sub-panel */}
                  {websiteSubTab === 'partners' && (
                    <div>
                      <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase className="text-primary" /> Add Industrial Partner</h2>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Upload logos of companies where graduates are placed.</p>
                      
                      <form onSubmit={handleAddPartner} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Select Logo File</label>
                          <input type="file" id="partner-file-input" accept="image/*" onChange={(e) => setPartnerFile(e.target.files ? e.target.files[0] : null)} className="form-input" required />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Company / Partner Name</label>
                          <input type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="form-input" placeholder="e.g. Amazon Arabic Support" required />
                        </div>
                        <button type="submit" className="btn btn-primary mt-2" disabled={uploading}>
                          <Upload size={16} /> {uploading ? 'Uploading...' : 'Save Partner'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Visitors Sub-panel */}
                  {websiteSubTab === 'visitors' && (
                    <div>
                      <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users className="text-primary" /> Add Guest or Mentor</h2>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Showcase guests, leaders, and mentors who visited the academy.</p>
                      
                      <form onSubmit={handleAddVisitor} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Select Photo File</label>
                          <input type="file" id="visitor-file-input" accept="image/*" onChange={(e) => setVisitorFile(e.target.files ? e.target.files[0] : null)} className="form-input" required />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Guest Name</label>
                          <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} className="form-input" placeholder="e.g. Dr. Faisal Basheer" required />
                        </div>
                        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Designation / Title</label>
                            <input type="text" value={visitorDesignation} onChange={(e) => setVisitorDesignation(e.target.value)} className="form-input" placeholder="e.g. Native Arab Professor" required />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Organization / Company</label>
                            <input type="text" value={visitorOrganization} onChange={(e) => setVisitorOrganization(e.target.value)} className="form-input" placeholder="e.g. University of Riyadh" />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary mt-2" disabled={uploading}>
                          <Upload size={16} /> {uploading ? 'Uploading...' : 'Save Guest Details'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Sub-tab Lists Display */}
                <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(201,156,51,0.1)', paddingBottom: '0.8rem' }}>
                    Existing {websiteSubTab === 'gallery' ? 'Gallery Items' : websiteSubTab === 'partners' ? 'Partners' : 'Guests & Mentors'}
                  </h3>

                  {/* GALLERY LIST */}
                  {websiteSubTab === 'gallery' && (
                    <div>
                      {galleryItems.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No gallery items uploaded yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
                          {galleryItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                              <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                              <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
                                <div>
                                  <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.2rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>{item.title}</h4>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-dark)', fontWeight: 700, textTransform: 'uppercase' }}>{item.category.replace('_', ' ')}</span>
                                </div>
                                <button onClick={() => handleDeleteWebsiteItem(item.id, 'gallery', item.image_url)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center', marginTop: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PARTNERS LIST */}
                  {websiteSubTab === 'partners' && (
                    <div>
                      {partnersList.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No partner logos uploaded yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
                          {partnersList.map(partner => (
                            <div key={partner.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', padding: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                              <img src={partner.logo_url} alt={partner.name} style={{ height: '50px', objectFit: 'contain', marginBottom: '0.8rem' }} />
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', margin: '0 0 0.8rem 0' }}>{partner.name}</h4>
                              <button onClick={() => handleDeleteWebsiteItem(partner.id, 'partners', partner.logo_url)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fca5a5' }}>
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* VISITORS LIST */}
                  {websiteSubTab === 'visitors' && (
                    <div>
                      {visitorsList.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No guest profiles uploaded yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
                          {visitorsList.map(visitor => (
                            <div key={visitor.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', padding: '1rem', alignItems: 'center' }}>
                              <img src={visitor.image_url} alt={visitor.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.8rem' }} />
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.2rem 0' }}>{visitor.name}</h4>
                              <p style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', margin: 0, textAlign: 'center' }}>{visitor.designation}</p>
                              {visitor.organization && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.1rem 0 0.8rem 0', textAlign: 'center' }}>{visitor.organization}</p>}
                              <button onClick={() => handleDeleteWebsiteItem(visitor.id, 'visitors', visitor.image_url)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fca5a5', marginTop: 'auto' }}>
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Row component for Roster Table with local edit states
const StaffRow = ({ staff, onUpdate, isSelf }: { staff: StaffProfile; onUpdate: Function; isSelf: boolean }) => {
  const [role, setRole] = useState(staff.role);
  const [designation, setDesignation] = useState(staff.designation || '');
  const [status, setStatus] = useState(staff.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(staff.id, role, designation, status);
    setSaving(false);
  };

  return (
    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{staff.name} {isSelf && <span style={{ color: 'var(--primary-dark)', fontSize: '0.75rem' }}>(You)</span>}</td>
      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{staff.email}</td>
      <td style={{ padding: '1rem 0.5rem' }}>
        <input 
          type="text" 
          value={designation} 
          onChange={(e) => setDesignation(e.target.value)}
          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '100%', fontSize: '0.9rem' }}
          placeholder="e.g. Arabic Translator"
        />
      </td>
      <td style={{ padding: '1rem 0.5rem' }}>
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value as any)}
          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none' }}
          disabled={isSelf} // Prevent demoting yourself
        >
          <option value="staff">Staff</option>
          <option value="gm">General Manager (GM)</option>
          <option value="md">Managing Director (MD)</option>
          <option value="director">Director</option>
        </select>
      </td>
      <td style={{ padding: '1rem 0.5rem' }}>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value as any)}
          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none' }}
          disabled={isSelf}
        >
          <option value="pending">Pending Approval</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive / Deactivated</option>
        </select>
      </td>
      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
        <button 
          onClick={handleSave} 
          className="btn btn-primary" 
          style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
          disabled={saving}
        >
          {saving ? '...' : 'Save'}
        </button>
      </td>
    </tr>
  );
};

export default AdminDashboard;
