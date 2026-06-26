import React, { useState } from 'react';
import { AlumniDirectory } from './AlumniDirectory';
import { AlumniFeed } from './AlumniFeed';
import { Users, MessagesSquare } from 'lucide-react';

interface AlumniLoungeProps {
  currentUserId: string;
  isStaffOrAdmin: boolean;
}

export const AlumniLounge: React.FC<AlumniLoungeProps> = ({ currentUserId, isStaffOrAdmin }) => {
  const [subTab, setSubTab] = useState<'directory' | 'feed'>('directory');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-color)' }}>
          💬 Alumni Lounge & Networking Hub
        </h2>
        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Connect with graduates, share language learning resources, and explore career advice.
        </p>
      </div>

      {/* Navigation Switcher */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '0.8rem', 
          background: 'rgba(0,0,0,0.03)', 
          padding: '0.4rem', 
          borderRadius: '10px',
          alignSelf: 'flex-start'
        }}
      >
        <button
          onClick={() => setSubTab('directory')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'directory' ? 'white' : 'transparent',
            boxShadow: subTab === 'directory' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: subTab === 'directory' ? 'var(--primary-dark)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
        >
          <Users size={16} />
          <span>Alumni Directory</span>
        </button>

        <button
          onClick={() => setSubTab('feed')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'feed' ? 'white' : 'transparent',
            boxShadow: subTab === 'feed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: subTab === 'feed' ? 'var(--primary-dark)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
        >
          <MessagesSquare size={16} />
          <span>Discussion Board</span>
        </button>
      </div>

      {/* Main Sub-views */}
      <div>
        {subTab === 'directory' ? (
          <AlumniDirectory currentUserId={currentUserId} />
        ) : (
          <AlumniFeed currentUserId={currentUserId} isStaffOrAdmin={isStaffOrAdmin} />
        )}
      </div>

    </div>
  );
};
