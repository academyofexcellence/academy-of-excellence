import { supabase } from './supabase';

export interface BackupSnapshot {
  timestamp: string;
  version: string;
  tables: {
    student_profiles?: any[];
    daily_attendance_logs?: any[];
    scores?: any[];
    accounting_transactions?: any[];
    accounting_fee_structures?: any[];
    courses?: any[];
    scoring_intervals?: any[];
    staff_profiles?: any[];
    appeal_requests?: any[];
    tasks?: any[];
    daily_logs?: any[];
  };
  summary: {
    total_records: number;
    table_counts: { [key: string]: number };
  };
}

const LOCAL_STORAGE_KEY = 'AOE_LOCAL_BACKUP_MIRROR';
const LAST_SYNC_KEY = 'AOE_LAST_BACKUP_TIMESTAMP';

/**
 * Automatically fetches all database tables from Supabase and mirrors them locally on this laptop.
 */
export async function mirrorDatabaseToLocal(): Promise<BackupSnapshot> {
  const tableNames = [
    'student_profiles',
    'daily_attendance_logs',
    'scores',
    'accounting_transactions',
    'accounting_fee_structures',
    'courses',
    'scoring_intervals',
    'staff_profiles',
    'appeal_requests',
    'tasks',
    'daily_logs'
  ];

  const snapshotData: { [key: string]: any[] } = {};
  const tableCounts: { [key: string]: number } = {};
  let totalRecords = 0;

  for (const tableName of tableNames) {
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (!error && data) {
        snapshotData[tableName] = data;
        tableCounts[tableName] = data.length;
        totalRecords += data.length;
      } else {
        snapshotData[tableName] = [];
        tableCounts[tableName] = 0;
      }
    } catch (e) {
      console.warn(`Failed to mirror table ${tableName}:`, e);
      snapshotData[tableName] = [];
      tableCounts[tableName] = 0;
    }
  }

  const nowIso = new Date().toISOString();
  const snapshot: BackupSnapshot = {
    timestamp: nowIso,
    version: '1.0.0',
    tables: snapshotData,
    summary: {
      total_records: totalRecords,
      table_counts: tableCounts
    }
  };

  // Save to LocalStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.setItem(LAST_SYNC_KEY, nowIso);
  } catch (e) {
    console.error('LocalStorage quota exceeded while saving local backup mirror:', e);
  }

  return snapshot;
}

/**
 * Returns the cached local snapshot from browser LocalStorage.
 */
export function getLocalSnapshot(): BackupSnapshot | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as BackupSnapshot;
    }
  } catch (e) {
    console.error('Error reading local backup snapshot:', e);
  }
  return null;
}

/**
 * Trigger browser download for JSON backup file.
 */
export function downloadJSONBackup(snapshot: BackupSnapshot) {
  const dateStr = snapshot.timestamp.split('T')[0];
  const filename = `AOE_Academy_Backup_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser download for PostgreSQL SQL dump file.
 */
export function downloadSQLBackup(snapshot: BackupSnapshot) {
  const dateStr = snapshot.timestamp.split('T')[0];
  const filename = `AOE_Academy_Dump_${dateStr}.sql`;

  let sqlContent = `-- ACADEMY OF EXCELLENCE DUAL-SYNC SQL BACKUP DUMP\n-- Exported At: ${snapshot.timestamp}\n\n`;

  for (const [tableName, rows] of Object.entries(snapshot.tables)) {
    if (!rows || rows.length === 0) continue;
    sqlContent += `-- Table: ${tableName} (${rows.length} rows)\n`;

    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row).map(v => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number' || typeof v === 'boolean') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      });

      sqlContent += `INSERT INTO public.${tableName} (${keys.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
    }
    sqlContent += `\n`;
  }

  const blob = new Blob([sqlContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restores JSON backup data back into Supabase.
 */
export async function restoreBackupToSupabase(snapshot: BackupSnapshot): Promise<{ success: boolean; restoredCounts: { [key: string]: number }; message: string }> {
  const restoredCounts: { [key: string]: number } = {};

  for (const [tableName, rows] of Object.entries(snapshot.tables)) {
    if (!rows || rows.length === 0) continue;

    try {
      const { error } = await supabase.from(tableName).upsert(rows);
      if (error) {
        console.error(`Error restoring ${tableName}:`, error);
      } else {
        restoredCounts[tableName] = rows.length;
      }
    } catch (e) {
      console.error(`Exception restoring ${tableName}:`, e);
    }
  }

  return {
    success: true,
    restoredCounts,
    message: `Successfully restored backup from ${snapshot.timestamp.split('T')[0]}`
  };
}
