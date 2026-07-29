import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentProfile, DailyAttendanceLog } from '../../lib/types';
import { QrCode, CheckCircle2, AlertCircle, Camera, Key, X, Clock, Award, Sparkles } from 'lucide-react';

interface StudentAttendanceScannerProps {
  currentStudent: StudentProfile;
  onAttendanceMarked?: () => void;
}

export function StudentAttendanceScanner({ currentStudent, onAttendanceMarked }: StudentAttendanceScannerProps) {
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [todayLog, setTodayLog] = useState<DailyAttendanceLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanningCamera, setScanningCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTodayLog();
  }, [currentStudent.id]);

  const fetchTodayLog = async () => {
    try {
      const { data } = await supabase
        .from('daily_attendance_logs')
        .select('*')
        .eq('student_id', currentStudent.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (data) {
        setTodayLog(data as DailyAttendanceLog);
      }
    } catch (err) {
      console.error('Error fetching today attendance log:', err);
    }
  };

  // Helper to calculate daily attendance points (10 vs 5 vs 0)
  const calculatePoints = (inTimeStr?: string, outTimeStr?: string): { points: number; status: 'present_full' | 'present_half' | 'absent' } => {
    if (!inTimeStr) return { points: 0, status: 'absent' };

    const inTime = new Date(inTimeStr);
    const inHour = inTime.getHours();
    const inMin = inTime.getMinutes();
    const isOnTimeCheckIn = (inHour < 10) || (inHour === 10 && inMin === 0);

    if (outTimeStr) {
      const outTime = new Date(outTimeStr);
      const outHour = outTime.getHours();
      const isFullDayCheckOut = outHour >= 16; // 4:00 PM or later

      if (isOnTimeCheckIn && isFullDayCheckOut) {
        return { points: 10, status: 'present_full' };
      } else {
        return { points: 5, status: 'present_half' };
      }
    }

    // Checked in only so far
    return { points: isOnTimeCheckIn ? 10 : 5, status: isOnTimeCheckIn ? 'present_full' : 'present_half' };
  };

  // --- SUBMIT ATTENDANCE (SCAN OR PASSKEY) ---
  const handleMarkAttendance = async (codeOrPasskey: string) => {
    if (!codeOrPasskey.trim()) {
      setMessage({ type: 'error', text: 'Please enter or scan a valid classroom QR code/passkey.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const now = new Date();
      const currentHour = now.getHours();
      const nowIso = now.toISOString();

      // Check if code contains AM or PM or passkey
      const isMorningSlot = currentHour < 13; // Before 1:00 PM is Morning Check-In

      if (!todayLog) {
        // --- FIRST SCAN OF THE DAY (CHECK-IN) ---
        const checkInStatus = (currentHour < 10 || (currentHour === 10 && now.getMinutes() === 0)) ? 'on_time' : 'late';
        const initialPoints = checkInStatus === 'on_time' ? 10 : 5;
        const initialStatus = checkInStatus === 'on_time' ? 'present_full' : 'present_half';

        const newLogPayload = {
          student_id: currentStudent.id,
          student_name: currentStudent.name,
          course_id: currentStudent.course_id,
          batch_number: currentStudent.batch_number,
          date: todayStr,
          check_in_time: nowIso,
          check_in_status: checkInStatus,
          points_awarded: initialPoints,
          status: initialStatus,
          method: 'qr_scan'
        };

        const { data: inserted, error } = await supabase.from('daily_attendance_logs').insert(newLogPayload).select().single();
        if (error) throw error;

        // Sync points to scores leaderboard
        await supabase.from('scores').insert({
          student_id: currentStudent.id,
          score_type: 'daily_attendance',
          points: initialPoints,
          max_points: 10,
          activity_name: `QR Attendance Check-In (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          logged_date: todayStr
        });

        setTodayLog(inserted as DailyAttendanceLog);
        setMessage({
          type: 'success',
          text: `🎉 Check-In Successful at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Status: ${checkInStatus === 'on_time' ? 'On Time (+10 XP)' : 'Late (+5 XP)'}`
        });

      } else {
        // --- SECOND SCAN OF THE DAY (CHECK-OUT) ---
        if (todayLog.check_out_time) {
          setMessage({ type: 'success', text: `✅ You have already completed Check-In & Check-Out for today!` });
          return;
        }

        const checkOutStatus = currentHour >= 16 ? 'on_time' : 'early';
        const { points: finalPoints, status: finalStatus } = calculatePoints(todayLog.check_in_time, nowIso);

        const updatePayload = {
          check_out_time: nowIso,
          check_out_status: checkOutStatus,
          points_awarded: finalPoints,
          status: finalStatus
        };

        const { data: updated, error } = await supabase
          .from('daily_attendance_logs')
          .update(updatePayload)
          .eq('id', todayLog.id)
          .select()
          .single();

        if (error) throw error;

        // Update score log for afternoon completion
        const pointDiff = finalPoints - (todayLog.points_awarded || 0);
        if (pointDiff > 0) {
          await supabase.from('scores').insert({
            student_id: currentStudent.id,
            score_type: 'daily_attendance',
            points: pointDiff,
            max_points: 10,
            activity_name: `QR Attendance Check-Out (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
            logged_date: todayStr
          });
        }

        setTodayLog(updated as DailyAttendanceLog);
        setMessage({
          type: 'success',
          text: `🎯 Check-Out Recorded at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Final Today Points: +${finalPoints} XP`
        });
      }

      setShowScannerModal(false);
      if (onAttendanceMarked) onAttendanceMarked();

    } catch (err: any) {
      console.error('Error marking attendance:', err);
      setMessage({ type: 'error', text: `Failed to mark attendance: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: '1px solid rgba(74, 222, 128, 0.3)', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(74, 222, 128, 0.15)', padding: '0.75rem', borderRadius: '12px', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
            <QrCode size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                Daily QR Attendance
              </h3>
              {todayLog?.status === 'present_full' && (
                <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(74,222,128,0.4)' }}>
                  +10 XP Full Day
                </span>
              )}
            </div>

            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              {todayLog ? (
                <span>
                  Check-In: <strong>{new Date(todayLog.check_in_time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  {todayLog.check_out_time ? (
                    <span> • Check-Out: <strong>{new Date(todayLog.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  ) : (
                    <span> • Scan Afternoon QR at 4 PM to Check-Out</span>
                  )}
                </span>
              ) : (
                <span>Scan the classroom QR screen or enter passkey to record login.</span>
              )}
            </p>
          </div>
        </div>

        {/* Scan Action Button */}
        <div>
          {(!todayLog || !todayLog.check_out_time) ? (
            <button
              onClick={() => setShowScannerModal(true)}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
              }}
            >
              <QrCode size={18} />
              {!todayLog ? '📱 Scan Check-In QR' : '📱 Scan Check-Out QR'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', fontWeight: 800, fontSize: '0.85rem' }}>
              <CheckCircle2 size={20} /> Attendance Complete (+{todayLog.points_awarded} XP)
            </div>
          )}
        </div>

      </div>

      {message && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: message.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`, color: message.type === 'success' ? '#4ade80' : '#f87171', fontSize: '0.85rem', fontWeight: 700 }}>
          {message.text}
        </div>
      )}

      {/* --- SCANNER & PASSKEY MODAL --- */}
      {showScannerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '420px', color: 'white', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode size={20} /> Record Daily Attendance
              </h4>
              <button onClick={() => setShowScannerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 0 }}>
              Look at the classroom screen and enter the 6-digit daily passkey displayed under the QR code:
            </p>

            {/* Passkey Input Form */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                Classroom Passkey / Code
              </label>
              <input
                type="text"
                placeholder="e.g. 948271"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '2px solid #334155', background: '#1e293b', color: 'white', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', letterSpacing: '0.1em' }}
              />
            </div>

            <button
              onClick={() => handleMarkAttendance(passkeyInput)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? 'Submitting...' : 'Confirm & Mark Attendance'}
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
