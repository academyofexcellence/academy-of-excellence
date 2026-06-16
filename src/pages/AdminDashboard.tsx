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
  ClipboardList, 
  Plus, 
  UserCheck,
  ListChecks,
  GraduationCap,
  XCircle,
  Settings,
  TrendingUp
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
  status: 'pending' | 'active' | 'inactive';
  courses?: Course;
}

interface ScoringInterval {
  id: string;
  name: string;
  course_id: string;
  batch_number: number;
  is_active: boolean;
}

interface LeaderboardEntry {
  student_id: string;
  name: string;
  total_score: number;
  level: number;
  rank: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(null);

  // Tab navigation states
  const [staffTab, setStaffTab] = useState<'checklist' | 'one_off' | 'history'>('checklist');
  const [adminTab, setAdminTab] = useState<'kpis' | 'tasks' | 'students' | 'roster' | 'logs' | 'website' | 'settings'>('kpis');
  const [websiteSubTab, setWebsiteSubTab] = useState<'gallery' | 'partners' | 'visitors'>('gallery');

  // UI State Messages
  const [message, setMessage] = useState('');
  
  // Data States (Staff)
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Data States (Students & Leaderboards)
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentList, setStudentList] = useState<StudentProfile[]>([]);
  const [intervalsList, setIntervalsList] = useState<ScoringInterval[]>([]);
  const [scoresList, setScoresList] = useState<any[]>([]);
  const [updatingScores, setUpdatingScores] = useState<string[]>([]);
  const [overviewLeaderboard, setOverviewLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [overviewSelectedInterval, setOverviewSelectedInterval] = useState<string>('');
  
  // Classroom Selector States
  const [filterCourse, setFilterCourse] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [activeInterval, setActiveInterval] = useState<ScoringInterval | null>(null);
  const [showArchivedFilter, setShowArchivedFilter] = useState(false);

  // Form States - Exam/Custom Grading
  const [gradingMode, setGradingMode] = useState<'vocab_sentences' | 'exam' | 'custom' | 'leaderboard'>('vocab_sentences');
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

  // Fetch overview leaderboard when selected overview interval changes
  useEffect(() => {
    if (overviewSelectedInterval && intervalsList.length > 0) {
      const int = intervalsList.find(i => i.id === overviewSelectedInterval);
      if (int) {
        fetchOverviewLeaderboard(int.id, int.course_id, int.batch_number);
      }
    }
  }, [overviewSelectedInterval, intervalsList]);

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
          currentRank = i + 1;
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
  const handleToggleStudentScore = async (studentId: string, scoreType: 'daily_vocab' | 'daily_sentences' | 'weekly_vlog', isChecked: boolean) => {
    if (!activeInterval || !currentUser) return;
    const lockKey = `${studentId}-${scoreType}`;
    if (updatingScores.includes(lockKey)) return;

    setUpdatingScores(prev => [...prev, lockKey]);
    const targetDate = selectedGradingDate;
    
    // Define point values
    const pointsMap = { daily_vocab: 5, daily_sentences: 5, weekly_vlog: 15 };
    const activityNameMap = { daily_vocab: 'Daily Vocabulary', daily_sentences: 'Daily Sentences', weekly_vlog: 'Weekly Vlog' };

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

  // Malayalam Penalty Trigger (-10 XP)
  const handleMalayalamPenalty = async (studentId: string) => {
    if (!activeInterval || !currentUser) return;
    const targetDate = selectedGradingDate;
    const lockKey = `${studentId}-penalty`;
    if (updatingScores.includes(lockKey)) return;

    setUpdatingScores(prev => [...prev, lockKey]);
    try {
      const { error } = await supabase.from('scores').insert([
        {
          student_id: studentId,
          interval_id: activeInterval.id,
          score_type: 'penalty',
          points: -10,
          max_points: 0,
          activity_name: 'Malayalam Speaking Policy Violation',
          logged_by: currentUser.id,
          logged_date: targetDate
        }
      ]);
      if (error) throw error;

      const studName = studentList.find(s => s.id === studentId)?.name || 'Student';
      await logActivity('malayalam_penalty', `Deducted -10 points from ${studName} for speaking Malayalam on ${targetDate}`);
      
      setMessage(`⚠️ Penalty logged: -10 points applied to ${studName}.`);
      await fetchClassroomScores(activeInterval.id, targetDate);
      await fetchClassroomLeaderboard(activeInterval.id);
    } catch (err: any) {
      console.error(err);
      if (err.code === '23505') {
        setMessage(`❌ Malayalam Penalty already logged for this student today.`);
      } else {
        setMessage(`❌ Failed to log penalty: ${err.message}`);
      }
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
        {isLeadership && adminTab === 'kpis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="grid grid-3" style={{ gap: '1.5rem' }}>
              <div className="glass-card text-center" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Daily Tasks Done (Today)</h4>
                <p style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--primary-dark)' }}>
                  {dailyLogs.length} / {taskList.filter(t => t.task_type === 'daily').length}
                </p>
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Active checklist monitoring</span>
              </div>

              <div className="glass-card text-center" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
                <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Pending Staff Duties</h4>
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
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} className="text-primary" /> Daily Tasks Status</h3>
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
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} className="text-primary" /> Pending Staff Registrations</h3>
                {staffList.filter(s => s.status === 'pending').length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No new staff signups waiting for approval.</p>
                ) : (
                  staffList.filter(s => s.status === 'pending').map(staff => (
                    <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{staff.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{staff.designation}</div>
                      </div>
                      <button onClick={() => setAdminTab('roster')} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
                        Review Roster
                      </button>
                    </div>
                  ))
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
                  {intervalsList.filter(i => i.is_active).length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active batches</span>
                  ) : (
                    intervalsList.filter(i => i.is_active).map(interval => {
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
                      <div key={entry.student_id} className="rank-card">
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
        )}

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
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '2rem', gap: '1.5rem' }}>
                  <button 
                    onClick={() => setGradingMode('vocab_sentences')}
                    style={{
                      padding: '0.5rem 0.5rem 0.8rem 0.5rem', background: 'none', border: 'none',
                      borderBottom: gradingMode === 'vocab_sentences' ? '3px solid var(--primary)' : '3px solid transparent',
                      color: gradingMode === 'vocab_sentences' ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
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
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
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
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    Custom Activities
                  </button>
                </div>

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
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>WhatsApp Vocab (+5 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Daily Sentences (+5 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Weekly Vlog (+15 XP)</th>
                                <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Language Policy</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredActiveStudents.map(student => {
                                const hasVocabToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_vocab');
                                const hasSentencesToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_sentences');
                                const hasVlogToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'weekly_vlog');

                                return (
                                  <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                    <td style={{ padding: '1rem 0.5rem', fontWeight: 650 }}>{student.name}</td>
                                    
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

                                    {/* Red Malayalam speaking deduction */}
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                                      <button 
                                        onClick={() => handleMalayalamPenalty(student.id)} 
                                        className="btn btn-outline" 
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5', background: 'rgba(239,68,68,0.03)' }}
                                      >
                                        <XCircle size={12} /> Malayalam Penalty (-10)
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* MOBILE CARDS VIEW */}
                        <div className="mobile-score-cards" style={{ display: 'none', flexDirection: 'column', gap: '1.2rem' }}>
                          {filteredActiveStudents.map(student => {
                            const hasVocabToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_vocab');
                            const hasSentencesToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_sentences');
                            const hasVlogToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'weekly_vlog');

                            return (
                              <div key={student.id} className="glass-card" style={{ padding: '1.2rem', border: '1px solid rgba(201,156,51,0.15)', background: 'white', borderRadius: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>{student.name}</span>
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
                                </div>

                                {/* Penalty */}
                                <button
                                  onClick={() => handleMalayalamPenalty(student.id)}
                                  className="btn btn-outline"
                                  style={{
                                    padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5',
                                    background: 'rgba(239,68,68,0.03)', width: '100%', justifyContent: 'center'
                                  }}
                                >
                                  <XCircle size={12} /> Malayalam Speaking Penalty (-10 XP)
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </>
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
                          {filteredActiveStudents.map(student => (
                            <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)', padding: '0.6rem 1rem', borderRadius: '8px' }}>
                              <span style={{ fontWeight: 600 }}>{student.name}</span>
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
                          {filteredActiveStudents.map(student => (
                            <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)', padding: '0.6rem 1rem', borderRadius: '8px' }}>
                              <span style={{ fontWeight: 600 }}>{student.name}</span>
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
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Save</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(staff => (
                    <StaffRow 
                      key={staff.id} 
                      staff={staff} 
                      onUpdate={handleUpdateStaff}
                      isSelf={staff.id === currentUser.id}
                    />
                  ))}
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
                          <span style={{ fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>Active</span>
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
      </div>
    </div>
  );
};

// Staff Roster table row
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
      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
        <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} disabled={saving}>{saving ? '...' : 'Save'}</button>
      </td>
    </tr>
  );
};

export default AdminDashboard;
