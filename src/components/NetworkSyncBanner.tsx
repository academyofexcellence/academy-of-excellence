import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncEngine } from '../lib/syncEngine';
import { Wifi, WifiOff, RefreshCw, HardDrive, ShieldCheck } from 'lucide-react';

export default function NetworkSyncBanner() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    pendingCount: 0,
    lastSync: new Date().toISOString(),
    isSyncing: false
  });

  useEffect(() => {
    if (!isAdminRoute) return;

    syncEngine.init();
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, [isAdminRoute]);

  if (!isAdminRoute) return null;

  const timeAgo = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <div style={{
      background: syncStatus.isOnline 
        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)' 
        : 'linear-gradient(135deg, #7c2d12 0%, #451a03 100%)',
      color: 'white',
      padding: '0.45rem 1rem',
      fontSize: '0.78rem',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(201, 156, 51, 0.25)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
      flexWrap: 'wrap',
      gap: '0.5rem'
    }}>
      {/* Connection & Mirror Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {syncStatus.isOnline ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
            <Wifi size={13} /> Online & Synced
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#f97316', background: 'rgba(249, 115, 22, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(249, 115, 22, 0.4)' }}>
            <WifiOff size={13} /> Offline Mode Active
          </span>
        )}

        <span style={{ color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <HardDrive size={13} color="#c99c33" /> Local Mirror: Active (Last synced: {timeAgo(syncStatus.lastSync)})
        </span>
      </div>

      {/* Pending Offline Actions Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {syncStatus.pendingCount > 0 ? (
          <span style={{ background: '#d97706', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <RefreshCw size={12} className="animate-spin" /> {syncStatus.pendingCount} Pending Offline Actions
          </span>
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ShieldCheck size={13} color="#c99c33" /> 100% Dual-Database Protected
          </span>
        )}

        <button
          onClick={() => syncEngine.flushOfflineQueue()}
          disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          style={{
            background: 'rgba(201, 156, 51, 0.2)',
            color: '#e6be65',
            border: '1px solid rgba(201, 156, 51, 0.4)',
            borderRadius: '6px',
            padding: '0.2rem 0.5rem',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: (syncStatus.isSyncing || !syncStatus.isOnline) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <RefreshCw size={11} className={syncStatus.isSyncing ? 'animate-spin' : ''} />
          {syncStatus.isSyncing ? 'Syncing...' : 'Sync Cloud'}
        </button>
      </div>
    </div>
  );
}
