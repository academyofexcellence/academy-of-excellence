import React from 'react';
import { StudentProfile, ScoreLog, Interval } from '../../lib/types';
import { 
  Calendar, BookOpen, MessageSquare, Video, Globe, Award, Printer, AlertTriangle, FileText, Clock, Grid, Sparkles, Compass, Volume2
} from 'lucide-react';

interface StudentProgressProps {
  currentStudent: StudentProfile;
  recentLogs: ScoreLog[];
  weeklyStatus: {
    vocab: { [key: string]: boolean };
    sentences: { [key: string]: boolean };
    vlog: boolean;
    videoReaction: boolean;
    hadithulArabia: boolean;
  };
  remarks: any;
  intervals: Interval[];
  selectedInterval: string;
  handleIntervalChange: (val: string) => void;
  
  attendanceRate: number;
  onTimeCount: number;
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
  presentDays: number;
  totalWorkingDays: number;
  totalPenaltiesCount: number;
  examAvg: number | null;
  examLogs: ScoreLog[];
  talkAvg: number | 'N/A';
  vocabCount: number;
  totalVocab: number;
  sentencesCount: number;
  totalSentences: number;
  vlogCount: number;
  totalVlog: number;
  videoReactionCount: number;
  totalReaction: number;
  hadithulArabiaCount: number;
  totalHadithul: number;
  
  handleOpenAppealForDate: (dateStr: string, type: 'attendance' | 'checklist' | 'scoring', activity?: string, currentVal?: string) => void;
  handlePrintReport: (student: StudentProfile, logs: ScoreLog[]) => void;
  getDatesRange: (startDateStr: string, endDateStr?: string) => string[];
}

export const StudentProgress: React.FC<StudentProgressProps> = ({
  currentStudent,
  recentLogs,
  weeklyStatus,
  remarks,
  intervals,
  selectedInterval,
  handleIntervalChange,
  attendanceRate,
  onTimeCount,
  lateCount,
  halfDayCount,
  absentCount,
  presentDays,
  totalWorkingDays,
  totalPenaltiesCount,
  examAvg,
  examLogs,
  talkAvg,
  vocabCount,
  totalVocab,
  sentencesCount,
  totalSentences,
  vlogCount,
  totalVlog,
  videoReactionCount,
  totalReaction,
  hadithulArabiaCount,
  totalHadithul,
  handleOpenAppealForDate,
  handlePrintReport,
  getDatesRange
}) => {
  const hasAnyRemarks = remarks && (
    remarks.strengths?.trim() ||
    remarks.weaknesses?.trim() ||
    remarks.career_path?.trim() ||
    remarks.general_remarks?.trim() ||
    (remarks.mock_interview_mark !== null && remarks.mock_interview_mark !== undefined) ||
    remarks.mock_interview_remark?.trim() ||
    (remarks.industrial_visit_mark !== null && remarks.industrial_visit_mark !== undefined) ||
    remarks.industrial_visit_remark?.trim()
  );

  if (currentStudent.status === 'alumni') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Period Selector */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '-0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period filter:</label>
          <select
            value={selectedInterval}
            onChange={(e) => handleIntervalChange(e.target.value)}
            style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <option value="cumulative">All Terms (Cumulative)</option>
            {intervals.map(int => (
              <option key={int.id} value={int.id}>
                {int.name} {int.is_active ? '(Active)' : '(Archived)'}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Column: Graduation Transcript */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                    <Award size={18} className="text-primary" /> Graduation Academic Transcript
                  </h3>
                </div>
                <button
                  onClick={() => handlePrintReport(currentStudent, recentLogs)}
                  className="btn btn-outline"
                  style={{ 
                    padding: '0.35rem 0.75rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.3rem', 
                    borderColor: 'var(--primary)',
                    color: 'var(--primary-dark)',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={12} /> Print Report
                </button>
              </div>
              
              {/* Grid of Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Final Attendance Rate</span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--primary-dark)' }}>{attendanceRate}%</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    OT: {onTimeCount} | L: {lateCount} | HD: {halfDayCount} | A: {absentCount} ({presentDays}/{totalWorkingDays} Days)
                  </span>
                </div>

                <div style={{ background: totalPenaltiesCount > 0 ? 'rgba(239,68,68,0.02)' : 'white', padding: '0.8rem', borderRadius: '12px', border: totalPenaltiesCount > 0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: totalPenaltiesCount > 0 ? '#b91c1c' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {totalPenaltiesCount > 0 && <AlertTriangle size={12} style={{ color: '#dc2626' }} />} Total Penalties
                  </span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: totalPenaltiesCount > 0 ? '#dc2626' : 'var(--text-main)' }}>{totalPenaltiesCount}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Total Violations Recorded
                  </span>
                </div>

                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Final Exam Average</span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-main)' }}>{examAvg !== null ? `${examAvg}%` : 'N/A'}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Across {examLogs.length} Exams
                  </span>
                </div>

                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Volume2 size={12} className="text-primary" /> Oral / Speech Avg
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
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vocabCount} / {totalVocab}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sentences</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{sentencesCount} / {totalSentences}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vlogs</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vlogCount} / {totalVlog}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reactions</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{videoReactionCount} / {totalReaction}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hadithul A.</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{hadithulArabiaCount} / {totalHadithul}</span>
                </div>
              </div>

              {/* Exams Details list */}
              {examLogs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} className="text-primary" /> Exam Breakdown
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.2rem' }}>
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
          </div>

          {/* Right Column: Remarks & Counseling */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
              <MessageSquare size={20} className="text-primary" /> Instructor Remarks & Counseling
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
              Personalized guidance, performance feedback, and career counseling remarks from the academy instructors.
            </p>

            {hasAnyRemarks ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {remarks.strengths?.trim() && (
                  <div className="remarks-card" style={{ background: 'rgba(16, 185, 129, 0.015)', borderColor: 'rgba(16, 185, 129, 0.12)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div className="remarks-title" style={{ color: '#047857', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <Sparkles size={14} /> 💪 Strengths
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{remarks.strengths}</div>
                  </div>
                )}

                {remarks.weaknesses?.trim() && (
                  <div className="remarks-card" style={{ background: 'rgba(239, 68, 68, 0.015)', borderColor: 'rgba(239, 68, 68, 0.12)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div className="remarks-title" style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <AlertTriangle size={14} /> ⚠️ Areas for Improvement
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{remarks.weaknesses}</div>
                  </div>
                )}

                {remarks.career_path?.trim() && (
                  <div className="remarks-card" style={{ background: 'rgba(59, 130, 246, 0.015)', borderColor: 'rgba(59, 130, 246, 0.12)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div className="remarks-title" style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <Compass size={14} /> 🎯 Apt Career Path
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{remarks.career_path}</div>
                  </div>
                )}

                {remarks.general_remarks?.trim() && (
                  <div className="remarks-card" style={{ background: 'rgba(201, 156, 51, 0.015)', borderColor: 'rgba(201, 156, 51, 0.12)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(201, 156, 51, 0.2)' }}>
                    <div className="remarks-title" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <MessageSquare size={14} /> 📝 General Remarks
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{remarks.general_remarks}</div>
                  </div>
                )}

                {(remarks.mock_interview_mark !== null && remarks.mock_interview_mark !== undefined || remarks.mock_interview_remark?.trim()) && (
                  <div className="remarks-card" style={{ background: 'rgba(201, 156, 51, 0.015)', borderColor: 'rgba(201, 156, 51, 0.12)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(201, 156, 51, 0.2)' }}>
                    <div className="remarks-title" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <Award size={14} /> 👔 Mock Interview (Score: {remarks.mock_interview_mark !== null && remarks.mock_interview_mark !== undefined ? `${remarks.mock_interview_mark}` : 'N/A'})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {remarks.mock_interview_remark?.trim() ? remarks.mock_interview_remark : <span className="remarks-empty">No feedback recorded.</span>}
                    </div>
                  </div>
                )}

                {(remarks.industrial_visit_mark !== null && remarks.industrial_visit_mark !== undefined || remarks.industrial_visit_remark?.trim()) && (
                  <div className="remarks-card" style={{ background: 'rgba(201, 156, 51, 0.015)', borderColor: 'rgba(201, 156, 51, 0.12)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(201, 156, 51, 0.2)' }}>
                    <div className="remarks-title" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <Compass size={14} /> 🚌 Industrial Visit (Score: {remarks.industrial_visit_mark !== null && remarks.industrial_visit_mark !== undefined ? `${remarks.industrial_visit_mark}` : 'N/A'})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {remarks.industrial_visit_remark?.trim() ? remarks.industrial_visit_remark : <span className="remarks-empty">No feedback recorded.</span>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center', background: 'rgba(201, 156, 51, 0.02)', borderRadius: '16px', border: '1px dashed rgba(201, 156, 51, 0.2)', marginTop: '1rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(201, 156, 51, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <MessageSquare size={28} className="text-primary" />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Remarks will appear here</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: 0 }}>
                  Once logged by your course instructors, your strengths, weaknesses, and career counseling remarks will be shown here.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  let intervalStartDate = new Date().toISOString();
  if (selectedInterval === 'cumulative') {
    const sortedInts = [...intervals].sort((a, b) => {
      const dateA = new Date(a.start_date || a.created_at || '').getTime();
      const dateB = new Date(b.start_date || b.created_at || '').getTime();
      return dateA - dateB;
    });
    const earliest = sortedInts[0];
    if (earliest) {
      intervalStartDate = earliest.start_date || earliest.created_at || new Date().toISOString();
    }
  } else {
    const currentIntervalObj = intervals.find(i => i.id === selectedInterval);
    if (currentIntervalObj) {
      intervalStartDate = currentIntervalObj.start_date || currentIntervalObj.created_at || new Date().toISOString();
    }
  }

  const sortedIntsForBound = [...intervals].sort((a, b) => {
    const dateA = new Date(a.start_date || a.created_at || '').getTime();
    const dateB = new Date(b.start_date || b.created_at || '').getTime();
    return dateA - dateB;
  });

  const activeObj = selectedInterval === 'cumulative' 
    ? null 
    : (intervals.find(i => i.id === selectedInterval) || sortedIntsForBound.find(i => i.is_active) || sortedIntsForBound[0]);

  let intervalEndDate: string | undefined = activeObj?.end_date || undefined;
  if (!intervalEndDate && activeObj) {
    const idx = sortedIntsForBound.findIndex(i => i.id === activeObj.id);
    if (idx !== -1 && idx < sortedIntsForBound.length - 1) {
      const nextInterval = sortedIntsForBound[idx + 1];
      const nextRawStart = nextInterval.start_date || nextInterval.created_at || '';
      if (nextRawStart) {
        const nextStart = new Date(nextRawStart);
        nextStart.setDate(nextStart.getDate() - 1);
        intervalEndDate = nextStart.toISOString().split('T')[0];
      }
    }
  }

  const matrixDates = getDatesRange(intervalStartDate, intervalEndDate);

  const checkItem = (scoreType: string, dateStr: string) => {
    const exists = recentLogs.some(s => s.logged_date === dateStr && s.score_type === scoreType);
    return exists ? (
      <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
    ) : (
      <span style={{ color: '#cbd5e1' }}>-</span>
    );
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Metrics Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '-0.5rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period filter:</label>
        <select
          value={selectedInterval}
          onChange={(e) => handleIntervalChange(e.target.value)}
          style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          <option value="cumulative">All Terms (Cumulative)</option>
          {intervals.map(int => (
            <option key={int.id} value={int.id}>
              {int.name} {int.is_active ? '(Active)' : '(Archived)'}
            </option>
          ))}
        </select>
      </div>

      <div className="student-dash-grid">
        {/* Left Column: Metrics & Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Performance Summary Report Card */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                  <Award size={18} className="text-primary" /> Performance Report
                </h3>
              </div>
              <button
                onClick={() => handlePrintReport(currentStudent, recentLogs)}
                className="btn btn-outline"
                style={{ 
                  padding: '0.35rem 0.75rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.3rem', 
                  borderColor: 'var(--primary)',
                  color: 'var(--primary-dark)',
                  cursor: 'pointer'
                }}
              >
                <Printer size={12} /> Print Report
              </button>
            </div>
            
            {/* Grid of Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Rate</span>
                <div style={{ margin: '0.4rem 0' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--primary-dark)' }}>{attendanceRate}%</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  OT: {onTimeCount} | L: {lateCount} | HD: {halfDayCount} | A: {absentCount} ({presentDays}/{totalWorkingDays} Days)
                </span>
              </div>

              <div style={{ background: totalPenaltiesCount > 0 ? 'rgba(239,68,68,0.02)' : 'white', padding: '0.8rem', borderRadius: '12px', border: totalPenaltiesCount > 0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: totalPenaltiesCount > 0 ? '#b91c1c' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {totalPenaltiesCount > 0 && <AlertTriangle size={12} style={{ color: '#dc2626' }} />} Malayalam Penalties
                </span>
                <div style={{ margin: '0.4rem 0' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 850, color: totalPenaltiesCount > 0 ? '#dc2626' : 'var(--text-main)' }}>{totalPenaltiesCount}</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Total Term Violations
                </span>
              </div>

              <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Exam Average</span>
                <div style={{ margin: '0.4rem 0' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-main)' }}>{examAvg !== null ? `${examAvg}%` : 'N/A'}</span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Across {examLogs.length} Exams
                </span>
              </div>

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
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vocabCount} / {totalVocab}</span>
              </div>
              <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sentences</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{sentencesCount} / {totalSentences}</span>
              </div>
              <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vlogs</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vlogCount} / {totalVlog}</span>
              </div>
              <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reactions</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{videoReactionCount} / {totalReaction}</span>
              </div>
              <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hadithul A.</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{hadithulArabiaCount} / {totalHadithul}</span>
              </div>
            </div>

            {/* Exams Details list */}
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
        </div>

        {/* Right Column: Weekly Checklist & Audit Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Weekly Checklist Checklist */}
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

          {/* Audit Logs */}
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

      {/* --- DAILY MARKS MATRIX --- */}
      <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
          <Grid size={20} className="text-primary" /> My Daily Marks Matrix
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
          Your comprehensive day-by-day record of attendance, daily tasks, and XP allocations starting from the first day of this period. Click the <strong>"Appeal"</strong> button next to any date to submit a correction request.
        </p>

        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Attendance</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>WhatsApp Vocab</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>WhatsApp Sentences</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Weekly Vlog</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Video Reaction</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Hadithul Arabia</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Daily XP</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {matrixDates.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No dates available for this interval.
                  </td>
                </tr>
              ) : (
                matrixDates.map(dateStr => {
                  const attObj = recentLogs.find(s => s.logged_date === dateStr && s.score_type === 'attendance');
                  const attVal = attObj ? attObj.activity_name.replace('Attendance: ', '') : '';
                  
                  let attDisplay = '-';
                  let attColor = '#64748b';
                  if (attVal === 'On Time') { attDisplay = 'OT'; attColor = '#16a34a'; }
                  else if (attVal === 'Late') { attDisplay = 'L'; attColor = '#b45309'; }
                  else if (attVal === 'Half Day') { attDisplay = 'HD'; attColor = '#3b82f6'; }
                  else if (attVal === 'Absent') { attDisplay = 'A'; attColor = '#dc2626'; }

                  const dayLogs = recentLogs.filter(s => s.logged_date === dateStr);
                  const dayXP = dayLogs.reduce((sum, s) => sum + s.points, 0);

                  return (
                    <tr key={dateStr} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: attColor }}>
                        {attDisplay}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {checkItem('daily_vocab', dateStr)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {checkItem('daily_sentences', dateStr)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {checkItem('weekly_vlog', dateStr)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {checkItem('video_reaction', dateStr)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {checkItem('hadithul_arabia', dateStr)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: dayXP > 0 ? '#16a34a' : dayXP < 0 ? '#dc2626' : 'inherit' }}>
                        {dayXP > 0 ? `+${dayXP}` : dayXP} XP
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            let prefillType: 'attendance' | 'checklist' | 'scoring' = 'attendance';
                            let prefillActivity = 'Attendance';
                            let prefillCurrent = 'Absent';
                            if (!attObj || attVal === 'Absent') {
                              prefillType = 'attendance';
                              prefillActivity = 'Attendance';
                              prefillCurrent = attVal || 'Absent';
                            } else {
                              const hasVocab = recentLogs.some(s => s.logged_date === dateStr && s.score_type === 'daily_vocab');
                              const hasSentences = recentLogs.some(s => s.logged_date === dateStr && s.score_type === 'daily_sentences');
                              if (!hasVocab) {
                                prefillType = 'checklist';
                                prefillActivity = 'Daily Vocab';
                                prefillCurrent = 'Incomplete';
                              } else if (!hasSentences) {
                                prefillType = 'checklist';
                                prefillActivity = 'Daily Sentences';
                                prefillCurrent = 'Incomplete';
                              } else {
                                prefillType = 'checklist';
                                prefillActivity = 'Daily Vocab';
                                prefillCurrent = 'Incomplete';
                              }
                            }
                            handleOpenAppealForDate(dateStr, prefillType, prefillActivity, prefillCurrent);
                          }}
                          className="btn btn-outline"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            borderColor: 'var(--primary)',
                            color: 'var(--primary-dark)',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Appeal
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '15px', fontSize: '0.75rem', marginTop: '1rem', color: '#64748b', flexWrap: 'wrap' }}>
          <strong>Attendance Legend:</strong>
          <div><span style={{ color: '#16a34a', fontWeight: 'bold' }}>OT:</span> On Time</div>
          <div><span style={{ color: '#b45309', fontWeight: 'bold' }}>L:</span> Late</div>
          <div><span style={{ color: '#3b82f6', fontWeight: 'bold' }}>HD:</span> Half Day</div>
          <div><span style={{ color: '#dc2626', fontWeight: 'bold' }}>A:</span> Absent</div>
          <div style={{ marginLeft: '10px' }}>• <strong>Checklist Legend:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span> Completed / Approved | <span style={{ color: '#cbd5e1' }}>-</span> Pending / Incomplete</div>
        </div>
      </div>

      {/* --- INSTRUCTOR REMARKS & COUNSELING --- */}
      <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
          <MessageSquare size={20} className="text-primary" /> Instructor Remarks & Counseling
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
          Personalized guidance, performance feedback, and career counseling remarks from the academy instructors.
        </p>

        {hasAnyRemarks ? (
          <div className="remarks-grid">
            <div className="remarks-card" style={{ background: 'rgba(16, 185, 129, 0.015)', borderColor: 'rgba(16, 185, 129, 0.12)' }}>
              <div className="remarks-title" style={{ color: '#047857' }}>
                <Sparkles size={16} /> 💪 Strengths
              </div>
              <div className="remarks-content">
                {remarks.strengths?.trim() ? remarks.strengths : <span className="remarks-empty">No strengths recorded yet.</span>}
              </div>
            </div>

            <div className="remarks-card" style={{ background: 'rgba(239, 68, 68, 0.015)', borderColor: 'rgba(239, 68, 68, 0.12)' }}>
              <div className="remarks-title" style={{ color: '#b91c1c' }}>
                <AlertTriangle size={16} /> ⚠️ Areas for Improvement
              </div>
              <div className="remarks-content">
                {remarks.weaknesses?.trim() ? remarks.weaknesses : <span className="remarks-empty">No areas recorded yet.</span>}
              </div>
            </div>

            <div className="remarks-card" style={{ background: 'rgba(59, 130, 246, 0.015)', borderColor: 'rgba(59, 130, 246, 0.12)' }}>
              <div className="remarks-title" style={{ color: '#1d4ed8' }}>
                <Compass size={16} /> 🎯 Apt Career Path
              </div>
              <div className="remarks-content">
                {remarks.career_path?.trim() ? remarks.career_path : <span className="remarks-empty">No recommendations yet.</span>}
              </div>
            </div>

            <div className="remarks-card" style={{ background: 'rgba(201, 156, 51, 0.015)', borderColor: 'rgba(201, 156, 51, 0.12)' }}>
              <div className="remarks-title" style={{ color: 'var(--primary-dark)' }}>
                <MessageSquare size={16} /> 📝 General Remarks
              </div>
              <div className="remarks-content">
                {remarks.general_remarks?.trim() ? remarks.general_remarks : <span className="remarks-empty">No remarks recorded.</span>}
              </div>
            </div>

            <div className="remarks-card" style={{ background: 'rgba(201, 156, 51, 0.015)', borderColor: 'rgba(201, 156, 51, 0.12)' }}>
              <div className="remarks-title" style={{ color: 'var(--primary-dark)' }}>
                <Award size={16} /> 👔 Mock Interview (Score: {remarks.mock_interview_mark !== null && remarks.mock_interview_mark !== undefined ? `${remarks.mock_interview_mark}` : 'N/A'})
              </div>
              <div className="remarks-content">
                {remarks.mock_interview_remark?.trim() ? remarks.mock_interview_remark : <span className="remarks-empty">No feedback recorded.</span>}
              </div>
            </div>

            <div className="remarks-card" style={{ background: 'rgba(201, 156, 51, 0.015)', borderColor: 'rgba(201, 156, 51, 0.12)' }}>
              <div className="remarks-title" style={{ color: 'var(--primary-dark)' }}>
                <Compass size={16} /> 🚌 Industrial Visit (Score: {remarks.industrial_visit_mark !== null && remarks.industrial_visit_mark !== undefined ? `${remarks.industrial_visit_mark}` : 'N/A'})
              </div>
              <div className="remarks-content">
                {remarks.industrial_visit_remark?.trim() ? remarks.industrial_visit_remark : <span className="remarks-empty">No feedback recorded.</span>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center', background: 'rgba(201, 156, 51, 0.02)', borderRadius: '16px', border: '1px dashed rgba(201, 156, 51, 0.2)', marginTop: '1rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(201, 156, 51, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <MessageSquare size={28} className="text-primary" />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Remarks will appear here</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: 0 }}>
              Once logged by your course instructors, your strengths, weaknesses, and career counseling remarks will be shown here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
