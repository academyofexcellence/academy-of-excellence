import { useEffect, useState, useRef } from 'react';
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
  HelpCircle
} from 'lucide-react';

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
  status: 'pending' | 'active' | 'inactive';
  courses?: Course;
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
}

interface LeaderboardEntry {
  student_id: string;
  name: string;
  total_score: number;
  level: number;
  rank: number;
}

const getDatesRange = (startDateStr: string) => {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  
  let limit = 0;
  const current = new Date(end);
  while (current >= start && limit < 90) {
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

  // Tab navigation states
  const [staffTab, setStaffTab] = useState<'checklist' | 'one_off' | 'history'>('checklist');
  const [adminTab, setAdminTab] = useState<'kpis' | 'tasks' | 'students' | 'roster' | 'student_roster' | 'logs' | 'website' | 'settings' | 'appeals'>('kpis');
  const [websiteSubTab, setWebsiteSubTab] = useState<'gallery' | 'partners' | 'visitors'>('gallery');

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
  
  // Synchronous lock to prevent penalty double-clicks
  const penaltyLockRef = useRef<Record<string, boolean>>({});
  
  // Classroom Selector States
  const [filterCourse, setFilterCourse] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [activeInterval, setActiveInterval] = useState<ScoringInterval | null>(null);
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
    if (adminTab === 'appeals') {
      fetchAdminAppeals();
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
        fetchStaffWorkspaceData(profile.id);
        fetchLeadershipDashboardData(); // Staff also need lists of classrooms to grade
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
            courses:course_id (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminAppeals(data || []);
      
      // Calculate pending count
      const pending = (data || []).filter((a: any) => a.status === 'pending').length;
      setPendingAppealsCount(pending);
    } catch (err) {
      console.error('Error fetching admin appeals:', err);
    } finally {
      setLoadingAdminAppeals(false);
    }
  };

  const handleApproveAppeal = async (appeal: any) => {
    setSelectedAppeal(appeal);
    setAppealActionRemark('');
    setShowAppealActionModal(true);
  };

  const handleConfirmAppealAction = async (approved: boolean) => {
    if (!selectedAppeal || !currentUser) return;
    try {
      setProcessingAppealAction(true);
      
      const newStatus = approved ? 'approved' : 'rejected';
      
      // 1. Update the correction request status in Supabase
      const { error: updateRequestError } = await supabase
        .from('correction_requests')
        .update({
          status: newStatus,
          admin_remark: appealActionRemark
        })
        .eq('id', selectedAppeal.id);

      if (updateRequestError) throw updateRequestError;

      // 2. If approved, perform the automatic database correction!
      if (approved) {
        const studentId = selectedAppeal.student_id;
        const loggedDate = selectedAppeal.logged_date;
        const reqType = selectedAppeal.request_type;
        const activityName = selectedAppeal.activity_name;
        const expectedVal = selectedAppeal.expected_value;

        // Find the active scoring interval for the student
        const studentProfile = studentList.find(s => s.id === studentId);
        if (studentProfile) {
          const studentCourseId = studentProfile.course_id;
          const studentBatchNum = studentProfile.batch_number;
          const matchedInterval = intervalsList.find(
            int => int.course_id === studentCourseId && int.batch_number === studentBatchNum && int.is_active
          );

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

      await logActivity('student_appeal_resolved', `Resolved appeal correction request as ${newStatus} for student ID: ${selectedAppeal.student_id}`);
      
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
      fetchClassroomLeaderboard(activeInterval.id);
    }
  }, [activeInterval, selectedGradingDate]);

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
    const activeInts = intervalsList.filter(i => i.is_active);
    if (activeInts.length > 0 && !selectedConfigIntervalId) {
      setSelectedConfigIntervalId(activeInts[0].id);
    }
  }, [intervalsList, selectedConfigIntervalId]);

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
      }
    }
  }, [selectedConfigIntervalId, intervalsList]);

  const loadClassroomActiveInterval = () => {
    const active = intervalsList.find(
      i => i.course_id === filterCourse && i.batch_number === parseInt(filterBatch) && i.is_active
    );
    if (active) {
      setActiveInterval(active);
    } else {
      setActiveInterval(null);
      setScoresList([]);
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
      // Fetch all active students in batch
      const { data: students } = await supabase
        .from('student_profiles')
        .select('id, name')
        .eq('course_id', courseId)
        .eq('batch_number', batchNumber)
        .eq('status', 'active');

      if (!students) return [];

      // Fetch all scores for this interval
      const { data: scores } = await supabase
        .from('scores')
        .select('student_id, points')
        .eq('interval_id', intervalId);

      const scoreMap: { [key: string]: number } = {};
      students.forEach(s => { scoreMap[s.id] = 0; });

      if (scores) {
        scores.forEach(s => {
          if (scoreMap[s.student_id] !== undefined) {
            scoreMap[s.student_id] += s.points;
          }
        });
      }

      // Format & Rank entries
      const entries: LeaderboardEntry[] = students.map(s => {
        const total = scoreMap[s.id];
        const computedLevel = Math.max(1, Math.floor(total / 100) + 1);
        return {
          student_id: s.id,
          name: s.name,
          total_score: total,
          level: computedLevel,
          rank: 0
        };
      });

      // Sort by score desc
      entries.sort((a, b) => b.total_score - a.total_score);

      // Assign ranks (handle ties)
      let currentRank = 1;
      for (let i = 0; i < entries.length; i++) {
        if (i > 0 && entries[i].total_score < entries[i - 1].total_score) {
          currentRank += 1;
        }
        entries[i].rank = currentRank;
      }

      return entries;
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      return [];
    }
  };

  const fetchClassroomLeaderboard = async (intervalId: string) => {
    if (!filterCourse || !filterBatch) return;
    const entries = await fetchLeaderboardData(intervalId, filterCourse, parseInt(filterBatch));
    setClassroomLeaderboard(entries);
    if (overviewSelectedInterval === intervalId) {
      setOverviewLeaderboard(entries);
    }
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
        const { error } = await supabase.from('scores').insert([
          {
            student_id: studentId,
            interval_id: activeInterval.id,
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

  const fetchBatchScores = async (intervalId: string) => {
    setLoadingBatchScores(true);
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('interval_id', intervalId);
      if (error) throw error;
      setBatchScores(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBatchScores(false);
    }
  };

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

        const { data, error } = await supabase
          .from('scores')
          .insert([
            {
              student_id: studentId,
              interval_id: activeInterval.id,
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
          const { data, error } = await supabase
            .from('scores')
            .insert([
              {
                student_id: studentId,
                interval_id: activeInterval.id,
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
          const { error: insertError } = await supabase.from('scores').insert([
            {
              student_id: studentId,
              interval_id: activeInterval.id,
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
          const { error: insertError } = await supabase
            .from('scores')
            .insert([
              {
                student_id: studentId,
                interval_id: activeInterval.id,
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
          const { error: insertError } = await supabase
            .from('scores')
            .insert([
              {
                student_id: studentId,
                interval_id: activeInterval.id,
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
      const insertRecords = Object.keys(examScores).map(studId => ({
        student_id: studId,
        interval_id: activeInterval.id,
        score_type: 'exam',
        points: examScores[studId] || 0,
        max_points: maxPts,
        activity_name: `Exam: ${examName}`,
        logged_by: currentUser.id,
        logged_date: selectedGradingDate
      }));

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
      const insertRecords = Object.keys(customScores).map(studId => ({
        student_id: studId,
        interval_id: activeInterval.id,
        score_type: 'custom',
        points: customScores[studId] || 0,
        max_points: maxPts,
        activity_name: customActivityName,
        logged_by: currentUser.id,
        logged_date: selectedGradingDate
      }));

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

  // Load and open student performance report modal
  const handleOpenReport = async (student: StudentProfile) => {
    setSelectedReportStudent(student);
    setReportTab('attendance');
    setStudentReportData({ scores: [], loading: true });
    
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
        const activeInt = intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum && i.is_active)
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
    const activeInt = intervalsList.find(i => i.course_id === studentCourseId && i.batch_number === studentBatchNum && i.is_active)
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
          start_date: configStartDate || null
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
        start_date: configStartDate
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
              <p>${courseName} • Batch ${activeInterval.batch_number} • ${activeInterval.name}</p>
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

  const handlePrintReport = (student: StudentProfile, scores: any[]) => {
    
    // Format the date
    const printDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Calculate metrics
    const studentInterval = intervalsList.find(i => i.course_id === student.course_id && i.batch_number === student.batch_number && i.is_active) 
      || intervalsList.find(i => i.course_id === student.course_id && i.batch_number === student.batch_number);
    const totalWorkingDays = studentInterval?.total_working_days ?? 20;
    const totalVocab = studentInterval?.total_vocab_tasks ?? 20;
    const totalSentences = studentInterval?.total_sentences_tasks ?? 20;
    const totalVlog = studentInterval?.total_vlog_tasks ?? 4;
    const totalReaction = studentInterval?.total_reaction_tasks ?? 4;
    const totalHadithul = studentInterval?.total_hadithul_tasks ?? 4;

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
          <title>Academic Report Card - ${student.name}</title>
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
              <span class="label">Batch Number</span>
              <span class="value">Batch ${student.batch_number}</span>
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
        const { error } = await supabase
          .from('student_profiles')
          .update({ status: 'active' })
          .eq('id', studentId);
        if (error) throw error;

        await logActivity('student_approved', `Approved student signup: ${targetStudent?.name}`);
        setMessage('✅ Student approved successfully.');
      } else {
        // Delete student auth user
        const { error: dbError } = await supabase.from('student_profiles').delete().eq('id', studentId);
        if (dbError) throw dbError;

        await logActivity('student_rejected', `Rejected student registration: ${targetStudent?.name}`);
        setMessage('❌ Student profile rejected and removed.');
      }
      fetchLeadershipDashboardData();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Profile approval update failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 4000);
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
  const filteredActiveStudents = studentList.filter(
    s => s.course_id === filterCourse && s.batch_number === parseInt(filterBatch) && s.status === 'active'
  );

  const sortedFilteredActiveStudents = [...filteredActiveStudents].sort((a, b) => {
    const rA = a.roll_number || '';
    const rB = b.roll_number || '';
    const numA = parseInt(rA);
    const numB = parseInt(rB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    if (rA && !rB) return -1;
    if (!rA && rB) return 1;
    if (!rA && !rB) {
      return a.name.localeCompare(b.name);
    }
    return rA.localeCompare(rB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const filteredStudentsForRoster = studentList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          s.email.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesCourse = studentFilterCourse === '' || s.course_id === studentFilterCourse;
    const matchesBatch = studentFilterBatch === '' || s.batch_number === parseInt(studentFilterBatch);
    const matchesStatus = studentFilterStatus === '' || s.status === studentFilterStatus;
    return matchesSearch && matchesCourse && matchesBatch && matchesStatus;
  }).sort((a, b) => {
    if (a.course_id !== b.course_id) {
      return a.course_id.localeCompare(b.course_id);
    }
    if (a.batch_number !== b.batch_number) {
      return a.batch_number - b.batch_number;
    }
    const rA = a.roll_number || '';
    const rB = b.roll_number || '';
    const numA = parseInt(rA);
    const numB = parseInt(rB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return rA.localeCompare(rB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', background: 'var(--bg-light)' }} className="bg-grid-pattern">
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
            SECTION A: STAFF VIEW (Tasks assigned to self)
            ========================================================================= */}
        {!isLeadership && (
          <div style={{ marginBottom: '2.5rem' }}>
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
          </div>
        )}

        {/* =========================================================================
            SECTION B: LEADERSHIP VIEWS (OR STAFF STUDENT MANAGER ACCESS)
            ========================================================================= */}
        {/* Navigation Tabs for Administrators / Staff Dashboard */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,156,51,0.2)', marginBottom: '2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isLeadership && (
            <>
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
            </>
          )}

          {/* Both standard Staff and leadership can access Student Classrooms to mark homework submissions! */}
          <button 
            onClick={() => setAdminTab('students')}
            style={{
              padding: '0.8rem 1.2rem', background: 'none', border: 'none',
              borderBottom: adminTab === 'students' ? '3px solid var(--primary)' : '3px solid transparent',
              color: adminTab === 'students' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <GraduationCap size={16} /> Student Classrooms
          </button>

          {/* Both standard Staff and leadership can manage appeals! */}
          <button 
            onClick={() => setAdminTab('appeals')}
            style={{
              padding: '0.8rem 1.2rem', background: 'none', border: 'none',
              borderBottom: adminTab === 'appeals' ? '3px solid var(--primary)' : '3px solid transparent',
              color: adminTab === 'appeals' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              position: 'relative'
            }}
          >
            <HelpCircle size={16} /> Correction Requests
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

          {isLeadership && (
            <>
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
                onClick={() => setAdminTab('student_roster')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'student_roster' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'student_roster' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Users size={16} /> Student Roster
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

              <button 
                onClick={() => setAdminTab('settings')}
                style={{
                  padding: '0.8rem 1.2rem', background: 'none', border: 'none',
                  borderBottom: adminTab === 'settings' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: adminTab === 'settings' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                <Settings size={16} /> Courses & Intervals
              </button>
            </>
          )}
        </div>

        {/* TAB: KPI Overview (leadership only) */}
        {/* TAB: KPI Overview (leadership only) */}
        {isLeadership && adminTab === 'kpis' && (() => {
          const activeStudents = studentList.filter(s => s.status === 'active');
          const activeStudentsCount = activeStudents.length;

          // Attendance stats for today
          const attPresent = todayScores.filter(s => s.score_type === 'attendance' && s.activity_name.includes('Attendance: On Time')).length;
          const attLate = todayScores.filter(s => s.score_type === 'attendance' && s.activity_name.includes('Attendance: Late')).length;
          const attHalfDay = todayScores.filter(s => s.score_type === 'attendance' && s.activity_name.includes('Attendance: Half Day')).length;
          const attAbsent = todayScores.filter(s => s.score_type === 'attendance' && s.activity_name.includes('Attendance: Absent')).length;
          const attMarked = attPresent + attLate + attHalfDay + attAbsent;
          const attendancePercent = attMarked > 0 ? Math.round(((attPresent + attLate + attHalfDay) / attMarked) * 100) : 0;

          // Student activities check-ins today
          const vocabCount = todayScores.filter(s => s.score_type === 'daily_vocab').length;
          const sentencesCount = todayScores.filter(s => s.score_type === 'daily_sentences').length;
          const vlogsCount = todayScores.filter(s => s.score_type === 'weekly_vlog').length;
          const videoReactionCount = todayScores.filter(s => s.score_type === 'video_reaction').length;
          const hadithulArabiaCount = todayScores.filter(s => s.score_type === 'hadithul_arabia').length;
          const penaltiesCount = todayScores.filter(s => s.score_type === 'penalty').length;
          const examsCount = todayScores.filter(s => s.score_type === 'exam').length;
          const customCount = todayScores.filter(s => s.score_type === 'custom' && s.activity_name === 'One Minute Talk').length;

          // Batches and active intervals
          const activeIntervals = intervalsList.filter(i => i.is_active);

          // Task summaries
          const pendingOneOffs = taskList.filter(t => t.task_type === 'one_off' && t.status !== 'completed');
          const completedOneOffs = taskList.filter(t => t.task_type === 'one_off' && t.status === 'completed');
          const dailyTasks = taskList.filter(t => t.task_type === 'daily');

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Top Stats Cards Grid */}
              <div className="grid grid-4" style={{ gap: '1.5rem' }}>
                <div className="glass-card text-center" style={{ padding: '1.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Daily Tasks Done (Today)</h4>
                  <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--primary-dark)' }}>
                    {dailyLogs.length} / {dailyTasks.length}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Active checklist monitoring</span>
                </div>

                <div className="glass-card text-center" style={{ padding: '1.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Pending Staff Duties</h4>
                  <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.5rem 0', color: '#dc2626' }}>
                    {pendingOneOffs.length}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned to staff roster</span>
                </div>

                <div className="glass-card text-center" style={{ padding: '1.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Active Students</h4>
                  <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.5rem 0', color: '#1e3a8a' }}>
                    {activeStudentsCount}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{studentList.filter(s => s.status === 'pending').length} pending approval</span>
                </div>

                <div className="glass-card text-center" style={{ padding: '1.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Today's Attendance</h4>
                  <p style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.5rem 0', color: '#16a34a' }}>
                    {attendancePercent}%
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {attPresent + attLate + attHalfDay} Present / {attMarked} Marked
                  </span>
                </div>
              </div>

              {/* Main Dashboard Command Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                
                {/* LEFT COLUMN: Student & Classroom Activity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  

                  {/* DAILY STUDENT GRADING PROGRESS */}
                  <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                      <TrendingUp size={18} className="text-primary" /> Student Daily Activity Logged (Today)
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      Number of items recorded by staff in the classrooms today.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #3b82f6', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Vocab Checks</div>
                        <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{vocabCount}</strong>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #8b5cf6', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Sentences Checks</div>
                        <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{sentencesCount}</strong>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #10b981', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weekly Vlogs Checks</div>
                        <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{vlogsCount}</strong>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #f43f5e', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Video Reactions Logged</div>
                        <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{videoReactionCount}</strong>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #06b6d4', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hadithul Arabia Logged</div>
                        <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{hadithulArabiaCount}</strong>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Oral Talks Graded</div>
                        <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{customCount}</strong>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #1e3a8a', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exams Recorded</div>
                        <strong style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{examsCount}</strong>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.03)', borderLeft: '3px solid #dc2626', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: '0.8rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 600 }}>Speaking Penalties</div>
                        <strong style={{ fontSize: '1.4rem', color: '#dc2626' }}>{penaltiesCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Staff Duties & Task Completion */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* DAILY TASKS LOGGED BY STAFF (TODAY) */}
                  <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                      <CheckCircle2 size={18} className="text-primary" /> Daily Checklist Tasks Completed
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      Status of daily checks to be completed by staff today.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {dailyTasks.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No daily checklist tasks configured.</p>
                      ) : (
                        dailyTasks.map(task => {
                          const log = dailyLogs.find(l => l.task_id === task.id);
                          const completed = !!log;
                          return (
                            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <div>
                                <strong style={{ fontSize: '0.95rem' }}>{task.title}</strong>
                                {completed && log && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                    Completed by: <strong>{staffList.find(s => s.id === log.completed_by)?.name || 'Staff'}</strong>
                                  </div>
                                )}
                              </div>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                fontWeight: 700, 
                                background: completed ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', 
                                color: completed ? '#16a34a' : '#ea580c' 
                              }}>
                                {completed ? '✓ Done' : '✕ Pending'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* PENDING STAFF ONE-OFF DUTIES */}
                  <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                      <AlertTriangle size={18} className="text-primary" /> Pending One-Off Staff Duties
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      Assigned duties currently pending or in progress.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {pendingOneOffs.length === 0 ? (
                        <p style={{ color: '#16a34a', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 600 }}>✓ All one-off duties completed!</p>
                      ) : (
                        pendingOneOffs.map(task => (
                          <div key={task.id} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #ea580c', borderRadius: '0 8px 8px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.95rem' }}>{task.title}</strong>
                              <span style={{ 
                                fontSize: '0.7rem', 
                                background: task.status === 'in_progress' ? 'rgba(234,88,12,0.1)' : 'rgba(0,0,0,0.05)', 
                                color: task.status === 'in_progress' ? '#ea580c' : 'var(--text-muted)', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                fontWeight: 700 
                              }}>
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                            {task.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.3rem 0' }}>{task.description}</p>}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                              Assigned to: <strong>{task.staff_profiles?.name || 'Unassigned'}</strong>
                              {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* RECENTLY COMPLETED ONE-OFF DUTIES */}
                  {completedOneOffs.length > 0 && (
                    <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                        <CheckCircle2 size={18} className="text-primary" /> Recently Completed One-Off Duties
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {completedOneOffs.map(task => (
                          <div key={task.id} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.01)', borderLeft: '3px solid #16a34a', borderRadius: '0 8px 8px 0', opacity: 0.85 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.9rem', textDecoration: 'line-through' }}>{task.title}</strong>
                              <span style={{ fontSize: '0.7rem', background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>completed</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Completed by: <strong>{task.staff_profiles?.name || 'Unassigned'}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Live Leaderboard / Scoreboard Section */}
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201,156,51,0.12)', paddingBottom: '1rem', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                    <TrendingUp size={20} className="text-primary" /> Live Leaderboard Standings
                  </h3>

                  {/* Active Batches Selection Pills */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Select Live Batch:</span>
                    {activeIntervals.length === 0 ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active batches</span>
                    ) : (
                      activeIntervals.map(interval => {
                        const isSelected = overviewSelectedInterval === interval.id;
                        return (
                          <button
                            key={interval.id}
                            onClick={() => setOverviewSelectedInterval(interval.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '20px',
                              border: '1.5px solid',
                              borderColor: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                              background: isSelected ? 'linear-gradient(135deg, rgba(201,156,51,0.12), rgba(201,156,51,0.03))' : 'white',
                              color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                          >
                            <span style={{
                              display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                              background: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.2)'
                            }}></span>
                            <span>{getShortCourseName(interval.course_id)} • Batch {interval.batch_number}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Leaderboard list container */}
                <div className="leaderboard-list">
                  {overviewLeaderboard.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No student rankings logged for this period.
                    </div>
                  ) : (
                    overviewLeaderboard.map(entry => {
                      const initials = entry.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                      const topScore = overviewLeaderboard[0]?.total_score || 100;
                      const relativePercent = topScore > 0 ? Math.min(100, Math.max(0, (entry.total_score / topScore) * 100)) : 0;

                      // Rank badge logic
                      const getRankBadge = (rank: number) => {
                        if (rank === 1) return { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '👑 1st', color: 'white' };
                        if (rank === 2) return { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', text: '🥈 2nd', color: '#1e293b' };
                        if (rank === 3) return { bg: 'linear-gradient(135deg, #ffedd5, #b45309)', text: '🥉 3rd', color: '#78350f' };
                        return { bg: '#f1f5f9', text: `#${rank}`, color: '#64748b' };
                      };
                      const rankBadge = getRankBadge(entry.rank);

                      // Dynamic Avatar color gradient
                      const getAvatarGradient = (id: string) => {
                        const colors = [
                          'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
                          'linear-gradient(135deg, #10b981, #047857)', // Green
                          'linear-gradient(135deg, #8b5cf6, #5b21b6)', // Purple
                          'linear-gradient(135deg, #ec4899, #be185d)', // Pink
                          'linear-gradient(135deg, #f97316, #c2410c)'  // Orange
                        ];
                        const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                        return colors[charCodeSum % colors.length];
                      };

                      return (
                        <div 
                          key={entry.student_id} 
                          className="rank-card"
                          onClick={() => {
                            const studentObj = studentList.find(s => s.id === entry.student_id);
                            if (studentObj) handleOpenReport(studentObj);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Rank Pill */}
                          <div 
                            className="rank-badge"
                            style={{
                              background: rankBadge.bg,
                              color: rankBadge.color,
                            }}
                          >
                            {rankBadge.text}
                          </div>

                          {/* Avatar Bubble */}
                          <div 
                            className="avatar-bubble"
                            style={{
                              background: getAvatarGradient(entry.student_id)
                            }}
                          >
                            {initials}
                          </div>

                          {/* Name & Gamified Level progress bar */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 750, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                {entry.name}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                Lvl {entry.level}
                              </span>
                              <div style={{ height: '6px', flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden', maxWidth: '200px' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${relativePercent}%`, 
                                    background: 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', 
                                    borderRadius: '10px' 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Total points XP */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '45px' }}>
                            <span className="xp-badge" style={{ color: 'var(--text-main)' }}>
                              {entry.total_score}
                            </span>
                            <span className="xp-label">
                              XP
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {/* TAB: Manage Tasks (Create and Delete Staff Tasks) */}
        {isLeadership && adminTab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={20} className="text-primary" /> Create & Assign Task</h3>
              <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Task Title</label>
                  <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="form-input" placeholder="e.g. Switch off all ACs and lights" required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Task Description (Optional)</label>
                  <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} className="form-input" placeholder="Provide details about keys etc." rows={2} />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Task Schedule Type</label>
                  <select value={taskType} onChange={(e) => setTaskType(e.target.value as any)} className="form-input">
                    <option value="daily">Daily Repeated Task</option>
                    <option value="one_off">One-Off Specific Date Task</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Assign To Staff Member</label>
                  <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="form-input" required>
                    <option value="">Select Assignee...</option>
                    {staffList.filter(s => s.status === 'active').map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name} ({staff.designation || 'Staff'})</option>
                    ))}
                  </select>
                </div>
                {taskType === 'one_off' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Due Date</label>
                    <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="form-input" required={taskType === 'one_off'} />
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
                          Assignee: <strong>{task.staff_profiles?.name || 'Unassigned'}</strong>
                          {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', background: task.status === 'completed' ? 'rgba(34,197,94,0.1)' : task.status === 'in_progress' ? 'rgba(234,88,12,0.1)' : 'rgba(0,0,0,0.05)', color: task.status === 'completed' ? '#16a34a' : task.status === 'in_progress' ? '#ea580c' : 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '50px', fontWeight: 600 }}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <button onClick={() => handleDeleteTask(task.id)} className="btn btn-outline" style={{ padding: '0.5rem', color: '#dc2626', borderColor: '#fca5a5' }}>
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

        {/* =========================================================================
            TAB: STUDENT CLASSROOMS (homework tracking, penalties, exams)
            ========================================================================= */}
        {adminTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Batch Filtering Panel */}
            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚡</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Live Batches</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontWeight: 750, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Activity Date:</label>
                    <input 
                      type="date" 
                      value={selectedGradingDate} 
                      onChange={(e) => setSelectedGradingDate(e.target.value)} 
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    />
                  </div>
                  
                  <button 
                    onClick={() => setShowArchivedFilter(!showArchivedFilter)} 
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.85rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline', outline: 'none'
                    }}
                  >
                    🔍 {showArchivedFilter ? 'Hide Search' : 'Search Other Batches'}
                  </button>
                </div>
              </div>

              {/* Quick-Access Row of Active Batches */}
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {intervalsList.filter(i => i.is_active).length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No live scoring periods currently running. Create one in Settings.
                  </span>
                ) : (
                  intervalsList.filter(i => i.is_active).map(interval => {
                    const isSelected = filterCourse === interval.course_id && parseInt(filterBatch) === interval.batch_number;
                    return (
                      <button
                        key={interval.id}
                        onClick={() => {
                          setFilterCourse(interval.course_id);
                          setFilterBatch(interval.batch_number.toString());
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.6rem 1.2rem',
                          borderRadius: '50px',
                          border: '2px solid',
                          borderColor: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
                          background: isSelected ? 'linear-gradient(135deg, rgba(201,156,51,0.12), rgba(201,156,51,0.03))' : 'white',
                          boxShadow: isSelected ? '0 0 15px rgba(201,156,51,0.15)' : 'none',
                          color: isSelected ? 'var(--primary-dark)' : 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        <span style={{
                          display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                          background: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.2)',
                          boxShadow: isSelected ? '0 0 8px var(--primary)' : 'none'
                        }}></span>
                        <span>{getShortCourseName(interval.course_id)} • Batch {interval.batch_number}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 500 }}>({interval.name})</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Collapsible Manual Selection / Archive Query */}
              {showArchivedFilter && (
                <div style={{ 
                  display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap', 
                  background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '10px', 
                  border: '1px dashed rgba(201,156,51,0.2)', animation: 'slideDown 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: 750, fontSize: '0.85rem' }}>Select Course:</label>
                    <select 
                      value={filterCourse} 
                      onChange={(e) => setFilterCourse(e.target.value)} 
                      style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(201,156,51,0.25)', outline: 'none', background: 'white', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: 750, fontSize: '0.85rem' }}>Batch Number:</label>
                    <input 
                      type="number" 
                      value={filterBatch} 
                      onChange={(e) => setFilterBatch(e.target.value)} 
                      placeholder="e.g. 25"
                      style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(201,156,51,0.25)', width: '70px', outline: 'none', background: 'white', fontWeight: 600, fontSize: '0.85rem' }}
                    />
                  </div>

                  {activeInterval ? (
                    <span style={{ fontSize: '0.8rem', background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '0.3rem 0.8rem', borderRadius: '50px', fontWeight: 700 }}>
                      Scoreboard: {activeInterval.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '0.3rem 0.8rem', borderRadius: '50px', fontWeight: 700 }}>
                      ⚠️ Inactive Scoring Period
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Pending Student Registrations approvals */}
            {isLeadership && (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserCheck size={18} className="text-primary" /> Pending Student Approvals</h3>
                
                {studentList.filter(s => s.status === 'pending').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No student signups waiting for approval.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {studentList.filter(s => s.status === 'pending').map(stud => (
                      <div key={stud.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.015)', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '10px', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <strong>{stud.name}</strong> ({stud.email})
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Course: <strong>{courses.find(c => c.id === stud.course_id)?.name || 'Course'}</strong> • Batch: <strong>{stud.batch_number}</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleApproveStudent(stud.id, true)} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                            Approve
                          </button>
                          <button onClick={() => handleApproveStudent(stud.id, false)} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CLASSROOM SCORE SHEET PANEL */}
            {activeInterval && (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
                
                {/* Mode Selector */}
                <div style={{ 
                  display: 'flex', 
                  borderBottom: '1px solid rgba(0,0,0,0.05)', 
                  marginBottom: '2rem', 
                  gap: '1.5rem',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  <button 
                    onClick={() => setGradingMode('vocab_sentences')}
                    style={{
                      padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                      borderBottom: gradingMode === 'vocab_sentences' ? '3px solid var(--primary)' : '3px solid transparent',
                      color: gradingMode === 'vocab_sentences' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    WhatsApp & Vlog Check-ins
                  </button>
                  <button 
                    onClick={() => setGradingMode('exam')}
                    style={{
                      padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                      borderBottom: gradingMode === 'exam' ? '3px solid var(--primary)' : '3px solid transparent',
                      color: gradingMode === 'exam' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    Conduct Exam
                  </button>
                  <button 
                    onClick={() => setGradingMode('custom')}
                    style={{
                      padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                      borderBottom: gradingMode === 'custom' ? '3px solid var(--primary)' : '3px solid transparent',
                      color: gradingMode === 'custom' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    Custom Activities
                  </button>
                  <button 
                    onClick={() => {
                      setGradingMode('batch_sheet');
                      if (activeInterval) fetchBatchScores(activeInterval.id);
                    }}
                    style={{
                      padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                      borderBottom: gradingMode === 'batch_sheet' ? '3px solid var(--primary)' : '3px solid transparent',
                      color: gradingMode === 'batch_sheet' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    📊 Batch Sheet (Matrix View)
                  </button>
                  <button 
                    onClick={() => {
                      setGradingMode('leaderboard');
                      if (activeInterval) fetchClassroomLeaderboard(activeInterval.id);
                    }}
                    style={{
                      padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                      borderBottom: gradingMode === 'leaderboard' ? '3px solid var(--primary)' : '3px solid transparent',
                      color: gradingMode === 'leaderboard' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}
                  >
                    🏆 Live Scoreboard
                  </button>
                  {isLeadership && (
                    <button 
                      onClick={() => setGradingMode('manage')}
                      style={{
                        padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                        borderBottom: gradingMode === 'manage' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: gradingMode === 'manage' ? 'var(--primary-dark)' : 'var(--text-muted)',
                        fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                        whiteSpace: 'nowrap', flexShrink: 0
                      }}
                    >
                      Manage Students
                    </button>
                  )}
                </div>

                {/* Sub Mode: Batch Sheet (Matrix View) */}
                {gradingMode === 'batch_sheet' && (() => {
                  const batchStartDate = (activeInterval && activeInterval.start_date)
                    ? activeInterval.start_date
                    : (activeInterval && activeInterval.created_at)
                      ? activeInterval.created_at
                      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

                  const matrixDates = getDatesRange(batchStartDate);

                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
                            📊 Batch Sheet (Matrix View)
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                            View and edit completions for all students and all dates since batch commencement in a single grid.
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 750, color: 'var(--text-muted)' }}>Select Activity / Metric:</label>
                          <select
                            value={matrixActivity}
                            onChange={(e) => setMatrixActivity(e.target.value as any)}
                            style={{
                              padding: '0.4rem 0.6rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(201,156,51,0.3)',
                              outline: 'none',
                              background: 'white',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="attendance">📅 Attendance Status</option>
                            <option value="daily_vocab">📚 WhatsApp Vocab (+5 XP)</option>
                            <option value="daily_sentences">✍️ Daily Sentences (+5 XP)</option>
                            <option value="weekly_vlog">📹 Weekly Vlog (+15 XP)</option>
                            <option value="video_reaction">💬 Video Reaction (+15 XP)</option>
                            <option value="hadithul_arabia">🕌 Hadithul Arabia (+10 XP)</option>
                          </select>
                          
                          {sortedFilteredActiveStudents.length > 0 && (
                            <button
                              onClick={() => handlePrintMatrix(sortedFilteredActiveStudents)}
                              className="btn btn-outline"
                              style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                borderColor: 'var(--primary)',
                                color: 'var(--primary-dark)',
                                cursor: 'pointer'
                              }}
                            >
                              <Printer size={14} /> Print Matrix
                            </button>
                          )}
                        </div>
                      </div>

                      {loadingBatchScores ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ width: '30px', height: '30px', border: '3px solid rgba(201,156,51,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
                          <span>Loading batch logs...</span>
                        </div>
                      ) : sortedFilteredActiveStudents.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active students registered for this batch/course.</p>
                      ) : (
                        <div className="matrix-table-container" style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', background: 'white', maxHeight: '550px' }}>
                          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.82rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                                <th style={{
                                  padding: '0.8rem 1rem',
                                  fontWeight: 800,
                                  position: 'sticky',
                                  left: 0,
                                  top: 0,
                                  zIndex: 20,
                                  background: '#f1f5f9',
                                  borderRight: '2px solid rgba(0,0,0,0.08)',
                                  borderBottom: '2px solid rgba(0,0,0,0.08)',
                                  whiteSpace: 'nowrap'
                                }}>
                                  Student Name
                                </th>
                                {matrixDates.map(dateStr => (
                                  <th key={dateStr} style={{
                                    padding: '0.8rem 0.5rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 10,
                                    background: '#f8fafc',
                                    borderBottom: '2px solid rgba(0,0,0,0.08)',
                                    borderRight: '1px solid rgba(0,0,0,0.04)',
                                    whiteSpace: 'nowrap',
                                    minWidth: '80px'
                                  }}>
                                    {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sortedFilteredActiveStudents.map(student => (
                                <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                  <td style={{
                                    padding: '0.8rem 1rem',
                                    fontWeight: 650,
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 5,
                                    background: 'white',
                                    borderRight: '2px solid rgba(0,0,0,0.08)',
                                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.3rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                                    {student.name}
                                  </td>
                                  {matrixDates.map(dateStr => {
                                    const lockKey = `${student.id}-${dateStr}-${matrixActivity}`;
                                    const isLocked = updatingMatrix.includes(lockKey) || updatingMatrix.includes(`${student.id}-${dateStr}-attendance`);
                                    
                                    if (matrixActivity === 'attendance') {
                                      const attObj = batchScores.find(s => s.student_id === student.id && s.logged_date === dateStr && s.score_type === 'attendance');
                                      const currentValue = attObj ? attObj.activity_name.replace('Attendance: ', '') : '';

                                      return (
                                        <td key={dateStr} style={{
                                          padding: '0.5rem 0.3rem',
                                          textAlign: 'center',
                                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                                          borderRight: '1px solid rgba(0,0,0,0.04)',
                                          opacity: isLocked ? 0.5 : 1
                                        }}>
                                          <select
                                            value={currentValue}
                                            onChange={(e) => handleToggleMatrixAttendance(student.id, dateStr, e.target.value)}
                                            disabled={isLocked}
                                            style={{
                                              padding: '0.2rem 0.3rem',
                                              borderRadius: '6px',
                                              border: '1px solid rgba(0,0,0,0.12)',
                                              background: currentValue === 'On Time' ? 'rgba(34,197,94,0.08)' : currentValue === 'Late' ? 'rgba(180,83,9,0.08)' : currentValue === 'Half Day' ? 'rgba(59,130,246,0.08)' : currentValue === 'Absent' ? 'rgba(239,68,68,0.08)' : 'white',
                                              color: currentValue === 'On Time' ? '#16a34a' : currentValue === 'Late' ? '#b45309' : currentValue === 'Half Day' ? '#3b82f6' : currentValue === 'Absent' ? '#dc2626' : 'var(--text-muted)',
                                              fontWeight: currentValue ? 700 : 500,
                                              fontSize: '0.75rem',
                                              outline: 'none',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            <option value="">-</option>
                                            <option value="On Time">On Time</option>
                                            <option value="Late">Late</option>
                                            <option value="Half Day">Half Day</option>
                                            <option value="Absent">Absent</option>
                                          </select>
                                        </td>
                                      );
                                    } else {
                                      const existing = batchScores.find(s => s.student_id === student.id && s.logged_date === dateStr && s.score_type === matrixActivity);
                                      const isChecked = !!existing;

                                      return (
                                        <td key={dateStr} style={{
                                          padding: '0.5rem 0.3rem',
                                          textAlign: 'center',
                                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                                          borderRight: '1px solid rgba(0,0,0,0.04)',
                                          opacity: isLocked ? 0.5 : 1
                                        }}>
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={isLocked}
                                            onChange={() => handleToggleMatrixCell(student.id, dateStr, matrixActivity, existing)}
                                            style={{
                                              width: '16px',
                                              height: '16px',
                                              cursor: 'pointer',
                                              accentColor: 'var(--primary)'
                                            }}
                                          />
                                        </td>
                                      );
                                    }
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sub Mode A: Daily Checkins & Red Penalty Button */}
                {gradingMode === 'vocab_sentences' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
                        Score Sheet: <span className="text-gradient" style={{ fontWeight: 800 }}>{new Date(selectedGradingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Tap cards/cells to toggle completion status.
                      </span>
                    </div>
                    
                    {filteredActiveStudents.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active students registered for this batch/course.</p>
                    ) : (
                      <>
                        <style>{`
                          @media (max-width: 768px) {
                            .desktop-score-table { display: none !important; }
                            .mobile-score-cards { display: flex !important; }
                          }
                          @media (min-width: 769px) {
                            .desktop-score-table { display: block !important; }
                            .mobile-score-cards { display: none !important; }
                          }
                        `}</style>

                        {/* DESKTOP TABLE VIEW */}
                        <div className="desktop-score-table" style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)' }}>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Student Name</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Attendance (10 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>WhatsApp Vocab (+5 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Daily Sentences (+5 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Weekly Vlog (+15 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Video Reaction (+15 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Hadithul Arabia (+10 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>One Minute Talk (10 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Language Policy</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedFilteredActiveStudents.map(student => {
                                const hasVocabToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_vocab');
                                const hasSentencesToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_sentences');
                                const hasVlogToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'weekly_vlog');
                                const hasVideoReactionToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'video_reaction');
                                const hasHadithulArabiaToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'hadithul_arabia');

                                return (
                                  <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                    <td style={{ padding: '1rem 0.5rem', fontWeight: 650 }}>
                                      {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.4rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                                      {student.name}
                                    </td>
                                    
                                    {/* Attendance select */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                      {(() => {
                                        const attendanceObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'attendance');
                                        const currentValue = attendanceObj 
                                          ? attendanceObj.activity_name.replace('Attendance: ', '') 
                                          : '';
                                        
                                        return (
                                          <select
                                            value={currentValue}
                                            onChange={(e) => handleToggleAttendance(student.id, e.target.value)}
                                            disabled={updatingScores.includes(`${student.id}-attendance`)}
                                            style={{
                                              padding: '0.35rem 0.5rem',
                                              borderRadius: '8px',
                                              border: '1px solid rgba(201,156,51,0.25)',
                                              background: currentValue === 'On Time' ? 'rgba(34,197,94,0.08)' : currentValue === 'Late' ? 'rgba(180,83,9,0.08)' : currentValue === 'Half Day' ? 'rgba(59,130,246,0.08)' : currentValue === 'Absent' ? 'rgba(239,68,68,0.08)' : 'white',
                                              color: currentValue === 'On Time' ? '#16a34a' : currentValue === 'Late' ? '#b45309' : currentValue === 'Half Day' ? '#3b82f6' : currentValue === 'Absent' ? '#dc2626' : 'var(--text-muted)',
                                              fontWeight: currentValue ? 700 : 500,
                                              outline: 'none',
                                              cursor: 'pointer',
                                              fontSize: '0.85rem'
                                            }}
                                          >
                                            <option value="">- Select -</option>
                                            <option value="On Time">On Time (+10 XP)</option>
                                            <option value="Late">Late (+7 XP)</option>
                                            <option value="Half Day">Half Day (+5 XP)</option>
                                            <option value="Absent">Absent (0 XP)</option>
                                          </select>
                                        );
                                      })()}
                                    </td>

                                    {/* Vocab check */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={hasVocabToday}
                                        onChange={(e) => handleToggleStudentScore(student.id, 'daily_vocab', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                      />
                                    </td>

                                    {/* Sentences check */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={hasSentencesToday}
                                        onChange={(e) => handleToggleStudentScore(student.id, 'daily_sentences', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                      />
                                    </td>

                                    {/* Vlog check */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={hasVlogToday}
                                        onChange={(e) => handleToggleStudentScore(student.id, 'weekly_vlog', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                      />
                                    </td>

                                    {/* Video Reaction check */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={hasVideoReactionToday}
                                        onChange={(e) => handleToggleStudentScore(student.id, 'video_reaction', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                      />
                                    </td>

                                    {/* Hadithul Arabia check */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={hasHadithulArabiaToday}
                                        onChange={(e) => handleToggleStudentScore(student.id, 'hadithul_arabia', e.target.checked)}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                      />
                                    </td>

                                    {/* One Minute Talk select */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                      {(() => {
                                        const talkScoreObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'custom' && s.activity_name === 'One Minute Talk');
                                        const currentValue = talkScoreObj ? talkScoreObj.points.toString() : '';
                                        
                                        return (
                                          <select
                                            value={currentValue}
                                            onChange={(e) => handleToggleOneMinuteTalk(student.id, e.target.value)}
                                            disabled={updatingScores.includes(`${student.id}-talk`)}
                                            style={{
                                              padding: '0.35rem 0.5rem',
                                              borderRadius: '8px',
                                              border: '1px solid rgba(201,156,51,0.25)',
                                              background: currentValue ? 'rgba(201,156,51,0.08)' : 'white',
                                              fontWeight: currentValue ? 700 : 500,
                                              outline: 'none',
                                              cursor: 'pointer',
                                              fontSize: '0.85rem'
                                            }}
                                          >
                                            <option value="">-</option>
                                            {[...Array(11).keys()].map(n => (
                                              <option key={n} value={n}>{n}/10</option>
                                            ))}
                                          </select>
                                        );
                                      })()}
                                    </td>

                                    {/* Malayalam Speaking Penalty (trackable, editable) */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                                      {(() => {
                                        const penalty = scoresList.find(s => s.student_id === student.id && s.score_type === 'penalty');
                                        const points = penalty ? penalty.points : 0;
                                        const count = Math.abs(points) / 2;
                                        
                                        return (
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                            {count > 0 && (
                                              <button
                                                onClick={() => handleMalayalamPenalty(student.id, 'decrement')}
                                                style={{
                                                  padding: '0.2rem 0.4rem', fontSize: '0.75rem',
                                                  color: '#16a34a', borderColor: '#86efac',
                                                  background: 'rgba(34,197,94,0.03)', cursor: 'pointer',
                                                  borderRadius: '4px', border: '1px solid',
                                                  outline: 'none'
                                                }}
                                                title="Reduce Penalty Count"
                                              >
                                                -1
                                              </button>
                                            )}
                                            <span style={{ 
                                              fontSize: '0.85rem', fontWeight: count > 0 ? 800 : 500,
                                              color: count > 0 ? '#dc2626' : 'var(--text-muted)',
                                              background: count > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.02)',
                                              padding: '0.25rem 0.5rem', borderRadius: '6px',
                                              border: count > 0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid transparent',
                                              display: 'inline-flex', alignItems: 'center'
                                            }}>
                                              {points} XP
                                            </span>
                                            <button
                                              onClick={() => handleMalayalamPenalty(student.id, 'increment')}
                                              style={{
                                                padding: '0.2rem 0.4rem', fontSize: '0.75rem',
                                                color: '#dc2626', borderColor: '#fca5a5',
                                                background: 'rgba(239,68,68,0.03)', cursor: 'pointer',
                                                borderRadius: '4px', border: '1px solid',
                                                outline: 'none'
                                              }}
                                              title="Add Penalty Count"
                                            >
                                              +1
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* MOBILE CARDS VIEW */}
                        <div className="mobile-score-cards" style={{ display: 'none', flexDirection: 'column', gap: '1.2rem' }}>
                          {sortedFilteredActiveStudents.map(student => {
                            const hasVocabToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_vocab');
                            const hasSentencesToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_sentences');
                            const hasVlogToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'weekly_vlog');
                            const hasVideoReactionToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'video_reaction');
                            const hasHadithulArabiaToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'hadithul_arabia');

                            return (
                              <div key={student.id} className="glass-card" style={{ padding: '1.2rem', border: '1px solid rgba(201,156,51,0.15)', background: 'white', borderRadius: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                                    {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.4rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                                    {student.name}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', background: 'rgba(201,156,51,0.1)', color: 'var(--primary-dark)', padding: '0.25rem 0.6rem', borderRadius: '50px', fontWeight: 700 }}>Active</span>
                                </div>

                                {/* Toggle Pills */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
                                  {/* Vocab */}
                                  <button
                                    onClick={() => handleToggleStudentScore(student.id, 'daily_vocab', !hasVocabToday)}
                                    style={{
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      padding: '0.6rem 0.4rem', borderRadius: '10px', border: '1px solid transparent',
                                      background: hasVocabToday ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.03)',
                                      color: hasVocabToday ? '#16a34a' : 'var(--text-muted)',
                                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                      outline: 'none', borderColor: hasVocabToday ? '#22c55e' : 'transparent'
                                    }}
                                  >
                                    <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>📚</span>
                                    <span>Vocab</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>{hasVocabToday ? '✓ Done' : '+5 XP'}</span>
                                  </button>

                                  {/* Sentences */}
                                  <button
                                    onClick={() => handleToggleStudentScore(student.id, 'daily_sentences', !hasSentencesToday)}
                                    style={{
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      padding: '0.6rem 0.4rem', borderRadius: '10px', border: '1px solid transparent',
                                      background: hasSentencesToday ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.03)',
                                      color: hasSentencesToday ? '#16a34a' : 'var(--text-muted)',
                                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                      outline: 'none', borderColor: hasSentencesToday ? '#22c55e' : 'transparent'
                                    }}
                                  >
                                    <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>✍️</span>
                                    <span>Sentences</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>{hasSentencesToday ? '✓ Done' : '+5 XP'}</span>
                                  </button>

                                  {/* Vlog */}
                                  <button
                                    onClick={() => handleToggleStudentScore(student.id, 'weekly_vlog', !hasVlogToday)}
                                    style={{
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      padding: '0.6rem 0.4rem', borderRadius: '10px', border: '1px solid transparent',
                                      background: hasVlogToday ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.03)',
                                      color: hasVlogToday ? '#16a34a' : 'var(--text-muted)',
                                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                      outline: 'none', borderColor: hasVlogToday ? '#22c55e' : 'transparent'
                                    }}
                                  >
                                    <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🎥</span>
                                    <span>Vlog</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>{hasVlogToday ? '✓ Approved' : '+15 XP'}</span>
                                  </button>

                                  {/* Video Reaction */}
                                  <button
                                    onClick={() => handleToggleStudentScore(student.id, 'video_reaction', !hasVideoReactionToday)}
                                    style={{
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      padding: '0.6rem 0.4rem', borderRadius: '10px', border: '1px solid transparent',
                                      background: hasVideoReactionToday ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.03)',
                                      color: hasVideoReactionToday ? '#16a34a' : 'var(--text-muted)',
                                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                      outline: 'none', borderColor: hasVideoReactionToday ? '#22c55e' : 'transparent'
                                    }}
                                  >
                                    <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>💬</span>
                                    <span>Reaction</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>{hasVideoReactionToday ? '✓ Done' : '+15 XP'}</span>
                                  </button>

                                  {/* Hadithul Arabia */}
                                  <button
                                    onClick={() => handleToggleStudentScore(student.id, 'hadithul_arabia', !hasHadithulArabiaToday)}
                                    style={{
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      padding: '0.6rem 0.4rem', borderRadius: '10px', border: '1px solid transparent',
                                      background: hasHadithulArabiaToday ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.03)',
                                      color: hasHadithulArabiaToday ? '#16a34a' : 'var(--text-muted)',
                                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                      outline: 'none', borderColor: hasHadithulArabiaToday ? '#22c55e' : 'transparent'
                                    }}
                                  >
                                    <span style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>🌐</span>
                                    <span>Hadithul A</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.1rem' }}>{hasHadithulArabiaToday ? '✓ Done' : '+10 XP'}</span>
                                  </button>
                                </div>

                                {/* Attendance (Mobile) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', marginBottom: '0.6rem', border: '1px solid rgba(0,0,0,0.03)' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>📅 Attendance:</span>
                                  {(() => {
                                    const attendanceObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'attendance');
                                    const currentValue = attendanceObj 
                                      ? attendanceObj.activity_name.replace('Attendance: ', '') 
                                      : '';
                                    return (
                                      <select
                                        value={currentValue}
                                        onChange={(e) => handleToggleAttendance(student.id, e.target.value)}
                                        disabled={updatingScores.includes(`${student.id}-attendance`)}
                                        style={{
                                          padding: '0.3rem 0.5rem',
                                          borderRadius: '6px',
                                          border: '1px solid rgba(201,156,51,0.25)',
                                          background: currentValue === 'On Time' ? 'rgba(34,197,94,0.08)' : currentValue === 'Late' ? 'rgba(180,83,9,0.08)' : currentValue === 'Half Day' ? 'rgba(59,130,246,0.08)' : currentValue === 'Absent' ? 'rgba(239,68,68,0.08)' : 'white',
                                          color: currentValue === 'On Time' ? '#16a34a' : currentValue === 'Late' ? '#b45309' : currentValue === 'Half Day' ? '#3b82f6' : currentValue === 'Absent' ? '#dc2626' : 'var(--text-muted)',
                                          fontWeight: currentValue ? 700 : 500,
                                          outline: 'none',
                                          cursor: 'pointer',
                                          fontSize: '0.8rem'
                                        }}
                                      >
                                        <option value="">- Select -</option>
                                        <option value="On Time">On Time (+10 XP)</option>
                                        <option value="Late">Late (+7 XP)</option>
                                        <option value="Half Day">Half Day (+5 XP)</option>
                                        <option value="Absent">Absent (0 XP)</option>
                                      </select>
                                    );
                                  })()}
                                </div>

                                {/* One Minute Talk (Mobile) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', marginBottom: '0.8rem', border: '1px solid rgba(0,0,0,0.03)' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>🎙️ One Minute Talk:</span>
                                  {(() => {
                                    const talkScoreObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'custom' && s.activity_name === 'One Minute Talk');
                                    const currentValue = talkScoreObj ? talkScoreObj.points.toString() : '';
                                    return (
                                      <select
                                        value={currentValue}
                                        onChange={(e) => handleToggleOneMinuteTalk(student.id, e.target.value)}
                                        disabled={updatingScores.includes(`${student.id}-talk`)}
                                        style={{
                                          padding: '0.3rem 0.5rem',
                                          borderRadius: '6px',
                                          border: '1px solid rgba(201,156,51,0.25)',
                                          background: currentValue ? 'rgba(201,156,51,0.08)' : 'white',
                                          fontWeight: currentValue ? 700 : 500,
                                          outline: 'none',
                                          cursor: 'pointer',
                                          fontSize: '0.8rem'
                                        }}
                                      >
                                        <option value="">-</option>
                                        {[...Array(11).keys()].map(n => (
                                          <option key={n} value={n}>{n}/10</option>
                                        ))}
                                      </select>
                                    );
                                  })()}
                                </div>

                                {/* Penalty */}
                                {(() => {
                                  const penalty = scoresList.find(s => s.student_id === student.id && s.score_type === 'penalty');
                                  const points = penalty ? penalty.points : 0;
                                  const count = Math.abs(points) / 2;
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(239,68,68,0.01)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.08)' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>💬 Malayalam Penalties:</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {count > 0 && (
                                          <button
                                            onClick={() => handleMalayalamPenalty(student.id, 'decrement')}
                                            style={{
                                              padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                                              color: '#16a34a', borderColor: '#86efac',
                                              background: 'white', cursor: 'pointer',
                                              borderRadius: '6px', border: '1px solid',
                                              outline: 'none'
                                            }}
                                          >
                                            -1
                                          </button>
                                        )}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: count > 0 ? '#dc2626' : 'var(--text-muted)', padding: '0 0.2rem' }}>
                                          {points} XP
                                        </span>
                                        <button
                                          onClick={() => handleMalayalamPenalty(student.id, 'increment')}
                                          style={{
                                            padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                                            color: '#dc2626', borderColor: '#fca5a5',
                                            background: 'white', cursor: 'pointer',
                                            borderRadius: '6px', border: '1px solid',
                                            outline: 'none'
                                          }}
                                        >
                                          +1
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Sub Mode: Classroom Leaderboard */}
                {gradingMode === 'leaderboard' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Class Standing Scoreboard</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>Standings computed in-memory based on all points accrued in the current term. Click any card to view detailed reports.</p>
                      </div>
                      {classroomLeaderboard.length > 0 && (
                        <button
                          onClick={handlePrintRankList}
                          className="btn btn-outline"
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            borderColor: 'var(--primary)',
                            color: 'var(--primary-dark)',
                            cursor: 'pointer'
                          }}
                        >
                          <Printer size={14} /> Print Rank List
                        </button>
                      )}
                    </div>
                    
                    {filteredActiveStudents.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active students in this batch.</p>
                    ) : (
                      <div className="leaderboard-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {(() => {
                          const entries = classroomLeaderboard;
                          const topScore = entries[0]?.total_score || 100;

                          // Rank badge helper
                          const getRankBadge = (rank: number) => {
                            if (rank === 1) return { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '👑 1st', color: 'white' };
                            if (rank === 2) return { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', text: '🥈 2nd', color: '#1e293b' };
                            if (rank === 3) return { bg: 'linear-gradient(135deg, #ffedd5, #b45309)', text: '🥉 3rd', color: '#78350f' };
                            return { bg: '#f1f5f9', text: `#${rank}`, color: '#64748b' };
                          };

                          // Dynamic Avatar color gradient
                          const getAvatarGradient = (id: string) => {
                            const colors = [
                              'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
                              'linear-gradient(135deg, #10b981, #047857)', // Green
                              'linear-gradient(135deg, #8b5cf6, #5b21b6)', // Purple
                              'linear-gradient(135deg, #ec4899, #be185d)', // Pink
                              'linear-gradient(135deg, #f97316, #c2410c)'  // Orange
                            ];
                            const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                            return colors[charCodeSum % colors.length];
                          };

                          return entries.map(entry => {
                            const initials = entry.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                            const relativePercent = topScore > 0 ? Math.min(100, Math.max(0, (entry.total_score / topScore) * 100)) : 0;
                            const rankBadge = getRankBadge(entry.rank);

                            return (
                              <div 
                                key={entry.student_id} 
                                className="rank-card"
                                onClick={() => handleOpenReport(filteredActiveStudents.find(s => s.id === entry.student_id)!)}
                                style={{ cursor: 'pointer' }}
                              >
                                {/* Rank Pill */}
                                <div 
                                  className="rank-badge"
                                  style={{
                                    background: rankBadge.bg,
                                    color: rankBadge.color,
                                  }}
                                >
                                  {rankBadge.text}
                                </div>

                                {/* Avatar Bubble */}
                                <div 
                                  className="avatar-bubble"
                                  style={{
                                    background: getAvatarGradient(entry.student_id)
                                  }}
                                >
                                  {initials}
                                </div>

                                {/* Name & Gamified Level progress bar */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 750, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                      {entry.name}
                                    </span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                      Lvl {entry.level}
                                    </span>
                                    <div style={{ height: '6px', flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden', maxWidth: '200px' }}>
                                      <div 
                                        style={{ 
                                          height: '100%', 
                                          width: `${relativePercent}%`, 
                                          background: 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', 
                                          borderRadius: '10px' 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>

                                {/* Total points XP */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '45px' }}>
                                  <span className="xp-badge" style={{ color: 'var(--text-main)' }}>
                                    {entry.total_score}
                                  </span>
                                  <span className="xp-label">
                                    XP
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub Mode B: Exam Grading Form */}
                {gradingMode === 'exam' && (
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Log Exam Scores</h3>
                    {filteredActiveStudents.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active students to grade.</p>
                    ) : (
                      <form onSubmit={handleGradeExam}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Exam Title / Name</label>
                            <input 
                              type="text" 
                              value={examName} 
                              onChange={(e) => setExamName(e.target.value)} 
                              className="form-input" 
                              placeholder="e.g. Midterm Grammar Translation Exam" 
                              required 
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Max Obtainable Points</label>
                            <input 
                              type="number" 
                              value={examMaxPoints} 
                              onChange={(e) => setExamMaxPoints(e.target.value)} 
                              className="form-input" 
                              placeholder="100" 
                              min="1"
                              required 
                            />
                          </div>
                        </div>

                        {/* Marks entries list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                          <h4 style={{ fontSize: '0.95rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Enter Student Marks</h4>
                          {sortedFilteredActiveStudents.map(student => (
                            <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)', padding: '0.6rem 1rem', borderRadius: '8px' }}>
                              <span style={{ fontWeight: 600 }}>
                                {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.4rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                                {student.name}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                  type="number" 
                                  value={examScores[student.id] !== undefined ? examScores[student.id] : ''}
                                  onChange={(e) => setExamScores(prev => ({ ...prev, [student.id]: parseInt(e.target.value) || 0 }))}
                                  style={{ padding: '0.4rem', width: '80px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', textAlign: 'center', fontWeight: 600 }}
                                  placeholder="0"
                                  min="0"
                                  max={parseInt(examMaxPoints) || 100}
                                />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {examMaxPoints}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                          Save & Publish Exam Scores
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Sub Mode C: Custom Activity Grading Form */}
                {gradingMode === 'custom' && (
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Grade Custom Activity</h3>
                    {filteredActiveStudents.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active students to grade.</p>
                    ) : (
                      <form onSubmit={handleGradeCustom}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Activity Name</label>
                            <input 
                              type="text" 
                              value={customActivityName} 
                              onChange={(e) => setCustomActivityName(e.target.value)} 
                              className="form-input" 
                              placeholder="e.g. Vocabulary Video vlog presentation" 
                              required 
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Max Points</label>
                            <input 
                              type="number" 
                              value={customMaxPoints} 
                              onChange={(e) => setCustomMaxPoints(e.target.value)} 
                              className="form-input" 
                              placeholder="20" 
                              min="1"
                              required 
                            />
                          </div>
                        </div>

                        {/* Marks entries list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                          <h4 style={{ fontSize: '0.95rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>Enter Points</h4>
                          {sortedFilteredActiveStudents.map(student => (
                            <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)', padding: '0.6rem 1rem', borderRadius: '8px' }}>
                              <span style={{ fontWeight: 600 }}>
                                {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.4rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                                {student.name}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                  type="number" 
                                  value={customScores[student.id] !== undefined ? customScores[student.id] : ''}
                                  onChange={(e) => setCustomScores(prev => ({ ...prev, [student.id]: parseInt(e.target.value) || 0 }))}
                                  style={{ padding: '0.4rem', width: '80px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', textAlign: 'center', fontWeight: 600 }}
                                  placeholder="0"
                                  min="0"
                                  max={parseInt(customMaxPoints) || 20}
                                />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {customMaxPoints}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                          Save & Publish Custom Grades
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Sub Mode D: Manage Students (Reset Password, Delete Profile) */}
                {isLeadership && gradingMode === 'manage' && (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Classroom Student Roster</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Reset student passwords directly or delete accounts permanently from the system.</p>
                    
                    {filteredActiveStudents.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active students in this batch.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)', paddingBottom: '0.8rem' }}>
                              <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Student Name</th>
                              <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Email Address</th>
                              <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Reset Password</th>
                              <th style={{ padding: '1rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedFilteredActiveStudents.map(student => (
                              <StudentManageRow 
                                key={student.id} 
                                student={student}
                                onResetPassword={handleResetPassword}
                                onDeleteAccount={handleDeleteAccount}
                                onOpenReport={handleOpenReport}
                                onUpdateStudent={handleUpdateStudent}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* TAB: Staff Roster Management */}
        {isLeadership && adminTab === 'roster' && (
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
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
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Reset Password</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(staff => (
                    <StaffRow 
                      key={staff.id} 
                      staff={staff} 
                      onUpdate={handleUpdateStaff}
                      isSelf={staff.id === (currentUser?.id || '')}
                      onResetPassword={handleResetPassword}
                      onDeleteAccount={handleDeleteAccount}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: Student Roster Management */}
        {isLeadership && adminTab === 'student_roster' && (
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Student Roster & Profiles</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Manage student accounts: assign roll numbers, update course, batch, or status, reset passwords, view reports, or delete accounts.
            </p>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Student</label>
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={studentSearch} 
                  onChange={(e) => setStudentSearch(e.target.value)} 
                  style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none', background: 'white', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Course</label>
                <select 
                  value={studentFilterCourse} 
                  onChange={(e) => setStudentFilterCourse(e.target.value)} 
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none', background: 'white', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Batch</label>
                <select 
                  value={studentFilterBatch} 
                  onChange={(e) => setStudentFilterBatch(e.target.value)} 
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none', background: 'white', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">All Batches</option>
                  {[...Array(20)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>Batch {i + 1}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Status</label>
                <select 
                  value={studentFilterStatus} 
                  onChange={(e) => setStudentFilterStatus(e.target.value)} 
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none', background: 'white', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)', paddingBottom: '0.8rem' }}>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Student Name</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Email Address</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Roll #</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Course</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Batch</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>Reset Password</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentsForRoster.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No students found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentsForRoster.map(student => (
                      <StudentRosterRow 
                        key={student.id} 
                        student={student} 
                        courses={courses} 
                        onUpdate={handleUpdateStudent} 
                        onResetPassword={handleResetPassword} 
                        onDeleteAccount={handleDeleteAccount} 
                        onOpenReport={handleOpenReport} 
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: Activity Logs Monitor */}
        {isLeadership && adminTab === 'logs' && (
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
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

        {/* TAB: Courses & Intervals Settings Manager */}
        {isLeadership && adminTab === 'settings' && (
          <div className="grid grid-2" style={{ gap: '2rem' }}>
            
            {/* Manage Courses Panel */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}><GraduationCap size={18} className="text-primary" /> Manage Courses</h3>
              
              <form onSubmit={handleAddCourse} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input 
                  type="text" 
                  value={newCourseName} 
                  onChange={(e) => setNewCourseName(e.target.value)} 
                  className="form-input" 
                  placeholder="e.g. OET Language Coaching" 
                  required 
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}>
                  Create
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.3rem' }}>Existing Course Roster</h4>
                {courses.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.9rem' }}>
                    <span>{c.name}</span>
                    <code style={{ fontSize: '0.75rem', opacity: 0.6 }}>{c.id.substring(0,8)}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Manage Scoring Intervals (Scoreboard resets) */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}><ClipboardList size={18} className="text-primary" /> Scoreboard Reset & Intervals</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Add a new interval to reset a batch's scoreboard. Historical scores remain archived.</p>

              <form onSubmit={handleAddInterval} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Course</label>
                  <select 
                    value={newIntervalCourse} 
                    onChange={(e) => setNewIntervalCourse(e.target.value)} 
                    className="form-input"
                    required
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Batch Number</label>
                    <input 
                      type="number" 
                      value={newIntervalBatch} 
                      onChange={(e) => setNewIntervalBatch(e.target.value)} 
                      className="form-input" 
                      placeholder="e.g. 25" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Interval Name</label>
                    <input 
                      type="text" 
                      value={newIntervalName} 
                      onChange={(e) => setNewIntervalName(e.target.value)} 
                      className="form-input" 
                      placeholder="e.g. Term 2 Phase" 
                      required 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Archive Scores & Reset Leaderboard
                </button>
              </form>

              {/* Intervals list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.3rem' }}>All Intervals History</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {intervalsList.map(int => {
                    const cName = courses.find(c => c.id === int.course_id)?.name || 'Course';
                    return (
                      <div key={int.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.015)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{int.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cName} (Batch {int.batch_number})</div>
                        </div>
                        {int.is_active ? (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>Active</span>
                            <button 
                              onClick={() => handleSetIntervalInactive(int.id)} 
                              className="btn btn-outline" 
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5', background: 'rgba(239,68,68,0.02)' }}
                            >
                              Deactivate
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleToggleIntervalActiveStatus(int.id, int.course_id, int.batch_number)} 
                            className="btn btn-outline" 
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
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
              {intervalsList.filter(i => i.is_active).length > 0 && (
                <div style={{ marginTop: '2rem', marginBottom: '2rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Settings size={16} className="text-primary" /> Active Period Target Configurations
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem' }}>Configure targets (total working days and task requirements) for active scoring intervals.</p>
                  
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Select Active Period</label>
                    <select 
                      value={selectedConfigIntervalId}
                      onChange={(e) => setSelectedConfigIntervalId(e.target.value)}
                      className="form-input"
                    >
                      {intervalsList.filter(i => i.is_active).map(int => {
                        const cName = courses.find(c => c.id === int.course_id)?.name || 'Course';
                        return (
                          <option key={int.id} value={int.id}>{int.name} - {cName} (Batch {int.batch_number})</option>
                        );
                      })}
                    </select>
                  </div>

                  <form onSubmit={handleSaveIntervalTargets} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Start Date (Course Commencement)</label>
                        <input 
                          type="date" 
                          value={configStartDate} 
                          onChange={(e) => setConfigStartDate(e.target.value)} 
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Working Days Target</label>
                        <input 
                          type="number" 
                          value={configWorkingDays} 
                          onChange={(e) => setConfigWorkingDays(parseInt(e.target.value) || 0)} 
                          className="form-input"
                          min={1}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Vocab Tasks Target</label>
                        <input 
                          type="number" 
                          value={configVocab} 
                          onChange={(e) => setConfigVocab(parseInt(e.target.value) || 0)} 
                          className="form-input"
                          min={0}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Sentences Target</label>
                        <input 
                          type="number" 
                          value={configSentences} 
                          onChange={(e) => setConfigSentences(parseInt(e.target.value) || 0)} 
                          className="form-input"
                          min={0}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Vlogs Target</label>
                        <input 
                          type="number" 
                          value={configVlog} 
                          onChange={(e) => setConfigVlog(parseInt(e.target.value) || 0)} 
                          className="form-input"
                          min={0}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Reactions Target</label>
                        <input 
                          type="number" 
                          value={configReaction} 
                          onChange={(e) => setConfigReaction(parseInt(e.target.value) || 0)} 
                          className="form-input"
                          min={0}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Hadithul Arabia Target</label>
                        <input 
                          type="number" 
                          value={configHadithul} 
                          onChange={(e) => setConfigHadithul(parseInt(e.target.value) || 0)} 
                          className="form-input"
                          min={0}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-outline" style={{ marginTop: '0.4rem', justifyContent: 'center', borderColor: 'var(--primary)', color: 'var(--primary-dark)', fontWeight: 700 }}>
                      Save Target Configurations
                    </button>
                  </form>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB: Website Management (Original panels) */}
        {isLeadership && adminTab === 'website' && (
          <div>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '2rem', gap: '0.5rem' }}>
              <button onClick={() => setWebsiteSubTab('gallery')} style={{ padding: '0.6rem 1.2rem', background: 'none', border: 'none', borderBottom: websiteSubTab === 'gallery' ? '2px solid var(--primary)' : '2px solid transparent', color: websiteSubTab === 'gallery' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Gallery Images</button>
              <button onClick={() => setWebsiteSubTab('partners')} style={{ padding: '0.6rem 1.2rem', background: 'none', border: 'none', borderBottom: websiteSubTab === 'partners' ? '2px solid var(--primary)' : '2px solid transparent', color: websiteSubTab === 'partners' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Partners Logos</button>
              <button onClick={() => setWebsiteSubTab('visitors')} style={{ padding: '0.6rem 1.2rem', background: 'none', border: 'none', borderBottom: websiteSubTab === 'visitors' ? '2px solid var(--primary)' : '2px solid transparent', color: websiteSubTab === 'visitors' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Guests & Mentors</button>
            </div>

            <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.15)', marginBottom: '3rem' }}>
              {websiteSubTab === 'gallery' && (
                <div>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image className="text-primary" /> Add to Gallery</h2>
                  <form onSubmit={handleAddGallery} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Select Image File</label><input type="file" id="gallery-file-input" accept="image/*" onChange={(e) => setGalleryFile(e.target.files ? e.target.files[0] : null)} className="form-input" required /></div>
                    <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Event Title</label><input type="text" value={galleryTitle} onChange={(e) => setGalleryTitle(e.target.value)} className="form-input" placeholder="e.g. Mock Interview" required /></div>
                    <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Category</label><select value={galleryCategory} onChange={(e) => setGalleryCategory(e.target.value)} className="form-input"><option value="activity">Activity Session</option><option value="mock_interview">Mock Interview</option></select></div>
                    <button type="submit" className="btn btn-primary mt-2" disabled={uploading}><Upload size={16} /> {uploading ? 'Uploading...' : 'Save to Gallery'}</button>
                  </form>
                </div>
              )}

              {websiteSubTab === 'partners' && (
                <div>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase className="text-primary" /> Add Industrial Partner</h2>
                  <form onSubmit={handleAddPartner} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Select Logo File</label><input type="file" id="partner-file-input" accept="image/*" onChange={(e) => setPartnerFile(e.target.files ? e.target.files[0] : null)} className="form-input" required /></div>
                    <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Company Name</label><input type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="form-input" placeholder="e.g. Amazon Arabic" required /></div>
                    <button type="submit" className="btn btn-primary mt-2" disabled={uploading}><Upload size={16} /> {uploading ? 'Uploading...' : 'Save Partner'}</button>
                  </form>
                </div>
              )}

              {websiteSubTab === 'visitors' && (
                <div>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users className="text-primary" /> Add Guest or Mentor</h2>
                  <form onSubmit={handleAddVisitor} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Select Photo File</label><input type="file" id="visitor-file-input" accept="image/*" onChange={(e) => setVisitorFile(e.target.files ? e.target.files[0] : null)} className="form-input" required /></div>
                    <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Guest Name</label><input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} className="form-input" required /></div>
                    <div className="grid grid-2" style={{ gap: '1.5rem' }}>
                      <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Title</label><input type="text" value={visitorDesignation} onChange={(e) => setVisitorDesignation(e.target.value)} className="form-input" required /></div>
                      <div className="form-group"><label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Organization</label><input type="text" value={visitorOrganization} onChange={(e) => setVisitorOrganization(e.target.value)} className="form-input" /></div>
                    </div>
                    <button type="submit" className="btn btn-primary mt-2" disabled={uploading}><Upload size={16} /> {uploading ? 'Uploading...' : 'Save Guest Details'}</button>
                  </form>
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(201,156,51,0.1)', paddingBottom: '0.8rem' }}>
                Existing {websiteSubTab === 'gallery' ? 'Gallery Items' : websiteSubTab === 'partners' ? 'Partners' : 'Guests & Mentors'}
              </h3>

              {websiteSubTab === 'gallery' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
                  {galleryItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                      <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
                        <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.2rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>{item.title}</h4>
                        <button onClick={() => handleDeleteWebsiteItem(item.id, 'gallery', item.image_url)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center', marginTop: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}><Trash2 size={12} /> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {websiteSubTab === 'partners' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
                  {partnersList.map(partner => (
                    <div key={partner.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', padding: '1rem', alignItems: 'center' }}>
                      <img src={partner.logo_url} alt={partner.name} style={{ height: '40px', objectFit: 'contain', marginBottom: '0.8rem' }} />
                      <h4 style={{ fontSize: '0.85rem', textAlign: 'center', margin: '0 0 0.8rem 0' }}>{partner.name}</h4>
                      <button onClick={() => handleDeleteWebsiteItem(partner.id, 'partners', partner.logo_url)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fca5a5' }}><Trash2 size={12} /> Delete</button>
                    </div>
                  ))}
                </div>
              )}

              {websiteSubTab === 'visitors' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
                  {visitorsList.map(visitor => (
                    <div key={visitor.id} style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', padding: '1rem', alignItems: 'center' }}>
                      <img src={visitor.image_url} alt={visitor.name} style={{ width: '65px', height: '65px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.8rem' }} />
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.2rem 0' }}>{visitor.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', margin: 0, textAlign: 'center' }}>{visitor.designation}</p>
                      <button onClick={() => handleDeleteWebsiteItem(visitor.id, 'visitors', visitor.image_url)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fca5a5', marginTop: '0.8rem' }}><Trash2 size={12} /> Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Correction Requests / Appeals Manager */}
        {adminTab === 'appeals' && (
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={22} className="text-primary" /> Correction Requests & Appeals
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                  Review and resolve student appeals regarding checklist tasks, attendance, and exam scores.
                </p>
              </div>

              {/* Status Filter Tab Buttons */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', padding: '0.3rem', borderRadius: '10px', gap: '0.2rem' }}>
                {(['pending', 'approved', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAppealsFilter(filter)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      background: appealsFilter === filter ? 'white' : 'transparent',
                      color: appealsFilter === filter ? 'var(--primary-dark)' : 'var(--text-muted)',
                      boxShadow: appealsFilter === filter ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {loadingAdminAppeals ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading correction requests...</div>
            ) : (() => {
              const filteredAppeals = adminAppeals.filter(a => a.status === appealsFilter);
              if (filteredAppeals.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'rgba(0,0,0,0.01)', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '16px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                      <HelpCircle size={24} style={{ color: '#94a3b8' }} />
                    </div>
                    <h4 style={{ fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>No requests found</h4>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>There are no {appealsFilter} correction requests currently.</p>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Student Name</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Course & Batch</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Activity Date</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Category</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Activity Name</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>Current</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>Expected</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>Student's Reason</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppeals.map((app) => (
                        <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{app.student?.name || 'Unknown Student'}</td>
                          <td style={{ padding: '1rem', color: '#475569' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650 }}>{app.student?.courses?.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Batch {app.student?.batch_number}</span>
                          </td>
                          <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{new Date(app.logged_date).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem', textTransform: 'capitalize', fontWeight: 600 }}>{app.request_type}</td>
                          <td style={{ padding: '1rem' }}>{app.activity_name}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>{app.current_value}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--primary-dark)' }}>{app.expected_value}</td>
                          <td style={{ padding: '1rem', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={app.reason}>{app.reason}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {app.status === 'pending' ? (
                              <button
                                onClick={() => handleApproveAppeal(app)}
                                className="btn btn-outline"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-dark)', borderColor: 'var(--primary)', cursor: 'pointer' }}
                              >
                                Review Request
                              </button>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start', minWidth: '120px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '0.15rem 0.4rem', borderRadius: '4px',
                                  fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                                  color: app.status === 'approved' ? '#16a34a' : '#dc2626',
                                  background: app.status === 'approved' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)'
                                }}>
                                  {app.status}
                                </span>
                                {app.admin_remark && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block' }}>
                                    "{app.admin_remark}"
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
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
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                  >
                    <Printer size={16} /> Print Report
                  </button>
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
                  const scores = studentReportData.scores;

                  const studentInterval = intervalsList.find(i => i.course_id === selectedReportStudent?.course_id && i.batch_number === selectedReportStudent?.batch_number && i.is_active)
                    || intervalsList.find(i => i.course_id === selectedReportStudent?.course_id && i.batch_number === selectedReportStudent?.batch_number);
                  const totalWorkingDays = studentInterval?.total_working_days ?? 20;
                  const totalVocab = studentInterval?.total_vocab_tasks ?? 20;
                  const totalSentences = studentInterval?.total_sentences_tasks ?? 20;
                  const totalVlog = studentInterval?.total_vlog_tasks ?? 4;
                  const totalReaction = studentInterval?.total_reaction_tasks ?? 4;
                  const totalHadithul = studentInterval?.total_hadithul_tasks ?? 4;

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

                        const studentInterval = intervalsList.find(i => i.course_id === selectedReportStudent?.course_id && i.batch_number === selectedReportStudent?.batch_number && i.is_active)
                          || intervalsList.find(i => i.course_id === selectedReportStudent?.course_id && i.batch_number === selectedReportStudent?.batch_number);


                        const intervalStartDate = (studentInterval && studentInterval.start_date) 
                          ? studentInterval.start_date 
                          : (studentInterval && studentInterval.created_at) 
                            ? studentInterval.created_at 
                            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                        const generatedDates = getDatesRange(intervalStartDate);
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

// Staff Roster table row
const StaffRow = ({ 
  staff, 
  onUpdate, 
  isSelf,
  onResetPassword,
  onDeleteAccount
}: { 
  staff: StaffProfile; 
  onUpdate: Function; 
  isSelf: boolean;
  onResetPassword: (userId: string, newPw: string) => Promise<void>;
  onDeleteAccount: (userId: string, name: string) => Promise<void>;
}) => {
  const [role, setRole] = useState(staff.role);
  const [designation, setDesignation] = useState(staff.designation || '');
  const [status, setStatus] = useState(staff.status);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(staff.id, role, designation, status);
    setSaving(false);
  };

  const handleReset = async () => {
    if (!newPassword) return;
    setResetting(true);
    await onResetPassword(staff.id, newPassword);
    setNewPassword('');
    setResetting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDeleteAccount(staff.id, staff.name);
    setDeleting(false);
  };

  return (
    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <td style={{ padding: '1rem 0.5rem', fontWeight: 650 }}>{staff.name} {isSelf && <span style={{ color: 'var(--primary-dark)', fontSize: '0.75rem' }}>(You)</span>}</td>
      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{staff.email}</td>
      <td style={{ padding: '1rem 0.5rem' }}>
        <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '100%', fontSize: '0.9rem' }} />
      </td>
      <td style={{ padding: '1rem 0.5rem' }}>
        <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none' }} disabled={isSelf}>
          <option value="staff">Staff</option>
          <option value="gm">General Manager (GM)</option>
          <option value="md">Managing Director (MD)</option>
          <option value="director">Director</option>
        </select>
      </td>
      <td style={{ padding: '1rem 0.5rem' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none' }} disabled={isSelf}>
          <option value="pending">Pending Approval</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive / Deactivated</option>
        </select>
      </td>
      <td style={{ padding: '1rem 0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <input 
            type="password" 
            placeholder="New Password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '120px', fontSize: '0.85rem' }} 
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
      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} disabled={saving}>{saving ? '...' : 'Save'}</button>
          <button 
            onClick={handleDelete} 
            disabled={deleting || isSelf} 
            className="btn btn-outline" 
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5', background: 'rgba(239,68,68,0.02)' }}
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
};

// Student Roster table row
const StudentRosterRow = ({
  student,
  courses,
  onUpdate,
  onResetPassword,
  onDeleteAccount,
  onOpenReport
}: {
  student: StudentProfile;
  courses: Course[];
  onUpdate: Function;
  onResetPassword: (userId: string, newPw: string) => Promise<void>;
  onDeleteAccount: (userId: string, name: string) => Promise<void>;
  onOpenReport: (student: StudentProfile) => void;
}) => {
  const [name, setName] = useState(student.name);
  const [rollNumber, setRollNumber] = useState(student.roll_number || '');
  const [courseId, setCourseId] = useState(student.course_id);
  const [batchNumber, setBatchNumber] = useState(student.batch_number);
  const [status, setStatus] = useState(student.status);
  
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(student.id, name, courseId, batchNumber, rollNumber, status);
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
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '100%', fontSize: '0.9rem', fontWeight: 600 }} 
        />
      </td>
      <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{student.email}</td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <input 
          type="text" 
          value={rollNumber} 
          onChange={(e) => setRollNumber(e.target.value)} 
          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '70px', fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }} 
          placeholder="Roll #"
        />
      </td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <select 
          value={courseId} 
          onChange={(e) => setCourseId(e.target.value)} 
          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.9rem', outline: 'none', maxWidth: '200px' }}
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <input 
          type="number" 
          value={batchNumber} 
          onChange={(e) => setBatchNumber(parseInt(e.target.value) || 1)} 
          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.15)', width: '60px', fontSize: '0.9rem', textAlign: 'center' }} 
        />
      </td>
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
