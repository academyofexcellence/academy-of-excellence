import React, { useState } from 'react';
import { TrendingUp, CheckCircle2, AlertTriangle, Activity, BarChart2 } from 'lucide-react';
import { StudentProfile, Task, DailyLog, ScoringInterval, StaffProfile } from '../../lib/types';

interface AnalyticsHubProps {
  isLeadership: boolean;
  studentList: StudentProfile[];
  todayScores: any[];
  taskList: Task[];
  dailyLogs: DailyLog[];
  intervalsList: ScoringInterval[];
  staffList: StaffProfile[];
  activityLogs: any[];
}

export const AnalyticsHub: React.FC<AnalyticsHubProps> = ({
  isLeadership,
  studentList,
  todayScores,
  taskList,
  dailyLogs,
  intervalsList,
  staffList,
  activityLogs
}) => {
  const [subTab, setSubTab] = useState<'overview' | 'logs'>('overview');

  if (!isLeadership) {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Only leadership roles can access the Analytics Hub.</p>
      </div>
    );
  }

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

  // Task summaries
  const pendingOneOffs = taskList.filter(t => t.task_type === 'one_off' && t.status !== 'completed');
  const completedOneOffs = taskList.filter(t => t.task_type === 'one_off' && t.status === 'completed');
  const dailyTasks = taskList.filter(t => t.task_type === 'daily');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub-tab Navigation */}
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
          onClick={() => setSubTab('overview')}
          style={{
            padding: '0.5rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'overview' ? 'white' : 'transparent',
            color: subTab === 'overview' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'overview' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <BarChart2 size={15} /> Overview
        </button>
        <button
          onClick={() => setSubTab('logs')}
          style={{
            padding: '0.5rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'logs' ? 'white' : 'transparent',
            color: subTab === 'logs' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'logs' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Activity size={15} /> Audit Logs
        </button>
      </div>

      {subTab === 'overview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Stats Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            <div className="glass-card text-center" style={{ padding: '1.25rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Daily Tasks (Today)</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0', color: 'var(--primary-dark)' }}>
                {dailyLogs.length} / {dailyTasks.length}
              </p>
              <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>Checklist monitoring</span>
            </div>

            <div className="glass-card text-center" style={{ padding: '1.25rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Pending Staff Duties</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0', color: '#dc2626' }}>
                {pendingOneOffs.length}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assigned in roster</span>
            </div>

            <div className="glass-card text-center" style={{ padding: '1.25rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Active Students</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0', color: '#1e3a8a' }}>
                {activeStudentsCount}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{studentList.filter(s => s.status === 'pending').length} pending approval</span>
            </div>

            <div className="glass-card text-center" style={{ padding: '1.25rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Attendance Today</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.35rem 0', color: '#16a34a' }}>
                {attendancePercent}%
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {attPresent + attLate + attHalfDay} Present / {attMarked} Marked
              </span>
            </div>
          </div>

          {/* Main Dashboard Command Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* DAILY STUDENT GRADING PROGRESS */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <TrendingUp size={16} className="text-primary" /> Student Daily Activity (Today)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>
                Grades and checklist marks recorded in classrooms today.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #3b82f6', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Vocab</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{vocabCount}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #8b5cf6', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Sentences</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{sentencesCount}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #10b981', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weekly Vlogs</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{vlogsCount}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #f43f5e', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Video Reactions</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{videoReactionCount}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #06b6d4', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hadithul Arabia</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{hadithulArabiaCount}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Oral Talks</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{customCount}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #1e3a8a', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exams</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{examsCount}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.03)', borderLeft: '3px solid #dc2626', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 600 }}>Speaking Penalties</div>
                  <strong style={{ fontSize: '1.2rem', color: '#dc2626' }}>{penaltiesCount}</strong>
                </div>
              </div>
            </div>

            {/* DAILY TASKS LOGGED BY STAFF (TODAY) */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <CheckCircle2 size={16} className="text-primary" /> Daily Checklist Tasks
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>
                Completion of daily operations by assigned staff.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {dailyTasks.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No daily checklist tasks configured.</p>
                ) : (
                  dailyTasks.map(task => {
                    const log = dailyLogs.find(l => l.task_id === task.id);
                    const completed = !!log;
                    return (
                      <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>{task.title}</strong>
                          {completed && log && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              Done by: <strong>{staffList.find(s => s.id === log.completed_by)?.name || 'Staff'}</strong>
                            </div>
                          )}
                        </div>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.15rem 0.4rem', 
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
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <AlertTriangle size={16} className="text-primary" /> Pending One-Off Staff Duties
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>
                One-time duties currently pending or in-progress.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto' }}>
                {pendingOneOffs.length === 0 ? (
                  <p style={{ color: '#16a34a', fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 600 }}>✓ All one-off duties completed!</p>
                ) : (
                  pendingOneOffs.map(task => (
                    <div key={task.id} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.015)', borderLeft: '3px solid #ea580c', borderRadius: '0 8px 8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.85rem' }}>{task.title}</strong>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          background: task.status === 'in_progress' ? 'rgba(234,88,12,0.1)' : 'rgba(0,0,0,0.05)', 
                          color: task.status === 'in_progress' ? '#ea580c' : 'var(--text-muted)', 
                          padding: '0.15rem 0.35rem', 
                          borderRadius: '4px', 
                          fontWeight: 700 
                        }}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      {task.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>{task.description}</p>}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        To: <strong>{task.staff_profiles?.name || 'Unassigned'}</strong>
                        {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* AUDIT LOGS VIEW */
        <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <Activity size={18} className="text-primary" /> Institute Activity Logs
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Audit trail of staff operations, logouts, and grading events.
          </p>
          {activityLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity records found.</p>
          ) : (
            <div style={{
              maxHeight: '480px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              paddingRight: '0.4rem'
            }}>
              {activityLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.01)',
                    borderLeft: '3px solid var(--primary)',
                    borderRadius: '0 8px 8px 0',
                    gap: '0.25rem',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong>{log.actor_name}</strong>: {log.details}
                      <span style={{ color: 'var(--primary-dark)', fontSize: '0.7rem', fontWeight: 700, marginLeft: '0.4rem', textTransform: 'uppercase' }}>
                        ({log.action_type})
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
