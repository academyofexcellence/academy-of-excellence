import React, { useState } from 'react';
import { StudentProfile, LeaderboardEntry, Interval } from '../../lib/types';
import { TrendingUp, Search } from 'lucide-react';

interface StudentLeaderboardProps {
  currentStudent: StudentProfile;
  leaderboard: LeaderboardEntry[];
  intervals: Interval[];
  selectedInterval: string;
  handleIntervalChange: (val: string) => void;
}

export const StudentLeaderboard: React.FC<StudentLeaderboardProps> = ({
  currentStudent,
  leaderboard,
  intervals,
  selectedInterval,
  handleIntervalChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Period select labels
  const getPeriodLabel = () => {
    if (selectedInterval === 'cumulative') return 'All Terms (Cumulative)';
    const intObj = intervals.find(i => i.id === selectedInterval);
    return intObj ? `${intObj.name} ${intObj.is_active ? '(Active)' : '(Archived)'}` : '';
  };

  const filteredLeaderboard = leaderboard.filter(entry => 
    entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '👑 1st', color: 'white' };
    if (rank === 2) return { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', text: '🥈 2nd', color: '#1e293b' };
    if (rank === 3) return { bg: 'linear-gradient(135deg, #ffedd5, #b45309)', text: '🥉 3rd', color: '#78350f' };
    return { bg: '#f1f5f9', text: `#${rank}`, color: '#64748b' };
  };

  const getAvatarGradient = (id: string, isMe: boolean) => {
    if (isMe) return 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
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

  const [selectedBreakdownStudent, setSelectedBreakdownStudent] = useState<LeaderboardEntry | null>(null);

  return (
    <div className="glass-card leaderboard-wrapper-card">
      
      {/* Leaderboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201,156,51,0.12)', paddingBottom: '1rem', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} className="text-primary" /> Batch Performance Leaderboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
            Currently viewing: <strong>{getPeriodLabel()}</strong>
          </p>
        </div>
        
        {/* Interval Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period:</label>
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
      </div>

      {/* QR Attendance Ranking System Notice Banner */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.65rem 1rem', borderRadius: '10px', marginBottom: '1.2rem', fontSize: '0.78rem', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>⚡ <strong>Live Integrated Ranking:</strong> Total XP = Sum of all Category XP (Attendance + Vocab + Sentences + Vlogs + Exams + Penalties)! Click any student to view detailed category score breakdown.</span>
      </div>

      {/* Roster Search bar */}
      <div style={{ position: 'relative', marginBottom: '1.2rem' }}>
        <input 
          type="text" 
          placeholder="Search student by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.2rem', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', fontSize: '0.85rem' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      </div>

      {/* Leaderboard Rankings List */}
      <div className="leaderboard-list">
        {filteredLeaderboard.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No matching students found.
          </div>
        ) : (
          filteredLeaderboard.map(entry => {
            const isSelf = entry.student_id === currentStudent.id;
            const topScore = leaderboard[0]?.total_score || 100;
            const relativePercent = topScore > 0 ? Math.min(100, Math.max(0, (entry.total_score / topScore) * 100)) : 0;
            const rankBadge = getRankBadge(entry.rank);
            const initials = entry.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

            return (
              <div 
                key={entry.student_id}
                className={`student-rank-card ${isSelf ? 'student-rank-card-self' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedBreakdownStudent(entry)}
              >
                {/* Rank Pill */}
                <div 
                  className="student-rank-badge"
                  style={{
                    background: rankBadge.bg,
                    color: rankBadge.color
                  }}
                >
                  {rankBadge.text}
                </div>

                {/* Avatar Bubble */}
                <div 
                  className="student-avatar-bubble"
                  style={{
                    background: getAvatarGradient(entry.student_id, isSelf)
                  }}
                >
                  {initials}
                </div>

                {/* Name & Gamified Level progress bar */}
                <div className="student-name-container" style={{ flex: 1 }}>
                  <div className="student-name-row">
                    <span 
                      className="student-name-text" 
                      style={{ color: isSelf ? 'var(--primary-dark)' : 'var(--text-main)' }}
                      title={entry.name}
                    >
                      {entry.name}
                    </span>
                    {isSelf && (
                      <span style={{ background: 'var(--primary-dark)', color: 'white', fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                        You
                      </span>
                    )}
                  </div>
                  
                  <div className="student-level-row">
                    <span 
                      className="student-level-badge" 
                      style={{ 
                        background: isSelf ? 'rgba(201,156,51,0.2)' : 'rgba(0,0,0,0.06)', 
                        color: isSelf ? 'var(--primary-dark)' : 'var(--text-muted)' 
                      }}
                    >
                      Lvl {entry.level}
                    </span>
                    <div className="student-progress-container">
                      <div 
                        className="student-progress-bar"
                        style={{ 
                          width: `${relativePercent}%`, 
                          background: isSelf ? 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)' : 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Category Breakdown Pills */}
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.65rem' }}>
                    {(entry.attendance_xp ?? 0) > 0 && (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        📷 {entry.attendance_xp} Attendance
                      </span>
                    )}
                    {(entry.vocab_xp ?? 0) > 0 && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        📖 {entry.vocab_xp} Vocab
                      </span>
                    )}
                    {(entry.sentence_xp ?? 0) > 0 && (
                      <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        ✍️ {entry.sentence_xp} Sentences
                      </span>
                    )}
                    {(entry.vlog_xp ?? 0) > 0 && (
                      <span style={{ background: '#fae8ff', color: '#86198f', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        🎥 {entry.vlog_xp} Vlog
                      </span>
                    )}
                    {(entry.reaction_xp ?? 0) > 0 && (
                      <span style={{ background: '#fce7f3', color: '#9d174d', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        🎬 {entry.reaction_xp} Reaction
                      </span>
                    )}
                    {(entry.hadith_xp ?? 0) > 0 && (
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        🕌 {entry.hadith_xp} Hadith
                      </span>
                    )}
                    {(entry.exam_xp ?? 0) > 0 && (
                      <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        🎓 {entry.exam_xp} Exam
                      </span>
                    )}
                    {(entry.custom_xp ?? 0) > 0 && (
                      <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        ⚙️ {entry.custom_xp} Custom
                      </span>
                    )}
                    {(entry.penalty_xp ?? 0) < 0 && (
                      <span style={{ background: '#ffe4e6', color: '#9f1239', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        ⚠️ {entry.penalty_xp} Penalty
                      </span>
                    )}
                  </div>
                </div>

                {/* Total points XP */}
                <div className="student-xp-container" style={{ textAlign: 'right' }}>
                  <span className="student-xp-value" style={{ color: isSelf ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                    {entry.total_score}
                  </span>
                  <span className="student-xp-label">
                    XP
                  </span>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Click details
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Category XP Breakdown Modal */}
      {selectedBreakdownStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  📊 Category Score Breakdown
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Student: <strong>{selectedBreakdownStudent.name}</strong> • Rank: #{selectedBreakdownStudent.rank}
                </p>
              </div>
              <button 
                onClick={() => setSelectedBreakdownStudent(null)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Total Score Summary Box */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700 }}>Total Cumulative XP</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24' }}>{selectedBreakdownStudent.total_score} XP</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Level {selectedBreakdownStudent.level}
                </span>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>📷 Attendance</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.attendance_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 700 }}>📖 Daily Vocab</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e3a8a', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.vocab_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3730a3', fontWeight: 700 }}>✍️ Daily Sentences</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#312e81', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.sentence_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#fae8ff', border: '1px solid #f5d0fe', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#86198f', fontWeight: 700 }}>🎥 Weekly Vlog</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#701a75', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.vlog_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#fce7f3', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9d174d', fontWeight: 700 }}>🎬 Video Reaction</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#831843', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.reaction_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700 }}>🕌 Hadithul Arabia</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#78350f', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.hadith_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: 700 }}>🎓 Term Exams</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#581c87', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.exam_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 700 }}>⚙️ Custom Activity</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.custom_xp ?? 0} XP
                </div>
              </div>

              <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9f1239', fontWeight: 700 }}>⚠️ Penalties</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#881337', marginTop: '0.2rem' }}>
                  {selectedBreakdownStudent.penalty_xp ?? 0} XP
                </div>
              </div>

            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedBreakdownStudent(null)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: 'var(--primary-dark)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
