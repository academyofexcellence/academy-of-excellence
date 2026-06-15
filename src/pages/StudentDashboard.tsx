import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen,
  MessageSquare,
  Video
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
  score_type: 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'exam' | 'penalty' | 'custom';
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
  }>({ vocab: {}, sentences: {}, vlog: false });

  // Navigation state inside dashboard
  const [activeSubTab, setActiveSubTab] = useState<'scoreboard' | 'logs'>('scoreboard');

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
          currentRank = i + 1;
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
      // Fetch recent score adjustments for this student
      const { data: logs } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .eq('interval_id', intervalId)
        .order('created_at', { ascending: false });

      if (logs) {
        setRecentLogs(logs);

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
          // Vlog is checked weekly, check if any vlog is logged in current week (last 7 days)
          const logDateObj = new Date(log.logged_date);
          if (log.score_type === 'weekly_vlog' && logDateObj >= monday) {
            hasVlog = true;
          }
        });

        setWeeklyStatus({
          vocab: vocabMap,
          sentences: sentenceMap,
          vlog: hasVlog
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
    return <div style={{ paddingTop: '150px', textAlign: 'center' }}>Loading Student Scoreboard...</div>;
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

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', background: 'var(--bg-light)' }} className="bg-grid-pattern">
      <div className="container" style={{ maxWidth: '1050px' }}>
        
        {/* Welcome & Gamified Badge Banner */}
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 15px 35px rgba(201, 156, 51, 0.1)', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
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

        {/* --- WEEKLY PROGRESS CHECKLIST --- */}
        <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem', marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18} className="text-primary" /> Weekly Performance Checklist</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Track if staff members have marked your WhatsApp submissions and weekly vlog for this week (Mon-Fri).</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            
            {/* Daily Vocabulary Checklists */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h4 style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', marginBottom: '0.8rem' }}>
                <BookOpen size={14} /> WhatsApp Vocab
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                {Object.keys(weeklyStatus.vocab).map(dateStr => {
                  const dateObj = new Date(dateStr);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const done = weeklyStatus.vocab[dateStr];
                  return (
                    <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{dayName}</span>
                      <span style={{ color: done ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{done ? '✓ Logged' : 'Pending'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Sentences Checklists */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h4 style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', marginBottom: '0.8rem' }}>
                <MessageSquare size={14} /> Daily Sentences
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                {Object.keys(weeklyStatus.sentences).map(dateStr => {
                  const dateObj = new Date(dateStr);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const done = weeklyStatus.sentences[dateStr];
                  return (
                    <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{dayName}</span>
                      <span style={{ color: done ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{done ? '✓ Logged' : 'Pending'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Vlog Checklist */}
            <div style={{ background: 'white', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <Video size={28} style={{ color: weeklyStatus.vlog ? '#16a34a' : 'var(--text-muted)', marginBottom: '0.5rem' }} />
              <h4 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>Weekly Vlog</h4>
              <span style={{ fontSize: '0.75rem', color: weeklyStatus.vlog ? '#16a34a' : '#ea580c', fontWeight: 700, marginTop: '0.4rem', display: 'inline-block', padding: '0.2rem 0.6rem', background: weeklyStatus.vlog ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', borderRadius: '50px' }}>
                {weeklyStatus.vlog ? 'Vlog Approved' : 'Not Uploaded Yet'}
              </span>
            </div>

          </div>
        </div>

        {/* --- MAIN PORTAL BODY --- */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,156,51,0.2)', marginBottom: '2rem', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveSubTab('scoreboard')}
            style={{
              padding: '0.8rem 1.5rem', background: 'none', border: 'none',
              borderBottom: activeSubTab === 'scoreboard' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeSubTab === 'scoreboard' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <TrendingUp size={16} /> Batch Scoreboard
          </button>
          
          <button 
            onClick={() => setActiveSubTab('logs')}
            style={{
              padding: '0.8rem 1.5rem', background: 'none', border: 'none',
              borderBottom: activeSubTab === 'logs' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeSubTab === 'logs' ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <Clock size={16} /> Recent Score Audits
          </button>

          {/* Interval Select Dropdown */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period:</label>
            <select
              value={selectedInterval}
              onChange={(e) => handleIntervalChange(e.target.value)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {intervals.map(int => (
                <option key={int.id} value={int.id}>
                  {int.name} {int.is_active ? '(Active Now)' : '(Archived)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TAB 1: Scoreboard Leaderboard */}
        {activeSubTab === 'scoreboard' && (
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)' }}>
                    <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Rank</th>
                    <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Student Name</th>
                    <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Scholar Level</th>
                    <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Total XP / Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(entry => {
                    const isSelf = entry.student_id === currentStudent.id;
                    const ringColor = entry.rank === 1 ? '#fbbf24' : entry.rank >= 2 && entry.rank <= 3 ? '#94a3b8' : entry.rank >= 4 && entry.rank <= 10 ? '#b45309' : 'transparent';
                    
                    return (
                      <tr 
                        key={entry.student_id} 
                        style={{ 
                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                          background: isSelf ? 'rgba(201,156,51,0.08)' : 'transparent',
                          fontWeight: isSelf ? 700 : 400
                        }}
                      >
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ 
                            display: 'inline-flex', width: '28px', height: '28px', 
                            background: ringColor !== 'transparent' ? ringColor : 'rgba(0,0,0,0.04)',
                            color: ringColor !== 'transparent' ? 'white' : 'var(--text-main)',
                            borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem'
                          }}>
                            {entry.rank}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          {entry.name} {isSelf && <span style={{ color: 'var(--primary-dark)', fontSize: '0.75rem', fontWeight: 800 }}>(You)</span>}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--primary-dark)', fontWeight: 600 }}>Level {entry.level}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 800 }}>{entry.total_score} pts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Recent Activity Logs */}
        {activeSubTab === 'logs' && (
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Your Point Logs (Current Period)</h3>

            {recentLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No point logs recorded for this period.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {recentLogs.map(log => {
                  const isPenalty = log.points < 0;
                  return (
                    <div 
                      key={log.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1rem', 
                        background: isPenalty ? 'rgba(239,68,68,0.04)' : 'rgba(34,197,94,0.04)', 
                        borderLeft: isPenalty ? '4px solid #dc2626' : '4px solid #16a34a',
                        borderRadius: '0 8px 8px 0' 
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.95rem' }}>{log.activity_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Logged on {new Date(log.logged_date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isPenalty ? <AlertTriangle size={16} style={{ color: '#dc2626' }} /> : <CheckCircle size={16} style={{ color: '#16a34a' }} />}
                        <span style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 800, 
                          color: isPenalty ? '#dc2626' : '#16a34a' 
                        }}>
                          {isPenalty ? '' : '+'}{log.points} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentDashboard;
