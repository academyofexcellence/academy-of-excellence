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

  return (
    <div className="glass-card leaderboard-wrapper-card">
      
      {/* Leaderboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201,156,51,0.12)', paddingBottom: '1rem', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} className="text-primary" /> Batch Rankings
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
                <div className="student-name-container">
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
                </div>

                {/* Total points XP */}
                <div className="student-xp-container">
                  <span className="student-xp-value" style={{ color: isSelf ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                    {entry.total_score}
                  </span>
                  <span className="student-xp-label">
                    XP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
