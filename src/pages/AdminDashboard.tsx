import { useEffect, useState, useRef, useCallback } from 'react';
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
  ClipboardList, 
  Plus, 
  UserCheck,
  ListChecks,
  GraduationCap,
  Settings,
  TrendingUp,
  X,
  Volume2,
  AlertTriangle,
  Award,
  Printer,
  HelpCircle,
  Download,
  Bell,
  BellOff,
  MessageSquare
} from 'lucide-react';
import { requestAndSubscribePush, unsubscribePush } from '../lib/pushNotifications';
import { AnalyticsHub } from '../components/dashboard/AnalyticsHub';
import { ClassroomGrading } from '../components/dashboard/ClassroomGrading';
import { DirectoryHub } from '../components/dashboard/DirectoryHub';
import { PlacementsHub } from '../components/dashboard/PlacementsHub';
import { OperationsHub } from '../components/dashboard/OperationsHub';
import { AlumniLounge } from '../components/alumni/AlumniLounge';
import { PlacementTracker } from '../components/dashboard/PlacementTracker';
import { MeetingMinutes } from '../components/dashboard/MeetingMinutes';

interface StaffProfile {
  id: string;
  email: string;
  name: string;
  designation: string;
  role: 'staff' | 'gm' | 'md' | 'director';
  status: 'active' | 'pending' | 'inactive';
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
  staff_profiles?: StaffProfile;
}

interface DailyLog {
  id: string;
  task_id: string;
  completed_by: string;
  completed_date: string;
}

interface Course {
  id: string;
  name: string;
  created_at: string;
}

interface StudentProfile {
  id: string;
  email: string;
  name: string;
  course_id: string;
  batch_number: number;
  roll_number?: string;
  status: 'pending' | 'active' | 'inactive' | 'alumni';
  courses?: Course;
  is_alumni_signup?: boolean;
  hometown?: string;
  house_name?: string;
  street?: string;
  locality?: string;
  district?: string;
  state?: string;
  pincode?: string;
  mobile_number?: string;
  whatsapp_number?: string;
  total_experience_years?: string;
  experience_details?: string;
}

interface ScoringInterval {
  id: string;
  name: string;
  course_id: string;
  batch_number: number;
  is_active: boolean;
  total_working_days?: number;
  total_vocab_tasks?: number;
  total_sentences_tasks?: number;
  total_vlog_tasks?: number;
  total_reaction_tasks?: number;
  total_hadithul_tasks?: number;
  created_at?: string;
  start_date?: string;
  end_date?: string;
}

interface LeaderboardEntry {
  student_id: string;
  name: string;
  total_score: number;
  level: number;
  rank: number;
}

const getDatesRange = (startDateStr: string, endDateStr?: string) => {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  
  const end = endDateStr ? new Date(endDateStr) : new Date();
  end.setHours(0, 0, 0, 0);
  
  let limit = 0;
  const current = new Date(end);
  while (current >= start && limit < 180) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() - 1);
    limit++;
  }
  return dates;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setShowInstallBtn(!isStandalone);
  }, []);

  const handleInstallApp = () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setShowInstallBtn(false);
        }
        (window as any).deferredPrompt = null;
      });
    } else {
      alert("To install this app on your home screen:\n\n📱 iOS (Safari):\n1. Tap the Share button at the bottom.\n2. Scroll down and select 'Add to Home Screen'.\n\n🤖 Android (Chrome):\n1. Tap the 3 dots in the top right.\n2. Select 'Install app' or 'Add to Home Screen'.");
    }
  };

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkNotificationState();
    }
  }, [currentUser?.id]);

  const checkNotificationState = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    }
  };

  const handleToggleNotifications = async () => {
    if (!currentUser) return;
    setNotificationLoading(true);
    try {
      if (pushSubscribed) {
        const success = await unsubscribePush(currentUser.id);
        if (success) setPushSubscribed(false);
      } else {
        const success = await requestAndSubscribePush(currentUser.id);
        if (success) setPushSubscribed(true);
      }
    } catch (err) {
      console.error('Error toggling push notifications:', err);
    } finally {
      setNotificationLoading(false);
    }
  };

  const [jobPosts, setJobPosts] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const fetchJobPosts = async () => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          job_contact_info (
            contact_number
          ),
          job_applications (
            id,
            applicant_id,
            applicant_name,
            applicant_mobile,
            message,
            created_at,
            student_profiles (
              batch_number,
              courses: course_id (
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobPosts(data || []);
    } catch (err) {
      console.error('Error fetching job posts:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleApproveJob = async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      setMessage('✅ Job post approved successfully!');
      fetchJobPosts();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      alert(`Error approving job: ${err.message}`);
    }
  };

  const handleRejectJob = async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      setMessage('❌ Job post rejected!');
      fetchJobPosts();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      alert(`Error rejecting job: ${err.message}`);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job post?')) return;
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage('🗑️ Job post deleted!');
      fetchJobPosts();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      alert(`Error deleting job: ${err.message}`);
    }
  };

  const handleCreateJobAdmin = async (jobForm: any) => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .insert([{
          job_title: jobForm.jobTitle,
          company_name: jobForm.companyName,
          location: jobForm.location,
          work_mode: jobForm.workMode,
          salary: jobForm.salary,
          description: jobForm.description,
          posted_by: currentUser?.id || '00000000-0000-0000-0000-000000000000',
          poster_name: currentUser?.name || 'Staff',
          poster_role: 'staff'
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create job post.');

      if (jobForm.contactNumber) {
        const { error: contactErr } = await supabase
          .from('job_contact_info')
          .insert([{
            job_id: data.id,
            contact_number: jobForm.contactNumber
          }]);
        if (contactErr) throw contactErr;
      }

      setMessage('✅ Job post created successfully!');
      fetchJobPosts();
      setTimeout(() => setMessage(''), 4000);
      return true;
    } catch (err: any) {
      alert(`Error creating job post: ${err.message}`);
      return false;
    }
  };

  // Tab navigation states
  const [adminTab, setAdminTab] = useState<'tasks' | 'dashboard' | 'classroom' | 'directory' | 'careers' | 'operations' | 'alumnilounge' | 'management'>('dashboard');
  const [websiteSubTab, setWebsiteSubTab] = useState<'gallery' | 'partners' | 'visitors'>('gallery');
  const [managementSubTab, setManagementSubTab] = useState<'tracker' | 'minutes'>('tracker');

  // UI State Messages
  const [message, setMessage] = useState('');
  
  // Data States (Staff)
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [todayScores, setTodayScores] = useState<any[]>([]);

  // Data States (Students & Leaderboards)
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentList, setStudentList] = useState<StudentProfile[]>([]);
  const [intervalsList, setIntervalsList] = useState<ScoringInterval[]>([]);
  const [scoresList, setScoresList] = useState<any[]>([]);
  const [updatingScores, setUpdatingScores] = useState<string[]>([]);
  const [overviewLeaderboard, setOverviewLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [classroomLeaderboard, setClassroomLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [overviewSelectedInterval, setOverviewSelectedInterval] = useState<string>('');
  
  // Student Roster Tab Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterCourse, setStudentFilterCourse] = useState('');
  const [studentFilterBatch, setStudentFilterBatch] = useState('');
  const [studentFilterStatus, setStudentFilterStatus] = useState('');

  // Alumni & Placement States
  const [alumniProfiles, setAlumniProfiles] = useState<any[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(false);
  const [placementSearch, setPlacementSearch] = useState('');
  const [placementFilterCourse, setPlacementFilterCourse] = useState('');
  const [placementFilterBatch, setPlacementFilterBatch] = useState('');
  const [placementFilterStatus, setPlacementFilterStatus] = useState('');
  const [placementFilterLocation, setPlacementFilterLocation] = useState('');
  const [placementFilterGradOnly, setPlacementFilterGradOnly] = useState('graduated');

  // Student Report States
  const [selectedReportStudent, setSelectedReportStudent] = useState<StudentProfile | null>(null);
  const [studentReportData, setStudentReportData] = useState<{ scores: any[]; loading: boolean }>({ scores: [], loading: false });
  const [reportTab, setReportTab] = useState<'attendance' | 'work' | 'grades' | 'remarks'>('attendance');
  const [remarksStrengths, setRemarksStrengths] = useState('');
  const [remarksWeaknesses, setRemarksWeaknesses] = useState('');
  const [remarksCareerPath, setRemarksCareerPath] = useState('');
  const [remarksGeneral, setRemarksGeneral] = useState('');
  const [remarksMockInterviewMark, setRemarksMockInterviewMark] = useState<number | ''>('');
  const [remarksMockInterviewRemark, setRemarksMockInterviewRemark] = useState('');
  const [remarksIndustrialVisitMark, setRemarksIndustrialVisitMark] = useState<number | ''>('');
  const [remarksIndustrialVisitRemark, setRemarksIndustrialVisitRemark] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);
  
  // Report Edit Form States
  const [addLogDate, setAddLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [addAttStatus, setAddAttStatus] = useState('On Time');
  const [addWorkVocab, setAddWorkVocab] = useState(false);
  const [addWorkSentences, setAddWorkSentences] = useState(false);
  const [addWorkVlog, setAddWorkVlog] = useState(false);
  const [addWorkReaction, setAddWorkReaction] = useState(false);
  const [addWorkHadithul, setAddWorkHadithul] = useState(false);
  
  const [addGradeType, setAddGradeType] = useState<'exam' | 'penalty' | 'custom'>('exam');
  const [addGradeTitle, setAddGradeTitle] = useState('');
  const [addGradePoints, setAddGradePoints] = useState(0);
  const [addGradeMaxPoints, setAddGradeMaxPoints] = useState(100);

  // Active Config Edit States
  const [selectedConfigIntervalId, setSelectedConfigIntervalId] = useState('');
  const [configWorkingDays, setConfigWorkingDays] = useState(20);
  const [configVocab, setConfigVocab] = useState(20);
  const [configSentences, setConfigSentences] = useState(20);
  const [configVlog, setConfigVlog] = useState(4);
  const [configReaction, setConfigReaction] = useState(4);
  const [configHadithul, setConfigHadithul] = useState(4);
  const [configStartDate, setConfigStartDate] = useState('');
  const [configEndDate, setConfigEndDate] = useState('');
  
  // Synchronous lock to prevent penalty double-clicks
  const penaltyLockRef = useRef<Record<string, boolean>>({});
  
  // Classroom Selector States
  const [filterCourse, setFilterCourse] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [activeInterval, setActiveInterval] = useState<ScoringInterval | null>(null);
  const [selectedLeaderboardInterval, setSelectedLeaderboardInterval] = useState<string>('');
  const [reportSelectedInterval, setReportSelectedInterval] = useState<string>('');
  const [showArchivedFilter, setShowArchivedFilter] = useState(false);

  // Form States - Exam/Custom Grading
  const [gradingMode, setGradingMode] = useState<'vocab_sentences' | 'exam' | 'custom' | 'leaderboard' | 'manage' | 'batch_sheet'>('vocab_sentences');
  
  // Batch Sheet Matrix View States
  const [matrixActivity, setMatrixActivity] = useState<'attendance' | 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia'>('attendance');
  const [batchScores, setBatchScores] = useState<any[]>([]);
  const [loadingBatchScores, setLoadingBatchScores] = useState(false);
  const [updatingMatrix, setUpdatingMatrix] = useState<string[]>([]);

  // Correction Requests (Appeals) States
  const [adminAppeals, setAdminAppeals] = useState<any[]>([]);
  const [loadingAdminAppeals, setLoadingAdminAppeals] = useState(false);
  const [appealsFilter, setAppealsFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedAppeal, setSelectedAppeal] = useState<any | null>(null);
  const [showAppealActionModal, setShowAppealActionModal] = useState(false);
  const [appealActionRemark, setAppealActionRemark] = useState('');
  const [processingAppealAction, setProcessingAppealAction] = useState(false);
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0);

  // Score Auditor / Verifier States
  const [showScoreVerifierModal, setShowScoreVerifierModal] = useState(false);
  const [scoreVerifierList, setScoreVerifierList] = useState<any[]>([]);
  const [intervalsAuditSummary, setIntervalsAuditSummary] = useState<any[]>([]);
  const [verifyingScores, setVerifyingScores] = useState(false);
  
  const [selectedGradingDate, setSelectedGradingDate] = useState(new Date().toISOString().split('T')[0]);
  const [examName, setExamName] = useState('');
  const [examMaxPoints, setExamMaxPoints] = useState('100');
  const [examScores, setExamScores] = useState<{ [studentId: string]: number }>({});
  
  const [customActivityName, setCustomActivityName] = useState('');
  const [customMaxPoints, setCustomMaxPoints] = useState('20');
  const [customScores, setCustomScores] = useState<{ [studentId: string]: number }>({});

  // Form States - Courses & Intervals creation
  const [newCourseName, setNewCourseName] = useState('');
  const [newIntervalName, setNewIntervalName] = useState('');
  const [newIntervalCourse, setNewIntervalCourse] = useState('');
  const [newIntervalBatch, setNewIntervalBatch] = useState('');
  
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

  useEffect(() => {
    if (adminTab === 'classroom') {
      fetchAdminAppeals();
    }
  }, [adminTab]);

  useEffect(() => {
    if (adminTab === 'careers') {
      fetchAlumniProfiles();
      fetchJobPosts();
    }
  }, [adminTab]);

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
        // Fallback: Check if they are in student profiles (direct access safeguard)
        const { data: isStud } = await supabase.from('student_profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (isStud) {
          navigate('/student/dashboard');
          return;
        }
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
        setAdminTab('tasks');
        fetchStaffWorkspaceData(profile.id);
        fetchLeadershipDashboardData(); // Staff also need lists of classrooms to grade
      } else {
        setAdminTab('dashboard');
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

      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          *,
          staff_profiles:assigned_to (name, designation)
        `)
        .eq('assigned_to', staffId)
        .order('created_at', { ascending: false });

      if (tasks) setTaskList(tasks);

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

  // --- LEADERSHIP & CLASSROOM FETCHES ---
  const fetchLeadershipDashboardData = async () => {
    try {
      // 1. Fetch Staff Roster
      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('name', { ascending: true });
      if (staff) setStaffList(staff);

      // 2. Fetch Staff Tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          *,
          staff_profiles:assigned_to (name, designation)
        `)
        .order('created_at', { ascending: false });
      if (tasks) setTaskList(tasks);

       // 3. Fetch daily task logs for today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: logs } = await supabase
        .from('daily_task_logs')
        .select('*')
        .eq('completed_date', todayStr);
      if (logs) setDailyLogs(logs);

      // Fetch today's student scores (attendance, vocabulary, penalties, etc.)
      const { data: todaySc } = await supabase
        .from('scores')
        .select('*')
        .eq('logged_date', todayStr);
      if (todaySc) setTodayScores(todaySc);

      // 4. Fetch Activity Logs
      const { data: actLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);
      if (actLogs) setActivityLogs(actLogs);

      // 5. Fetch Courses, Students and Intervals
      const { data: courseData } = await supabase.from('courses').select('*').order('name', { ascending: true });
      if (courseData) {
        setCourses(courseData);
        if (courseData.length > 0 && !filterCourse) {
          setFilterCourse(courseData[0].id);
          setNewIntervalCourse(courseData[0].id);
        }
      }

      const { data: studentData } = await supabase.from('student_profiles').select(`
        *,
        courses:course_id (name)
      `).order('name', { ascending: true });
      if (studentData) setStudentList(studentData);

      const { data: intervals } = await supabase.from('scoring_intervals').select('*').order('created_at', { ascending: false });
      if (intervals) setIntervalsList(intervals);

      // 6. Fetch Website Content
      fetchWebsiteContent();

      // 7. Fetch Correction Requests (Appeals)
      await fetchAdminAppeals();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchAdminAppeals = async () => {
    try {
      setLoadingAdminAppeals(true);
      const { data, error } = await supabase
        .from('correction_requests')
        .select(`
          *,
          student:student_id (
            name,
            batch_number,
            course_id,
            courses:course_id (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminAppeals(data || []);
      
      const pending = (data || []).filter((a: any) => a.status === 'pending').length;
      setPendingAppealsCount(pending);
    } catch (err) {
      console.error('Error fetching admin appeals:', err);
    } finally {
      setLoadingAdminAppeals(false);
    }
  };

  const fetchAlumniProfiles = async () => {
    setLoadingAlumni(true);
    try {
      const { data: students, error: studentErr } = await supabase
        .from('student_profiles')
        .select('*, courses:course_id(name)');
      if (studentErr) throw studentErr;

      const { data: careers, error: careerErr } = await supabase
        .from('alumni_profiles')
        .select('*');
      if (careerErr) throw careerErr;

      const mapped = (students || []).map(stud => {
        const career = (careers || []).find(c => c.student_id === stud.id);
        return {
          ...stud,
          career: career || {
            employment_status: 'unemployed_looking',
            preferred_location: 'anywhere',
            preferred_roles: '',
            current_job_title: '',
            current_company: '',
            current_work_location: '',
            skills_learned: '',
            linkedin_url: '',
            marital_status: 'single',
            spouse_name: '',
            spouse_profession: '',
            spouse_company: '',
            spouse_work_location: ''
          }
        };
      });

      setAlumniProfiles(mapped);
    } catch (err) {
      console.error('Error fetching alumni profiles:', err);
    } finally {
      setLoadingAlumni(false);
    }
  };

  const handleApproveAppeal = async (appeal: any) => {
    setSelectedAppeal(appeal);
    setAppealActionRemark('');
    setShowAppealActionModal(true);
  };

  const handleConfirmAppealAction = async (approved: boolean, appealOverride?: any) => {
    const appeal = appealOverride || selectedAppeal;
    if (!appeal || !currentUser) return;
    try {
      setProcessingAppealAction(true);
      
      const newStatus = approved ? 'approved' : 'rejected';
      
      // 1. Update the correction request status in Supabase
      const { error: updateRequestError } = await supabase
        .from('correction_requests')
        .update({
          status: newStatus,
          admin_remark: appealOverride ? (approved ? 'Approved directly' : 'Rejected directly') : appealActionRemark
        })
        .eq('id', appeal.id);

      if (updateRequestError) throw updateRequestError;

      // 2. If approved, perform the automatic database correction!
      if (approved) {
        const studentId = appeal.student_id;
        const loggedDate = appeal.logged_date;
        const reqType = appeal.request_type;
        const activityName = appeal.activity_name;
        const expectedVal = appeal.expected_value;

        // Find the active scoring interval for the student
        const studentProfile = studentList.find(s => s.id === studentId);
        if (studentProfile) {
          const studentCourseId = studentProfile.course_id;
          const studentBatchNum = studentProfile.batch_number;
          const matchedInterval = getIntervalForDate(loggedDate, studentCourseId, studentBatchNum);

          if (matchedInterval) {
            if (reqType === 'attendance') {
              const statusValue = expectedVal; // expected e.g. 'On Time', 'Late', 'Half Day', 'Absent'
              const points = statusValue === 'On Time' ? 10 : (statusValue === 'Late' ? 7 : (statusValue === 'Half Day' ? 5 : 0));
              const dbActivityName = `Attendance: ${statusValue}`;

              const { data: existingScores, error: findError } = await supabase
                .from('scores')
                .select('*')
                .eq('student_id', studentId)
                .eq('logged_date', loggedDate)
                .eq('score_type', 'attendance');

              if (findError) throw findError;

              if (existingScores && existingScores.length > 0) {
                const { error: updError } = await supabase
                  .from('scores')
                  .update({
                    points: points,
                    max_points: points,
                    activity_name: dbActivityName,
                    logged_by: currentUser.id
                  })
                  .eq('id', existingScores[0].id);
                if (updError) throw updError;
              } else {
                const { error: insError } = await supabase
                  .from('scores')
                  .insert([{
                    student_id: studentId,
                    interval_id: matchedInterval.id,
                    score_type: 'attendance',
                    points: points,
                    max_points: points,
                    activity_name: dbActivityName,
                    logged_by: currentUser.id,
                    logged_date: loggedDate
                  }]);
                if (insError) throw insError;
              }
            } else if (reqType === 'checklist') {
              const pointsMap = { 
                'daily_vocab': 5, 
                'daily_sentences': 5, 
                'weekly_vlog': 15, 
                'video_reaction': 15, 
                'hadithul_arabia': 10 
              } as any;
              
              const activityNameMap = { 
                'daily_vocab': 'Daily Vocabulary', 
                'daily_sentences': 'Daily Sentences', 
                'weekly_vlog': 'Weekly Vlog',
                'video_reaction': 'Video Reaction Task',
                'hadithul_arabia': 'Hadithul Arabia Attendance'
              } as any;

              let scoreType = 'daily_vocab';
              const lowerActivity = activityName.toLowerCase();
              if (lowerActivity.includes('vocab')) scoreType = 'daily_vocab';
              else if (lowerActivity.includes('sentence')) scoreType = 'daily_sentences';
              else if (lowerActivity.includes('vlog')) scoreType = 'weekly_vlog';
              else if (lowerActivity.includes('reaction')) scoreType = 'video_reaction';
              else if (lowerActivity.includes('hadithul')) scoreType = 'hadithul_arabia';

              const targetPoints = pointsMap[scoreType] || 5;
              const targetName = activityNameMap[scoreType] || activityName;

              const { data: existingChecklist, error: findChecklistError } = await supabase
                .from('scores')
                .select('*')
                .eq('student_id', studentId)
                .eq('logged_date', loggedDate)
                .eq('score_type', scoreType);

              if (findChecklistError) throw findChecklistError;

              if (existingChecklist && existingChecklist.length > 0) {
                const { error: updError } = await supabase
                  .from('scores')
                  .update({
                    points: targetPoints,
                    max_points: targetPoints,
                    activity_name: targetName,
                    logged_by: currentUser.id
                  })
                  .eq('id', existingChecklist[0].id);
                if (updError) throw updError;
              } else {
                const { error: insError } = await supabase
                  .from('scores')
                  .insert([{
                    student_id: studentId,
                    interval_id: matchedInterval.id,
                    score_type: scoreType,
                    points: targetPoints,
                    max_points: targetPoints,
                    activity_name: targetName,
                    logged_by: currentUser.id,
                    logged_date: loggedDate
                  }]);
                if (insError) throw insError;
              }
            } else if (reqType === 'scoring') {
              const { data: existingScoring, error: findScoringError } = await supabase
                .from('scores')
                .select('*')
                .eq('student_id', studentId)
                .eq('logged_date', loggedDate)
                .eq('activity_name', activityName);

              if (findScoringError) throw findScoringError;

              let points = parseInt(expectedVal.split('/')[0].trim());
              let maxPoints = 100;
              if (expectedVal.includes('/')) {
                maxPoints = parseInt(expectedVal.split('/')[1].trim());
              }
              if (isNaN(points)) points = 0;
              if (isNaN(maxPoints)) maxPoints = 100;

              let scoreType = 'custom';
              if (activityName.toLowerCase().includes('exam')) {
                scoreType = 'exam';
              } else if (activityName.toLowerCase().includes('violation') || activityName.toLowerCase().includes('penalty')) {
                scoreType = 'penalty';
              } else if (activityName.toLowerCase().includes('one minute talk')) {
                scoreType = 'custom';
              }

              if (existingScoring && existingScoring.length > 0) {
                const { error: updError } = await supabase
                  .from('scores')
                  .update({
                    points: points,
                    max_points: maxPoints,
                    logged_by: currentUser.id
                  })
                  .eq('id', existingScoring[0].id);
                if (updError) throw updError;
              } else {
                const { error: insError } = await supabase
                  .from('scores')
                  .insert([{
                    student_id: studentId,
                    interval_id: matchedInterval.id,
                    score_type: scoreType,
                    points: points,
                    max_points: maxPoints,
                    activity_name: activityName,
                    logged_by: currentUser.id,
                    logged_date: loggedDate
                  }]);
                if (insError) throw insError;
              }
            }

            await fetchClassroomLeaderboard(matchedInterval.id);
          }
        }
      }

      await logActivity('student_appeal_resolved', `Resolved appeal correction request as ${newStatus} for student ID: ${appeal.student_id}`);
      
      setMessage(`✅ Appeal request ${newStatus} successfully!`);
      setTimeout(() => setMessage(''), 4000);
      
      setShowAppealActionModal(false);
      setSelectedAppeal(null);
      await fetchAdminAppeals();
    } catch (err: any) {
      console.error('Error resolving appeal:', err);
      alert(`Error resolving appeal: ${err.message}`);
    } finally {
      setProcessingAppealAction(false);
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

  // Helper to display shortened course acronyms/names in quick buttons
  const getShortCourseName = (courseId: string) => {
    const fullName = courses.find(c => c.id === courseId)?.name || 'Course';
    const lower = fullName.toLowerCase();
    if (lower.includes('translation') || lower.includes('diploma')) {
      return 'PDTOA';
    }
    if (lower.includes('arabic')) {
      return 'Gulf Arabic';
    }
    return fullName.length > 25 ? fullName.substring(0, 22) + '...' : fullName;
  };

  // Automatically select the first live (active) batch on load
  useEffect(() => {
    if (intervalsList.length > 0) {
      const active = intervalsList.find(i => i.is_active);
      if (active) {
        if (!filterCourse || !filterBatch) {
          setFilterCourse(active.course_id);
          setFilterBatch(active.batch_number.toString());
        }
        if (!overviewSelectedInterval) {
          setOverviewSelectedInterval(active.id);
        }
      } else {
        if (!filterCourse || !filterBatch) {
          setFilterCourse(intervalsList[0].course_id);
          setFilterBatch(intervalsList[0].batch_number.toString());
        }
        if (!overviewSelectedInterval) {
          setOverviewSelectedInterval(intervalsList[0].id);
        }
      }
    }
  }, [intervalsList, filterCourse, filterBatch, overviewSelectedInterval]);

  // Triggered when Course and Batch selection changes in Classroom View
  useEffect(() => {
    if (filterCourse && filterBatch) {
      loadClassroomActiveInterval();
    }
  }, [filterCourse, filterBatch, intervalsList]);

  // Fetch classroom scores and leaderboard when interval or selected date changes
  useEffect(() => {
    if (activeInterval) {
      fetchClassroomScores(activeInterval.id, selectedGradingDate);
      fetchClassroomLeaderboard(selectedLeaderboardInterval || activeInterval.id);
    }
  }, [activeInterval, selectedGradingDate, selectedLeaderboardInterval]);

  // Load batch scores when Matrix view is activated
  useEffect(() => {
    if (activeInterval && gradingMode === 'batch_sheet') {
      fetchBatchScores(activeInterval.id);
    }
  }, [activeInterval, gradingMode]);

  // Fetch overview leaderboard when selected overview interval changes
  useEffect(() => {
    if (overviewSelectedInterval && intervalsList.length > 0) {
      const int = intervalsList.find(i => i.id === overviewSelectedInterval);
      if (int) {
        fetchOverviewLeaderboard(int.id, int.course_id, int.batch_number);
      }
    }
  }, [overviewSelectedInterval, intervalsList]);

  // Synchronize configuration editor states when intervalsList or selectedConfigIntervalId changes
  useEffect(() => {
    if (selectedConfigIntervalId) {
      const selected = intervalsList.find(i => i.id === selectedConfigIntervalId);
      if (selected) {
        setConfigWorkingDays(selected.total_working_days ?? 20);
        setConfigVocab(selected.total_vocab_tasks ?? 20);
        setConfigSentences(selected.total_sentences_tasks ?? 20);
        setConfigVlog(selected.total_vlog_tasks ?? 4);
        setConfigReaction(selected.total_reaction_tasks ?? 4);
        setConfigHadithul(selected.total_hadithul_tasks ?? 4);
        setConfigStartDate(selected.start_date ?? (selected.created_at ? selected.created_at.split('T')[0] : ''));
        setConfigEndDate(selected.end_date ?? '');
      }
    }
  }, [selectedConfigIntervalId, intervalsList]);

  const loadClassroomActiveInterval = () => {
    const active = intervalsList.find(
      i => i.course_id === filterCourse && i.batch_number === parseInt(filterBatch) && i.is_active
    );
    if (active) {
      setActiveInterval(active);
      setSelectedLeaderboardInterval(active.id);
      setSelectedConfigIntervalId(active.id);
    } else {
      setActiveInterval(null);
      setSelectedLeaderboardInterval('');
      setScoresList([]);
      
      const courseInts = intervalsList.filter(i => i.course_id === filterCourse && i.batch_number === parseInt(filterBatch));
      if (courseInts.length > 0) {
        setSelectedConfigIntervalId(courseInts[0].id);
      } else {
        setSelectedConfigIntervalId('');
      }
    }
  };

  const fetchClassroomScores = async (_intervalId: string, dateStr?: string) => {
    try {
      const targetDate = dateStr || selectedGradingDate;
      // Fetch scores logged for this date (regardless of interval to align with UNIQUE constraint)
      const { data } = await supabase
        .from('scores')
        .select('*')
        .eq('logged_date', targetDate);
      if (data) setScoresList(data);
    } catch (err) {
      console.error('Error fetching scores:', err);
    }
  };

  const fetchLeaderboardData = async (intervalId: string, courseId: string, batchNumber: number): Promise<LeaderboardEntry[]> => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_interval_id: intervalId,
        p_course_id: courseId,
        p_batch_number: batchNumber
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      return [];
    }
  };

  const getIntervalForDate = (dateStr: string, courseId: string, batchNumber: number): ScoringInterval | null => {
    const courseInts = intervalsList.filter(
      i => i.course_id === courseId && i.batch_number === batchNumber
    );
    if (courseInts.length === 0) return null;

    const sorted = [...courseInts].sort((a, b) => {
      const dateA = new Date(a.start_date || a.created_at || '').getTime();
      const dateB = new Date(b.start_date || b.created_at || '').getTime();
      return dateA - dateB;
    });

    const targetTime = new Date(dateStr).getTime();

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const startStr = current.start_date || current.created_at || '';
      const startTime = new Date(startStr).getTime();

      let endTime = Infinity;
      if (current.end_date) {
        endTime = new Date(current.end_date).getTime() + 24 * 60 * 60 * 1000 - 1;
      } else if (i < sorted.length - 1) {
        const nextStart = sorted[i + 1].start_date || sorted[i + 1].created_at || '';
        endTime = new Date(nextStart).getTime() - 1;
      }

      if (targetTime >= startTime && targetTime <= endTime) {
        return current;
      }
    }

    const active = sorted.find(i => i.is_active);
    if (active) return active;
    
    if (targetTime < new Date(sorted[0].start_date || sorted[0].created_at || '').getTime()) {
      return sorted[0];
    }
    return sorted[sorted.length - 1];
  };

  const fetchClassroomLeaderboard = async (intervalId: string) => {
    if (!filterCourse || !filterBatch) return;
    const targetIntervalId = selectedLeaderboardInterval || intervalId;
    const entries = await fetchLeaderboardData(targetIntervalId, filterCourse, parseInt(filterBatch));
    setClassroomLeaderboard(entries);
    if (overviewSelectedInterval === targetIntervalId) {
      setOverviewLeaderboard(entries);
    }
  };

  const handleLeaderboardIntervalChange = (intervalId: string) => {
    setSelectedLeaderboardInterval(intervalId);
    fetchClassroomLeaderboard(intervalId);
  };

  const fetchOverviewLeaderboard = async (intervalId: string, courseId: string, batchNumber: number) => {
    const entries = await fetchLeaderboardData(intervalId, courseId, batchNumber);
    setOverviewLeaderboard(entries);
  };


  // --- STUDENT SCOREBOARD & LOG OPERATIONS ---

  // Toggle student check-in (Daily Vocab / Sentences / Weekly Vlog)
  const handleToggleStudentScore = async (studentId: string, scoreType: 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia', isChecked: boolean) => {
    if (!activeInterval || !currentUser) return;
    const lockKey = `${studentId}-${scoreType}`;
    if (updatingScores.includes(lockKey)) return;

    setUpdatingScores(prev => [...prev, lockKey]);
    const targetDate = selectedGradingDate;
    
    // Define point values
    const pointsMap = { daily_vocab: 5, daily_sentences: 5, weekly_vlog: 15, video_reaction: 15, hadithul_arabia: 10 };
    const activityNameMap = { 
      daily_vocab: 'Daily Vocabulary', 
      daily_sentences: 'Daily Sentences', 
      weekly_vlog: 'Weekly Vlog',
      video_reaction: 'Video Reaction Task',
      hadithul_arabia: 'Hadithul Arabia Attendance'
    };

    try {
      if (isChecked) {
        const student = studentList.find(s => s.id === studentId);
        const targetInterval = getIntervalForDate(
          targetDate,
          student?.course_id || activeInterval.course_id,
          student?.batch_number || activeInterval.batch_number
        );
        const { error } = await supabase.from('scores').insert([
          {
            student_id: studentId,
            interval_id: targetInterval ? targetInterval.id : activeInterval.id,
            score_type: scoreType,
            points: pointsMap[scoreType],
            max_points: pointsMap[scoreType],
            activity_name: activityNameMap[scoreType],
            logged_by: currentUser.id,
            logged_date: targetDate
          }
        ]);
        if (error) throw error;

        const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
        await logActivity('student_score_logged', `Logged +${pointsMap[scoreType]} points for ${studName} (${activityNameMap[scoreType]}) on ${targetDate}`);
      } else {
        const { error } = await supabase
          .from('scores')
          .delete()
          .eq('student_id', studentId)
          .eq('score_type', scoreType)
          .eq('logged_date', targetDate);
        if (error) throw error;

        const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
        await logActivity('student_score_deleted', `Removed ${activityNameMap[scoreType]} points for ${studName} on ${targetDate}`);
      }
      
      // Refresh classroom logs & leaderboard
      await fetchClassroomScores(activeInterval.id, targetDate);
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      if (err.code === '23505') {
        setMessage(`❌ Activity already logged for this student today.`);
      } else {
        setMessage(`❌ Failed toggling mark: ${err.message}`);
      }
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setUpdatingScores(prev => prev.filter(k => k !== lockKey));
    }
  };

  const fetchBatchScores = useCallback(async (intervalId: string) => {
    setLoadingBatchScores(true);
    try {
      let allScores: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('scores')
          .select('*')
          .eq('interval_id', intervalId)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allScores = [...allScores, ...data];
          from += pageSize;
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      setBatchScores(allScores);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBatchScores(false);
    }
  }, []);

  const handleToggleMatrixCell = async (studentId: string, dateStr: string, scoreType: string, existingRecord: any) => {
    if (!activeInterval || !currentUser) return;
    const lockKey = `${studentId}-${dateStr}-${scoreType}`;
    if (updatingMatrix.includes(lockKey)) return;

    setUpdatingMatrix(prev => [...prev, lockKey]);

    try {
      if (existingRecord) {
        const { error } = await supabase
          .from('scores')
          .delete()
          .eq('id', existingRecord.id);
        if (error) throw error;
        setBatchScores(prev => prev.filter(s => s.id !== existingRecord.id));
        
        const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
        await logActivity('student_score_deleted', `Removed ${scoreType.replace('daily_', '').replace('_', ' ')} points for ${studName} on ${dateStr} (Matrix View)`);
      } else {
        const pointsMap = { daily_vocab: 5, daily_sentences: 5, weekly_vlog: 15, video_reaction: 15, hadithul_arabia: 10 };
        const activityNameMap = { 
          daily_vocab: 'Daily Vocabulary', 
          daily_sentences: 'Daily Sentences', 
          weekly_vlog: 'Weekly Vlog',
          video_reaction: 'Video Reaction Task',
          hadithul_arabia: 'Hadithul Arabia Attendance'
        } as any;

        const student = studentList.find(s => s.id === studentId);
        const targetInterval = getIntervalForDate(
          dateStr,
          student?.course_id || activeInterval.course_id,
          student?.batch_number || activeInterval.batch_number
        );
        const { data, error } = await supabase
          .from('scores')
          .insert([
            {
              student_id: studentId,
              interval_id: targetInterval ? targetInterval.id : activeInterval.id,
              score_type: scoreType,
              points: pointsMap[scoreType as 'daily_vocab'],
              max_points: pointsMap[scoreType as 'daily_vocab'],
              activity_name: activityNameMap[scoreType],
              logged_by: currentUser.id,
              logged_date: dateStr
            }
          ])
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          setBatchScores(prev => [...prev, data[0]]);
        }

        const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
        await logActivity('student_score_logged', `Logged +${pointsMap[scoreType as 'daily_vocab']} points for ${studName} (${activityNameMap[scoreType]}) on ${dateStr} (Matrix View)`);
      }
      // Keep scoreboard updated in background
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed updating matrix cell: ${err.message}`);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setUpdatingMatrix(prev => prev.filter(k => k !== lockKey));
    }
  };

  const handleToggleMatrixAttendance = async (studentId: string, dateStr: string, statusValue: string) => {
    if (!activeInterval || !currentUser) return;
    const lockKey = `${studentId}-${dateStr}-attendance`;
    if (updatingMatrix.includes(lockKey)) return;

    setUpdatingMatrix(prev => [...prev, lockKey]);

    try {
      const existingRecord = batchScores.find(
        s => s.student_id === studentId && s.logged_date === dateStr && s.score_type === 'attendance'
      );

      if (!statusValue) {
        if (existingRecord) {
          const { error } = await supabase
            .from('scores')
            .delete()
            .eq('id', existingRecord.id);
          if (error) throw error;
          setBatchScores(prev => prev.filter(s => s.id !== existingRecord.id));
          
          const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
          await logActivity('student_score_deleted', `Removed Attendance for ${studName} on ${dateStr} (Matrix View)`);
        }
      } else {
        const points = statusValue === 'On Time' ? 10 : (statusValue === 'Late' ? 7 : (statusValue === 'Half Day' ? 5 : 0));
        const dbActivityName = `Attendance: ${statusValue}`;

        if (existingRecord) {
          const { data, error } = await supabase
            .from('scores')
            .update({
              points: points,
              max_points: points,
              activity_name: dbActivityName,
              logged_by: currentUser.id
            })
            .eq('id', existingRecord.id)
            .select();
          if (error) throw error;
          if (data && data.length > 0) {
            setBatchScores(prev => prev.map(s => s.id === existingRecord.id ? data[0] : s));
          }
          const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
          await logActivity('student_score_logged', `Updated Attendance to ${statusValue} for ${studName} on ${dateStr} (Matrix View)`);
        } else {
        const student = studentList.find(s => s.id === studentId);
        const targetInterval = getIntervalForDate(
          dateStr,
          student?.course_id || activeInterval.course_id,
          student?.batch_number || activeInterval.batch_number
        );
        const { data, error } = await supabase
          .from('scores')
          .insert([
            {
              student_id: studentId,
              interval_id: targetInterval ? targetInterval.id : activeInterval.id,
              score_type: 'attendance',
              points: points,
              max_points: points,
              activity_name: dbActivityName,
              logged_by: currentUser.id,
              logged_date: dateStr
            }
          ])
          .select();
          if (error) throw error;
          if (data && data.length > 0) {
            setBatchScores(prev => [...prev, data[0]]);
          }
          const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
          await logActivity('student_score_logged', `Logged Attendance (${statusValue}) for ${studName} on ${dateStr} (Matrix View)`);
        }
      }
      // Keep scoreboard updated in background
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed updating attendance: ${err.message}`);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setUpdatingMatrix(prev => prev.filter(k => k !== lockKey));
    }
  };

  // Malayalam Penalty Trigger (-2 XP, multi-clickable)
  const handleMalayalamPenalty = async (studentId: string, action: 'increment' | 'decrement') => {
    if (!activeInterval || !currentUser) return;
    const targetDate = selectedGradingDate;
    const lockKey = `${studentId}-penalty`;
    
    // Check both standard React state lock and synchronous ref lock
    if (updatingScores.includes(lockKey) || penaltyLockRef.current[studentId]) return;

    penaltyLockRef.current[studentId] = true;
    setUpdatingScores(prev => [...prev, lockKey]);

    try {
      // Query the database directly to get the absolute latest state and prevent race conditions
      const { data: dbScores, error: fetchError } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .eq('score_type', 'penalty')
        .eq('logged_date', targetDate);

      if (fetchError) throw fetchError;
      const existingPenalty = dbScores && dbScores.length > 0 ? dbScores[0] : null;
      const studName = studentList.find(s => s.id === studentId)?.name || 'Student';

      if (action === 'increment') {
        const newPoints = existingPenalty ? existingPenalty.points - 2 : -2;
        
        if (existingPenalty) {
          const { error: updateError } = await supabase
            .from('scores')
            .update({ points: newPoints })
            .eq('id', existingPenalty.id);
          if (updateError) throw updateError;
          await logActivity('malayalam_penalty_inc', `Increased Malayalam penalty count for ${studName} (Total: ${newPoints} XP) on ${targetDate}`);
          setMessage(`⚠️ Malayalam penalty count increased (Total: ${newPoints} XP) for ${studName}.`);
        } else {
          const student = studentList.find(s => s.id === studentId);
          const targetInterval = getIntervalForDate(
            targetDate,
            student?.course_id || activeInterval.course_id,
            student?.batch_number || activeInterval.batch_number
          );
          const { error: insertError } = await supabase.from('scores').insert([
            {
              student_id: studentId,
              interval_id: targetInterval ? targetInterval.id : activeInterval.id,
              score_type: 'penalty',
              points: -2,
              max_points: 0,
              activity_name: 'Malayalam Speaking Policy Violation',
              logged_by: currentUser.id,
              logged_date: targetDate
            }
          ]);
          if (insertError) throw insertError;
          await logActivity('malayalam_penalty_create', `Deducted -2 points from ${studName} for speaking Malayalam on ${targetDate}`);
          setMessage(`⚠️ Malayalam penalty logged: -2 XP applied to ${studName}.`);
        }
      } else if (action === 'decrement') {
        if (existingPenalty) {
          if (existingPenalty.points === -2) {
            // Delete row if it gets reduced to 0
            const { error: deleteError } = await supabase
              .from('scores')
              .delete()
              .eq('id', existingPenalty.id);
            if (deleteError) throw deleteError;
            await logActivity('malayalam_penalty_remove', `Removed all Malayalam penalties for ${studName} on ${targetDate}`);
            setMessage(`✅ Malayalam penalty completely removed for ${studName}.`);
          } else {
            const newPoints = existingPenalty.points + 2;
            const { error: updateError } = await supabase
              .from('scores')
              .update({ points: newPoints })
              .eq('id', existingPenalty.id);
            if (updateError) throw updateError;
            await logActivity('malayalam_penalty_dec', `Reduced Malayalam penalty count for ${studName} (Total: ${newPoints} XP) on ${targetDate}`);
            setMessage(`⚠️ Malayalam penalty reduced to ${newPoints} XP for ${studName}.`);
          }
        }
      }

      await fetchClassroomScores(activeInterval.id, targetDate);
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to update penalty: ${err.message}`);
    } finally {
      penaltyLockRef.current[studentId] = false;
      setUpdatingScores(prev => prev.filter(k => k !== lockKey));
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Attendance Score Grade (On Time = 10, Late = 0, Absent = 0)
  const handleToggleAttendance = async (studentId: string, statusValue: string) => {
    if (!activeInterval || !currentUser) return;
    const targetDate = selectedGradingDate;
    const lockKey = `${studentId}-attendance`;
    if (updatingScores.includes(lockKey)) return;

    setUpdatingScores(prev => [...prev, lockKey]);
    try {
      const existingAttendance = scoresList.find(
        s => s.student_id === studentId && s.score_type === 'attendance'
      );

      const studName = studentList.find(s => s.id === studentId)?.name || 'Student';

      if (statusValue === '') {
        // If cleared, delete from database
        if (existingAttendance) {
          const { error: deleteError } = await supabase
            .from('scores')
            .delete()
            .eq('id', existingAttendance.id);
          if (deleteError) throw deleteError;
          await logActivity('attendance_delete', `Removed attendance record for ${studName} on ${targetDate}`);
          setMessage(`📅 Attendance removed for ${studName}.`);
        }
      } else {
        const pointsValue = statusValue === 'On Time' ? 10 : (statusValue === 'Late' ? 7 : (statusValue === 'Half Day' ? 5 : 0));
        const dbActivityName = `Attendance: ${statusValue}`;
        
        if (existingAttendance) {
          // Update points and status (activity_name)
          const { error: updateError } = await supabase
            .from('scores')
            .update({ 
              points: pointsValue,
              activity_name: dbActivityName
            })
            .eq('id', existingAttendance.id);
          if (updateError) throw updateError;
          await logActivity('attendance_update', `Updated attendance for ${studName} to ${statusValue} (${pointsValue} XP) on ${targetDate}`);
          setMessage(`📅 Attendance updated to ${statusValue} (${pointsValue} XP) for ${studName}.`);
        } else {
          // Insert new score row
          const student = studentList.find(s => s.id === studentId);
          const targetInterval = getIntervalForDate(
            targetDate,
            student?.course_id || activeInterval.course_id,
            student?.batch_number || activeInterval.batch_number
          );
          const { error: insertError } = await supabase
            .from('scores')
            .insert([
              {
                student_id: studentId,
                interval_id: targetInterval ? targetInterval.id : activeInterval.id,
                points: pointsValue,
                max_points: 10,
                score_type: 'attendance',
                activity_name: dbActivityName,
                logged_by: currentUser.id,
                logged_date: targetDate
              }
            ]);
          if (insertError) throw insertError;
          await logActivity('attendance_insert', `Logged attendance for ${studName} as ${statusValue} (${pointsValue} XP) on ${targetDate}`);
          setMessage(`📅 Attendance logged as ${statusValue} (${pointsValue} XP) for ${studName}.`);
        }      }
      
      // Refresh scores and leaderboard
      await fetchClassroomScores(activeInterval.id, targetDate);
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to update attendance: ${err.message}`);
    } finally {
      setUpdatingScores(prev => prev.filter(k => k !== lockKey));
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // One Minute Talk Score Grade (0-10)
  const handleToggleOneMinuteTalk = async (studentId: string, val: string) => {
    if (!activeInterval || !currentUser) return;
    const targetDate = selectedGradingDate;
    const lockKey = `${studentId}-talk`;
    if (updatingScores.includes(lockKey)) return;

    setUpdatingScores(prev => [...prev, lockKey]);
    try {
      const existingTalk = scoresList.find(
        s => s.student_id === studentId && s.score_type === 'custom' && s.activity_name === 'One Minute Talk'
      );

      const studName = studentList.find(s => s.id === studentId)?.name || 'Student';

      if (val === '') {
        // If cleared, delete from database
        if (existingTalk) {
          const { error: deleteError } = await supabase
            .from('scores')
            .delete()
            .eq('id', existingTalk.id);
          if (deleteError) throw deleteError;
          await logActivity('one_minute_talk_delete', `Removed One Minute Talk score for ${studName} on ${targetDate}`);
          setMessage(`🎙️ One Minute Talk score removed for ${studName}.`);
        }
      } else {
        const pointsValue = parseInt(val);
        if (existingTalk) {
          // Update points
          const { error: updateError } = await supabase
            .from('scores')
            .update({ points: pointsValue })
            .eq('id', existingTalk.id);
          if (updateError) throw updateError;
          await logActivity('one_minute_talk_update', `Updated One Minute Talk score for ${studName} to ${pointsValue}/10 on ${targetDate}`);
          setMessage(`🎙️ One Minute Talk score updated to ${pointsValue}/10 for ${studName}.`);
        } else {
          // Insert new score row
          const student = studentList.find(s => s.id === studentId);
          const targetInterval = getIntervalForDate(
            targetDate,
            student?.course_id || activeInterval.course_id,
            student?.batch_number || activeInterval.batch_number
          );
          const { error: insertError } = await supabase
            .from('scores')
            .insert([
              {
                student_id: studentId,
                interval_id: targetInterval ? targetInterval.id : activeInterval.id,
                points: pointsValue,
                max_points: 10,
                score_type: 'custom',
                activity_name: 'One Minute Talk',
                logged_by: currentUser.id,
                logged_date: targetDate
              }
            ]);
          if (insertError) throw insertError;
          await logActivity('one_minute_talk_log', `Logged One Minute Talk score of ${pointsValue}/10 for ${studName} on ${targetDate}`);
          setMessage(`🎙️ One Minute Talk score logged: ${pointsValue}/10 for ${studName}.`);
        }
      }

      await fetchClassroomScores(activeInterval.id, targetDate);
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to log One Minute Talk score: ${err.message}`);
    } finally {
      setUpdatingScores(prev => prev.filter(k => k !== lockKey));
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Submit Bulk Exam Grades
  const handleGradeExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterval || !currentUser || !examName) return;

    setMessage('Saving exam grades to database...');
    try {
      const maxPts = parseInt(examMaxPoints);
      const insertRecords = Object.keys(examScores).map(studId => {
        const student = studentList.find(s => s.id === studId);
        const targetInterval = getIntervalForDate(
          selectedGradingDate,
          student?.course_id || activeInterval.course_id,
          student?.batch_number || activeInterval.batch_number
        );
        return {
          student_id: studId,
          interval_id: targetInterval ? targetInterval.id : activeInterval.id,
          score_type: 'exam',
          points: examScores[studId] || 0,
          max_points: maxPts,
          activity_name: `Exam: ${examName}`,
          logged_by: currentUser.id,
          logged_date: selectedGradingDate
        };
      });

      if (insertRecords.length === 0) {
        throw new Error('No student grades entered.');
      }

      const { error } = await supabase.from('scores').insert(insertRecords);
      if (error) throw error;

      await logActivity('exam_graded', `Logged grades for exam "${examName}" across batch for date ${selectedGradingDate}`);
      setMessage('✅ Exam grades logged successfully!');
      setExamName('');
      setExamScores({});
      await fetchClassroomScores(activeInterval.id, selectedGradingDate);
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to save grades: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Submit Bulk Custom Activity Grades
  const handleGradeCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterval || !currentUser || !customActivityName) return;

    setMessage('Saving custom grades to database...');
    try {
      const maxPts = parseInt(customMaxPoints);
      const insertRecords = Object.keys(customScores).map(studId => {
        const student = studentList.find(s => s.id === studId);
        const targetInterval = getIntervalForDate(
          selectedGradingDate,
          student?.course_id || activeInterval.course_id,
          student?.batch_number || activeInterval.batch_number
        );
        return {
          student_id: studId,
          interval_id: targetInterval ? targetInterval.id : activeInterval.id,
          score_type: 'custom',
          points: customScores[studId] || 0,
          max_points: maxPts,
          activity_name: customActivityName,
          logged_by: currentUser.id,
          logged_date: selectedGradingDate
        };
      });

      if (insertRecords.length === 0) {
        throw new Error('No student grades entered.');
      }

      const { error } = await supabase.from('scores').insert(insertRecords);
      if (error) throw error;

      await logActivity('custom_graded', `Logged grades for activity "${customActivityName}" across batch for date ${selectedGradingDate}`);
      setMessage('✅ Activity grades logged successfully!');
      setCustomActivityName('');
      setCustomScores({});
      await fetchClassroomScores(activeInterval.id, selectedGradingDate);
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to save grades: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleVerifyScores = async () => {
    if (!filterCourse || !filterBatch) return;
    setVerifyingScores(true);
    setShowScoreVerifierModal(true);
    setScoreVerifierList([]);
    try {
      const { data: students, error: studentErr } = await supabase
        .from('student_profiles')
        .select('id, name')
        .eq('course_id', filterCourse)
        .eq('batch_number', parseInt(filterBatch))
        .eq('status', 'active');
      if (studentErr) throw studentErr;

      const { data: intervals, error: intervalErr } = await supabase
        .from('scoring_intervals')
        .select('id, name, start_date, end_date')
        .eq('course_id', filterCourse)
        .eq('batch_number', parseInt(filterBatch));
      if (intervalErr) throw intervalErr;

      const intervalIds = intervals?.map(i => i.id) || [];
      if (intervalIds.length === 0 || !students || students.length === 0) {
        setVerifyingScores(false);
        return;
      }

      let allScores: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: pageData, error: scoreErr } = await supabase
          .from('scores')
          .select('student_id, interval_id, points, logged_date')
          .in('interval_id', intervalIds)
          .in('student_id', students.map(s => s.id))
          .range(from, from + pageSize - 1);

        if (scoreErr) throw scoreErr;
        if (pageData && pageData.length > 0) {
          allScores = [...allScores, ...pageData];
          from += pageSize;
          if (pageData.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Calculate intervals audit summary (dates logged vs configured start)
      const intervalSummary = intervals.map(interval => {
        const intervalScores = allScores.filter(s => s.interval_id === interval.id);
        const dates = intervalScores.map(s => s.logged_date).filter(Boolean);
        
        let actualStart = 'N/A';
        let actualEnd = 'N/A';
        if (dates.length > 0) {
          actualStart = dates.reduce((min, d) => d < min ? d : min);
          actualEnd = dates.reduce((max, d) => d > max ? d : max);
        }
        
        const totalPoints = intervalScores.reduce((sum, s) => sum + s.points, 0);

        return {
          id: interval.id,
          name: interval.name,
          configuredStart: interval.start_date || 'N/A',
          configuredEnd: interval.end_date || 'N/A',
          actualStart,
          actualEnd,
          totalPoints,
          count: intervalScores.length
        };
      });
      setIntervalsAuditSummary(intervalSummary);

      const targetIntervalId = selectedLeaderboardInterval || activeInterval?.id || '';
      const report = students.map(student => {
        const termScores: { [termName: string]: number } = {};
        let calculatedSum = 0;
        
        intervals.forEach(interval => {
          const intervalScores = (allScores || []).filter(s => s.student_id === student.id && s.interval_id === interval.id);
          const sum = intervalScores.reduce((acc, s) => acc + s.points, 0);
          termScores[interval.name] = sum;
          
          if (targetIntervalId === 'cumulative' || interval.id === targetIntervalId) {
            calculatedSum += sum;
          }
        });

        const entry = classroomLeaderboard.find(e => e.student_id === student.id);
        const scoreboardScore = entry ? entry.total_score : 0;

        return {
          id: student.id,
          name: student.name,
          terms: termScores,
          calculatedSum,
          scoreboardScore,
          isOk: calculatedSum === scoreboardScore
        };
      });

      setScoreVerifierList(report);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed verification: ${err.message}`);
    } finally {
      setVerifyingScores(false);
    }
  };

  // Load and open student performance report modal
  const handleOpenReport = async (student: StudentProfile) => {
    setSelectedReportStudent(student);
    setReportTab('attendance');
    setStudentReportData({ scores: [], loading: true });
    
    const defaultInterval = selectedLeaderboardInterval || activeInterval?.id || 'cumulative';
    setReportSelectedInterval(defaultInterval);
    
    // Reset remarks textareas
    setRemarksStrengths('');
    setRemarksWeaknesses('');
    setRemarksCareerPath('');
    setRemarksGeneral('');
    setRemarksMockInterviewMark('');
    setRemarksMockInterviewRemark('');
    setRemarksIndustrialVisitMark('');
    setRemarksIndustrialVisitRemark('');

    // Fetch remarks from Supabase student_remarks table
    try {
      const { data: remarksData, error: remarksError } = await supabase
        .from('student_remarks')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();

      if (remarksError) throw remarksError;
      if (remarksData) {
        setRemarksStrengths(remarksData.strengths || '');
        setRemarksWeaknesses(remarksData.weaknesses || '');
        setRemarksCareerPath(remarksData.career_path || '');
        setRemarksGeneral(remarksData.general_remarks || '');
        setRemarksMockInterviewMark(remarksData.mock_interview_mark !== null && remarksData.mock_interview_mark !== undefined ? remarksData.mock_interview_mark : '');
        setRemarksMockInterviewRemark(remarksData.mock_interview_remark || '');
        setRemarksIndustrialVisitMark(remarksData.industrial_visit_mark !== null && remarksData.industrial_visit_mark !== undefined ? remarksData.industrial_visit_mark : '');
        setRemarksIndustrialVisitRemark(remarksData.industrial_visit_remark || '');
      }
    } catch (err) {
      console.error('Failed to fetch student remarks:', err);
    }
    
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', student.id)
        .order('logged_date', { ascending: false });
      
      if (error) throw error;
      setStudentReportData({ scores: data || [], loading: false });
    } catch (err: any) {
      console.error(err);
      setStudentReportData({ scores: [], loading: false });
    }
  };

  // Save/Update student remarks
  const handleSaveRemarks = async () => {
    if (!selectedReportStudent || !currentUser) return;
    setSavingRemarks(true);
    try {
      const { error } = await supabase
        .from('student_remarks')
        .upsert({
          student_id: selectedReportStudent.id,
          strengths: remarksStrengths,
          weaknesses: remarksWeaknesses,
          career_path: remarksCareerPath,
          general_remarks: remarksGeneral,
          mock_interview_mark: remarksMockInterviewMark === '' ? null : remarksMockInterviewMark,
          mock_interview_remark: remarksMockInterviewRemark,
          industrial_visit_mark: remarksIndustrialVisitMark === '' ? null : remarksIndustrialVisitMark,
          industrial_visit_remark: remarksIndustrialVisitRemark,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

      if (error) throw error;
      await logActivity('student_remarks_update', `Updated counseling remarks for ${selectedReportStudent.name}`);
      setMessage(`📝 Remarks saved successfully for ${selectedReportStudent.name}.`);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to save remarks: ${err.message}`);
    } finally {
      setSavingRemarks(false);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Report editing helper functions
  const handleUpdateAttendanceScore = async (scoreId: string, statusValue: string) => {
    if (!selectedReportStudent) return;
    try {
      const pointsValue = statusValue === 'On Time' ? 10 : (statusValue === 'Late' ? 7 : (statusValue === 'Half Day' ? 5 : 0));
      const dbActivityName = `Attendance: ${statusValue}`;
      const { error } = await supabase
        .from('scores')
        .update({
          points: pointsValue,
          activity_name: dbActivityName
        })
        .eq('id', scoreId);
      if (error) throw error;
      
      setStudentReportData(prev => ({
        ...prev,
        scores: prev.scores.map(s => s.id === scoreId ? { ...s, points: pointsValue, activity_name: dbActivityName } : s)
      }));
      
      if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
      setMessage('📅 Attendance updated successfully.');
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to update attendance: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (!selectedReportStudent) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this log entry?');
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('id', scoreId);
      if (error) throw error;
      
      setStudentReportData(prev => ({
        ...prev,
        scores: prev.scores.filter(s => s.id !== scoreId)
      }));
      
      if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
      setMessage('🗑️ Log entry deleted successfully.');
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to delete entry: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleToggleWorkCell = async (dateStr: string, scoreType: string) => {
    if (!selectedReportStudent) return;
    
    const existing = studentReportData.scores.find(
      s => s.logged_date === dateStr && s.score_type === scoreType
    );
    
    try {
      if (existing) {
        const { error } = await supabase
          .from('scores')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        
        setStudentReportData(prev => ({
          ...prev,
          scores: prev.scores.filter(s => s.id !== existing.id)
        }));
        if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
        setMessage(`Removed ${scoreType.replace('daily_', '').replace('_', ' ')} submission.`);
      } else {
        const studentCourseId = selectedReportStudent.course_id;
        const studentBatchNum = selectedReportStudent.batch_number;
        const activeInt = getIntervalForDate(dateStr, studentCourseId, studentBatchNum)
          || intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum && i.is_active)
          || intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum);
        if (!activeInt) {
          setMessage('❌ Cannot log: No active interval found for this student\'s course & batch.');
          return;
        }
        
        let activityName = 'Daily Task';
        if (scoreType === 'daily_vocab') activityName = 'Daily Vocab';
        else if (scoreType === 'daily_sentences') activityName = 'Daily Sentences';
        else if (scoreType === 'weekly_vlog') activityName = 'Weekly Vlog';
        else if (scoreType === 'video_reaction') activityName = 'Video Reaction';
        else if (scoreType === 'hadithul_arabia') activityName = 'Hadithul Arabia';
        
        const points = scoreType.startsWith('daily_') ? 10 : 15;
        
        const { data, error } = await supabase
          .from('scores')
          .insert([{
            student_id: selectedReportStudent.id,
            interval_id: activeInt.id,
            score_type: scoreType,
            activity_name: activityName,
            points: points,
            max_points: points,
            logged_date: dateStr,
            logged_by: currentUser?.id
          }])
          .select();
        
        if (error) throw error;
        if (data && data.length > 0) {
          setStudentReportData(prev => ({
            ...prev,
            scores: [...prev.scores, data[0]].sort((a, b) => new Date(b.logged_date).getTime() - new Date(a.logged_date).getTime())
          }));
        }
        if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
        setMessage(`Logged ${activityName} submission.`);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Error updating task: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddAttendanceLog = async () => {
    if (!selectedReportStudent || !currentUser) return;
    try {
      const statusValue = addAttStatus;
      const pointsValue = statusValue === 'On Time' ? 10 : (statusValue === 'Late' ? 7 : (statusValue === 'Half Day' ? 5 : 0));
      const dbActivityName = `Attendance: ${statusValue}`;
      
      const studentCourseId = selectedReportStudent.course_id;
      const studentBatchNum = selectedReportStudent.batch_number;
      const activeInt = intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum && i.is_active)
        || intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum);
      if (!activeInt) {
        setMessage('❌ Cannot log: No active interval found for this student\'s course & batch.');
        return;
      }

      const { data, error } = await supabase
        .from('scores')
        .upsert({
          student_id: selectedReportStudent.id,
          interval_id: activeInt.id,
          points: pointsValue,
          max_points: 10,
          score_type: 'attendance',
          activity_name: dbActivityName,
          logged_by: currentUser.id,
          logged_date: addLogDate
        }, { onConflict: 'student_id,logged_date,score_type' })
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        setStudentReportData(prev => {
          const filtered = prev.scores.filter(s => !(s.logged_date === addLogDate && s.score_type === 'attendance'));
          return {
            ...prev,
            scores: [data[0], ...filtered].sort((a, b) => new Date(b.logged_date).getTime() - new Date(a.logged_date).getTime())
          };
        });
      }
      if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
      setMessage(`📅 Attendance logged for ${addLogDate} as ${statusValue}.`);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to log attendance: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddWorkLog = async () => {
    if (!selectedReportStudent || !currentUser) return;
    
    const studentCourseId = selectedReportStudent.course_id;
    const studentBatchNum = selectedReportStudent.batch_number;
    const activeInt = intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum && i.is_active)
      || intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum);
    if (!activeInt) {
      setMessage('❌ Cannot log: No active interval found for this student\'s course & batch.');
      return;
    }

    const tasksToLog: { score_type: string; activity_name: string; points: number }[] = [];
    if (addWorkVocab) {
      tasksToLog.push({ score_type: 'daily_vocab', activity_name: 'Daily Vocab', points: 10 });
    }
    if (addWorkSentences) {
      tasksToLog.push({ score_type: 'daily_sentences', activity_name: 'Daily Sentences', points: 10 });
    }
    if (addWorkVlog) {
      tasksToLog.push({ score_type: 'weekly_vlog', activity_name: 'Weekly Vlog', points: 15 });
    }
    if (addWorkReaction) {
      tasksToLog.push({ score_type: 'video_reaction', activity_name: 'Video Reaction', points: 15 });
    }
    if (addWorkHadithul) {
      tasksToLog.push({ score_type: 'hadithul_arabia', activity_name: 'Hadithul Arabia', points: 15 });
    }

    if (tasksToLog.length === 0) {
      setMessage('⚠️ Select at least one checklist item to log.');
      return;
    }

    try {
      const insertedData: any[] = [];
      for (const task of tasksToLog) {
        const { data, error } = await supabase
          .from('scores')
          .upsert({
            student_id: selectedReportStudent.id,
            interval_id: activeInt.id,
            score_type: task.score_type,
            activity_name: task.activity_name,
            points: task.points,
            max_points: task.points,
            logged_by: currentUser.id,
            logged_date: addLogDate
          }, { onConflict: 'student_id,logged_date,score_type' })
          .select();
        
        if (error) throw error;
        if (data && data[0]) insertedData.push(data[0]);
      }

      setStudentReportData(prev => {
        const types = tasksToLog.map(t => t.score_type);
        const filtered = prev.scores.filter(s => !(s.logged_date === addLogDate && types.includes(s.score_type)));
        return {
          ...prev,
          scores: [...insertedData, ...filtered].sort((a, b) => new Date(b.logged_date).getTime() - new Date(a.logged_date).getTime())
        };
      });

      setAddWorkVocab(false);
      setAddWorkSentences(false);
      setAddWorkVlog(false);
      setAddWorkReaction(false);
      setAddWorkHadithul(false);

      if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
      setMessage(`📚 Checklist tasks logged for ${addLogDate}.`);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to log tasks: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddGradeLog = async () => {
    if (!selectedReportStudent || !currentUser) return;
    if (addGradeType === 'exam' && !addGradeTitle) {
      setMessage('⚠️ Enter an exam description/title.');
      return;
    }
    
    const studentCourseId = selectedReportStudent.course_id;
    const studentBatchNum = selectedReportStudent.batch_number;
    const activeInt = getIntervalForDate(addLogDate, studentCourseId, studentBatchNum)
      || intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum && i.is_active)
      || intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum);
    if (!activeInt) {
      setMessage('❌ Cannot log: No active interval found for this student\'s course & batch.');
      return;
    }

    try {
      let scoreType = addGradeType;
      let actName = addGradeTitle;
      let points = addGradePoints;
      let maxPoints = addGradeMaxPoints;

      if (scoreType === 'penalty') {
        points = -Math.abs(points);
        maxPoints = 0;
        actName = 'Malayalam Speaking violation';
      } else if (scoreType === 'custom' && !actName) {
        actName = 'One Minute Talk';
        maxPoints = 10;
      }

      const { data, error } = await supabase
        .from('scores')
        .insert([{
          student_id: selectedReportStudent.id,
          interval_id: activeInt.id,
          score_type: scoreType,
          activity_name: actName,
          points: points,
          max_points: maxPoints,
          logged_by: currentUser.id,
          logged_date: addLogDate
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        setStudentReportData(prev => ({
          ...prev,
          scores: [data[0], ...prev.scores].sort((a, b) => new Date(b.logged_date).getTime() - new Date(a.logged_date).getTime())
        }));
      }

      setAddGradeTitle('');
      setAddGradePoints(0);
      setAddGradeMaxPoints(100);
      if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
      setMessage(`📝 Log entry created successfully.`);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to log: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSaveIntervalTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigIntervalId) return;
    try {
      const { error } = await supabase
        .from('scoring_intervals')
        .update({
          total_working_days: configWorkingDays,
          total_vocab_tasks: configVocab,
          total_sentences_tasks: configSentences,
          total_vlog_tasks: configVlog,
          total_reaction_tasks: configReaction,
          total_hadithul_tasks: configHadithul,
          start_date: configStartDate || null,
          end_date: configEndDate || null
        })
        .eq('id', selectedConfigIntervalId);

      if (error) throw error;

      setIntervalsList(prev => prev.map(int => int.id === selectedConfigIntervalId ? {
        ...int,
        total_working_days: configWorkingDays,
        total_vocab_tasks: configVocab,
        total_sentences_tasks: configSentences,
        total_vlog_tasks: configVlog,
        total_reaction_tasks: configReaction,
        total_hadithul_tasks: configHadithul,
        start_date: configStartDate,
        end_date: configEndDate
      } : int));

      setMessage('⚙️ Period targets updated successfully.');
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to save targets: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const printHtml = (htmlContent: string) => {
    const printDiv = document.createElement('div');
    printDiv.id = 'print-section';
    printDiv.innerHTML = htmlContent;

    const style = document.createElement('style');
    style.id = 'print-style';
    style.innerHTML = `
      @media print {
        body > *:not(#print-section) {
          display: none !important;
        }
        #print-section {
          display: block !important;
          width: 100% !important;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(printDiv);

    window.print();

    const cleanup = () => {
      const el = document.getElementById('print-section');
      if (el) el.remove();
      const st = document.getElementById('print-style');
      if (st) st.remove();
    };

    window.onafterprint = cleanup;
    setTimeout(cleanup, 1000);
  };

  const handlePrintRankList = () => {
    if (!activeInterval) return;

    const courseName = courses.find(c => c.id === activeInterval.course_id)?.name || '';
    const printDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const currentLeaderboardName = selectedLeaderboardInterval === 'cumulative'
      ? 'All Terms (Cumulative)'
      : (intervalsList.find(i => i.id === selectedLeaderboardInterval)?.name || activeInterval.name);

    const rows = classroomLeaderboard.map((entry) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; text-align: center;">${entry.rank}</td>
        <td style="padding: 10px; font-weight: 600;">${entry.name}</td>
        <td style="padding: 10px; text-align: center;">Level ${entry.level}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; color: #c99c33;">${entry.total_score} XP</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Class Standing Leaderboard - ${activeInterval.name}</title>
          <style>
            body {
              font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background: white;
            }
            .header {
              border-bottom: 3px solid #c99c33;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .title-section h1 {
              margin: 0 0 5px 0;
              font-size: 22px;
              font-weight: 800;
            }
            .title-section p {
              margin: 0;
              color: #64748b;
              font-size: 13px;
            }
            .academy-info h2 {
              margin: 0;
              font-size: 16px;
              font-weight: 800;
              color: #c99c33;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 14px;
            }
            th {
              background: #f8fafc;
              border-bottom: 2px solid #cbd5e1;
              padding: 12px 10px;
              font-weight: 700;
            }
            td {
              padding: 12px 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
              <h1>Class Standing Leaderboard</h1>
              <p>${courseName} • Batch ${activeInterval.batch_number} • ${currentLeaderboardName}</p>
              <p style="margin-top: 5px;">Report Generated: ${printDate}</p>
            </div>
            <div class="academy-info">
              <h2>ACADEMY OF EXCELLENCE</h2>
              <p style="margin: 0; font-size: 10px; color: #64748b; text-align: right;">Elegance in Arabic Education</p>
            </div>
          </div>

          <table>
            <thead>
              <tr style="background: #f8fafc;">
                <th style="width: 15%; text-align: center;">Rank</th>
                <th style="width: 45%; text-align: left;">Student Name</th>
                <th style="width: 20%; text-align: center;">Scholar Level</th>
                <th style="width: 20%; text-align: right;">Total Score</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
    `;

    printHtml(htmlContent);
  };

  const handlePrintMatrix = (studentsListToPrint: StudentProfile[]) => {
    if (!activeInterval) return;

    const courseName = courses.find(c => c.id === activeInterval.course_id)?.name || '';
    const printDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const batchStartDate = activeInterval.start_date || activeInterval.created_at || new Date().toISOString();
    const matrixDates = getDatesRange(batchStartDate);

    const activityNameMap = { 
      attendance: '📅 Attendance Status', 
      daily_vocab: '📚 WhatsApp Vocab (+5 XP)', 
      daily_sentences: '✍️ Daily Sentences (+5 XP)', 
      weekly_vlog: '📹 Weekly Vlog (+15 XP)', 
      video_reaction: '💬 Video Reaction (+15 XP)', 
      hadithul_arabia: '🕌 Hadithul Arabia Attendance (+10 XP)'
    } as any;

    const currentActivityName = activityNameMap[matrixActivity] || 'Matrix View';

    const ths = matrixDates.map(dateStr => `
      <th style="padding: 6px 4px; font-weight: 700; text-align: center; border: 1px solid #cbd5e1; font-size: 10px; white-space: nowrap;">
        ${new Date(dateStr).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
      </th>
    `).join('');

    const rows = studentsListToPrint.map(student => {
      const tds = matrixDates.map(dateStr => {
        if (matrixActivity === 'attendance') {
          const attObj = batchScores.find(s => s.student_id === student.id && s.logged_date === dateStr && s.score_type === 'attendance');
          const val = attObj ? attObj.activity_name.replace('Attendance: ', '') : '';
          
          let displayVal = '-';
          let color = '#64748b';
          if (val === 'On Time') { displayVal = 'OT'; color = '#16a34a'; }
          else if (val === 'Late') { displayVal = 'L'; color = '#b45309'; }
          else if (val === 'Half Day') { displayVal = 'HD'; color = '#3b82f6'; }
          else if (val === 'Absent') { displayVal = 'A'; color = '#dc2626'; }

          return `<td style="padding: 6px 4px; text-align: center; border: 1px solid #e2e8f0; font-size: 9px; font-weight: bold; color: ${color};">${displayVal}</td>`;
        } else {
          const existing = batchScores.find(s => s.student_id === student.id && s.logged_date === dateStr && s.score_type === matrixActivity);
          const displayVal = existing ? '✓' : '-';
          const color = existing ? '#16a34a' : '#94a3b8';
          return `<td style="padding: 6px 4px; text-align: center; border: 1px solid #e2e8f0; font-size: 10px; font-weight: bold; color: ${color};">${displayVal}</td>`;
        }
      }).join('');

      return `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 6px 8px; font-weight: 600; border: 1px solid #cbd5e1; white-space: nowrap; font-size: 11px;">
            ${student.roll_number ? `#${student.roll_number} ` : ''}${student.name}
          </td>
          ${tds}
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch Sheet Matrix - ${activeInterval.name}</title>
          <style>
            @page {
              size: landscape;
              margin: 15mm;
            }
            body {
              font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background: white;
            }
            .header {
              border-bottom: 3px solid #c99c33;
              padding-bottom: 15px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .title-section h1 {
              margin: 0 0 5px 0;
              font-size: 20px;
              font-weight: 800;
            }
            .title-section p {
              margin: 0;
              color: #64748b;
              font-size: 12px;
            }
            .academy-info h2 {
              margin: 0;
              font-size: 15px;
              font-weight: 800;
              color: #c99c33;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
            }
            .legend {
              display: flex;
              gap: 15px;
              font-size: 11px;
              margin-top: 15px;
              color: #64748b;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
              <h1>Batch Sheet (Matrix Grid)</h1>
              <p>${courseName} • Batch ${activeInterval.batch_number} • ${activeInterval.name}</p>
              <p style="margin-top: 3px; font-weight: 600; color: #0f172a;">Metric: ${currentActivityName}</p>
              <p style="margin-top: 3px;">Report Generated: ${printDate}</p>
            </div>
            <div class="academy-info">
              <h2>ACADEMY OF EXCELLENCE</h2>
              <p style="margin: 0; font-size: 9px; color: #64748b; text-align: right;">Elegance in Arabic Education</p>
            </div>
          </div>

          <table>
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 6px 8px; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700;">Student Name</th>
                ${ths}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          ${matrixActivity === 'attendance' ? `
            <div class="legend">
              <strong>Legend:</strong>
              <div class="legend-item"><span style="color: #16a34a; font-weight: bold;">OT:</span> On Time</div>
              <div class="legend-item"><span style="color: #b45309; font-weight: bold;">L:</span> Late</div>
              <div class="legend-item"><span style="color: #3b82f6; font-weight: bold;">HD:</span> Half Day</div>
              <div class="legend-item"><span style="color: #dc2626; font-weight: bold;">A:</span> Absent</div>
            </div>
          ` : `
            <div class="legend">
              <strong>Legend:</strong>
              <div class="legend-item"><span style="color: #16a34a; font-weight: bold;">✓:</span> Task Completed / Logged</div>
              <div class="legend-item"><span style="color: #94a3b8; font-weight: bold;">-:</span> Task Pending</div>
            </div>
          `}

    `;

    printHtml(htmlContent);
  };

  const handlePrintReport = (student: StudentProfile, rawScores: any[]) => {
    
    // Format the date
    const printDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Filter scores based on the active report selection
    const scores = reportSelectedInterval === 'cumulative'
      ? rawScores
      : rawScores.filter(s => s.interval_id === reportSelectedInterval);

    const periodName = reportSelectedInterval === 'cumulative'
      ? 'All Terms (Cumulative)'
      : (intervalsList.find(i => i.id === reportSelectedInterval)?.name || 'Academic Term');

    // Calculate metrics based on the active report selection (single or sum of all terms)
    const studentIntervals = intervalsList.filter(i => i.course_id === student.course_id && i.batch_number === student.batch_number);
    const studentInterval = reportSelectedInterval === 'cumulative'
      ? null
      : (intervalsList.find(i => i.id === reportSelectedInterval) || studentIntervals.find(i => i.is_active) || studentIntervals[0]);

    const totalWorkingDays = reportSelectedInterval === 'cumulative'
      ? studentIntervals.reduce((sum, i) => sum + (i.total_working_days ?? 20), 0)
      : (studentInterval?.total_working_days ?? 20);

    const totalVocab = reportSelectedInterval === 'cumulative'
      ? studentIntervals.reduce((sum, i) => sum + (i.total_vocab_tasks ?? 20), 0)
      : (studentInterval?.total_vocab_tasks ?? 20);

    const totalSentences = reportSelectedInterval === 'cumulative'
      ? studentIntervals.reduce((sum, i) => sum + (i.total_sentences_tasks ?? 20), 0)
      : (studentInterval?.total_sentences_tasks ?? 20);

    const totalVlog = reportSelectedInterval === 'cumulative'
      ? studentIntervals.reduce((sum, i) => sum + (i.total_vlog_tasks ?? 4), 0)
      : (studentInterval?.total_vlog_tasks ?? 4);

    const totalReaction = reportSelectedInterval === 'cumulative'
      ? studentIntervals.reduce((sum, i) => sum + (i.total_reaction_tasks ?? 4), 0)
      : (studentInterval?.total_reaction_tasks ?? 4);

    const totalHadithul = reportSelectedInterval === 'cumulative'
      ? studentIntervals.reduce((sum, i) => sum + (i.total_hadithul_tasks ?? 4), 0)
      : (studentInterval?.total_hadithul_tasks ?? 4);

    const attendanceRecords = scores.filter(s => s.score_type === 'attendance');
    const totalAttendance = attendanceRecords.length;
    const onTimeCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('on time')).length;
    const lateCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('late')).length;
    const halfDayCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('half day')).length;
    const absentCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('absent')).length;
    
    const presentDays = onTimeCount + lateCount + (halfDayCount * 0.5);
    const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;

    const vocabCount = scores.filter(s => s.score_type === 'daily_vocab').length;
    const sentencesCount = scores.filter(s => s.score_type === 'daily_sentences').length;
    const vlogCount = scores.filter(s => s.score_type === 'weekly_vlog').length;
    const videoReactionCount = scores.filter(s => s.score_type === 'video_reaction').length;
    const hadithulArabiaCount = scores.filter(s => s.score_type === 'hadithul_arabia').length;

    const talkScores = scores.filter(s => s.score_type === 'custom' && s.activity_name === 'One Minute Talk');
    const talkAvg = talkScores.length > 0 ? (talkScores.reduce((sum, s) => sum + s.points, 0) / talkScores.length).toFixed(1) : 'N/A';

    const examScoresList = scores.filter(s => s.score_type === 'exam');
    const examAvg = examScoresList.length > 0 
      ? Math.round(examScoresList.reduce((sum, s) => sum + (s.points / s.max_points) * 100, 0) / examScoresList.length) 
      : null;

    const penaltyRecords = scores.filter(s => s.score_type === 'penalty');
    const totalPenaltiesCount = penaltyRecords.reduce((sum, r) => sum + Math.round(Math.abs(r.points) / 2), 0);

    // Format Attendance Rows
    const attendanceRows = attendanceRecords.length === 0 
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #888; font-style: italic;">No attendance logged.</td></tr>`
      : attendanceRecords.map(rec => {
          const status = rec.activity_name.replace('Attendance: ', '');
          let statusColor = '#666';
          if (status === 'On Time') statusColor = '#16a34a';
          else if (status === 'Late') statusColor = '#b45309';
          else if (status === 'Half Day') statusColor = '#3b82f6';
          else if (status === 'Absent') statusColor = '#dc2626';
          
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 10px;">${new Date(rec.logged_date).toLocaleDateString()}</td>
              <td style="padding: 8px 10px; font-weight: bold; color: ${statusColor};">${status}</td>
              <td style="padding: 8px 10px; text-align: right;">${rec.points > 0 ? '+' : ''}${rec.points} XP</td>
            </tr>
          `;
        }).join('');

    // Format Work Rows
    const workTypes = ['daily_vocab', 'daily_sentences', 'weekly_vlog', 'video_reaction', 'hadithul_arabia'];
    const workRecords = scores.filter(s => workTypes.includes(s.score_type));
    const workGroupByDate = workRecords.reduce((acc, score) => {
      const d = score.logged_date;
      if (!acc[d]) {
        acc[d] = { daily_vocab: false, daily_sentences: false, weekly_vlog: false, video_reaction: false, hadithul_arabia: false };
      }
      acc[d][score.score_type] = true;
      return acc;
    }, {} as any);
    const workDatesSorted = Object.keys(workGroupByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const workRows = workDatesSorted.length === 0
      ? `<tr><td colspan="6" style="padding: 10px; text-align: center; color: #888; font-style: italic;">No work logged.</td></tr>`
      : workDatesSorted.map(dateStr => {
          const entry = workGroupByDate[dateStr];
          const check = (done: boolean) => done ? `<span style="color: #16a34a; font-weight: bold;">✓</span>` : `<span style="color: #ccc;">-</span>`;
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 10px;">${new Date(dateStr).toLocaleDateString()}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.daily_vocab)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.daily_sentences)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.weekly_vlog)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.video_reaction)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.hadithul_arabia)}</td>
            </tr>
          `;
        }).join('');

    // Format Grades/Penalties Rows
    const gradeTypes = ['exam', 'penalty', 'custom'];
    const gradeRecords = scores.filter(s => gradeTypes.includes(s.score_type));
    const gradeRows = gradeRecords.length === 0
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #888; font-style: italic;">No grades or penalties logged.</td></tr>`
      : gradeRecords.map(rec => {
          let title = rec.activity_name;
          let score = `${rec.points > 0 ? '+' : ''}${rec.points} XP`;
          let color = rec.points >= 0 ? '#333' : '#dc2626';

          if (rec.score_type === 'exam') {
            const pct = Math.round((rec.points / rec.max_points) * 100);
            title = `📝 Exam: ${rec.activity_name.replace(/^exam:\s*/i, '')}`;
            score = `${rec.points}/${rec.max_points} (${pct}%)`;
            color = 'var(--primary-dark)';
          } else if (rec.score_type === 'penalty') {
            const count = Math.round(Math.abs(rec.points) / 2);
            title = `⚠️ Malayalam Speaking violation`;
            score = `-${Math.abs(rec.points)} XP (${count} ${count === 1 ? 'penalty' : 'penalties'})`;
            color = '#dc2626';
          } else if (rec.score_type === 'custom' && rec.activity_name === 'One Minute Talk') {
            title = `🎙️ One Minute Talk`;
            score = `${rec.points} / 10`;
          }

          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 10px;">${new Date(rec.logged_date).toLocaleDateString()}</td>
              <td style="padding: 8px 10px; font-weight: 600;">${title}</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: ${color};">${score}</td>
            </tr>
          `;
        }).join('');

    // Remarks content formatting
    const rStrengths = remarksStrengths || 'No strengths recorded yet.';
    const rWeaknesses = remarksWeaknesses || 'No improvement areas recorded yet.';
    const rCareerPath = remarksCareerPath || 'No career path recommendations recorded yet.';
    const rGeneral = remarksGeneral || 'No general remarks recorded yet.';
    const rMockInterviewMark = remarksMockInterviewMark !== '' ? `${remarksMockInterviewMark}` : 'N/A';
    const rMockInterviewRemark = remarksMockInterviewRemark || 'No feedback recorded yet.';
    const rIndustrialVisitMark = remarksIndustrialVisitMark !== '' ? `${remarksIndustrialVisitMark}` : 'N/A';
    const rIndustrialVisitRemark = remarksIndustrialVisitRemark || 'No feedback recorded yet.';

    // Construct print template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Academic Performance Report - ${student.name}</title>
          <style>
            body {
              font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #c99c33;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title-section h1 {
              margin: 0 0 5px 0;
              font-size: 24px;
              font-weight: 800;
              color: #1e293b;
            }
            .title-section p {
              margin: 0;
              color: #64748b;
              font-size: 14px;
            }
            .academy-info {
              text-align: right;
            }
            .academy-info h2 {
              margin: 0 0 5px 0;
              font-size: 18px;
              font-weight: 800;
              color: #c99c33;
            }
            .academy-info p {
              margin: 0;
              font-size: 12px;
              color: #64748b;
            }
            .student-profile {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px 20px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .profile-item {
              display: flex;
              flex-direction: column;
            }
            .profile-item span.label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 700;
              margin-bottom: 3px;
            }
            .profile-item span.value {
              font-size: 14px;
              font-weight: bold;
              color: #0f172a;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .metric-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              text-align: center;
              background: #ffffff;
            }
            .metric-card span.label {
              display: block;
              font-size: 11px;
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .metric-card span.value {
              display: block;
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
            }
            .section-title {
              font-size: 16px;
              font-weight: 800;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 8px;
              margin: 30px 0 15px 0;
              color: #0f172a;
              page-break-after: avoid;
            }
            .remarks-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .remarks-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              background: #fafafa;
            }
            .remarks-card h4 {
              margin: 0 0 8px 0;
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .remarks-card p {
              margin: 0;
              font-size: 13px;
              line-height: 1.5;
              white-space: pre-wrap;
              color: #334155;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            th {
              background: #f8fafc;
              border-bottom: 2px solid #cbd5e1;
              padding: 8px 10px;
              font-weight: 700;
              text-align: left;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #f1f5f9;
            }
            .checklist-table th {
              text-align: center;
            }
            .checklist-table td {
              text-align: center;
            }
            .page-break {
              page-break-before: always;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
              <h1>ACADEMIC PERFORMANCE REPORT</h1>
              <p>Report Generated on: ${printDate}</p>
            </div>
            <div class="academy-info">
              <h2>ACADEMY OF EXCELLENCE</h2>
              <p>Elegance in Arabic Education</p>
            </div>
          </div>

          <div class="student-profile">
            <div class="profile-item">
              <span class="label">Student Name</span>
              <span class="value">${student.name}</span>
            </div>
            <div class="profile-item">
              <span class="label">Roll Number</span>
              <span class="value">${student.roll_number || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="label">Email Address</span>
              <span class="value">${student.email}</span>
            </div>
            <div class="profile-item">
              <span class="label">Course</span>
              <span class="value">${student.courses?.name || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="label">Batch & Period</span>
              <span class="value">Batch ${student.batch_number} (${periodName})</span>
            </div>
            <div class="profile-item">
              <span class="label">Status</span>
              <span class="value" style="text-transform: capitalize;">${student.status}</span>
            </div>
          </div>

          <div class="section-title">Key Academic Statistics</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="label">Attendance Rate</span>
              <span class="value">${attendanceRate}%</span>
              <span class="label" style="font-size: 9px; margin-top: 5px; font-weight: normal; text-transform: none;">
                On Time: ${onTimeCount} | Late: ${lateCount} | Half Day: ${halfDayCount} | Absent: ${absentCount} (Present: ${presentDays} / ${totalWorkingDays} Days)
              </span>
            </div>
            <div class="metric-card" style="${totalPenaltiesCount > 0 ? 'border-color: #fca5a5; background: #fffafb;' : ''}">
              <span class="label" style="${totalPenaltiesCount > 0 ? 'color: #b91c1c;' : ''}">Malayalam Penalties</span>
              <span class="value" style="${totalPenaltiesCount > 0 ? 'color: #dc2626;' : ''}">${totalPenaltiesCount}</span>
            </div>
            <div class="metric-card">
              <span class="label">Exam Average</span>
              <span class="value">${examAvg !== null ? `${examAvg}%` : 'N/A'}</span>
            </div>
            <div class="metric-card">
              <span class="label">One Minute Talk</span>
              <span class="value">${talkAvg}${talkAvg !== 'N/A' ? '/10' : ''}</span>
            </div>
          </div>

          <div class="section-title">Checklist Tasks Completed Summary</div>
          <table class="checklist-table">
            <thead>
              <tr>
                <th>Vocabulary Tasks</th>
                <th>Sentences Tasks</th>
                <th>Weekly Vlogs</th>
                <th>Video Reactions</th>
                <th>Hadithul Arabia Attendance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-size: 16px; font-weight: bold;">${vocabCount} / ${totalVocab}</td>
                <td style="font-size: 16px; font-weight: bold;">${sentencesCount} / ${totalSentences}</td>
                <td style="font-size: 16px; font-weight: bold;">${vlogCount} / ${totalVlog}</td>
                <td style="font-size: 16px; font-weight: bold;">${videoReactionCount} / ${totalReaction}</td>
                <td style="font-size: 16px; font-weight: bold;">${hadithulArabiaCount} / ${totalHadithul}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">Instructor Remarks & Counseling</div>
          <div class="remarks-grid">
            <div class="remarks-card" style="border-left: 4px solid #10b981;">
              <h4 style="color: #047857;">💪 Strengths</h4>
              <p>${rStrengths}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #ef4444;">
              <h4 style="color: #b91c1c;">⚠️ Areas for Improvement</h4>
              <p>${rWeaknesses}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #3b82f6;">
              <h4 style="color: #1d4ed8;">🎯 Apt Career Path</h4>
              <p>${rCareerPath}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #c99c33;">
              <h4 style="color: #c99c33;">📝 General Remarks</h4>
              <p>${rGeneral}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #c99c33;">
              <h4 style="color: #c99c33;">👔 Mock Interview (Score: ${rMockInterviewMark})</h4>
              <p>${rMockInterviewRemark}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #c99c33;">
              <h4 style="color: #c99c33;">🚌 Industrial Visit (Score: ${rIndustrialVisitMark})</h4>
              <p>${rIndustrialVisitRemark}</p>
            </div>
          </div>

          <div class="page-break"></div>

          <div class="section-title">Attendance History Logs</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Date</th>
                <th style="width: 40%;">Status</th>
                <th style="width: 20%; text-align: right;">Points Credit</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRows}
            </tbody>
          </table>

          <div class="section-title">Grades & Penalty Audits</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30%;">Date</th>
                <th style="width: 50%;">Activity Description / Speaking Violation</th>
                <th style="width: 20%; text-align: right;">Result</th>
              </tr>
            </thead>
            <tbody>
              ${gradeRows}
            </tbody>
          </table>

          <div class="section-title">Daily Task Submission Timeline</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vocab</th>
                <th>Sentences</th>
                <th>Vlog</th>
                <th>Reaction</th>
                <th>Hadithul A.</th>
              </tr>
            </thead>
            <tbody>
              ${workRows}
            </tbody>
          </table>

          <div class="footer">
            <span>Academy of Excellence • Academic Performance Report</span>
            <span>Page 2 of 2</span>
          </div>
        </body>
      </html>
    `;

    printHtml(htmlContent);
  };

  // Approve Pending Student
  const handleApproveStudent = async (studentId: string, isApprove: boolean) => {
    try {
      const targetStudent = studentList.find(s => s.id === studentId);
      if (isApprove) {
        const isAlumni = targetStudent?.is_alumni_signup || false;
        const newStatus = isAlumni ? 'alumni' : 'active';
        
        const { error } = await supabase
          .from('student_profiles')
          .update({ status: newStatus })
          .eq('id', studentId);
        if (error) throw error;

        if (isAlumni) {
          // Check if placement profile already exists (e.g. created by trigger during signup)
          const { data: existingProfile } = await supabase
            .from('alumni_profiles')
            .select('student_id')
            .eq('student_id', studentId)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from('alumni_profiles').insert([{ student_id: studentId }]);
          }
          await logActivity('alumni_approved', `Approved alumni signup: ${targetStudent?.name}`);
          setMessage('✅ Alumni approved successfully.');
        } else {
          await logActivity('student_approved', `Approved student signup: ${targetStudent?.name}`);
          setMessage('✅ Student approved successfully.');
        }
      } else {
        // Delete student auth user
        const { error: dbError } = await supabase.from('student_profiles').delete().eq('id', studentId);
        if (dbError) throw dbError;

        await logActivity('student_rejected', `Rejected student registration: ${targetStudent?.name}`);
        setMessage('❌ Registration rejected and profile removed.');
      }
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Profile approval update failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleExportAlumniCSV = () => {
    if (alumniProfiles.length === 0) return;

    // Filter students exactly matching the active search and dropdown states
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

    const headers = [
      'Name', 'Email', 'Course', 'Batch', 'Roll Number', 'Mobile Number', 'WhatsApp Number', 
      'Total Experience Years', 'Prior Experience Details',
      'Hometown', 'House Name', 'Street', 'Locality', 'District', 'State', 'Pincode',
      'Employment Status', 'Preferred Location', 'Preferred Roles', 'Current Job Title', 
      'Current Company', 'Current Work Location', 'Skills Learned', 'LinkedIn URL',
      'Marital Status', 'Spouse Name', 'Spouse Profession', 'Spouse Company', 'Spouse Work Location'
    ];

    const rows = filtered.map(alumnus => [
      alumnus.name,
      alumnus.email,
      alumnus.courses?.name || 'N/A',
      alumnus.batch_number,
      alumnus.roll_number || 'N/A',
      alumnus.mobile_number || '',
      alumnus.whatsapp_number || '',
      alumnus.total_experience_years || 'None',
      alumnus.experience_details || '',
      alumnus.hometown || '',
      alumnus.house_name || '',
      alumnus.street || '',
      alumnus.locality || '',
      alumnus.district || '',
      alumnus.state || '',
      alumnus.pincode || '',
      alumnus.career?.employment_status || 'unemployed_looking',
      alumnus.career?.preferred_location || 'anywhere',
      alumnus.career?.preferred_roles || '',
      alumnus.career?.current_job_title || '',
      alumnus.career?.current_company || '',
      alumnus.career?.current_work_location || '',
      alumnus.career?.skills_learned || '',
      alumnus.career?.linkedin_url || '',
      alumnus.career?.marital_status || 'single',
      alumnus.career?.spouse_name || '',
      alumnus.career?.spouse_profession || '',
      alumnus.career?.spouse_company || '',
      alumnus.career?.spouse_work_location || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `academy_alumni_placements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [graduatingBatch, setGraduatingBatch] = useState(false);

  const handleGraduateBatch = async (courseId?: string, batchNumber?: number) => {
    const targetCourse = courseId || filterCourse;
    const targetBatch = batchNumber || (filterBatch ? parseInt(filterBatch) : 0);
    if (!targetCourse || !targetBatch) return;
    const courseName = courses.find(c => c.id === targetCourse)?.name || 'Course';
    
    const confirmMsg = `Are you sure you want to graduate all active students in Batch ${targetBatch} of ${courseName} to Alumni? This action cannot be easily undone.`;
    if (!window.confirm(confirmMsg)) return;

    setGraduatingBatch(true);
    try {
      const { data: activeStudents, error: fetchErr } = await supabase
        .from('student_profiles')
        .select('id, name')
        .eq('course_id', targetCourse)
        .eq('batch_number', targetBatch)
        .eq('status', 'active');

      if (fetchErr) throw fetchErr;
      if (!activeStudents || activeStudents.length === 0) {
        setMessage('⚠️ No active students found in this batch to graduate.');
        setGraduatingBatch(false);
        return;
      }

      const studentIds = activeStudents.map(s => s.id);

      const { error: updateErr } = await supabase
        .from('student_profiles')
        .update({ status: 'alumni' })
        .in('id', studentIds);

      if (updateErr) throw updateErr;

      const alumniInsertRows = studentIds.map(id => ({ student_id: id }));
      const { error: alumniErr } = await supabase
        .from('alumni_profiles')
        .upsert(alumniInsertRows, { onConflict: 'student_id' });

      if (alumniErr) throw alumniErr;

      await logActivity('batch_graduation', `Graduated ${activeStudents.length} students of Course ID ${targetCourse} (Batch ${targetBatch}) to Alumni.`);

      await supabase
        .from('scoring_intervals')
        .update({ is_active: false })
        .eq('course_id', targetCourse)
        .eq('batch_number', targetBatch);

      setMessage(`🎉 Successfully graduated ${activeStudents.length} students to Alumni status and archived batch scoring intervals.`);
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Batch graduation failed: ${err.message}`);
    } finally {
      setGraduatingBatch(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Update student profile details (Leadership only)
  const handleUpdateStudent = async (studentId: string, name: string, courseId: string, batchNumber: number, rollNumber: string, status: string) => {
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({
          name,
          course_id: courseId,
          batch_number: batchNumber,
          roll_number: rollNumber,
          status
        })
        .eq('id', studentId);
      if (error) throw error;
      
      await logActivity('student_profile_update', `Updated student profile details: name=${name}, roll=${rollNumber}, status=${status}`);
      setMessage('✅ Student profile updated successfully.');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Student profile update failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Reset password of student/staff via RPC (Leadership only)
  const handleResetPassword = async (userId: string, newPw: string) => {
    if (!newPw) {
      setMessage('❌ Please enter a new password.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    try {
      const { error } = await supabase.rpc('reset_auth_user_password', {
        user_id: userId,
        new_password: newPw
      });
      if (error) throw error;
      setMessage('✅ Password reset successfully.');
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to reset password: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  // Delete student/staff auth account (cascades to public profile)
  const handleDeleteAccount = async (userId: string, name: string) => {
    const confirmDelete = window.confirm(`⚠️ Are you sure you want to PERMANENTLY delete the account for ${name}?\n\nThis will delete all their profiles and cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.rpc('delete_auth_user', {
        user_id: userId
      });
      if (error) throw error;
      
      setMessage(`✅ Account for ${name} deleted successfully.`);
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to delete account: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };


  // --- CONFIGURATION SETTINGS OPERATIONS (COURSES & INTERVALS) ---

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName) return;

    try {
      const { error } = await supabase.from('courses').insert([{ name: newCourseName }]);
      if (error) throw error;

      await logActivity('course_added', `Created new institute course: "${newCourseName}"`);
      setMessage('✅ New course created successfully!');
      setNewCourseName('');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to add course: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddInterval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntervalName || !newIntervalCourse || !newIntervalBatch) return;

    try {
      const batchNum = parseInt(newIntervalBatch);

      // Set all other intervals for this course/batch to inactive first
      const { error: resetError } = await supabase
        .from('scoring_intervals')
        .update({ is_active: false })
        .eq('course_id', newIntervalCourse)
        .eq('batch_number', batchNum);

      if (resetError) throw resetError;

      // Create new active interval
      const { error: createError } = await supabase
        .from('scoring_intervals')
        .insert([
          {
            name: newIntervalName,
            course_id: newIntervalCourse,
            batch_number: batchNum,
            is_active: true
          }
        ]);
      
      if (createError) throw createError;

      const courseName = courses.find(c => c.id === newIntervalCourse)?.name || 'Course';
      await logActivity('interval_created', `Archived previous interval and reset scores. Started new scoring term: "${newIntervalName}" for ${courseName} Batch ${batchNum}`);
      
      setMessage('✅ Scoreboard archived. New active interval set successfully!');
      setNewIntervalName('');
      setNewIntervalBatch('');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to archive interval: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleToggleIntervalActiveStatus = async (intervalId: string, courseId: string, batchNum: number) => {
    try {
      // 1. Deactivate all intervals in batch
      await supabase.from('scoring_intervals').update({ is_active: false }).eq('course_id', courseId).eq('batch_number', batchNum);
      // 2. Set this one to active
      await supabase.from('scoring_intervals').update({ is_active: true }).eq('id', intervalId);

      setMessage('✅ Active interval switched successfully.');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to switch active interval: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSetIntervalInactive = async (intervalId: string) => {
    try {
      const { error } = await supabase.from('scoring_intervals').update({ is_active: false }).eq('id', intervalId);
      if (error) throw error;
      setMessage('✅ Interval deactivated successfully.');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to deactivate interval: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

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


  // --- STAFF ACTIONS (Carried over) ---

  const toggleDailyTask = async (taskId: string, isChecked: boolean) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (isChecked) {
        const { error } = await supabase
          .from('daily_task_logs')
          .insert([{ task_id: taskId, completed_by: currentUser.id, completed_date: todayStr }]);
        if (error) throw error;

        const task = taskList.find(t => t.id === taskId);
        await logActivity('task_completed', `Checked off daily task: "${task?.title}"`);
      } else {
        const { error } = await supabase
          .from('daily_task_logs')
          .delete()
          .eq('task_id', taskId)
          .eq('completed_date', todayStr)
          .eq('completed_by', currentUser.id);
        if (error) throw error;

        const task = taskList.find(t => t.id === taskId);
        await logActivity('task_uncompleted', `Unchecked daily task: "${task?.title}"`);
      }
      fetchStaffWorkspaceData(currentUser.id);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Action failed: ${err.message}`);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const updateOneOffTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      if (error) throw error;

      const task = taskList.find(t => t.id === taskId);
      await logActivity('task_status_updated', `Updated status of task "${task?.title}" to "${newStatus}"`);
      
      setMessage('✅ Task status updated successfully!');
      fetchStaffWorkspaceData(currentUser.id);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to update: ${err.message}`);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus: Record<string, 'pending' | 'in_progress' | 'completed'> = {
      'pending': 'in_progress',
      'in_progress': 'completed',
      'completed': 'pending'
    };
    const next = nextStatus[currentStatus] || 'pending';
    await updateOneOffTaskStatus(taskId, next);
  };

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

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const taskObj = taskList.find(t => t.id === taskId);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;

      await logActivity('task_deleted', `Deleted task "${taskObj?.title}"`);
      setMessage('✅ Task deleted successfully.');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed to delete task: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleUpdateStaff = async (staffId: string, role: string, designation: string, status: string) => {
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ role, designation, status })
        .eq('id', staffId);
      if (error) throw error;

      const targetStaff = staffList.find(s => s.id === staffId);
      await logActivity('staff_profile_updated', `Updated staff profile ${targetStaff?.name} (Role: ${role}, Title: ${designation})`);

      setMessage('✅ Staff profile updated successfully!');
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Profile update failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
  };


  if (authLoading || !currentUser) {
    return <div style={{ paddingTop: '150px', textAlign: 'center' }}>Verifying Staff Access credentials...</div>;
  }

  const isLeadership = currentUser.role !== 'staff';

  const pendingJobsCount = jobPosts.filter(j => j.status === 'pending').length;
  const totalApplicationsCount = jobPosts.reduce((acc, job) => acc + (job.job_applications?.length || 0), 0);
  const careersNotificationCount = pendingJobsCount + totalApplicationsCount;

  return (
    <div className="bg-grid-pattern admin-dashboard-layout">
      <div className="container" style={{ maxWidth: '1150px' }}>
        
        {/* Welcome Section */}
        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.15)', boxShadow: 'var(--glass-shadow)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge" style={{ background: 'rgba(201, 156, 51, 0.15)', color: 'var(--primary-dark)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Operations Center • {currentUser.role.toUpperCase()}
            </span>
            <h1 className="heading-lg" style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1.8rem' }}>Welcome, {currentUser.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Title: <strong>{currentUser.designation || 'Staff Member'}</strong> • System ID: <code style={{ fontSize: '0.8rem' }}>{currentUser.id.substring(0,8)}</code>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            {showInstallBtn && (
              <button
                onClick={handleInstallApp}
                className="btn btn-primary"
                style={{ 
                  padding: '0.6rem 1.2rem', 
                  fontSize: '0.9rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem',
                  cursor: 'pointer',
                  borderRadius: '50px',
                  boxShadow: '0 4px 10px rgba(201, 156, 51, 0.2)'
                }}
              >
                📥 Install App
              </button>
            )}
            <button
              onClick={handleToggleNotifications}
              disabled={notificationLoading}
              className="btn btn-outline"
              style={{
                padding: '0.6rem 1.2rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                background: pushSubscribed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(201, 156, 51, 0.1)',
                color: pushSubscribed ? '#dc2626' : 'var(--primary-dark)',
                border: pushSubscribed ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(201, 156, 51, 0.3)',
                borderRadius: '50px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {pushSubscribed ? <BellOff size={16} /> : <Bell size={16} />}
              {notificationLoading ? 'Processing...' : pushSubscribed ? 'Disable Alerts' : 'Enable Alerts'}
            </button>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Global Toast Message */}
        {message && (
          <div style={{ padding: '1rem', background: 'rgba(201, 156, 51, 0.1)', border: '1px solid rgba(201, 156, 51, 0.2)', color: 'var(--text-main)', borderRadius: '10px', marginBottom: '2rem', fontWeight: 600, fontSize: '0.95rem' }}>
            {message}
          </div>
        )}

        {/* Navigation Tabs (Staff & Leadership Dashboard) */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,156,51,0.2)', marginBottom: '2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isLeadership && (
            <button 
              onClick={() => setAdminTab('tasks')}
              style={{
                padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                borderBottom: adminTab === 'tasks' ? '3px solid var(--primary)' : '3px solid transparent',
                color: adminTab === 'tasks' ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <ListChecks size={16} /> My Tasks
            </button>
          )}

          {isLeadership && (
            <button 
              onClick={() => setAdminTab('dashboard')}
              style={{
                padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                borderBottom: adminTab === 'dashboard' ? '3px solid var(--primary)' : '3px solid transparent',
                color: adminTab === 'dashboard' ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <Activity size={16} /> Analytics
            </button>
          )}

          <button 
            onClick={() => setAdminTab('classroom')}
            style={{
              padding: '0.8rem 1.2rem', background: 'none', border: 'none',
              borderBottom: adminTab === 'classroom' ? '3px solid var(--primary)' : '3px solid transparent',
              color: adminTab === 'classroom' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              position: 'relative'
            }}
          >
            <GraduationCap size={16} /> Classroom Hub
            {pendingAppealsCount > 0 && (
              <span style={{
                position: 'absolute', top: '0.2rem', right: '0.2rem',
                background: '#dc2626', color: 'white', fontSize: '0.65rem',
                fontWeight: 800, padding: '0.15rem 0.35rem', borderRadius: '50px',
                lineHeight: 1
              }}>
                {pendingAppealsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setAdminTab('management')}
            style={{
              padding: '0.8rem 1.2rem', background: 'none', border: 'none',
              borderBottom: adminTab === 'management' ? '3px solid var(--primary)' : '3px solid transparent',
              color: adminTab === 'management' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <ClipboardList size={16} /> Management Board
          </button>

          <button 
            onClick={() => setAdminTab('careers')}
            style={{
              padding: '0.8rem 1.2rem', background: 'none', border: 'none',
              borderBottom: adminTab === 'careers' ? '3px solid var(--primary)' : '3px solid transparent',
              color: adminTab === 'careers' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              position: 'relative'
            }}
          >
            <Briefcase size={16} /> Careers & Alumni
            {careersNotificationCount > 0 && (
              <span style={{
                position: 'absolute', top: '0.2rem', right: '0.2rem',
                background: '#dc2626', color: 'white', fontSize: '0.65rem',
                fontWeight: 800, padding: '0.15rem 0.35rem', borderRadius: '50px',
                lineHeight: 1
              }}>
                {careersNotificationCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setAdminTab('alumnilounge')}
            style={{
              padding: '0.8rem 1.2rem', background: 'none', border: 'none',
              borderBottom: adminTab === 'alumnilounge' ? '3px solid var(--primary)' : '3px solid transparent',
              color: adminTab === 'alumnilounge' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <MessageSquare size={16} /> Alumni Lounge
          </button>

          {isLeadership && (
            <>
              <button 
                onClick={() => setAdminTab('directory')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'directory' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'directory' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Users size={16} /> Directory
              </button>

              <button 
                onClick={() => setAdminTab('operations')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'operations' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'operations' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Settings size={16} /> Operations
              </button>
            </>
          )}
        </div>

        {/* TAB CONTENT AREAS */}
        {adminTab === 'tasks' && !isLeadership && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              
              {/* Daily Checklist Column */}
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ListChecks size={18} className="text-primary" /> Daily Task Checklist
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 1.5rem 0' }}>
                  Repeatable maintenance items assigned to you. Reset daily.
                </p>

                {taskList.filter(t => t.task_type === 'daily').length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    <CheckCircle2 size={32} style={{ color: 'var(--primary-light)', marginBottom: '0.6rem' }} />
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>No daily tasks currently assigned to your roster.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {taskList.filter(t => t.task_type === 'daily').map(task => {
                      const isCompletedToday = dailyLogs.some(log => log.task_id === task.id);
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '1rem', background: isCompletedToday ? 'rgba(34,197,94,0.03)' : 'white', border: isCompletedToday ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(0,0,0,0.05)', borderRadius: '10px', gap: '0.8rem', transition: 'all 0.2s' }}>
                          <input 
                            type="checkbox" 
                            checked={isCompletedToday}
                            onChange={(e) => toggleDailyTask(task.id, e.target.checked)}
                            style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer', marginTop: '0.1rem' }}
                          />
                          <div style={{ flexGrow: 1 }}>
                            <h4 style={{ textDecoration: isCompletedToday ? 'line-through' : 'none', color: isCompletedToday ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '0.9rem', fontWeight: 650, margin: 0 }}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem', margin: 0 }}>
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* One-Off Assignments Column */}
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={18} className="text-primary" /> One-Off Assignments
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 1.5rem 0' }}>
                  Specific assignments with due dates set by MD / GM.
                </p>

                {taskList.filter(t => t.task_type === 'one_off').length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    <Calendar size={32} style={{ color: '#94a3b8', marginBottom: '0.6rem' }} />
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>No individual tasks currently assigned.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {taskList.filter(t => t.task_type === 'one_off').map(task => (
                      <div key={task.id} style={{ padding: '1rem', background: 'white', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700 }}>{task.title}</h4>
                          {task.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem', marginBottom: '0.5rem', margin: 0 }}>{task.description}</p>}
                          
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626', fontWeight: 600 }}>
                              <Calendar size={12} /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '120px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status</label>
                          <select 
                            value={task.status} 
                            onChange={(e) => updateOneOffTaskStatus(task.id, e.target.value as any)}
                            style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.25)', outline: 'none', background: 'white', fontWeight: 600, fontSize: '0.75rem' }}
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

            </div>
          </div>
        )}

        {isLeadership && adminTab === 'dashboard' && (
          <AnalyticsHub 
            isLeadership={isLeadership}
            studentList={studentList}
            todayScores={todayScores}
            taskList={taskList}
            dailyLogs={dailyLogs}
            intervalsList={intervalsList}
            staffList={staffList}
            activityLogs={activityLogs}
          />
        )}

        {adminTab === 'classroom' && (
          <ClassroomGrading 
            currentUser={currentUser}
            isLeadership={isLeadership}
            studentList={studentList}
            activeInterval={activeInterval}
            intervalsList={intervalsList}
            scoresList={scoresList}
            batchScores={batchScores}
            loadingBatchScores={loadingBatchScores}
            updatingScores={updatingScores}
            updatingMatrix={updatingMatrix}
            selectedGradingDate={selectedGradingDate}
            setSelectedGradingDate={setSelectedGradingDate}
            filterCourse={filterCourse}
            setFilterCourse={setFilterCourse}
            filterBatch={filterBatch}
            setFilterBatch={setFilterBatch}
            courses={courses}
            classroomLeaderboard={classroomLeaderboard}
            pendingAppealsCount={pendingAppealsCount}
            adminAppeals={adminAppeals}
            loadingAdminAppeals={loadingAdminAppeals}
            appealsFilter={appealsFilter}
            setAppealsFilter={setAppealsFilter}
            processingAppealAction={processingAppealAction}
            handleToggleStudentScore={handleToggleStudentScore}
            handleToggleMatrixCell={handleToggleMatrixCell}
            handleToggleMatrixAttendance={handleToggleMatrixAttendance}
            handleToggleAttendance={handleToggleAttendance}
            handleMalayalamPenalty={handleMalayalamPenalty}
            handleToggleOneMinuteTalk={handleToggleOneMinuteTalk}
            handleGradeExam={handleGradeExam}
            handleGradeCustom={handleGradeCustom}
            handleVerifyScores={handleVerifyScores}
            handleConfirmAppealAction={handleConfirmAppealAction}
            handleApproveAppeal={handleApproveAppeal}
            handleApproveStudent={handleApproveStudent}
            fetchBatchScores={fetchBatchScores}
            handlePrintRankList={handlePrintRankList}
            handleOpenReport={handleOpenReport}
            examName={examName}
            setExamName={setExamName}
            examMaxPoints={examMaxPoints}
            setExamMaxPoints={setExamMaxPoints}
            examScores={examScores}
            setExamScores={setExamScores}
            customActivityName={customActivityName}
            setCustomActivityName={setCustomActivityName}
            customMaxPoints={customMaxPoints}
            setCustomMaxPoints={setCustomMaxPoints}
            customScores={customScores}
            setCustomScores={setCustomScores}
            selectedLeaderboardInterval={selectedLeaderboardInterval}
            handleLeaderboardIntervalChange={handleLeaderboardIntervalChange}
            matrixActivity={matrixActivity}
            setMatrixActivity={setMatrixActivity}
            getIntervalForDate={getIntervalForDate}
          />
        )}

        {isLeadership && adminTab === 'directory' && (
          <DirectoryHub 
            isLeadership={isLeadership}
            currentUser={currentUser}
            studentList={studentList}
            staffList={staffList}
            courses={courses}
            handleUpdateStaff={handleUpdateStaff}
            handleResetPassword={handleResetPassword}
            handleDeleteAccount={handleDeleteAccount}
            handleUpdateStudent={handleUpdateStudent}
            handleOpenReport={handleOpenReport}
            handleGraduateBatch={handleGraduateBatch}
            graduatingBatch={graduatingBatch}
          />
        )}

        {adminTab === 'management' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,156,51,0.2)', marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setManagementSubTab('tracker')}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: managementSubTab === 'tracker' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: managementSubTab === 'tracker' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ClipboardList size={16} /> Task & Follow-up Tracker
              </button>
              <button
                onClick={() => setManagementSubTab('minutes')}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: managementSubTab === 'minutes' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: managementSubTab === 'minutes' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <MessageSquare size={16} /> Meeting Minutes
              </button>
            </div>

            {managementSubTab === 'tracker' ? (
              <PlacementTracker currentUserId={currentUser.id} />
            ) : (
              <MeetingMinutes />
            )}
          </div>
        )}

        {adminTab === 'careers' && (
          <PlacementsHub 
            alumniProfiles={alumniProfiles}
            courses={courses}
            loadingAlumni={loadingAlumni}
            handleExportAlumniCSV={handleExportAlumniCSV}
            jobPosts={jobPosts}
            loadingJobs={loadingJobs}
            handleApproveJob={handleApproveJob}
            handleRejectJob={handleRejectJob}
            handleDeleteJob={handleDeleteJob}
            handleCreateJobAdmin={handleCreateJobAdmin}
          />
        )}

        {adminTab === 'alumnilounge' && (
          <AlumniLounge currentUserId={currentUser?.id || ''} isStaffOrAdmin={true} />
        )}

        {isLeadership && adminTab === 'operations' && (
          <OperationsHub 
            isLeadership={isLeadership}
            currentUser={currentUser}
            taskList={taskList}
            staffList={staffList}
            courses={courses}
            intervalsList={intervalsList}
            activeInterval={activeInterval}
            galleryItems={galleryItems}
            partnersList={partnersList}
            visitorsList={visitorsList}
            newCourseName={newCourseName}
            setNewCourseName={setNewCourseName}
            handleAddCourse={handleAddCourse}
            newIntervalCourse={newIntervalCourse}
            setNewIntervalCourse={setNewIntervalCourse}
            newIntervalBatch={newIntervalBatch}
            setNewIntervalBatch={setNewIntervalBatch}
            newIntervalName={newIntervalName}
            setNewIntervalName={setNewIntervalName}
            handleAddInterval={handleAddInterval}
            handleSetIntervalInactive={handleSetIntervalInactive}
            handleToggleIntervalActiveStatus={handleToggleIntervalActiveStatus}
            selectedConfigIntervalId={selectedConfigIntervalId}
            setSelectedConfigIntervalId={setSelectedConfigIntervalId}
            configStartDate={configStartDate}
            setConfigStartDate={setConfigStartDate}
            configEndDate={configEndDate}
            setConfigEndDate={setConfigEndDate}
            configWorkingDays={configWorkingDays}
            setConfigWorkingDays={setConfigWorkingDays}
            configVocab={configVocab}
            setConfigVocab={setConfigVocab}
            configSentences={configSentences}
            setConfigSentences={setConfigSentences}
            configVlogs={configVlog}
            setConfigVlogs={setConfigVlog}
            configReaction={configReaction}
            setConfigReaction={setConfigReaction}
            configHadith={configHadithul}
            setConfigHadith={setConfigHadithul}
            handleSaveIntervalTargets={handleSaveIntervalTargets}
            taskTitle={taskTitle}
            setTaskTitle={setTaskTitle}
            taskDesc={taskDesc}
            setTaskDesc={setTaskDesc}
            taskType={taskType}
            setTaskType={setTaskType}
            taskAssignedTo={taskAssignee}
            setTaskAssignedTo={setTaskAssignee}
            taskDueDate={taskDueDate}
            setTaskDueDate={setTaskDueDate}
            handleCreateTask={handleCreateTask}
            handleDeleteTask={handleDeleteTask}
            handleToggleTaskStatus={handleToggleTaskStatus}
            fetchWebsiteContent={fetchWebsiteContent}
            filterCourse={filterCourse}
            filterBatch={filterBatch}
          />
        )}

        {/* --- ADMIN APPEAL RESOLUTION MODAL --- */}
        {showAppealActionModal && selectedAppeal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,10,10,0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '2.5rem', position: 'relative', border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', background: 'white' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '0.8rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle className="text-primary" /> Review Student Appeal
              </h3>

              <div style={{ background: 'var(--bg-light)', padding: '1rem', borderRadius: '12px', marginBottom: '1.2rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>Student:</strong> {selectedAppeal.student?.name}</div>
                <div><strong>Course & Batch:</strong> {selectedAppeal.student?.courses?.name} • Batch {selectedAppeal.student?.batch_number}</div>
                <div><strong>Category / Type:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedAppeal.request_type}</span></div>
                <div><strong>Activity Name:</strong> {selectedAppeal.activity_name} ({new Date(selectedAppeal.logged_date).toLocaleDateString()})</div>
                <div><strong>Recorded Status:</strong> <span style={{ color: '#ef4444', fontWeight: 700 }}>{selectedAppeal.current_value}</span></div>
                <div><strong>Correct Expected:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{selectedAppeal.expected_value}</span></div>
                <div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <strong>Reason:</strong> <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>"{selectedAppeal.reason}"</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Feedback / Admin Remark</label>
                <textarea 
                  placeholder="Add a remark explaining your decision (e.g. 'Attendance corrected' or 'Vlog was checked and marked')" 
                  value={appealActionRemark} 
                  onChange={(e) => setAppealActionRemark(e.target.value)} 
                  rows={3} 
                  className="form-input"
                  style={{ width: '100%', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1.2rem' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAppealActionModal(false);
                    setSelectedAppeal(null);
                  }} 
                  className="btn btn-outline" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#64748b', borderColor: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => handleConfirmAppealAction(false)} // Reject
                    disabled={processingAppealAction} 
                    className="btn btn-outline" 
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#dc2626', borderColor: '#fca5a5', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Reject Request
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleConfirmAppealAction(true)} // Approve
                    disabled={processingAppealAction} 
                    className="btn btn-primary" 
                    style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {processingAppealAction ? 'Processing...' : 'Approve & Correct'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SCORE INTEGRITY VERIFIER MODAL --- */}
        {showScoreVerifierModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(10, 10, 10, 0.45)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '1.5rem'
            }}
            onClick={() => setShowScoreVerifierModal(false)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '24px',
                border: '1px solid rgba(201, 156, 51, 0.15)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: '680px',
                maxHeight: '85vh',
                overflowY: 'auto',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '2.5rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowScoreVerifierModal(false)}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                &times;
              </button>

              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: 800 }}>
                🔍 Score Sum Integrity Auditor ({selectedLeaderboardInterval === 'cumulative' ? 'Cumulative' : (intervalsList.find(i => i.id === (selectedLeaderboardInterval || activeInterval?.id))?.name || 'Active Period')})
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                This auditor performs an in-memory cross-check. It fetches every individual score entry for each active student and compares the calculated sum across all terms against the live scoreboard value.
              </p>

              {/* Term Configurations Summary */}
              {!verifyingScores && intervalsAuditSummary.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(201,156,51,0.04)', borderRadius: '16px', border: '1px solid rgba(201,156,51,0.12)' }}>
                  <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📅 Academic Terms & Logged Date Boundaries
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {intervalsAuditSummary.map(int => (
                      <div key={int.id} style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', fontSize: '0.8rem', lineHeight: '1.5' }}>
                        <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{int.name}</div>
                        <div><strong>Configured Start:</strong> {int.configuredStart}</div>
                        <div><strong>Configured End:</strong> {int.configuredEnd}</div>
                        <div><strong>Actual Logged Range:</strong> {int.count > 0 ? `${int.actualStart} to ${int.actualEnd}` : <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No scores logged</span>}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)', borderTop: '1px dashed rgba(0,0,0,0.05)', paddingTop: '0.25rem' }}>
                          {int.count} score records ({int.totalPoints} total XP)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {verifyingScores ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <div className="spinner" style={{ marginBottom: '1rem' }}>⚙️</div>
                  Auditing scoring database records...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {scoreVerifierList.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      No records to display.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: 700 }}>Student</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 700 }}>Terms Sum</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 700 }}>Scoreboard</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 700 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scoreVerifierList.map(row => (
                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <td style={{ padding: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {row.name}
                                <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  {Object.entries(row.terms).map(([name, val]) => `${name}: ${val} XP`).join(' • ')}
                                </div>
                              </td>
                              <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 800, color: 'var(--text-main)' }}>
                                {row.calculatedSum} XP
                              </td>
                              <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 800, color: 'var(--primary-dark)' }}>
                                {row.scoreboardScore} XP
                              </td>
                              <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: row.isOk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: row.isOk ? '#059669' : '#dc2626'
                                }}>
                                  {row.isOk ? '✅ Consistent' : '❌ Mismatch'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem' }}>💡</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#15803d', lineHeight: '1.4' }}>
                      <strong>Tip:</strong> If you see "Consistent", it means every single daily and exam score points sum up perfectly to the displayed scoreboard totals. The 100,000+ query limit upgrade prevents any score truncation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Student Performance Report Modal */}
        {selectedReportStudent && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(10, 10, 10, 0.45)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '1.5rem'
            }}
            onClick={() => setSelectedReportStudent(null)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '24px',
                border: '1px solid rgba(201, 156, 51, 0.15)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: '650px',
                maxHeight: '85vh',
                overflowY: 'auto',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '2.5rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedReportStudent(null)}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0.3rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <X size={20} />
              </button>

              {/* Header */}
              <div style={{ marginBottom: '1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="badge" style={{ background: 'rgba(201,156,51,0.15)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Batch {selectedReportStudent.batch_number} • Student Report
                  </span>
                  <h2 style={{ fontSize: '1.8rem', margin: '0.5rem 0 0.2rem 0', fontWeight: 800 }}>
                    {selectedReportStudent.name}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                    {selectedReportStudent.email}
                  </p>
                </div>
                
                {!studentReportData.loading && (
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period:</label>
                      <select
                        value={reportSelectedInterval}
                        onChange={(e) => setReportSelectedInterval(e.target.value)}
                        style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <option value="cumulative">All Terms (Cumulative)</option>
                        {intervalsList
                          .filter(i => i.course_id === selectedReportStudent.course_id && i.batch_number === selectedReportStudent.batch_number)
                          .map(int => (
                            <option key={int.id} value={int.id}>
                              {int.name} {int.is_active ? '(Active)' : '(Archived)'}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <button
                      onClick={() => handlePrintReport(selectedReportStudent, studentReportData.scores)}
                      className="btn btn-outline"
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        borderColor: 'var(--primary)',
                        color: 'var(--primary-dark)',
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={16} /> Print Report
                    </button>
                  </div>
                )}
              </div>

              {studentReportData.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(201,156,51,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading academic report...</span>
                </div>
              ) : (
                (() => {
                  const scores = reportSelectedInterval === 'cumulative'
                    ? studentReportData.scores
                    : studentReportData.scores.filter(s => s.interval_id === reportSelectedInterval);

                  const studentIntervals = intervalsList.filter(i => i.course_id === selectedReportStudent?.course_id && i.batch_number === selectedReportStudent?.batch_number);
                  const studentInterval = reportSelectedInterval === 'cumulative'
                    ? null
                    : (intervalsList.find(i => i.id === reportSelectedInterval) || studentIntervals.find(i => i.is_active) || studentIntervals[0]);

                  const totalWorkingDays = reportSelectedInterval === 'cumulative'
                    ? studentIntervals.reduce((sum, i) => sum + (i.total_working_days ?? 20), 0)
                    : (studentInterval?.total_working_days ?? 20);

                  const totalVocab = reportSelectedInterval === 'cumulative'
                    ? studentIntervals.reduce((sum, i) => sum + (i.total_vocab_tasks ?? 20), 0)
                    : (studentInterval?.total_vocab_tasks ?? 20);

                  const totalSentences = reportSelectedInterval === 'cumulative'
                    ? studentIntervals.reduce((sum, i) => sum + (i.total_sentences_tasks ?? 20), 0)
                    : (studentInterval?.total_sentences_tasks ?? 20);

                  const totalVlog = reportSelectedInterval === 'cumulative'
                    ? studentIntervals.reduce((sum, i) => sum + (i.total_vlog_tasks ?? 4), 0)
                    : (studentInterval?.total_vlog_tasks ?? 4);

                  const totalReaction = reportSelectedInterval === 'cumulative'
                    ? studentIntervals.reduce((sum, i) => sum + (i.total_reaction_tasks ?? 4), 0)
                    : (studentInterval?.total_reaction_tasks ?? 4);

                  const totalHadithul = reportSelectedInterval === 'cumulative'
                    ? studentIntervals.reduce((sum, i) => sum + (i.total_hadithul_tasks ?? 4), 0)
                    : (studentInterval?.total_hadithul_tasks ?? 4);

                  // 1. Attendance Metrics
                  const attendanceRecords = scores.filter(s => s.score_type === 'attendance');
                  const totalAttendance = attendanceRecords.length;
                  const onTimeCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('on time')).length;
                  const lateCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('late')).length;
                  const halfDayCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('half day')).length;
                  const absentCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('absent')).length;
                  
                  const presentDays = onTimeCount + lateCount + (halfDayCount * 0.5);
                  const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;

                  // 2. Checklist Completions
                  const vocabCount = scores.filter(s => s.score_type === 'daily_vocab').length;
                  const sentencesCount = scores.filter(s => s.score_type === 'daily_sentences').length;
                  const vlogCount = scores.filter(s => s.score_type === 'weekly_vlog').length;
                  const videoReactionCount = scores.filter(s => s.score_type === 'video_reaction').length;
                  const hadithulArabiaCount = scores.filter(s => s.score_type === 'hadithul_arabia').length;

                  // 3. Oral Talk (One Minute Talk)
                  const talkScores = scores.filter(s => s.score_type === 'custom' && s.activity_name === 'One Minute Talk');
                  const talkAvg = talkScores.length > 0 ? (talkScores.reduce((sum, s) => sum + s.points, 0) / talkScores.length).toFixed(1) : 'N/A';

                  // 4. Exams
                  const examScoresList = scores.filter(s => s.score_type === 'exam');
                  const examAvg = examScoresList.length > 0 
                    ? Math.round(examScoresList.reduce((sum, s) => sum + (s.points / s.max_points) * 100, 0) / examScoresList.length) 
                    : null;

                  // 5. Malayalam Penalties
                  const penaltyRecords = scores.filter(s => s.score_type === 'penalty');
                  const totalPenaltiesCount = penaltyRecords.reduce((sum, r) => sum + Math.round(Math.abs(r.points) / 2), 0);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Metrics grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                        
                        {/* Attendance Rate */}
                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={14} className="text-primary" /> Attendance Rate
                          </span>
                          <div style={{ margin: '0.6rem 0' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--primary-dark)' }}>{attendanceRate}%</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div>Present: <strong style={{ color: 'var(--text-main)' }}>{presentDays} / {totalWorkingDays} Days</strong></div>
                            <div>On Time: <strong>{onTimeCount}</strong> | Late: <strong>{lateCount}</strong> | Half Day: <strong>{halfDayCount}</strong> | Absent: <strong>{absentCount}</strong></div>
                          </div>
                        </div>

                        {/* Malayalam Speaking Penalty */}
                        <div style={{ background: totalPenaltiesCount > 0 ? 'rgba(239,68,68,0.02)' : 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '16px', border: totalPenaltiesCount > 0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: totalPenaltiesCount > 0 ? '#b91c1c' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <AlertTriangle size={14} style={{ color: totalPenaltiesCount > 0 ? '#dc2626' : 'var(--primary)' }} /> Malayalam Penalties
                          </span>
                          <div style={{ margin: '0.6rem 0' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 850, color: totalPenaltiesCount > 0 ? '#dc2626' : 'var(--text-main)' }}>{totalPenaltiesCount}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Total violations across term
                          </span>
                        </div>

                        {/* Exam Average */}
                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Award size={14} className="text-primary" /> Exam Average
                          </span>
                          <div style={{ margin: '0.6rem 0' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-main)' }}>{examAvg !== null ? `${examAvg}%` : 'N/A'}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Across {examScoresList.length} graded exams
                          </span>
                        </div>

                        {/* One Minute Talk */}
                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Volume2 size={14} className="text-primary" /> One Minute Talk
                          </span>
                          <div style={{ margin: '0.6rem 0' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-main)' }}>{talkAvg}</span>
                            {talkAvg !== 'N/A' && <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/10</span>}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Average daily oral score
                          </span>
                        </div>

                      </div>

                      {/* Task completions checklist */}
                      <div style={{ background: 'rgba(201,156,51,0.04)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(201,156,51,0.1)' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ListChecks size={16} className="text-primary" /> Checklist Tasks Completed
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vocab Tasks</span>
                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vocabCount} / {totalVocab}</span>
                          </div>
                          <div style={{ width: '1px', height: '25px', background: 'rgba(201,156,51,0.2)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sentences Tasks</span>
                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{sentencesCount} / {totalSentences}</span>
                          </div>
                          <div style={{ width: '1px', height: '25px', background: 'rgba(201,156,51,0.2)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Weekly Vlogs</span>
                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vlogCount} / {totalVlog}</span>
                          </div>
                          <div style={{ width: '1px', height: '25px', background: 'rgba(201,156,51,0.2)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Video Reaction</span>
                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{videoReactionCount} / {totalReaction}</span>
                          </div>
                          <div style={{ width: '1px', height: '25px', background: 'rgba(201,156,51,0.2)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hadithul Arabia</span>
                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{hadithulArabiaCount} / {totalHadithul}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sub tab navigation */}
                      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.05)', gap: '1rem', marginTop: '1rem', marginBottom: '1.2rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                        <button 
                          onClick={() => setReportTab('attendance')}
                          style={{
                            padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                            borderBottom: reportTab === 'attendance' ? '3px solid var(--primary)' : '3px solid transparent',
                            color: reportTab === 'attendance' ? 'var(--primary-dark)' : 'var(--text-muted)',
                            fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0
                          }}
                        >
                          📅 Attendance History
                        </button>
                        <button 
                          onClick={() => setReportTab('work')}
                          style={{
                            padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                            borderBottom: reportTab === 'work' ? '3px solid var(--primary)' : '3px solid transparent',
                            color: reportTab === 'work' ? 'var(--primary-dark)' : 'var(--text-muted)',
                            fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0
                          }}
                        >
                          📚 Work Submissions
                        </button>
                        <button 
                          onClick={() => setReportTab('grades')}
                          style={{
                            padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                            borderBottom: reportTab === 'grades' ? '3px solid var(--primary)' : '3px solid transparent',
                            color: reportTab === 'grades' ? 'var(--primary-dark)' : 'var(--text-muted)',
                            fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0
                          }}
                        >
                          📝 Grades & Penalties
                        </button>
                        <button 
                          onClick={() => setReportTab('remarks')}
                          style={{
                            padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                            borderBottom: reportTab === 'remarks' ? '3px solid var(--primary)' : '3px solid transparent',
                            color: reportTab === 'remarks' ? 'var(--primary-dark)' : 'var(--text-muted)',
                            fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0
                          }}
                        >
                          💬 Counseling & Remarks
                        </button>
                      </div>

                      {/* Tab 1: Attendance Table */}
                      {reportTab === 'attendance' && (() => {
                        const attRecords = scores.filter(s => s.score_type === 'attendance');
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Log attendance form */}
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', padding: '0.8rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>➕ Log Attendance:</span>
                              <input 
                                type="date" 
                                value={addLogDate} 
                                onChange={(e) => setAddLogDate(e.target.value)} 
                                style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                              />
                              <select 
                                value={addAttStatus} 
                                onChange={(e) => setAddAttStatus(e.target.value)}
                                style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                              >
                                <option value="On Time">On Time (10 XP)</option>
                                <option value="Late">Late (7 XP)</option>
                                <option value="Half Day">Half Day (5 XP)</option>
                                <option value="Absent">Absent (0 XP)</option>
                              </select>
                              <button 
                                onClick={handleAddAttendanceLog}
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: 700 }}
                              >
                                Log
                              </button>
                            </div>

                            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th style={{ padding: '0.6rem 1rem', fontWeight: 700 }}>Date</th>
                                    <th style={{ padding: '0.6rem 1rem', fontWeight: 700 }}>Status</th>
                                    <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 700 }}>Points</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {attRecords.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No attendance records logged.
                                      </td>
                                    </tr>
                                  ) : (
                                    attRecords.map(rec => {
                                      const status = rec.activity_name.replace('Attendance: ', '');
                                      let statusBg = 'rgba(0,0,0,0.04)';
                                      let statusColor = 'var(--text-muted)';
                                      if (status === 'On Time') { statusBg = 'rgba(34,197,94,0.08)'; statusColor = '#16a34a'; }
                                      else if (status === 'Late') { statusBg = 'rgba(180,83,9,0.08)'; statusColor = '#b45309'; }
                                      else if (status === 'Half Day') { statusBg = 'rgba(59,130,246,0.08)'; statusColor = '#3b82f6'; }
                                      else if (status === 'Absent') { statusBg = 'rgba(239,68,68,0.08)'; statusColor = '#dc2626'; }

                                      return (
                                        <tr key={rec.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                          <td style={{ padding: '0.6rem 1rem', fontWeight: 550 }}>
                                            {new Date(rec.logged_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </td>
                                          <td style={{ padding: '0.6rem 1rem' }}>
                                            <select
                                              value={status}
                                              onChange={(e) => handleUpdateAttendanceScore(rec.id, e.target.value)}
                                              style={{
                                                padding: '0.2rem 0.4rem',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                background: statusBg,
                                                color: statusColor,
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                outline: 'none'
                                              }}
                                            >
                                              <option value="On Time" style={{ color: '#16a34a', fontWeight: 'bold' }}>On Time</option>
                                              <option value="Late" style={{ color: '#b45309', fontWeight: 'bold' }}>Late</option>
                                              <option value="Half Day" style={{ color: '#3b82f6', fontWeight: 'bold' }}>Half Day</option>
                                              <option value="Absent" style={{ color: '#dc2626', fontWeight: 'bold' }}>Absent</option>
                                            </select>
                                          </td>
                                          <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                              <span style={{ color: rec.points > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                                                {rec.points > 0 ? `+${rec.points}` : rec.points} XP
                                              </span>
                                              <button
                                                onClick={() => handleDeleteScore(rec.id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                                                title="Delete Log"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Tab 2: Work Submission Table */}
                      {reportTab === 'work' && (() => {
                        const workTypes = ['daily_vocab', 'daily_sentences', 'weekly_vlog', 'video_reaction', 'hadithul_arabia'];
                        const workRecords = scores.filter(s => workTypes.includes(s.score_type));

                        const workGroupByDate = workRecords.reduce((acc, score) => {
                          const d = score.logged_date;
                          if (!acc[d]) {
                            acc[d] = { daily_vocab: false, daily_sentences: false, weekly_vlog: false, video_reaction: false, hadithul_arabia: false };
                          }
                          acc[d][score.score_type as 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia'] = true;
                          return acc;
                        }, {} as { [date: string]: { daily_vocab: boolean, daily_sentences: boolean, weekly_vlog: boolean, video_reaction: boolean, hadithul_arabia: boolean } });

                        const getIntervalTime = (i: ScoringInterval) => 
                          i.start_date ? new Date(i.start_date).getTime() : 
                          (i.created_at ? new Date(i.created_at).getTime() : 0);

                        const studentIntervals = intervalsList
                          .filter(i => i.course_id === selectedReportStudent?.course_id && i.batch_number === selectedReportStudent?.batch_number)
                          .sort((a, b) => getIntervalTime(a) - getIntervalTime(b));

                        const studentInterval = reportSelectedInterval === 'cumulative'
                          ? null
                          : (intervalsList.find(i => i.id === reportSelectedInterval) || studentIntervals.find(i => i.is_active) || studentIntervals[0]);

                        const rawStartDate = studentInterval
                          ? (studentInterval.start_date || studentInterval.created_at)
                          : (studentIntervals.length > 0 
                             ? (studentIntervals[0].start_date || studentIntervals[0].created_at)
                             : null);

                        const intervalStartDate: string = rawStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

                        let intervalEndDate: string | undefined = studentInterval?.end_date || undefined;
                        if (!intervalEndDate && studentInterval) {
                          const idx = studentIntervals.findIndex(i => i.id === studentInterval.id);
                          if (idx !== -1 && idx < studentIntervals.length - 1) {
                            const nextInterval = studentIntervals[idx + 1];
                            const nextRawStart = nextInterval.start_date || nextInterval.created_at || '';
                            if (nextRawStart) {
                              const nextStart = new Date(nextRawStart);
                              nextStart.setDate(nextStart.getDate() - 1);
                              intervalEndDate = nextStart.toISOString().split('T')[0];
                            }
                          }
                        }

                        const generatedDates = getDatesRange(intervalStartDate, intervalEndDate);
                        const loggedDates = Object.keys(workGroupByDate);
                        const allDatesSet = new Set([...generatedDates, ...loggedDates]);
                        const workDatesSorted = Array.from(allDatesSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Log work checklist form */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.8rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>➕ Log Work Completions:</span>
                                <input 
                                  type="date" 
                                  value={addLogDate} 
                                  onChange={(e) => setAddLogDate(e.target.value)} 
                                  style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                                  <input type="checkbox" checked={addWorkVocab} onChange={(e) => setAddWorkVocab(e.target.checked)} /> Vocab
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                                  <input type="checkbox" checked={addWorkSentences} onChange={(e) => setAddWorkSentences(e.target.checked)} /> Sentences
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                                  <input type="checkbox" checked={addWorkVlog} onChange={(e) => setAddWorkVlog(e.target.checked)} /> Vlog
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                                  <input type="checkbox" checked={addWorkReaction} onChange={(e) => setAddWorkReaction(e.target.checked)} /> Reaction
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                                  <input type="checkbox" checked={addWorkHadithul} onChange={(e) => setAddWorkHadithul(e.target.checked)} /> Hadithul A.
                                </label>
                                <button 
                                  onClick={handleAddWorkLog}
                                  className="btn btn-primary"
                                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, marginLeft: 'auto' }}
                                >
                                  Log Work
                                </button>
                              </div>
                            </div>

                            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th style={{ padding: '0.6rem 1rem', fontWeight: 700 }}>Date</th>
                                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>Vocab</th>
                                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>Sentences</th>
                                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>Vlog</th>
                                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>Reaction</th>
                                    <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>Hadithul A.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {workDatesSorted.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No task submissions logged.
                                      </td>
                                    </tr>
                                  ) : (
                                    workDatesSorted.map(dateStr => {
                                      const entry = workGroupByDate[dateStr] || { daily_vocab: false, daily_sentences: false, weekly_vlog: false, video_reaction: false, hadithul_arabia: false };
                                      const renderStatus = (done: boolean, scoreType: string) => (
                                        <button
                                          onClick={() => handleToggleWorkCell(dateStr, scoreType)}
                                          style={{ 
                                            background: 'none',
                                            border: 'none',
                                            color: done ? '#16a34a' : 'rgba(0,0,0,0.2)', 
                                            fontWeight: 800, 
                                            fontSize: done ? '1.1rem' : '0.9rem',
                                            cursor: 'pointer',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            outline: 'none'
                                          }}
                                          title={`Click to ${done ? 'remove' : 'log'} submission`}
                                        >
                                          {done ? '✓' : '-'}
                                        </button>
                                      );

                                      return (
                                        <tr key={dateStr} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                          <td style={{ padding: '0.6rem 1rem', fontWeight: 550 }}>
                                            {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </td>
                                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{renderStatus(entry.daily_vocab, 'daily_vocab')}</td>
                                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{renderStatus(entry.daily_sentences, 'daily_sentences')}</td>
                                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{renderStatus(entry.weekly_vlog, 'weekly_vlog')}</td>
                                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{renderStatus(entry.video_reaction, 'video_reaction')}</td>
                                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{renderStatus(entry.hadithul_arabia, 'hadithul_arabia')}</td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Tab 3: Grades & Penalties Table */}
                      {reportTab === 'grades' && (() => {
                        const gradeTypes = ['exam', 'penalty', 'custom'];
                        const gradeRecords = scores.filter(s => gradeTypes.includes(s.score_type));

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Log grade/penalty form */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.8rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>➕ Log Grade / Penalty:</span>
                                <input 
                                  type="date" 
                                  value={addLogDate} 
                                  onChange={(e) => setAddLogDate(e.target.value)} 
                                  style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                                />
                                <select 
                                  value={addGradeType} 
                                  onChange={(e) => setAddGradeType(e.target.value as any)}
                                  style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                                >
                                  <option value="exam">📝 Exam</option>
                                  <option value="penalty">⚠️ Malayalam Violation</option>
                                  <option value="custom">🎙️ One Minute Talk / Custom</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                {addGradeType === 'exam' && (
                                  <>
                                    <input 
                                      type="text" 
                                      placeholder="Exam Title (e.g. Grammar Test 1)"
                                      value={addGradeTitle}
                                      onChange={(e) => setAddGradeTitle(e.target.value)}
                                      style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', flex: 1, minWidth: '150px', outline: 'none' }}
                                    />
                                    <input 
                                      type="number" 
                                      placeholder="Score"
                                      value={addGradePoints || ''}
                                      onChange={(e) => setAddGradePoints(parseInt(e.target.value) || 0)}
                                      style={{ padding: '0.3rem 0.5rem', width: '70px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                                    />
                                    <span style={{ fontSize: '0.8rem' }}>/</span>
                                    <input 
                                      type="number" 
                                      placeholder="Max"
                                      value={addGradeMaxPoints || ''}
                                      onChange={(e) => setAddGradeMaxPoints(parseInt(e.target.value) || 0)}
                                      style={{ padding: '0.3rem 0.5rem', width: '70px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                                    />
                                  </>
                                )}
                                {addGradeType === 'penalty' && (
                                  <>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Malayalam Violations (each -2 XP). Count:</span>
                                    <input 
                                      type="number" 
                                      placeholder="Penalties count"
                                      value={Math.round(Math.abs(addGradePoints) / 2) || ''}
                                      onChange={(e) => setAddGradePoints((parseInt(e.target.value) || 0) * 2)}
                                      style={{ padding: '0.3rem 0.5rem', width: '120px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                                    />
                                  </>
                                )}
                                {addGradeType === 'custom' && (
                                  <>
                                    <input 
                                      type="text" 
                                      placeholder="Activity Title (e.g. One Minute Talk)"
                                      value={addGradeTitle}
                                      onChange={(e) => setAddGradeTitle(e.target.value)}
                                      style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', flex: 1, minWidth: '150px', outline: 'none' }}
                                    />
                                    <input 
                                      type="number" 
                                      placeholder="Score"
                                      value={addGradePoints || ''}
                                      onChange={(e) => setAddGradePoints(parseInt(e.target.value) || 0)}
                                      style={{ padding: '0.3rem 0.5rem', width: '80px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                                    />
                                    <span style={{ fontSize: '0.8rem' }}>/</span>
                                    <input 
                                      type="number" 
                                      placeholder="Max"
                                      value={addGradeMaxPoints || ''}
                                      onChange={(e) => setAddGradeMaxPoints(parseInt(e.target.value) || 0)}
                                      style={{ padding: '0.3rem 0.5rem', width: '80px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none' }}
                                    />
                                  </>
                                )}
                                <button 
                                  onClick={handleAddGradeLog}
                                  className="btn btn-primary"
                                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, marginLeft: 'auto' }}
                                >
                                  Log Score
                                </button>
                              </div>
                            </div>

                            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th style={{ padding: '0.6rem 1rem', fontWeight: 700 }}>Date</th>
                                    <th style={{ padding: '0.6rem 1rem', fontWeight: 700 }}>Activity / Violation</th>
                                    <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 700 }}>Grade / Score</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {gradeRecords.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No grades or penalties logged.
                                      </td>
                                    </tr>
                                  ) : (
                                    gradeRecords.map(rec => {
                                      let displayTitle = rec.activity_name;
                                      let displayScore = `${rec.points > 0 ? '+' : ''}${rec.points} XP`;
                                      let scoreColor = rec.points >= 0 ? 'var(--text-main)' : '#dc2626';

                                      if (rec.score_type === 'exam') {
                                        const pct = Math.round((rec.points / rec.max_points) * 100);
                                        displayTitle = `📝 Exam: ${rec.activity_name.replace(/^exam:\s*/i, '')}`;
                                        displayScore = `${rec.points}/${rec.max_points} (${pct}%)`;
                                        scoreColor = 'var(--primary-dark)';
                                      } else if (rec.score_type === 'penalty') {
                                        const count = Math.round(Math.abs(rec.points) / 2);
                                        displayTitle = `⚠️ Malayalam Speaking violation`;
                                        displayScore = `-${Math.abs(rec.points)} XP (${count} ${count === 1 ? 'penalty' : 'penalties'})`;
                                        scoreColor = '#dc2626';
                                      } else if (rec.score_type === 'custom' && rec.activity_name === 'One Minute Talk') {
                                        displayTitle = `🎙️ One Minute Talk`;
                                        displayScore = `${rec.points} / 10`;
                                      }

                                      return (
                                        <tr key={rec.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                          <td style={{ padding: '0.6rem 1rem', fontWeight: 550 }}>
                                            {new Date(rec.logged_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </td>
                                          <td style={{ padding: '0.6rem 1rem' }}>
                                            <div style={{ fontWeight: 600 }}>{displayTitle}</div>
                                          </td>
                                          <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                              <span style={{ color: scoreColor }}>
                                                {displayScore}
                                              </span>
                                              <button
                                                onClick={() => handleDeleteScore(rec.id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                                                title="Delete Log"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Tab 4: Counseling & Remarks Table */}
                      {reportTab === 'remarks' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>💪 Strengths</label>
                            <textarea 
                              placeholder="e.g. Excellent communication skills, active participant, fast learner..."
                              value={remarksStrengths}
                              onChange={(e) => setRemarksStrengths(e.target.value)}
                              rows={2}
                              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>⚠️ Weaknesses / Areas for Improvement</label>
                            <textarea 
                              placeholder="e.g. Needs to improve daily attendance consistency, avoid side talking..."
                              value={remarksWeaknesses}
                              onChange={(e) => setRemarksWeaknesses(e.target.value)}
                              rows={2}
                              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>🎯 Apt Career Path</label>
                            <textarea 
                              placeholder="e.g. Arabic Language Instructor, Translator, Content Creator..."
                              value={remarksCareerPath}
                              onChange={(e) => setRemarksCareerPath(e.target.value)}
                              rows={2}
                              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>📝 General Remarks</label>
                            <textarea 
                              placeholder="Add any other general counseling notes or feedback here..."
                              value={remarksGeneral}
                              onChange={(e) => setRemarksGeneral(e.target.value)}
                              rows={3}
                              style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.8rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>👔 Mock Interview</h4>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Mark:</label>
                                <input 
                                  type="number"
                                  placeholder="Score"
                                  value={remarksMockInterviewMark}
                                  onChange={(e) => setRemarksMockInterviewMark(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                  style={{ width: '80px', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem' }}
                                />
                              </div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '-0.3rem' }}>Remark:</label>
                              <textarea 
                                placeholder="Mock Interview Feedback..."
                                value={remarksMockInterviewRemark}
                                onChange={(e) => setRemarksMockInterviewRemark(e.target.value)}
                                rows={2}
                                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.8rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>🚌 Industrial Visit</h4>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Mark:</label>
                                <input 
                                  type="number"
                                  placeholder="Score"
                                  value={remarksIndustrialVisitMark}
                                  onChange={(e) => setRemarksIndustrialVisitMark(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                  style={{ width: '80px', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem' }}
                                />
                              </div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '-0.3rem' }}>Remark:</label>
                              <textarea 
                                placeholder="Industrial Visit Feedback..."
                                value={remarksIndustrialVisitRemark}
                                onChange={(e) => setRemarksIndustrialVisitRemark(e.target.value)}
                                rows={2}
                                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleSaveRemarks}
                            disabled={savingRemarks}
                            className="btn btn-primary"
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                          >
                            {savingRemarks ? 'Saving Remarks...' : '✓ Save Remarks'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentManageRow = ({ 
  student, 
  onResetPassword, 
  onDeleteAccount,
  onOpenReport,
  onUpdateStudent
}: { 
  student: StudentProfile; 
  onResetPassword: (userId: string, newPw: string) => Promise<void>;
  onDeleteAccount: (userId: string, name: string) => Promise<void>;
  onOpenReport: (student: StudentProfile) => void;
  onUpdateStudent: (studentId: string, name: string, courseId: string, batchNumber: number, rollNumber: string, status: string) => Promise<void>;
}) => {
  const [name, setName] = useState(student.name);
  const [rollNumber, setRollNumber] = useState(student.roll_number || '');
  const [status, setStatus] = useState(student.status);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdateStudent(student.id, name, student.course_id, student.batch_number, rollNumber, status);
    setSaving(false);
  };

  const handleReset = async () => {
    if (!newPassword) return;
    setResetting(true);
    await onResetPassword(student.id, newPassword);
    setNewPassword('');
    setResetting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDeleteAccount(student.id, student.name);
    setDeleting(false);
  };

  return (
    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <input 
          type="text" 
          value={rollNumber} 
          onChange={(e) => setRollNumber(e.target.value)} 
          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '70px', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center' }} 
          placeholder="Roll #"
        />
      </td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '100%', fontSize: '0.9rem', fontWeight: 650 }} 
        />
      </td>
      <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{student.email}</td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value as any)} 
          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none' }}
        >
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <input 
            type="password" 
            placeholder="New Password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '110px', fontSize: '0.85rem' }} 
          />
          <button 
            onClick={handleReset} 
            disabled={resetting || !newPassword}
            className="btn btn-outline" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
          >
            {resetting ? '...' : 'Reset'}
          </button>
        </div>
      </td>
      <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} disabled={saving}>{saving ? '...' : 'Save'}</button>
          <button 
            onClick={() => onOpenReport(student)}
            className="btn btn-outline" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--primary)', borderColor: 'var(--primary)', background: 'rgba(201,156,51,0.02)' }}
          >
            Report
          </button>
          <button 
            onClick={handleDelete} 
            disabled={deleting} 
            className="btn btn-outline" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5', background: 'rgba(239,68,68,0.02)' }}
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
};


export default AdminDashboard;
