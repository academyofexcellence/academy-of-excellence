import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  HelpCircle, 
  Settings, 
  Printer, 
  ClipboardList, 
  Search, 
  Users, 
  BarChart2, 
  TrendingUp, 
  Smile, 
  UserCheck 
} from 'lucide-react';
import { 
  StudentProfile, 
  ScoringInterval, 
  Course, 
  LeaderboardEntry,
  AppealRequest
} from '../../lib/types';

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

interface ClassroomGradingProps {
  currentUser: any;
  isLeadership: boolean;
  studentList: StudentProfile[];
  activeInterval: ScoringInterval | null;
  intervalsList: ScoringInterval[];
  scoresList: any[];
  batchScores: any[];
  loadingBatchScores: boolean;
  updatingScores: string[];
  updatingMatrix: string[];
  selectedGradingDate: string;
  setSelectedGradingDate: (date: string) => void;
  filterCourse: string;
  setFilterCourse: (course: string) => void;
  filterBatch: string;
  setFilterBatch: (batch: string) => void;
  courses: Course[];
  classroomLeaderboard: LeaderboardEntry[];
  pendingAppealsCount: number;
  adminAppeals: any[];
  loadingAdminAppeals: boolean;
  appealsFilter: 'pending' | 'approved' | 'rejected';
  setAppealsFilter: (filter: 'pending' | 'approved' | 'rejected') => void;
  processingAppealAction: boolean;
  handleToggleStudentScore: (studentId: string, scoreType: 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia', isChecked: boolean) => Promise<void>;
  handleToggleMatrixCell: (studentId: string, dateStr: string, scoreType: string, existingRecord: any) => Promise<void>;
  handleToggleAttendance: (studentId: string, statusValue: string) => Promise<void>;
  handleMalayalamPenalty: (studentId: string, action: 'increment' | 'decrement') => Promise<void>;
  handleToggleOneMinuteTalk: (studentId: string, val: string) => Promise<void>;
  handleGradeExam: (e: React.FormEvent) => Promise<void>;
  handleGradeCustom: (e: React.FormEvent) => Promise<void>;
  handleVerifyScores: () => Promise<void>;
  handleConfirmAppealAction: (approved: boolean, appealOverride?: any) => Promise<void>;
  handleToggleMatrixAttendance: (studentId: string, dateStr: string, statusValue: string) => Promise<void>;
  handleApproveAppeal: (appeal: any) => void;
  handleApproveStudent: (studentId: string, approve: boolean) => Promise<void>;
  fetchBatchScores: (intervalId: string) => Promise<void>;
  handlePrintRankList: () => void;
  handleOpenReport: (student: StudentProfile) => void;
  
  examName: string;
  setExamName: (val: string) => void;
  examMaxPoints: string;
  setExamMaxPoints: (val: string) => void;
  examScores: { [studentId: string]: number };
  setExamScores: React.Dispatch<React.SetStateAction<{ [studentId: string]: number }>>;
  
  customActivityName: string;
  setCustomActivityName: (val: string) => void;
  customMaxPoints: string;
  setCustomMaxPoints: (val: string) => void;
  customScores: { [studentId: string]: number };
  setCustomScores: React.Dispatch<React.SetStateAction<{ [studentId: string]: number }>>;

  selectedLeaderboardInterval: string;
  handleLeaderboardIntervalChange: (intervalId: string) => void;
  matrixActivity: 'attendance' | 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia' | 'penalty' | 'custom' | 'exam';
  setMatrixActivity: (activity: any) => void;
  getIntervalForDate: (dateStr: string, courseId: string, batchNumber: number) => ScoringInterval | null;
}

export const ClassroomGrading: React.FC<ClassroomGradingProps> = ({
  currentUser,
  isLeadership,
  studentList,
  activeInterval,
  intervalsList,
  scoresList,
  batchScores,
  loadingBatchScores,
  updatingScores,
  updatingMatrix,
  selectedGradingDate,
  setSelectedGradingDate,
  filterCourse,
  setFilterCourse,
  filterBatch,
  setFilterBatch,
  courses,
  classroomLeaderboard,
  pendingAppealsCount,
  adminAppeals,
  loadingAdminAppeals,
  appealsFilter,
  setAppealsFilter,
  processingAppealAction,
  handleToggleStudentScore,
  handleToggleMatrixCell,
  handleToggleAttendance,
  handleMalayalamPenalty,
  handleToggleOneMinuteTalk,
  handleGradeExam,
  handleGradeCustom,
  handleVerifyScores,
  handleConfirmAppealAction,
  handleToggleMatrixAttendance,
  handleApproveAppeal,
  handleApproveStudent,
  fetchBatchScores,
  handlePrintRankList,
  handleOpenReport,
  examName,
  setExamName,
  examMaxPoints,
  setExamMaxPoints,
  examScores,
  setExamScores,
  customActivityName,
  setCustomActivityName,
  customMaxPoints,
  setCustomMaxPoints,
  customScores,
  setCustomScores,
  selectedLeaderboardInterval,
  handleLeaderboardIntervalChange,
  matrixActivity,
  setMatrixActivity,
  getIntervalForDate
}) => {
  const [subTab, setSubTab] = useState<'grading' | 'exams' | 'matrix' | 'standings' | 'appeals'>('grading');
  const [showArchivedFilter, setShowArchivedFilter] = useState(false);
  const [expandedAppealId, setExpandedAppealId] = useState<string | null>(null);

  useEffect(() => {
    if (subTab === 'matrix' && activeInterval?.id) {
      fetchBatchScores(activeInterval.id);
    }
  }, [subTab, activeInterval?.id, fetchBatchScores]);

  const batchPendingAppealsCount = (adminAppeals || []).filter(
    a => a.student?.course_id === filterCourse && a.student?.batch_number === parseInt(filterBatch) && a.status === 'pending'
  ).length;

  const otherPendingAppeals = (adminAppeals || []).filter(a => {
    const isCurrentBatch = a.student?.course_id === filterCourse && a.student?.batch_number === parseInt(filterBatch);
    return !isCurrentBatch && a.status === 'pending';
  });

  const filteredActiveStudents = studentList.filter(
    s => s.course_id === filterCourse && s.batch_number === parseInt(filterBatch) && s.status === 'active'
  );
  
  const sortedFilteredActiveStudents = [...filteredActiveStudents].sort((a, b) => {
    const aRoll = a.roll_number ? parseInt(a.roll_number) : 9999;
    const bRoll = b.roll_number ? parseInt(b.roll_number) : 9999;
    return aRoll - bRoll;
  });

  const pendingApprovals = studentList.filter(s => s.status === 'pending');

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '👑 1st', color: 'white' };
    if (rank === 2) return { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', text: '🥈 2nd', color: '#1e293b' };
    if (rank === 3) return { bg: 'linear-gradient(135deg, #ffedd5, #b45309)', text: '🥉 3rd', color: '#78350f' };
    return { bg: '#f1f5f9', text: `#${rank}`, color: '#64748b' };
  };

  const getAvatarGradient = (id: string) => {
    const hex = id.substring(0, 6) || 'c99c33';
    return `linear-gradient(135deg, #${hex}, #000000)`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Batch Filtering Panel */}
      <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(201, 156, 51, 0.15)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1rem' }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Classrooms</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontWeight: 750, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date:</label>
              <input 
                type="date" 
                value={selectedGradingDate} 
                onChange={(e) => setSelectedGradingDate(e.target.value)} 
                style={{ padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              />
            </div>
            
            <button 
              onClick={() => setShowArchivedFilter(!showArchivedFilter)} 
              style={{
                background: 'none', border: 'none', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline', outline: 'none'
              }}
            >
              🔍 {showArchivedFilter ? 'Hide Search' : 'Search Other Batches'}
            </button>
          </div>
        </div>

        {/* Quick-Access Row of Active Batches */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {intervalsList.filter(i => i.is_active).length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              No live scoring periods running. Create one in settings.
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
                    gap: '0.4rem',
                    padding: '0.45rem 1rem',
                    borderRadius: '50px',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.08)',
                    background: isSelected ? 'rgba(201, 156, 51, 0.06)' : 'white',
                    color: isSelected ? 'var(--primary-dark)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(201, 156, 51, 0.08)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🎓 {courses.find(c => c.id === interval.course_id)?.name || 'Course'} (B-{interval.batch_number})
                </button>
              );
            })
          )}
        </div>

        {showArchivedFilter && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.015)', padding: '0.8rem', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontWeight: 750, fontSize: '0.8rem' }}>Course:</label>
              <select 
                value={filterCourse} 
                onChange={(e) => setFilterCourse(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(201,156,51,0.25)', outline: 'none', background: 'white', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontWeight: 750, fontSize: '0.8rem' }}>Batch Number:</label>
              <input 
                type="number" 
                value={filterBatch} 
                onChange={(e) => setFilterBatch(e.target.value)} 
                placeholder="e.g. 25"
                style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(201,156,51,0.25)', width: '60px', outline: 'none', background: 'white', fontWeight: 600, fontSize: '0.8rem' }}
              />
            </div>

            {activeInterval ? (
              <span style={{ fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '0.25rem 0.6rem', borderRadius: '50px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                Scoreboard: {activeInterval.name}
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '0.25rem 0.6rem', borderRadius: '50px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                ⚠️ Inactive Term
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pending Student Registrations approvals */}
      {isLeadership && pendingApprovals.length > 0 && (
        <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
            <UserCheck size={16} className="text-primary" /> Pending Student Approvals
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingApprovals.map(stud => (
              <div key={stud.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(0,0,0,0.015)', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '10px', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>{stud.name}</strong>
                  {stud.is_alumni_signup ? (
                    <span className="badge" style={{ marginLeft: '0.4rem', background: 'rgba(59,130,246,0.12)', color: '#2563eb', fontSize: '0.65rem', padding: '0.1rem 0.3rem', verticalAlign: 'middle', border: '1px solid rgba(59,130,246,0.2)' }}>Alumni</span>
                  ) : (
                    <span className="badge" style={{ marginLeft: '0.4rem', background: 'rgba(245,158,11,0.12)', color: '#d97706', fontSize: '0.65rem', padding: '0.1rem 0.3rem', verticalAlign: 'middle', border: '1px solid rgba(245,158,11,0.2)' }}>Student</span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> ({stud.email})</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Course: <strong>{courses.find(c => c.id === stud.course_id)?.name || 'Course'}</strong> • Batch: <strong>{stud.batch_number}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => handleApproveStudent(stud.id, true)} className="btn btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}>
                    Approve
                  </button>
                  <button onClick={() => handleApproveStudent(stud.id, false)} className="btn btn-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Sub-Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        gap: '1rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        marginBottom: '0.5rem'
      }}>
        <button
          onClick={() => setSubTab('grading')}
          style={{
            padding: '0.6rem 0.5rem 0.8rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'grading' ? '3px solid var(--primary)' : '3px solid transparent',
            color: subTab === 'grading' ? 'var(--primary-dark)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          📋 Daily Tasks
        </button>
        <button
          onClick={() => setSubTab('exams')}
          style={{
            padding: '0.6rem 0.5rem 0.8rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'exams' ? '3px solid var(--primary)' : '3px solid transparent',
            color: subTab === 'exams' ? 'var(--primary-dark)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          ✍️ Bulk Grader
        </button>
        <button
          onClick={() => setSubTab('matrix')}
          style={{
            padding: '0.6rem 0.5rem 0.8rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'matrix' ? '3px solid var(--primary)' : '3px solid transparent',
            color: subTab === 'matrix' ? 'var(--primary-dark)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          📊 Batch Matrix
        </button>
        <button
          onClick={() => setSubTab('standings')}
          style={{
            padding: '0.6rem 0.5rem 0.8rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'standings' ? '3px solid var(--primary)' : '3px solid transparent',
            color: subTab === 'standings' ? 'var(--primary-dark)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          🏆 Scoreboard Standings
        </button>
        <button
          onClick={() => setSubTab('appeals')}
          style={{
            padding: '0.6rem 0.5rem 0.8rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'appeals' ? '3px solid var(--primary)' : '3px solid transparent',
            color: subTab === 'appeals' ? 'var(--primary-dark)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem',
            position: 'relative'
          }}
        >
          📝 Corrections {batchPendingAppealsCount > 0 && (
            <span style={{
              background: '#dc2626', color: 'white', fontSize: '0.65rem',
              fontWeight: 800, padding: '0.1rem 0.3rem', borderRadius: '50px',
              marginLeft: '0.3rem'
            }}>{batchPendingAppealsCount}</span>
          )}
        </button>
      </div>

      {/* Alert banner for pending correction requests in other batches */}
      {otherPendingAppeals.length > 0 && (
        <div style={{
          background: 'rgba(201, 156, 51, 0.08)',
          border: '1px solid rgba(201, 156, 51, 0.25)',
          borderRadius: '12px',
          padding: '0.8rem 1.2rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--primary-dark)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={16} />
            <span>
              You have {otherPendingAppeals.length} pending correction {otherPendingAppeals.length === 1 ? 'request' : 'requests'} in other batches.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(() => {
              const uniqueBatches: { courseId: string; courseName: string; batchNumber: number }[] = [];
              otherPendingAppeals.forEach(a => {
                const cId = a.student?.course_id || '';
                const bNum = a.student?.batch_number || 0;
                const cName = a.student?.courses?.name || 'Course';
                const alreadyExists = uniqueBatches.some(b => b.courseId === cId && b.batchNumber === bNum);
                if (cId && bNum && !alreadyExists) {
                  uniqueBatches.push({ courseId: cId, courseName: cName, batchNumber: bNum });
                }
              });
              
              return uniqueBatches.map(b => (
                <button
                  key={`${b.courseId}-${b.batchNumber}`}
                  onClick={() => {
                    setFilterCourse(b.courseId);
                    setFilterBatch(b.batchNumber.toString());
                    setSubTab('appeals');
                  }}
                  className="btn btn-outline"
                  style={{
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    borderColor: 'var(--primary)',
                    color: 'var(--primary-dark)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'white'
                  }}
                >
                  Switch to {b.courseName.length > 15 ? b.courseName.substring(0, 12) + '...' : b.courseName} (B-{b.batchNumber})
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {!activeInterval ? (
        <div className="glass-card text-center" style={{ padding: '3rem', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ Select an active course and batch, or configure a scoring period in settings.</p>
        </div>
      ) : (
        <>
          {subTab === 'grading' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                  Live Grading: <span className="text-gradient" style={{ fontWeight: 800 }}>{new Date(selectedGradingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </h3>
              </div>

              {filteredActiveStudents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active students registered for this batch/course.</p>
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

                  {/* DESKTOP MATRIX ROW VIEW */}
                  <div className="desktop-score-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)' }}>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700 }}>Student Name</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'center' }}>Attendance (10 XP)</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'center' }}>Vocab (+5 XP)</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'center' }}>Sentences (+5 XP)</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'center' }}>Vlog (+15 XP)</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'center' }}>Reaction (+15 XP)</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'center' }}>Hadithul A (+10 XP)</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'center' }}>Oral Talk (10 XP)</th>
                          <th style={{ padding: '0.6rem 0.4rem', fontWeight: 700, textAlign: 'right' }}>Malayalam Penalty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFilteredActiveStudents.map(student => {
                          const hasVocabToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_vocab');
                          const hasSentencesToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_sentences');
                          const hasVlogToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'weekly_vlog');
                          const hasVideoReactionToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'video_reaction');
                          const hasHadithulArabiaToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'hadithul_arabia');

                          const attendanceObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'attendance');
                          const attVal = attendanceObj ? attendanceObj.activity_name.replace('Attendance: ', '') : '';

                          const talkObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'custom' && s.activity_name === 'One Minute Talk');
                          const talkVal = talkObj ? talkObj.points.toString() : '';

                          const penaltyObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'penalty');
                          const penaltyPoints = penaltyObj ? Math.round(Math.abs(penaltyObj.points)) : 0;

                          return (
                            <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <td style={{ padding: '0.8rem 0.4rem', fontWeight: 650 }}>
                                {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.3rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                                {student.name}
                              </td>
                              
                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center' }}>
                                <select
                                  value={attVal}
                                  onChange={(e) => handleToggleAttendance(student.id, e.target.value)}
                                  disabled={updatingScores.includes(`${student.id}-attendance`)}
                                  style={{
                                    padding: '0.3rem 0.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(201,156,51,0.25)',
                                    background: attVal === 'On Time' ? 'rgba(34,197,94,0.08)' : attVal === 'Late' ? 'rgba(180,83,9,0.08)' : attVal === 'Half Day' ? 'rgba(59,130,246,0.08)' : attVal === 'Absent' ? 'rgba(239,68,68,0.08)' : 'white',
                                    color: attVal === 'On Time' ? '#16a34a' : attVal === 'Late' ? '#b45309' : attVal === 'Half Day' ? '#3b82f6' : attVal === 'Absent' ? '#dc2626' : 'var(--text-muted)',
                                    fontWeight: attVal ? 700 : 500,
                                    outline: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                  }}
                                >
                                  <option value="">- Select -</option>
                                  <option value="On Time">On Time (+10 XP)</option>
                                  <option value="Late">Late (+7 XP)</option>
                                  <option value="Half Day">Half Day (+5 XP)</option>
                                  <option value="Absent">Absent (0 XP)</option>
                                </select>
                              </td>

                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasVocabToday} 
                                  onChange={() => handleToggleStudentScore(student.id, 'daily_vocab', !hasVocabToday)}
                                  disabled={updatingScores.includes(`${student.id}-daily_vocab`)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                              </td>

                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasSentencesToday} 
                                  onChange={() => handleToggleStudentScore(student.id, 'daily_sentences', !hasSentencesToday)}
                                  disabled={updatingScores.includes(`${student.id}-daily_sentences`)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                              </td>

                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasVlogToday} 
                                  onChange={() => handleToggleStudentScore(student.id, 'weekly_vlog', !hasVlogToday)}
                                  disabled={updatingScores.includes(`${student.id}-weekly_vlog`)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                              </td>

                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasVideoReactionToday} 
                                  onChange={() => handleToggleStudentScore(student.id, 'video_reaction', !hasVideoReactionToday)}
                                  disabled={updatingScores.includes(`${student.id}-video_reaction`)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                              </td>

                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasHadithulArabiaToday} 
                                  onChange={() => handleToggleStudentScore(student.id, 'hadithul_arabia', !hasHadithulArabiaToday)}
                                  disabled={updatingScores.includes(`${student.id}-hadithul_arabia`)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                              </td>

                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center' }}>
                                <select
                                  value={talkVal}
                                  onChange={(e) => handleToggleOneMinuteTalk(student.id, e.target.value)}
                                  disabled={updatingScores.includes(`${student.id}-talk`)}
                                  style={{
                                    padding: '0.3rem 0.4rem', borderRadius: '6px', border: '1px solid rgba(201,156,51,0.25)',
                                    fontWeight: talkVal ? 700 : 500, fontSize: '0.8rem', background: 'white', outline: 'none', cursor: 'pointer'
                                  }}
                                >
                                  <option value="">- Score -</option>
                                  {[...Array(11)].map((_, i) => (
                                    <option key={i} value={i}>{i}/10</option>
                                  ))}
                                </select>
                              </td>

                              <td style={{ padding: '0.8rem 0.4rem', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {penaltyPoints > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 800, background: 'rgba(220,38,38,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                      -{penaltyPoints} XP
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleMalayalamPenalty(student.id, 'increment')}
                                    disabled={updatingScores.includes(`${student.id}-penalty`)}
                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    🗣️ -2 XP
                                  </button>
                                  {penaltyPoints > 0 && (
                                    <button
                                      onClick={() => handleMalayalamPenalty(student.id, 'decrement')}
                                      disabled={updatingScores.includes(`${student.id}-penalty`)}
                                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                                    >
                                      Undo
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE DETAILED CARDS VIEW */}
                  <div className="mobile-score-cards" style={{ display: 'none', flexDirection: 'column', gap: '1rem' }}>
                    {sortedFilteredActiveStudents.map(student => {
                      const hasVocabToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_vocab');
                      const hasSentencesToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'daily_sentences');
                      const hasVlogToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'weekly_vlog');
                      const hasVideoReactionToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'video_reaction');
                      const hasHadithulArabiaToday = scoresList.some(s => s.student_id === student.id && s.score_type === 'hadithul_arabia');

                      const attendanceObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'attendance');
                      const attVal = attendanceObj ? attendanceObj.activity_name.replace('Attendance: ', '') : '';

                      const talkObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'custom' && s.activity_name === 'One Minute Talk');
                      const talkVal = talkObj ? talkObj.points.toString() : '';

                      const penaltyObj = scoresList.find(s => s.student_id === student.id && s.score_type === 'penalty');
                      const penaltyPoints = penaltyObj ? Math.round(Math.abs(penaltyObj.points)) : 0;

                      return (
                        <div key={student.id} className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(201,156,51,0.15)', background: 'white', borderRadius: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                              {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.3rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                              {student.name}
                            </span>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(201,156,51,0.1)', color: 'var(--primary-dark)', padding: '0.2rem 0.5rem', borderRadius: '50px', fontWeight: 700 }}>Active</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.8rem' }}>
                            <button
                              onClick={() => handleToggleStudentScore(student.id, 'daily_vocab', !hasVocabToday)}
                              disabled={updatingScores.includes(`${student.id}-daily_vocab`)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid',
                                background: hasVocabToday ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)',
                                color: hasVocabToday ? '#16a34a' : 'var(--text-muted)',
                                borderColor: hasVocabToday ? '#22c55e' : 'transparent',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', outline: 'none'
                              }}
                            >
                              <span style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>📚</span>
                              <span>Vocab</span>
                            </button>

                            <button
                              onClick={() => handleToggleStudentScore(student.id, 'daily_sentences', !hasSentencesToday)}
                              disabled={updatingScores.includes(`${student.id}-daily_sentences`)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid',
                                background: hasSentencesToday ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)',
                                color: hasSentencesToday ? '#16a34a' : 'var(--text-muted)',
                                borderColor: hasSentencesToday ? '#22c55e' : 'transparent',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', outline: 'none'
                              }}
                            >
                              <span style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>✍️</span>
                              <span>Sentences</span>
                            </button>

                            <button
                              onClick={() => handleToggleStudentScore(student.id, 'weekly_vlog', !hasVlogToday)}
                              disabled={updatingScores.includes(`${student.id}-weekly_vlog`)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid',
                                background: hasVlogToday ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)',
                                color: hasVlogToday ? '#16a34a' : 'var(--text-muted)',
                                borderColor: hasVlogToday ? '#22c55e' : 'transparent',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', outline: 'none'
                              }}
                            >
                              <span style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>🎥</span>
                              <span>Vlog</span>
                            </button>

                            <button
                              onClick={() => handleToggleStudentScore(student.id, 'video_reaction', !hasVideoReactionToday)}
                              disabled={updatingScores.includes(`${student.id}-video_reaction`)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid',
                                background: hasVideoReactionToday ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)',
                                color: hasVideoReactionToday ? '#16a34a' : 'var(--text-muted)',
                                borderColor: hasVideoReactionToday ? '#22c55e' : 'transparent',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', outline: 'none'
                              }}
                            >
                              <span style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>💬</span>
                              <span>Reaction</span>
                            </button>

                            <button
                              onClick={() => handleToggleStudentScore(student.id, 'hadithul_arabia', !hasHadithulArabiaToday)}
                              disabled={updatingScores.includes(`${student.id}-hadithul_arabia`)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0.3rem', borderRadius: '8px', border: '1px solid',
                                background: hasHadithulArabiaToday ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)',
                                color: hasHadithulArabiaToday ? '#16a34a' : 'var(--text-muted)',
                                borderColor: hasHadithulArabiaToday ? '#22c55e' : 'transparent',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', outline: 'none'
                              }}
                            >
                              <span style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>🌐</span>
                              <span>Hadith A</span>
                            </button>
                          </div>

                          {/* Attendance & Talk selectors */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>📅 Attendance</span>
                              <select
                                value={attVal}
                                onChange={(e) => handleToggleAttendance(student.id, e.target.value)}
                                disabled={updatingScores.includes(`${student.id}-attendance`)}
                                style={{
                                  padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(201,156,51,0.25)',
                                  background: attVal === 'On Time' ? 'rgba(34,197,94,0.08)' : attVal === 'Late' ? 'rgba(180,83,9,0.08)' : attVal === 'Half Day' ? 'rgba(59,130,246,0.08)' : attVal === 'Absent' ? 'rgba(239,68,68,0.08)' : 'white',
                                  color: attVal === 'On Time' ? '#16a34a' : attVal === 'Late' ? '#b45309' : attVal === 'Half Day' ? '#3b82f6' : attVal === 'Absent' ? '#dc2626' : 'var(--text-muted)',
                                  fontWeight: attVal ? 700 : 500, fontSize: '0.75rem', outline: 'none', cursor: 'pointer'
                                }}
                              >
                                <option value="">- Select -</option>
                                <option value="On Time">On Time (+10)</option>
                                <option value="Late">Late (+7)</option>
                                <option value="Half Day">Half Day (+5)</option>
                                <option value="Absent">Absent (0)</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>🎙️ Oral Talk</span>
                              <select
                                value={talkVal}
                                onChange={(e) => handleToggleOneMinuteTalk(student.id, e.target.value)}
                                disabled={updatingScores.includes(`${student.id}-talk`)}
                                style={{
                                  padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(201,156,51,0.25)',
                                  fontWeight: talkVal ? 700 : 500, fontSize: '0.75rem', background: 'white', outline: 'none', cursor: 'pointer'
                                }}
                              >
                                <option value="">- Score -</option>
                                {[...Array(11)].map((_, i) => (
                                  <option key={i} value={i}>{i}/10</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>🗣️ Language Penalty</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {penaltyPoints > 0 && <span style={{ color: '#dc2626', fontWeight: 800 }}>-{penaltyPoints} XP</span>}
                                <button
                                  onClick={() => handleMalayalamPenalty(student.id, 'increment')}
                                  disabled={updatingScores.includes(`${student.id}-penalty`)}
                                  style={{ padding: '0.15rem 0.3rem', fontSize: '0.65rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  🗣️ -2 XP
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {subTab === 'exams' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* BULK EXAM GRADES FORM */}
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 700 }}>✍️ Bulk Exam Grader</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1.2rem' }}>
                  Log marks for a written or spoken examination across the entire batch.
                </p>

                <form onSubmit={handleGradeExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Exam Description</label>
                      <input 
                        type="text" 
                        value={examName} 
                        onChange={(e) => setExamName(e.target.value)} 
                        placeholder="e.g. Weekly Grammar Quiz"
                        required
                        style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Max Marks</label>
                      <input 
                        type="number" 
                        value={examMaxPoints} 
                        onChange={(e) => setExamMaxPoints(e.target.value)} 
                        required
                        style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', padding: '0.5rem' }}>
                    {filteredActiveStudents.map(student => (
                      <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{student.name}</span>
                        <input 
                          type="number" 
                          placeholder="Score"
                          value={examScores[student.id] === undefined ? '' : examScores[student.id]}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            setExamScores(prev => ({ ...prev, [student.id]: val }));
                          }}
                          style={{ width: '60px', padding: '0.25rem', textAlign: 'center', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)' }}
                        />
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', alignSelf: 'flex-start' }}>
                    Submit Exam Grades
                  </button>
                </form>
              </div>

              {/* BULK CUSTOM ACTIVITY GRADES FORM */}
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 700 }}>✍️ Bulk Custom Activity Grader</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1.2rem' }}>
                  Log custom activity XP (projects, speech contests, group presentations).
                </p>

                <form onSubmit={handleGradeCustom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Activity Title</label>
                      <input 
                        type="text" 
                        value={customActivityName} 
                        onChange={(e) => setCustomActivityName(e.target.value)} 
                        placeholder="e.g. Group Roleplay Project"
                        required
                        style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Max Points</label>
                      <input 
                        type="number" 
                        value={customMaxPoints} 
                        onChange={(e) => setCustomMaxPoints(e.target.value)} 
                        required
                        style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.25)', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', padding: '0.5rem' }}>
                    {filteredActiveStudents.map(student => (
                      <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{student.name}</span>
                        <input 
                          type="number" 
                          placeholder="Score"
                          value={customScores[student.id] === undefined ? '' : customScores[student.id]}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            setCustomScores(prev => ({ ...prev, [student.id]: val }));
                          }}
                          style={{ width: '60px', padding: '0.25rem', textAlign: 'center', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)' }}
                        />
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', alignSelf: 'flex-start' }}>
                    Submit Custom Grades
                  </button>
                </form>
              </div>
            </div>
          )}

          {subTab === 'matrix' && (() => {
            const batchStartDate = (activeInterval && activeInterval.start_date)
              ? activeInterval.start_date
              : (activeInterval && activeInterval.created_at)
                ? activeInterval.created_at
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const matrixDates = getDatesRange(batchStartDate);

            return (
              <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                      📊 Batch Sheet (Matrix Grid)
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                      Full chronological record of batch completions. Tap cells to toggle grades.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-muted)' }}>Activity Metric:</label>
                    <select
                      value={matrixActivity}
                      onChange={(e) => setMatrixActivity(e.target.value as any)}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      <option value="attendance">Attendance Status</option>
                      <option value="daily_vocab">WhatsApp Vocabulary</option>
                      <option value="daily_sentences">Daily Sentences</option>
                      <option value="weekly_vlog">Weekly Vlog</option>
                      <option value="video_reaction">Video Reaction Task</option>
                      <option value="hadithul_arabia">Hadithul Arabia Attendance</option>
                    </select>
                  </div>
                </div>

                {loadingBatchScores ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading grid data...</div>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '450px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-light)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                          <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left', fontWeight: 800, background: 'var(--bg-light)', position: 'sticky', left: 0, zIndex: 11, borderRight: '1px solid rgba(0,0,0,0.06)', minWidth: '150px' }}>Student Name</th>
                          {matrixDates.map(dateStr => {
                            const dateObj = new Date(dateStr);
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = dateObj.getDate();
                            const monName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                            return (
                              <th key={dateStr} style={{ padding: '0.5rem', minWidth: '80px', borderRight: '1px solid rgba(0,0,0,0.03)' }}>
                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{dayName}</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 850, color: 'var(--text-main)' }}>{dayNum}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{monName}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFilteredActiveStudents.map(student => (
                          <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '0.8rem 0.5rem', textAlign: 'left', fontWeight: 700, background: 'white', position: 'sticky', left: 0, zIndex: 5, borderRight: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
                              {student.roll_number && <span style={{ color: 'var(--primary)', marginRight: '0.25rem', fontWeight: 800 }}>#{student.roll_number}</span>}
                              {student.name}
                            </td>
                            {matrixDates.map(dateStr => {
                              const record = batchScores.find(s => s.student_id === student.id && s.logged_date === dateStr && s.score_type === matrixActivity);
                              const isUpdating = updatingMatrix.includes(`${student.id}-${dateStr}-${matrixActivity}`);

                              if (matrixActivity === 'attendance') {
                                const currentStatus = record ? record.activity_name.replace('Attendance: ', '') : '';
                                let color = 'var(--text-muted)';
                                let bg = 'transparent';
                                let text = '✕';
                                
                                if (currentStatus === 'On Time') { color = '#16a34a'; bg = 'rgba(34,197,94,0.08)'; text = 'On Time'; }
                                else if (currentStatus === 'Late') { color = '#b45309'; bg = 'rgba(180,83,9,0.08)'; text = 'Late'; }
                                else if (currentStatus === 'Half Day') { color = '#3b82f6'; bg = 'rgba(59,130,246,0.08)'; text = 'Half Day'; }
                                else if (currentStatus === 'Absent') { color = '#dc2626'; bg = 'rgba(239,68,68,0.08)'; text = 'Absent'; }

                                return (
                                  <td key={dateStr} style={{ padding: '0.4rem', borderRight: '1px solid rgba(0,0,0,0.03)', verticalAlign: 'middle' }}>
                                    <select
                                      value={currentStatus}
                                      disabled={isUpdating}
                                      onChange={(e) => handleToggleMatrixAttendance(student.id, dateStr, e.target.value)}
                                      style={{
                                        fontSize: '0.75rem',
                                        padding: '0.2rem 0.3rem',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        background: bg,
                                        color: color,
                                        fontWeight: currentStatus ? 700 : 400,
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
                              }

                              const isCompleted = !!record;
                              return (
                                <td 
                                  key={dateStr}
                                  onClick={() => !isUpdating && handleToggleMatrixCell(student.id, dateStr, matrixActivity, record)}
                                  style={{
                                    borderRight: '1px solid rgba(0,0,0,0.03)',
                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    background: isCompleted ? 'rgba(34,197,94,0.06)' : 'transparent',
                                    color: isCompleted ? '#16a34a' : 'rgba(0,0,0,0.1)',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    transition: 'all 0.15s',
                                    userSelect: 'none'
                                  }}
                                  title={`${student.name} • ${dateStr}`}
                                >
                                  {isUpdating ? '⏳' : (isCompleted ? '✓' : '·')}
                                </td>
                              );
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

          {subTab === 'standings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.8rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Class Standing Scoreboard</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                    {selectedLeaderboardInterval === 'cumulative'
                      ? 'Cumulative standings computed across all active and archived terms.'
                      : 'Standings computed based on all points accrued in the selected term.'
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period:</label>
                    <select
                      value={selectedLeaderboardInterval}
                      onChange={(e) => handleLeaderboardIntervalChange(e.target.value)}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <option value="cumulative">All Terms (Cumulative)</option>
                      {intervalsList
                        .filter(i => i.course_id === filterCourse && i.batch_number === parseInt(filterBatch))
                        .map(int => (
                          <option key={int.id} value={int.id}>
                            {int.name} {int.is_active ? '(Active)' : '(Archived)'}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  {classroomLeaderboard.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={handleVerifyScores}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', borderColor: '#059669', color: '#047857', cursor: 'pointer' }}
                      >
                        🔍 Verify Sums
                      </button>
                      <button
                        onClick={handlePrintRankList}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', borderColor: 'var(--primary)', color: 'var(--primary-dark)', cursor: 'pointer' }}
                      >
                        <Printer size={12} /> Print Rank List
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {filteredActiveStudents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active students in this batch.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {classroomLeaderboard.map((entry) => {
                    const student = filteredActiveStudents.find(s => s.id === entry.student_id);
                    if (!student) return null;
                    const rBadge = getRankBadge(entry.rank);
                    const lvlPercent = entry.total_score % 100;
                    
                    return (
                      <div
                        key={entry.student_id}
                        onClick={() => handleOpenReport(student)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          background: 'white',
                          borderRadius: '16px',
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.01)',
                          gap: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        className="rank-card"
                      >
                        <div style={{
                          background: rBadge.bg,
                          color: rBadge.color,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '50px',
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {rBadge.text}
                        </div>

                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getAvatarGradient(entry.student_id),
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          {entry.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{entry.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Level {entry.level}</span>
                            <div style={{ width: '60px', height: '5px', background: '#f1f5f9', borderRadius: '50px', overflow: 'hidden' }}>
                              <div style={{ width: `${lvlPercent}%`, height: '100%', background: 'var(--primary)' }} />
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-dark)' }}>{entry.total_score} XP</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Click for Report</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {subTab === 'appeals' && (
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.8rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <HelpCircle size={18} className="text-primary" /> Correction Requests & Appeals
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                    Review student score adjustment requests for this batch.
                  </p>
                </div>

                {/* Status Filter Tab Buttons */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', padding: '0.25rem', borderRadius: '8px', gap: '0.2rem' }}>
                  {(['pending', 'approved', 'rejected'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAppealsFilter(filter)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        background: appealsFilter === filter ? 'white' : 'transparent',
                        color: appealsFilter === filter ? 'var(--primary-dark)' : 'var(--text-muted)',
                        boxShadow: appealsFilter === filter ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {loadingAdminAppeals ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading correction requests...</div>
              ) : (() => {
                const batchAppeals = adminAppeals.filter(
                  a => a.student?.course_id === filterCourse && a.student?.batch_number === parseInt(filterBatch) && a.status === appealsFilter
                );
                
                if (batchAppeals.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(0,0,0,0.01)', border: '1px dashed rgba(0,0,0,0.08)', borderRadius: '16px', color: 'var(--text-muted)' }}>
                      <HelpCircle size={20} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
                      <h4 style={{ fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-main)', fontSize: '0.85rem' }}>No requests found</h4>
                      <p style={{ fontSize: '0.75rem', margin: 0 }}>There are no {appealsFilter} requests for this batch.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                          <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 700 }}>Student</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 700 }}>Date</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 700 }}>Category</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 700 }}>Activity</th>
                          <th style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 700 }}>Current</th>
                          <th style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 700 }}>Expected</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: 700 }}>Reason</th>
                          <th style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 700 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchAppeals.map((app) => (
                          <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <td style={{ padding: '0.8rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{app.student?.name || 'Student'}</td>
                            <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(app.logged_date).toLocaleDateString()}</td>
                            <td style={{ padding: '0.8rem', textTransform: 'capitalize', fontWeight: 600 }}>{app.request_type}</td>
                            <td style={{ padding: '0.8rem' }}>{app.activity_name}</td>
                            <td style={{ padding: '0.8rem', textAlign: 'center', color: '#64748b' }}>{app.current_value}</td>
                            <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 700, color: 'var(--primary-dark)' }}>{app.expected_value}</td>
                            <td 
                              style={{ 
                                padding: '0.8rem', 
                                color: '#475569', 
                                maxWidth: '200px',
                                cursor: 'pointer'
                              }}
                              onClick={() => setExpandedAppealId(expandedAppealId === app.id ? null : app.id)}
                              title="Click to expand/collapse"
                            >
                              <div style={{
                                whiteSpace: expandedAppealId === app.id ? 'normal' : 'nowrap',
                                overflow: expandedAppealId === app.id ? 'visible' : 'hidden',
                                textOverflow: expandedAppealId === app.id ? 'unset' : 'ellipsis',
                                wordBreak: 'break-word'
                              }}>
                                {app.reason}
                              </div>
                            </td>
                            <td style={{ padding: '0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {app.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleConfirmAppealAction(true, app)}
                                    disabled={processingAppealAction}
                                    className="btn btn-primary"
                                    style={{ 
                                      padding: '0.35rem 0.8rem', 
                                      fontSize: '0.75rem', 
                                      background: '#16a34a', 
                                      color: 'white', 
                                      border: 'none', 
                                      borderRadius: '6px', 
                                      cursor: 'pointer', 
                                      fontWeight: 700,
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleConfirmAppealAction(false, app)}
                                    disabled={processingAppealAction}
                                    className="btn btn-outline"
                                    style={{ 
                                      padding: '0.35rem 0.8rem', 
                                      fontSize: '0.75rem', 
                                      background: '#dc2626', 
                                      color: 'white', 
                                      border: 'none', 
                                      borderRadius: '6px', 
                                      cursor: 'pointer', 
                                      fontWeight: 700,
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                  color: app.status === 'approved' ? '#16a34a' : '#dc2626'
                                }}>
                                  {app.status}
                                </span>
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
        </>
      )}
    </div>
  );
};
