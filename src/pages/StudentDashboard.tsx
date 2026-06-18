import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Calendar, 
  TrendingUp, 
  Clock, 
  BookOpen,
  MessageSquare,
  Video,
  Award,
  FileText,
  Volume2,
  AlertTriangle,
  Globe
} from 'lucide-react';

interface StudentProfile {
  id: string;
  email: string;
  name: string;
  course_id: string;
  batch_number: number;
  status: 'pending' | 'active' | 'inactive';
  courses?: {
    name: string;
  };
}

interface LeaderboardEntry {
  student_id: string;
  name: string;
  total_score: number;
  rank: number;
  level: number;
}

interface ScoreLog {
  id: string;
  activity_name: string;
  score_type: 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia' | 'exam' | 'penalty' | 'custom' | 'attendance';
  points: number;
  max_points: number;
  logged_date: string;
  created_at: string;
}

interface Interval {
  id: string;
  name: string;
  is_active: boolean;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);

  // Interval selection for leaderboard
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<string>('');

  // Dashboard Data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<ScoreLog[]>([]);
  const [weeklyStatus, setWeeklyStatus] = useState<{
    vocab: { [key: string]: boolean };
    sentences: { [key: string]: boolean };
    vlog: boolean;
    videoReaction: boolean;
    hadithulArabia: boolean;
  }>({ vocab: {}, sentences: {}, vlog: false, videoReaction: false, hadithulArabia: false });

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
      const { data: student, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          courses:course_id (name)
        `)
        .eq('id', session.user.id)
        .single();

      if (error || !student) {
        throw new Error('Student profile not found.');
      }

      if (student.status !== 'active') {
        await supabase.auth.signOut();
        navigate('/admin');
        return;
      }

      setCurrentStudent(student);
      
      // Load student data
      await fetchIntervalsAndData(student.course_id, student.batch_number, student.id);
    } catch (err) {
      console.error(err);
      await supabase.auth.signOut();
      navigate('/admin');
    }
  };

  const fetchIntervalsAndData = async (courseId: string, batchNumber: number, studentId: string) => {
    try {
      // 1. Fetch scoring intervals for this course and batch
      const { data: intervalsData } = await supabase
        .from('scoring_intervals')
        .select('*')
        .eq('course_id', courseId)
        .eq('batch_number', batchNumber)
        .order('created_at', { ascending: false });

      if (intervalsData && intervalsData.length > 0) {
        setIntervals(intervalsData);
        // Default to active interval
        const active = intervalsData.find(i => i.is_active);
        const defaultIntervalId = active ? active.id : intervalsData[0].id;
        setSelectedInterval(defaultIntervalId);
        
        // Load Leaderboard for default interval
        fetchLeaderboard(defaultIntervalId, courseId, batchNumber);
        // Load Logs for default interval
        fetchLogsAndWeeklyCheckins(studentId, defaultIntervalId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (intervalId: string, courseId: string, batchNumber: number) => {
    try {
      // Fetch all students in batch
      const { data: students } = await supabase
        .from('student_profiles')
        .select('id, name')
        .eq('course_id', courseId)
        .eq('batch_number', batchNumber)
        .eq('status', 'active');

      if (!students) return;

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
        // Gamified level: 1 level per 100 points, starting at Level 1 (caps at Level 100)
        const computedLevel = Math.max(1, Math.floor(total / 100) + 1);
        return {
          student_id: s.id,
          name: s.name,
          total_score: total,
          level: computedLevel,
          rank: 0 // Will assign below
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

      setLeaderboard(entries);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogsAndWeeklyCheckins = async (studentId: string, intervalId: string) => {
    try {
      // Fetch recent score adjustments for this student (all intervals, to align with UNIQUE constraint and weekly checklist)
      const { data: logs } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (logs) {
        // Show only the selected interval's audit logs in history
        setRecentLogs(logs.filter(log => log.interval_id === intervalId));

        // Calculate weekly status (Mon-Fri checkins + weekly vlog)
        // Get start of current week (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const mondayDiff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.setDate(mondayDiff));
        monday.setHours(0, 0, 0, 0);

        const weekDates: string[] = [];
        for (let i = 0; i < 5; i++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          weekDates.push(date.toISOString().split('T')[0]);
        }

        const vocabMap: { [key: string]: boolean } = {};
        const sentenceMap: { [key: string]: boolean } = {};
        let hasVlog = false;
        let hasVideoReaction = false;
        let hasHadithulArabia = false;

        weekDates.forEach(d => {
          vocabMap[d] = false;
          sentenceMap[d] = false;
        });

        logs.forEach(log => {
          const logDateStr = log.logged_date;
          if (weekDates.includes(logDateStr)) {
            if (log.score_type === 'daily_vocab') vocabMap[logDateStr] = true;
            if (log.score_type === 'daily_sentences') sentenceMap[logDateStr] = true;
          }
          const logDateObj = new Date(log.logged_date);
          // Vlog is checked weekly, check if any vlog is logged in current week (last 7 days)
          if (log.score_type === 'weekly_vlog' && logDateObj >= monday) {
            hasVlog = true;
          }
          if (log.score_type === 'video_reaction' && logDateObj >= monday) {
            hasVideoReaction = true;
          }
          if (log.score_type === 'hadithul_arabia' && logDateObj >= monday) {
            hasHadithulArabia = true;
          }
        });

        setWeeklyStatus({
          vocab: vocabMap,
          sentences: sentenceMap,
          vlog: hasVlog,
          videoReaction: hasVideoReaction,
          hadithulArabia: hasHadithulArabia
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIntervalChange = (intervalId: string) => {
    setSelectedInterval(intervalId);
    if (currentStudent) {
      fetchLeaderboard(intervalId, currentStudent.course_id, currentStudent.batch_number);
      fetchLogsAndWeeklyCheckins(currentStudent.id, intervalId);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  if (loading || !currentStudent) {
    return <div style={{ paddingTop: '150px', textAlign: 'center', fontFamily: 'inherit', color: 'var(--text-muted)', fontWeight: 600 }}>Loading Student Scoreboard...</div>;
  }

  // Get current student ranking statistics
  const selfEntry = leaderboard.find(e => e.student_id === currentStudent.id);
  const myRank = selfEntry ? selfEntry.rank : 0;
  const myScore = selfEntry ? selfEntry.total_score : 0;
  const myLevel = selfEntry ? selfEntry.level : 1;

  // XP level calculations (assuming 100 XP per level)
  const xpInCurrentLevel = myScore % 100;
  const levelProgressPercent = Math.min(100, Math.max(0, xpInCurrentLevel));

  // Determine Badge Ring styling based on Rank
  const getBadgeStyle = (rank: number) => {
    if (rank === 1) return { text: '🥇 Gold Roster', border: 'linear-gradient(135deg, #fbbf24, #d97706)', shadow: 'rgba(251, 191, 36, 0.4)' };
    if (rank >= 2 && rank <= 3) return { text: '🥈 Silver Roster', border: 'linear-gradient(135deg, #cbd5e1, #64748b)', shadow: 'rgba(148, 163, 184, 0.4)' };
    if (rank >= 4 && rank <= 10) return { text: '🥉 Bronze Roster', border: 'linear-gradient(135deg, #b45309, #78350f)', shadow: 'rgba(180, 83, 9, 0.3)' };
    return { text: '🎓 Active Learner', border: 'linear-gradient(135deg, var(--primary-light), var(--primary))', shadow: 'rgba(201,156,51,0.2)' };
  };

  const myBadge = getBadgeStyle(myRank);

  // Performance Report Calculations
  const attendanceLogs = recentLogs.filter(log => log.score_type === 'attendance');
  const totalAttendance = attendanceLogs.length;
  const onTimeCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('on time')).length;
  const lateCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('late')).length;
  const halfDayCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('half day')).length;
  const absentCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('absent')).length;
  const attendanceRate = totalAttendance > 0 ? Math.round((onTimeCount / totalAttendance) * 100) : 0;

  const vocabCount = recentLogs.filter(log => log.score_type === 'daily_vocab').length;
  const sentencesCount = recentLogs.filter(log => log.score_type === 'daily_sentences').length;
  const vlogCount = recentLogs.filter(log => log.score_type === 'weekly_vlog').length;
  const videoReactionCount = recentLogs.filter(log => log.score_type === 'video_reaction').length;
  const hadithulArabiaCount = recentLogs.filter(log => log.score_type === 'hadithul_arabia').length;

  const talkLogs = recentLogs.filter(log => log.score_type === 'custom' && log.activity_name === 'One Minute Talk');
  const talkAvg = talkLogs.length > 0 ? (talkLogs.reduce((sum, log) => sum + log.points, 0) / talkLogs.length).toFixed(1) : 'N/A';

  const examLogs = recentLogs.filter(log => log.score_type === 'exam');
  const examAvg = examLogs.length > 0 
    ? Math.round(examLogs.reduce((sum, log) => sum + (log.points / log.max_points) * 100, 0) / examLogs.length)
    : null;

  const penaltyLogs = recentLogs.filter(log => log.score_type === 'penalty');
  const totalPenaltiesCount = penaltyLogs.reduce((sum, log) => sum + Math.round(Math.abs(log.points) / 2), 0);

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', background: 'var(--bg-light)' }} className="bg-grid-pattern">
      <div className="container" style={{ maxWidth: '1080px' }}>
        
        {/* Style block for gaming and layout classes */}
        <style>{`
          .student-dash-grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 1.5rem;
            align-items: start;
            margin-top: 1.5rem;
          }
          .leaderboard-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .rank-card {
            display: flex;
            align-items: center;
            padding: 1rem 1.2rem;
            background: white;
            border-radius: 16px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.01);
            gap: 1rem;
            position: relative;
            overflow: hidden;
            transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
          }
          .rank-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(201, 156, 51, 0.08);
            border-color: rgba(201, 156, 51, 0.25);
          }
          .rank-card-self {
            border: 2px solid var(--primary) !important;
            background: rgba(201, 156, 51, 0.04) !important;
            box-shadow: 0 8px 20px rgba(201, 156, 51, 0.15) !important;
          }
          .rank-badge {
            padding: 0.35rem 0.75rem;
            border-radius: 50px;
            font-weight: 800;
            font-size: 0.75rem;
            min-width: 52px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
          }
          .avatar-bubble {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.9rem;
            box-shadow: 0 3px 8px rgba(0,0,0,0.05);
          }
          .xp-badge {
            font-weight: 850;
            font-size: 1.15rem;
            line-height: 1;
          }
          .xp-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 0.15rem;
          }
          .logs-scroll-container {
            max-height: 380px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding-right: 0.25rem;
          }
          @media (max-width: 991px) {
            .student-dash-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 480px) {
            .rank-card {
              padding: 0.8rem 1rem;
              gap: 0.75rem;
            }
            .avatar-bubble {
              width: 36px;
              height: 36px;
              font-size: 0.8rem;
            }
            .xp-badge {
              font-size: 1rem;
            }
          }
        `}</style>

        {/* Welcome & Gamified Badge Banner */}
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 15px 35px rgba(201, 156, 51, 0.1)', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-blob" style={{ width: '300px', height: '300px', top: '-50px', right: '-50px', background: 'radial-gradient(circle, rgba(201,156,51,0.15) 0%, rgba(253,251,247,0) 70%)' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', position: 'relative', zIndex: 10 }}>
            <div style={{ flex: '1 1 500px' }}>
              <span className="badge" style={{ background: 'rgba(201,156,51,0.15)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {currentStudent.courses?.name} • Batch {currentStudent.batch_number}
              </span>
              <h1 className="heading-xl" style={{ margin: '0.5rem 0 0.8rem 0', fontSize: '2.2rem', lineHeight: '1.1' }}>
                Hello, <span className="text-gradient">{currentStudent.name}</span>
              </h1>
              
              {/* Gamified Level & XP bar */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <span>Level {myLevel} Scholar</span>
                  <span style={{ color: 'var(--text-muted)' }}>{xpInCurrentLevel}/100 XP to Level {myLevel + 1}</span>
                </div>
                <div style={{ height: '12px', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${levelProgressPercent}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)', borderRadius: '10px', transition: 'width 0.5s ease-out' }}></div>
                </div>
              </div>
            </div>

            {/* Profile Rank Ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '160px' }}>
              <div 
                style={{
                  width: '110px', height: '110px', borderRadius: '50%',
                  background: 'white', border: '6px solid',
                  borderImageSource: myBadge.border, borderImageSlice: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 10px 25px ${myBadge.shadow}`, position: 'relative', marginBottom: '0.8rem',
                  borderStyle: 'solid'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Rank</span>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1' }}>#{myRank || '-'}</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{myBadge.text}</span>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', zIndex: 10 }}>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>

        {/* --- TWO-COLUMN GAMIFIED LAYOUT (SCOREBOARD IS MAIN FOCUS) --- */}
        <div className="student-dash-grid">
          
          {/* COLUMN 1: Live Leaderboard (Left Side - Large Focus Card) */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem', width: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201,156,51,0.12)', paddingBottom: '1rem', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} className="text-primary" /> Batch Leaderboard
              </h2>
              
              {/* Period Select Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period:</label>
                <select
                  value={selectedInterval}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {intervals.map(int => (
                    <option key={int.id} value={int.id}>
                      {int.name} {int.is_active ? '(Active)' : '(Archived)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No student rankings logged for this period.
                </div>
              ) : (
                leaderboard.map(entry => {
                  const isSelf = entry.student_id === currentStudent.id;
                  // Calculate relative percent to top score
                  const topScore = leaderboard[0]?.total_score || 100;
                  const relativePercent = topScore > 0 ? Math.min(100, Math.max(0, (entry.total_score / topScore) * 100)) : 0;
                  
                  // Get Rank styling
                  const getRankBadge = (rank: number) => {
                    if (rank === 1) return { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '👑 1st', color: 'white' };
                    if (rank === 2) return { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', text: '🥈 2nd', color: '#1e293b' };
                    if (rank === 3) return { bg: 'linear-gradient(135deg, #ffedd5, #b45309)', text: '🥉 3rd', color: '#78350f' };
                    return { bg: '#f1f5f9', text: `#${rank}`, color: '#64748b' };
                  };
                  
                  const rankBadge = getRankBadge(entry.rank);
                  const initials = entry.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

                  // Dynamic Avatar Gradient
                  const getAvatarGradient = (id: string, isMe: boolean) => {
                    if (isMe) return 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
                    const colors = [
                      'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
                      'linear-gradient(135deg, #10b981, #047857)', // Green
                      'linear-gradient(135deg, #8b5cf6, #5b21b6)', // Purple
                      'linear-gradient(135deg, #ec4899, #be185d)', // Pink
                      'linear-gradient(135deg, #f97316, #c2410c)'  // Orange
                    ];
                    // Simple hash based on student_id to choose consistent color
                    const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                    return colors[charCodeSum % colors.length];
                  };

                  return (
                    <div 
                      key={entry.student_id}
                      className={`rank-card ${isSelf ? 'rank-card-self' : ''}`}
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
                          background: getAvatarGradient(entry.student_id, isSelf)
                        }}
                      >
                        {initials}
                      </div>

                      {/* Name & Gamified Level progress bar */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 750, fontSize: '0.95rem', color: isSelf ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                            {entry.name}
                          </span>
                          {isSelf && (
                            <span style={{ background: 'var(--primary-dark)', color: 'white', fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                              You
                            </span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.7rem', background: isSelf ? 'rgba(201,156,51,0.2)' : 'rgba(0,0,0,0.06)', color: isSelf ? 'var(--primary-dark)' : 'var(--text-muted)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                            Lvl {entry.level}
                          </span>
                          <div style={{ height: '6px', flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden', maxWidth: '200px' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${relativePercent}%`, 
                                background: isSelf ? 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)' : 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', 
                                borderRadius: '10px' 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Total points XP */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '45px' }}>
                        <span className="xp-badge" style={{ color: isSelf ? 'var(--primary-dark)' : 'var(--text-main)' }}>
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

          {/* COLUMN 2: Sidebar (Checklists & Logs - Right Side) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            
            {/* 1. Weekly checklist */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                <Calendar size={18} className="text-primary" /> Weekly Checklist
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>Mon-Fri WhatsApp & Weekly Vlog tasks checkoffs.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                
                {/* Vocab row */}
                <div style={{ background: 'white', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <h4 style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', marginBottom: '0.6rem', fontWeight: 750 }}>
                    <BookOpen size={14} /> WhatsApp Vocab
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                    {Object.keys(weeklyStatus.vocab).map(dateStr => {
                      const dateObj = new Date(dateStr);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const done = weeklyStatus.vocab[dateStr];
                      return (
                        <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{dayName} ({dateStr.substring(8, 10)})</span>
                          <span style={{ color: done ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{done ? '✓ Logged' : 'Pending'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sentences row */}
                <div style={{ background: 'white', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <h4 style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', marginBottom: '0.6rem', fontWeight: 750 }}>
                    <MessageSquare size={14} /> WhatsApp Sentences
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                    {Object.keys(weeklyStatus.sentences).map(dateStr => {
                      const dateObj = new Date(dateStr);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const done = weeklyStatus.sentences[dateStr];
                      return (
                        <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{dayName} ({dateStr.substring(8, 10)})</span>
                          <span style={{ color: done ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{done ? '✓ Logged' : 'Pending'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vlog item */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Video size={20} style={{ color: weeklyStatus.vlog ? '#16a34a' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Weekly Vlog Upload</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: weeklyStatus.vlog ? '#16a34a' : '#ea580c', fontWeight: 700, padding: '0.2rem 0.5rem', background: weeklyStatus.vlog ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', borderRadius: '50px' }}>
                    {weeklyStatus.vlog ? 'Approved' : 'Pending'}
                  </span>
                </div>

                {/* Video Reaction item */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <MessageSquare size={20} style={{ color: weeklyStatus.videoReaction ? '#16a34a' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Video Reaction Task</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: weeklyStatus.videoReaction ? '#16a34a' : '#ea580c', fontWeight: 700, padding: '0.2rem 0.5rem', background: weeklyStatus.videoReaction ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', borderRadius: '50px' }}>
                    {weeklyStatus.videoReaction ? 'Approved' : 'Pending'}
                  </span>
                </div>

                {/* Hadithul Arabia item */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Globe size={20} style={{ color: weeklyStatus.hadithulArabia ? '#16a34a' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Hadithul Arabia Attendance</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: weeklyStatus.hadithulArabia ? '#16a34a' : '#ea580c', fontWeight: 700, padding: '0.2rem 0.5rem', background: weeklyStatus.hadithulArabia ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', borderRadius: '50px' }}>
                    {weeklyStatus.hadithulArabia ? 'Approved' : 'Pending'}
                  </span>
                </div>

              </div>
            </div>

            {/* Academic Performance Report Card */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                <Award size={18} className="text-primary" /> Performance Report
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>A complete academic summary for this period.</p>

              {/* Grid of Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                {/* Attendance Rate */}
                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Rate</span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--primary-dark)' }}>{attendanceRate}%</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    On Time: {onTimeCount}/{totalAttendance} Days (Late: {lateCount}, Half Day: {halfDayCount}, Absent: {absentCount})
                  </span>
                </div>

                {/* Malayalam Penalties */}
                <div style={{ background: totalPenaltiesCount > 0 ? 'rgba(239,68,68,0.02)' : 'white', padding: '0.8rem', borderRadius: '12px', border: totalPenaltiesCount > 0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: totalPenaltiesCount > 0 ? '#b91c1c' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {totalPenaltiesCount > 0 && <AlertTriangle size={12} style={{ color: '#dc2626' }} />} Malayalam Penalties
                  </span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: totalPenaltiesCount > 0 ? '#dc2626' : 'var(--text-main)' }}>{totalPenaltiesCount}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Total Term Count
                  </span>
                </div>

                {/* Exam Average */}
                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Exam Average</span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-main)' }}>{examAvg !== null ? `${examAvg}%` : 'N/A'}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Across {examLogs.length} Exams
                  </span>
                </div>

                {/* One Minute Talk Average */}
                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Volume2 size={12} className="text-primary" /> One Minute Talk
                  </span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-main)' }}>{talkAvg}</span>
                    {talkAvg !== 'N/A' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>/10</span>}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Average Oral Score
                  </span>
                </div>
              </div>

              {/* Checklist Tasks Breakdown */}
              <div style={{ background: 'rgba(201,156,51,0.03)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(201,156,51,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '1.2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vocabulary</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vocabCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sentences</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{sentencesCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vlogs</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vlogCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reactions</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{videoReactionCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hadithul A.</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{hadithulArabiaCount}</span>
                </div>
              </div>

              {/* Exams details */}
              {examLogs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} className="text-primary" /> Exam Breakdown
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                    {examLogs.map(exam => {
                      const examNameFormatted = exam.activity_name.replace(/^exam:\s*/i, '');
                      const percent = Math.round((exam.points / exam.max_points) * 100);
                      return (
                        <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 650, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, marginRight: '0.5rem' }}>{examNameFormatted}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{exam.points}/{exam.max_points} ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Recent Logs Card */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                <Clock size={18} className="text-primary" /> Score Audits
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>Audit trail of your point credits/debits.</p>

              <div className="logs-scroll-container">
                {recentLogs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>No point logs recorded.</p>
                ) : (
                  recentLogs.slice(0, 15).map(log => {
                    const isPenalty = log.points < 0;
                    return (
                      <div 
                        key={log.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '0.75rem', 
                          background: isPenalty ? 'rgba(239,68,68,0.04)' : 'rgba(34,197,94,0.04)', 
                          borderLeft: isPenalty ? '3px solid #dc2626' : '3px solid #16a34a',
                          borderRadius: '0 8px 8px 0',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                          <strong style={{ display: 'block', color: 'var(--text-main)' }}>{log.activity_name}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(log.logged_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <span style={{ 
                            fontWeight: 800, 
                            color: isPenalty ? '#dc2626' : '#16a34a',
                            whiteSpace: 'nowrap'
                          }}>
                            {isPenalty ? '' : '+'}{log.points} XP
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
