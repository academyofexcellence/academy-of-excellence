import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Course, StudentProfile, DailyAttendanceLog } from '../../lib/types';
import { Calendar, QrCode, Printer, RefreshCw, CheckCircle2, Clock, AlertTriangle, UserCheck, ShieldCheck, Search, Filter, Edit3, Save, X, PlusCircle, FlaskConical, Play, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

interface AttendanceHubProps {
  coursesList: Course[];
  studentList: StudentProfile[];
}

export default function AttendanceHub({ coursesList, studentList }: AttendanceHubProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(coursesList[0]?.id || '');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | string>(26);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subTab, setSubTab] = useState<'qr_screen' | 'daily_register' | 'history_logs' | 'test_simulator'>('daily_register');

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

  // TEST SIMULATOR SANDBOX STATE
  const [testCheckInTime, setTestCheckInTime] = useState<string>('09:45');
  const [testCheckOutTime, setTestCheckOutTime] = useState<string>('16:15');
  const [testResult, setTestResult] = useState<{
    checkInStatus: string;
    checkOutStatus: string;
    points: number;
    status: string;
    explanation: string;
  } | null>(null);

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
        .order('student_name', { ascending: true });

      if (error) throw error;
      setAttendanceLogs(data as DailyAttendanceLog[] || []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate QR token with 6-digit daily passkey
  const generateQrToken = async () => {
    try {
      const todayPasskey = Math.abs(
        selectedDate.split('-').reduce((acc, part) => acc + parseInt(part), 0) * 98765
      ).toString().slice(0, 6).padStart(6, '9');

      const qrPayload = JSON.stringify({
        type: 'AOE_ATTENDANCE_TOKEN',
        slot: qrType,
        date: selectedDate,
        course_id: selectedCourseId,
        batch: selectedBatchNumber,
        passkey: todayPasskey
      });

      const url = await QRCode.toDataURL(qrPayload, { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  // Helper to extract decimal hours in IST (Asia/Kolkata UTC+5:30)
  const getHoursInIST = (timeInput?: string | Date): number => {
    if (!timeInput) return -1;
    if (typeof timeInput === 'string' && /^\d{2}:\d{2}$/.test(timeInput)) {
      const [h, m] = timeInput.split(':').map(Number);
      return h + m / 60;
    }
    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return -1;
    const istTimeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const [h, m] = istTimeStr.split(':').map(Number);
    return h + m / 60;
  };

  // Evaluate Attendance & Points Logic (Strictly in IST)
  const evaluatePointsAndStatus = (checkInInput?: string | Date, checkOutInput?: string | Date) => {
    const inHours = getHoursInIST(checkInInput);
    const outHours = getHoursInIST(checkOutInput);

    let checkInStatus: 'on_time' | 'late' | 'pending' = 'pending';
    let checkOutStatus: 'on_time' | 'early' | 'pending' = 'pending';

    if (inHours >= 0) {
      checkInStatus = inHours <= 10.08 ? 'on_time' : 'late'; // 10:05 AM grace in IST
    }

    if (outHours >= 0) {
      checkOutStatus = outHours >= 15.95 ? 'on_time' : 'early'; // 4:00 PM (16:00) in IST
    }

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
        notes: 'Quick marked by staff'
      };

      const { error } = await supabase
        .from('daily_attendance_logs')
        .upsert(recordToUpsert, { onConflict: 'student_id,date' });

      if (error) throw error;

      await syncScoreToLeaderboard(student.id, pointsOverride);
      setMessage(`✅ Attendance set to ${pointsOverride} XP for ${student.name}`);
      await fetchLogs();
    } catch (err: any) {
      console.error('Error marking attendance:', err);
      alert(`Error marking attendance: ${err.message}`);
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Sync points to Leaderboard Scores table under active term interval
  const syncScoreToLeaderboard = async (studentId: string, points: number) => {
    try {
      const student = activeStudents.find(s => s.id === studentId);
      let intervalId: string | undefined = undefined;

      if (student) {
        const { data: activeInterval } = await supabase
          .from('scoring_intervals')
          .select('id')
          .eq('course_id', student.course_id)
          .eq('batch_number', student.batch_number)
          .eq('is_active', true)
          .maybeSingle();
        intervalId = activeInterval?.id;
      }

      await supabase.from('scores').upsert({
        student_id: studentId,
        interval_id: intervalId,
        score_type: 'attendance',
        points: points,
        max_points: 10,
        activity_name: `Daily QR Attendance (${selectedDate})`,
        logged_date: selectedDate
      }, { onConflict: 'student_id,interval_id,score_type,logged_date' });
    } catch (err) {
      console.error('Error syncing score:', err);
    }
  };

  // Save Edit Details
  const handleSaveEdit = async () => {
    if (!editingLog) return;
    try {
      const inIso = editCheckIn ? new Date(`${selectedDate}T${editCheckIn}:00`).toISOString() : undefined;
      const outIso = editCheckOut ? new Date(`${selectedDate}T${editCheckOut}:00`).toISOString() : undefined;

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

  // --- RUN TEST SIMULATION (SANDBOX - ZERO IMPACT ON PRODUCTION) ---
  const handleRunTestSimulation = () => {
    const res = evaluatePointsAndStatus(testCheckInTime, testCheckOutTime);

    let explanation = '';
    if (res.points === 10) {
      explanation = '✅ On-Time Check-In (≤ 10:00 AM) AND Full Check-Out (≥ 4:00 PM) = 10 XP Awarded.';
    } else if (res.points === 5) {
      explanation = '⚠️ Late Check-In (> 10:00 AM) or Early Check-Out (< 4:00 PM) = 5 XP Awarded.';
    } else {
      explanation = '❌ No Check-In / Check-Out recorded = 0 XP.';
    }

    setTestResult({
      checkInStatus: res.check_in_status,
      checkOutStatus: res.check_out_status,
      points: res.points,
      status: res.status,
      explanation
    });
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
          <UserCheck size={16} /> Daily Attendance Register
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
          <QrCode size={16} /> Classroom QR Screen
        </button>

        <button
          onClick={() => setSubTab('history_logs')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: subTab === 'history_logs' ? '#059669' : '#f1f5f9',
            color: subTab === 'history_logs' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Printer size={16} /> Log History & Printable Report
        </button>

        {/* Dedicated Test Simulator Tab */}
        <button
          onClick={() => setSubTab('test_simulator')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: subTab === 'test_simulator' ? '#7c3aed' : '#f3e8ff',
            color: subTab === 'test_simulator' ? 'white' : '#7c3aed',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <FlaskConical size={16} /> 🧪 Test QR Simulator
        </button>
      </div>

      {/* --- SUB-TAB 1: DAILY REGISTER --- */}
      {subTab === 'daily_register' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Classroom Attendance Register ({selectedDate})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                {selectedCourse?.name || 'Academic Course'} • Batch {selectedBatchNumber} ({activeStudents.length} Active Students)
              </p>
            </div>

            {/* Selectors */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                {coursesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

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
                    <th style={{ padding: '0.75rem 1rem' }}>Today Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Points Awarded</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Quick Staff Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map(student => {
                    const log = attendanceLogs.find(l => l.student_id === student.id);
                    const checkInStr = log?.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                    const checkOutStr = log?.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                    const points = log ? log.points_awarded : 0;

                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                          {student.name}
                          {student.roll_number && <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: 500 }}>(Roll #{student.roll_number})</span>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: log?.check_in_time ? '#15803d' : '#94a3b8', fontWeight: log?.check_in_time ? 700 : 400 }}>
                          {checkInStr}
                          {log?.check_in_status === 'on_time' && <span style={{ marginLeft: '0.3rem', color: '#16a34a', fontSize: '0.7rem' }}>✓ On Time</span>}
                          {log?.check_in_status === 'late' && <span style={{ marginLeft: '0.3rem', color: '#d97706', fontSize: '0.7rem' }}>⚠ Late</span>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: log?.check_out_time ? '#15803d' : '#94a3b8', fontWeight: log?.check_out_time ? 700 : 400 }}>
                          {checkOutStr}
                          {log?.check_out_status === 'on_time' && <span style={{ marginLeft: '0.3rem', color: '#16a34a', fontSize: '0.7rem' }}>✓ Full Day</span>}
                          {log?.check_out_status === 'early' && <span style={{ marginLeft: '0.3rem', color: '#dc2626', fontSize: '0.7rem' }}>⚠ Early</span>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          {log?.status === 'present_full' ? (
                            <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.2rem 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>Present (Full Day)</span>
                          ) : log?.status === 'present_half' ? (
                            <span style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>Half Day / Late</span>
                          ) : (
                            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '0.2rem 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>Absent / Unmarked</span>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: points === 10 ? '#16a34a' : (points === 5 ? '#b45309' : '#94a3b8') }}>
                          +{points} XP
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleQuickMarkAttendance(student, 10, 'present_full')}
                              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#16a34a', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              +10 Pts
                            </button>
                            <button
                              onClick={() => handleQuickMarkAttendance(student, 5, 'present_half')}
                              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#d97706', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              +5 Pts
                            </button>
                            <button
                              onClick={() => handleQuickMarkAttendance(student, 0, 'absent')}
                              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#dc2626', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Absent
                            </button>
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

      {/* --- SUB-TAB 2: CLASSROOM QR SCREEN --- */}
      {subTab === 'qr_screen' && (
        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', textAlign: 'center', background: '#0f172a', color: 'white' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setQrType('check_in')}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: qrType === 'check_in' ? '#22c55e' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ☀️ Morning Check-In QR (≤ 10:00 AM)
            </button>

            <button
              onClick={() => setQrType('check_out')}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: qrType === 'check_out' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              🌙 Afternoon Check-Out QR (≥ 04:00 PM)
            </button>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', display: 'inline-block', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Classroom QR Code" style={{ width: '280px', height: '280px' }} />
            ) : (
              <div style={{ width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Generating QR...</div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: qrType === 'check_in' ? '#4ade80' : '#60a5fa', margin: '0 0 0.5rem 0' }}>
              {qrType === 'check_in' ? 'Scan to Check-In (On-Time before 10:00 AM)' : 'Scan to Check-Out (Full Day after 04:00 PM)'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              {selectedCourse?.name} • Batch {selectedBatchNumber} • Date: {selectedDate}
            </p>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'inline-block', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>6-DIGIT DAILY CLASSROOM PASSKEY</span>
              <strong style={{ fontSize: '1.8rem', letterSpacing: '0.25em', color: '#facc15' }}>
                {Math.abs(selectedDate.split('-').reduce((acc, part) => acc + parseInt(part), 0) * 98765).toString().slice(0, 6).padStart(6, '9')}
              </strong>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB 3: LOG HISTORY & PRINTABLE REPORT --- */}
      {subTab === 'history_logs' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Attendance Log History & Audit
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Showing logs for {selectedDate}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', background: '#059669', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} /> Print Attendance Register
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Check-In</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Check-Out</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Points</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No logs found for this date.</td>
                  </tr>
                ) : (
                  filteredLogs.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{l.date}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{l.student_name}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{l.check_in_time ? new Date(l.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{l.check_out_time ? new Date(l.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>{l.status}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: l.points_awarded === 10 ? '#16a34a' : '#b45309' }}>+{l.points_awarded} XP</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{l.method || 'qr_scan'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- SUB-TAB 4: DEDICATED TEST QR SIMULATOR SANDBOX --- */}
      {subTab === 'test_simulator' && (
        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', background: '#ffffff', border: '2px dashed #a855f7' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f3e8ff', color: '#7c3aed', padding: '0.75rem', borderRadius: '12px' }}>
              <FlaskConical size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#6b21a8' }}>
                Safe Attendance Rule Simulator & Sandbox
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Test the 10:00 AM on-time rule, 04:00 PM full-day rule, and +10 XP / +5 XP points calculation without affecting any real student ranks or database records.
              </p>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', color: '#1e293b', fontSize: '0.85rem' }}>
            🔒 <strong>Safe Mode Active:</strong> All test scans in this simulator run in memory and do <strong>NOT</strong> touch real student profiles or live leaderboard rankings.
          </div>

          {/* Time Test Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                Simulated Check-In Time
              </label>
              <input
                type="time"
                value={testCheckInTime}
                onChange={(e) => setTestCheckInTime(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 800 }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                Rule: On-Time if ≤ 10:00 AM
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                Simulated Check-Out Time
              </label>
              <input
                type="time"
                value={testCheckOutTime}
                onChange={(e) => setTestCheckOutTime(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 800 }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                Rule: Full Day if ≥ 04:00 PM (16:00)
              </span>
            </div>

          </div>

          <button
            onClick={handleRunTestSimulation}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}
          >
            <Play size={16} /> Run Test Simulation
          </button>

          {/* Test Simulation Results */}
          {testResult && (
            <div style={{ marginTop: '1.75rem', padding: '1.5rem', borderRadius: '12px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={18} /> Test Rule Calculation Result:
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>CHECK-IN EVALUATION</span>
                  <strong style={{ color: testResult.checkInStatus === 'on_time' ? '#16a34a' : '#d97706', fontSize: '0.95rem' }}>
                    {testResult.checkInStatus === 'on_time' ? '✓ On Time' : '⚠ Late Check-In'}
                  </strong>
                </div>

                <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>CHECK-OUT EVALUATION</span>
                  <strong style={{ color: testResult.checkOutStatus === 'on_time' ? '#16a34a' : '#dc2626', fontSize: '0.95rem' }}>
                    {testResult.checkOutStatus === 'on_time' ? '✓ Full Day' : '⚠ Early Check-Out'}
                  </strong>
                </div>

                <div style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>POINTS AWARDED</span>
                  <strong style={{ color: testResult.points === 10 ? '#16a34a' : '#b45309', fontSize: '1.2rem' }}>
                    +{testResult.points} XP
                  </strong>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#581c87', fontWeight: 700 }}>
                {testResult.explanation}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
