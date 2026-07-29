import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Course, StudentProfile, DailyAttendanceLog } from '../../lib/types';
import { Calendar, QrCode, Printer, RefreshCw, CheckCircle2, Clock, AlertTriangle, UserCheck, ShieldCheck, Search, Filter, Edit3, Save, X, PlusCircle } from 'lucide-react';
import QRCode from 'qrcode';

interface AttendanceHubProps {
  coursesList: Course[];
  studentList: StudentProfile[];
}

export default function AttendanceHub({ coursesList, studentList }: AttendanceHubProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(coursesList[0]?.id || '');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | string>(26);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subTab, setSubTab] = useState<'qr_screen' | 'daily_register' | 'history_logs'>('daily_register');

  // Logs & Loading
  const [attendanceLogs, setAttendanceLogs] = useState<DailyAttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // QR Code Screen state
  const [qrType, setQrType] = useState<'check_in' | 'check_out'>('check_in');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Manual Edit Modal state
  const [editingLog, setEditingLog] = useState<DailyAttendanceLog | null>(null);
  const [editCheckIn, setEditCheckIn] = useState<string>('');
  const [editCheckOut, setEditCheckOut] = useState<string>('');
  const [editPoints, setEditPoints] = useState<number>(10);
  const [editNotes, setEditNotes] = useState<string>('');

  const selectedCourse = coursesList.find(c => c.id === selectedCourseId);
  const activeStudents = studentList.filter(
    s => s.course_id === selectedCourseId && Number(s.batch_number) === Number(selectedBatchNumber) && s.status === 'active'
  );

  useEffect(() => {
    fetchLogs();
  }, [selectedDate, selectedCourseId, selectedBatchNumber]);

  // Regenerate live QR code
  useEffect(() => {
    generateQrToken();
  }, [selectedDate, selectedCourseId, selectedBatchNumber, qrType]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_attendance_logs')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendanceLogs(data as DailyAttendanceLog[] || []);
    } catch (err: any) {
      console.error('Error fetching attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate dynamic QR Code token for display on classroom screen
  const generateQrToken = async () => {
    try {
      const tokenPayload = {
        date: selectedDate,
        course_id: selectedCourseId,
        batch_number: Number(selectedBatchNumber),
        type: qrType,
        token: `AOE-ATTEND-${selectedDate}-${qrType}`
      };
      const jsonStr = JSON.stringify(tokenPayload);
      const url = await QRCode.toDataURL(jsonStr, {
        width: 320,
        margin: 1,
        color: { dark: qrType === 'check_in' ? '#0f172a' : '#1d4ed8', light: '#ffffff' }
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Error generating QR token:', err);
    }
  };

  // Auto-calculate points and status based on Check-in (10am) & Check-out (4pm) rules
  const evaluatePointsAndStatus = (checkInIso?: string, checkOutIso?: string) => {
    if (!checkInIso && !checkOutIso) {
      return { points: 0, status: 'absent', check_in_status: 'pending', check_out_status: 'pending' };
    }

    let checkInStatus: 'on_time' | 'late' | 'pending' = 'pending';
    let checkOutStatus: 'on_time' | 'early' | 'pending' = 'pending';

    if (checkInIso) {
      const inDate = new Date(checkInIso);
      const inHours = inDate.getHours() + inDate.getMinutes() / 60;
      checkInStatus = inHours <= 10.05 ? 'on_time' : 'late'; // Allow up to 10:03 AM grace
    }

    if (checkOutIso) {
      const outDate = new Date(checkOutIso);
      const outHours = outDate.getHours() + outDate.getMinutes() / 60;
      checkOutStatus = outHours >= 15.95 ? 'on_time' : 'early'; // 4:00 PM (16:00)
    }

    // Points rule: 10 points if check-in <= 10:00 AM AND check-out >= 04:00 PM
    if (checkInStatus === 'on_time' && checkOutStatus === 'on_time') {
      return { points: 10, status: 'present_full', check_in_status: checkInStatus, check_out_status: checkOutStatus };
    } else if (checkInStatus !== 'pending' || checkOutStatus !== 'pending') {
      return { points: 5, status: 'present_half', check_in_status: checkInStatus, check_out_status: checkOutStatus };
    }

    return { points: 0, status: 'absent', check_in_status: checkInStatus, check_out_status: checkOutStatus };
  };

  // Save / Update Attendance Record manually or via override
  const handleQuickMarkAttendance = async (student: StudentProfile, pointsOverride: number, statusOverride: string) => {
    try {
      const nowIso = new Date().toISOString();
      const existingLog = attendanceLogs.find(l => l.student_id === student.id);

      let checkInTime = existingLog?.check_in_time || (pointsOverride > 0 ? nowIso : undefined);
      let checkOutTime = existingLog?.check_out_time || (pointsOverride === 10 ? nowIso : undefined);

      const recordToUpsert = {
        student_id: student.id,
        student_name: student.name,
        course_id: student.course_id,
        batch_number: student.batch_number,
        date: selectedDate,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        check_in_status: pointsOverride === 10 ? 'on_time' : (pointsOverride === 5 ? 'late' : 'pending'),
        check_out_status: pointsOverride === 10 ? 'on_time' : (pointsOverride === 5 ? 'early' : 'pending'),
        points_awarded: pointsOverride,
        status: statusOverride,
        method: 'manual_override',
        notes: `Staff Manual Entry (${pointsOverride} Pts)`
      };

      const { error } = await supabase
        .from('daily_attendance_logs')
        .upsert(recordToUpsert, { onConflict: 'student_id,date' });

      if (error) throw error;

      // Sync points to scores table for live leaderboard
      await syncScoreToLeaderboard(student.id, pointsOverride);

      setMessage(`✅ Saved ${student.name}: ${pointsOverride} Points (${statusOverride.replace('_', ' ')})`);
      await fetchLogs();
    } catch (err: any) {
      console.error('Error saving manual attendance:', err);
      setMessage(`❌ Failed: ${err.message}`);
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Sync points to leaderboard scores table
  const syncScoreToLeaderboard = async (studentId: string, points: number) => {
    try {
      // Find active interval
      const { data: intervalData } = await supabase
        .from('scoring_intervals')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!intervalData?.id) return;

      await supabase
        .from('scores')
        .upsert({
          student_id: studentId,
          interval_id: intervalData.id,
          score_type: 'attendance',
          points: points,
          max_points: 10,
          activity_name: `Attendance (${selectedDate})`,
          logged_date: selectedDate,
          logged_by: 'Staff System'
        }, { onConflict: 'student_id,logged_date,score_type,activity_name' });
    } catch (err) {
      console.error('Error syncing score:', err);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (log: DailyAttendanceLog) => {
    setEditingLog(log);
    setEditCheckIn(log.check_in_time ? new Date(log.check_in_time).toTimeString().slice(0, 5) : '09:30');
    setEditCheckOut(log.check_out_time ? new Date(log.check_out_time).toTimeString().slice(0, 5) : '16:15');
    setEditPoints(log.points_awarded || 10);
    setEditNotes(log.notes || '');
  };

  // Save Edit Details
  const handleSaveEdit = async () => {
    if (!editingLog) return;
    try {
      // Construct ISO timestamps with selectedDate
      const inIso = editCheckIn ? new Date(`${selectedDate}T${editCheckIn}:00`).toISOString() : undefined;
      const outIso = editCheckOut ? new Date(`${selectedDate}T${editCheckOut}:00`).toISOString() : undefined;

      const evalRes = evaluatePointsAndStatus(inIso, outIso);

      const { error } = await supabase
        .from('daily_attendance_logs')
        .update({
          check_in_time: inIso,
          check_out_time: outIso,
          points_awarded: editPoints,
          status: editPoints === 10 ? 'present_full' : (editPoints === 5 ? 'present_half' : 'absent'),
          notes: editNotes || 'Updated by staff',
          method: 'manual_override'
        })
        .eq('id', editingLog.id);

      if (error) throw error;

      await syncScoreToLeaderboard(editingLog.student_id, editPoints);
      setMessage(`✅ Updated attendance details for ${editingLog.student_name}`);
      setEditingLog(null);
      await fetchLogs();
    } catch (err: any) {
      console.error('Error updating log:', err);
      alert(`Error updating log: ${err.message}`);
    }
  };

  // Filter logs for registry table
  const filteredLogs = attendanceLogs.filter(l => 
    l.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.date.includes(searchTerm)
  );

  return (
    <div style={{ padding: '1rem 0' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '1.75rem 2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
            <Calendar size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#60a5fa' }}>
              QR Attendance & Points Hub
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Automated Check-in (10 AM) & Check-out (4 PM) rule engine (10 Pts / 5 Pts) with printable logs.
            </p>
          </div>
        </div>

        {/* Date & Sub-Tab controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, outline: 'none' }}
          />

          <button
            onClick={fetchLogs}
            className="btn btn-outline"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: message.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.startsWith('✅') ? '#22c55e' : '#ef4444'}`, color: message.startsWith('✅') ? '#15803d' : '#b91c1c', fontWeight: 700, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setSubTab('daily_register')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: subTab === 'daily_register' ? '#0f172a' : '#f1f5f9',
            color: subTab === 'daily_register' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <UserCheck size={18} /> Daily Register & Manual Entry
        </button>

        <button
          onClick={() => setSubTab('qr_screen')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: subTab === 'qr_screen' ? '#2563eb' : '#f1f5f9',
            color: subTab === 'qr_screen' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <QrCode size={18} /> Classroom QR Screen
        </button>

        <button
          onClick={() => setSubTab('history_logs')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: subTab === 'history_logs' ? '#b45309' : '#f1f5f9',
            color: subTab === 'history_logs' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Printer size={18} /> Complete Logs & Print Report
        </button>
      </div>

      {/* --- TAB 1: DAILY REGISTER & MANUAL ENTRY --- */}
      {subTab === 'daily_register' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Attendance Register for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Batch {selectedBatchNumber} • Rule: Check-in before 10 AM & Check-out after 4 PM = 10 Pts. Partial = 5 Pts.
              </p>
            </div>

            {/* Course & Batch Selectors */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  {coursesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={selectedBatchNumber}
                  onChange={(e) => setSelectedBatchNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Batch #"
                  style={{ width: '80px', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {activeStudents.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              No active students found in this course and batch. Select another course or batch above.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Check-In Time</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Check-Out Time</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Calculated Points</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map(student => {
                    const log = attendanceLogs.find(l => l.student_id === student.id);
                    const checkInStr = log?.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                    const checkOutStr = log?.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                          {student.name}
                          {student.roll_number && <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: 500 }}>(Roll #{student.roll_number})</span>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                          {log?.check_in_time ? (
                            <span style={{ color: log.check_in_status === 'on_time' ? '#16a34a' : '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={13} /> {checkInStr}
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>Not Checked In</span>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                          {log?.check_out_time ? (
                            <span style={{ color: log.check_out_status === 'on_time' ? '#16a34a' : '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={13} /> {checkOutStr}
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>Not Checked Out</span>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          {log ? (
                            <span style={{ background: log.points_awarded === 10 ? 'rgba(34, 197, 94, 0.15)' : (log.points_awarded === 5 ? 'rgba(217, 119, 6, 0.15)' : 'rgba(239, 68, 68, 0.15)'), color: log.points_awarded === 10 ? '#15803d' : (log.points_awarded === 5 ? '#b45309' : '#b91c1c'), padding: '0.25rem 0.65rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.85rem' }}>
                              {log.points_awarded} Points
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>0 Points</span>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          {log ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: log.status === 'present_full' ? '#16a34a' : (log.status === 'present_half' ? '#d97706' : '#dc2626') }}>
                              {log.status.replace('_', ' ')}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Unmarked</span>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            
                            {/* Mark 10 Points (Full Day) */}
                            <button
                              onClick={() => handleQuickMarkAttendance(student, 10, 'present_full')}
                              title="Mark Full Day Present (10 Pts)"
                              style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              +10 Pts
                            </button>

                            {/* Mark 5 Points (Half Day) */}
                            <button
                              onClick={() => handleQuickMarkAttendance(student, 5, 'present_half')}
                              title="Mark Partial / Late Present (5 Pts)"
                              style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              +5 Pts
                            </button>

                            {/* Mark Absent */}
                            <button
                              onClick={() => handleQuickMarkAttendance(student, 0, 'absent')}
                              title="Mark Absent (0 Pts)"
                              style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Absent
                            </button>

                            {/* Edit Timestamps / Notes */}
                            {log && (
                              <button
                                onClick={() => handleOpenEdit(log)}
                                title="Edit Check-in / Check-out Details"
                                style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer' }}
                              >
                                <Edit3 size={14} />
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
          )}

        </div>
      )}

      {/* --- TAB 2: CLASSROOM QR SCREEN --- */}
      {subTab === 'qr_screen' && (
        <div className="glass-card" style={{ padding: '2.5rem 1.5rem', borderRadius: '16px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setQrType('check_in')}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', background: qrType === 'check_in' ? '#22c55e' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
            >
              🌅 Morning Check-In QR (Cutoff 10:00 AM)
            </button>
            <button
              onClick={() => setQrType('check_out')}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', background: qrType === 'check_out' ? '#2563eb' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
            >
              🌇 Afternoon Check-Out QR (Cutoff 04:00 PM)
            </button>
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', margin: '0 0 0.5rem 0' }}>
            {selectedCourse?.name || 'Academic Program'} - Batch {selectedBatchNumber}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Scan with your phone to log your <strong>{qrType === 'check_in' ? 'Check-In' : 'Check-Out'}</strong> timestamp for {selectedDate}.
          </p>

          {/* QR Code Container */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', display: 'inline-block', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', border: '4px solid #fbbf24', marginBottom: '1.5rem' }}>
            {qrDataUrl && <img src={qrDataUrl} alt="Attendance QR" style={{ width: '280px', height: '280px', display: 'block' }} />}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <div>✅ <strong>In &lt;= 10:00 AM + Out &gt;= 4:00 PM</strong>: 10 Points</div>
            <div>⚠️ <strong>Late or Early Exit</strong>: 5 Points</div>
          </div>

        </div>
      )}

      {/* --- TAB 3: COMPLETE LOGS & PRINTABLE REPORT --- */}
      {subTab === 'history_logs' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Complete Attendance & Audit Log History
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Total Records: <strong>{filteredLogs.length} entries</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student or date..."
                  style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
                <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              <button
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#b45309', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} /> Print Attendance Register
              </button>
            </div>
          </div>

          {/* Printable Document Container */}
          <div className="printable-attendance-register">
            
            {/* Header for Printed Version */}
            <div className="only-print" style={{ display: 'none', textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #0f172a', paddingBottom: '1rem' }}>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.8rem', fontWeight: 900 }}>ACADEMY OF EXCELLENCE</h2>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#b45309' }}>Official Attendance Register & Audit History</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                Program: {selectedCourse?.name || 'All Programs'} • Batch {selectedBatchNumber} • Date: {selectedDate}
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Check-In Time</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Check-Out Time</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Points</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Method / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => {
                    const checkInStr = log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                    const checkOutStr = log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        
                        <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 700 }}>
                          {log.date}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                          {log.student_name}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          {log.check_in_time ? (
                            <span style={{ color: log.check_in_status === 'on_time' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                              {checkInStr} {log.check_in_status === 'late' && '(Late)'}
                            </span>
                          ) : '--:--'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          {log.check_out_time ? (
                            <span style={{ color: log.check_out_status === 'on_time' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                              {checkOutStr} {log.check_out_status === 'early' && '(Early)'}
                            </span>
                          ) : '--:--'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: log.points_awarded === 10 ? '#15803d' : (log.points_awarded === 5 ? '#b45309' : '#dc2626') }}>
                          {log.points_awarded} Pts
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                          {log.status.replace('_', ' ')}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                          {log.method === 'manual_override' ? '✏️ Staff Manual' : '📱 QR Scan'} {log.notes && `• ${log.notes}`}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editingLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                Edit Attendance Record
              </h4>
              <button onClick={() => setEditingLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Student</label>
              <input type="text" disabled value={`${editingLog.student_name} (${editingLog.date})`} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Check-In Time</label>
                <input
                  type="time"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Check-Out Time</label>
                <input
                  type="time"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Points Awarded</label>
              <select
                value={editPoints}
                onChange={(e) => setEditPoints(Number(e.target.value))}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
              >
                <option value={10}>10 Points (Full Day On-Time)</option>
                <option value={5}>5 Points (Partial / Late)</option>
                <option value={0}>0 Points (Absent / Unmarked)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Staff Note</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Reason for manual edit..."
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingLog(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
