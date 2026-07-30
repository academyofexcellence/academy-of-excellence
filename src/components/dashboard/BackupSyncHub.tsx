import { useState, useEffect } from 'react';
import { 
  mirrorDatabaseToLocal, 
  getLocalSnapshot, 
  downloadJSONBackup, 
  downloadSQLBackup, 
  restoreBackupToSupabase, 
  BackupSnapshot 
} from '../../lib/backupEngine';
import { 
  ShieldCheck, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  FileJson, 
  FileCode, 
  CheckCircle2, 
  HardDrive, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

export default function BackupSyncHub() {
  const [snapshot, setSnapshot] = useState<BackupSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Load existing snapshot from local storage immediately, then refresh from cloud
    const cached = getLocalSnapshot();
    if (cached) setSnapshot(cached);
    handleSyncAndMirror();
  }, []);

  const handleSyncAndMirror = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const freshSnapshot = await mirrorDatabaseToLocal();
      setSnapshot(freshSnapshot);
      setMessage({ type: 'success', text: `✅ All 11 database tables successfully mirrored locally to your laptop!` });
    } catch (err: any) {
      console.error('Local backup sync error:', err);
      setMessage({ type: 'error', text: `Failed to mirror local database: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!snapshot) return;
    downloadJSONBackup(snapshot);
    setMessage({ type: 'success', text: `📥 JSON Backup downloaded to your computer downloads folder!` });
  };

  const handleDownloadSQL = () => {
    if (!snapshot) return;
    downloadSQLBackup(snapshot);
    setMessage({ type: 'success', text: `🗄️ SQL Database Dump (.sql) downloaded to your computer!` });
  };

  const handleFileUploadAndRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const uploadedSnapshot = JSON.parse(text) as BackupSnapshot;

      if (!uploadedSnapshot.tables) {
        throw new Error('Invalid backup file format.');
      }

      const res = await restoreBackupToSupabase(uploadedSnapshot);
      await handleSyncAndMirror();
      setMessage({ type: 'success', text: `🎉 ${res.message}` });
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setMessage({ type: 'error', text: `Failed to restore backup file: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '1.75rem 2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)', border: '1px solid rgba(201, 156, 51, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(201, 156, 51, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#c99c33', border: '1px solid rgba(201, 156, 51, 0.3)' }}>
            <HardDrive size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#c99c33' }}>
              Local Laptop Backup & Dual-Sync Hub
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Automatic offline mirroring & 1-click standalone JSON / SQL database dumps.
            </p>
          </div>
        </div>

        {/* Sync Action Button */}
        <button
          onClick={handleSyncAndMirror}
          disabled={loading}
          className="btn"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #c99c33 0%, #a67c22 100%)',
            color: 'white',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(201, 156, 51, 0.3)'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing...' : '🔄 Sync & Mirror Local Database'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: message.type === 'success' ? 'rgba(201, 156, 51, 0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${message.type === 'success' ? '#c99c33' : '#ef4444'}`, color: message.type === 'success' ? '#a67c22' : '#b91c1c', fontWeight: 700, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {message.text}
        </div>
      )}

      {/* Main Status Panel */}
      <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px', marginBottom: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={14} /> Dual-Sync Protection Active
            </span>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>
              Local Database Mirror Status
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Last Local Backup: <strong>{snapshot ? new Date(snapshot.timestamp).toLocaleString() : 'Never'}</strong>
            </p>
          </div>

          {/* Download & Upload Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadJSON}
              disabled={!snapshot}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: '#0f172a',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <FileJson size={16} color="#c99c33" /> Download JSON Backup
            </button>

            <button
              onClick={handleDownloadSQL}
              disabled={!snapshot}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: '#0f172a',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <FileCode size={16} color="#c99c33" /> Download SQL Dump
            </button>

            <label
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Upload size={16} /> Restore Backup File
              <input type="file" accept=".json" onChange={handleFileUploadAndRestore} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Database Tables Summary Grid */}
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800, color: '#475569', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Mirrored Database Tables ({snapshot ? snapshot.summary.total_records : 0} Total Records Stored Locally)
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {snapshot && snapshot.summary.table_counts ? (
            Object.entries(snapshot.summary.table_counts).map(([tableName, count]) => (
              <div key={tableName} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'capitalize', display: 'block' }}>
                    {tableName.replace(/_/g, ' ')}
                  </span>
                  <strong style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 900 }}>
                    {count} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>records</span>
                  </strong>
                </div>
                <Database size={20} color="#c99c33" />
              </div>
            ))
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No local snapshot mirrored yet. Click 'Sync & Mirror' above.</div>
          )}
        </div>

      </div>

    </div>
  );
}
