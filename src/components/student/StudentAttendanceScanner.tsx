import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentProfile, DailyAttendanceLog } from '../../lib/types';
import { QrCode, CheckCircle2, AlertCircle, Camera, Key, X, Clock, Award, Sparkles, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface StudentAttendanceScannerProps {
  currentStudent: StudentProfile;
  onAttendanceMarked?: () => void;
}

export function StudentAttendanceScanner({ currentStudent, onAttendanceMarked }: StudentAttendanceScannerProps) {
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [modalTab, setModalTab] = useState<'camera' | 'passkey'>('camera');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [todayLog, setTodayLog] = useState<DailyAttendanceLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTodayLog();
  }, [currentStudent.id]);

  useEffect(() => {
    if (showScannerModal && modalTab === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [showScannerModal, modalTab]);

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

  // Start Html5Qrcode Camera Scanner
  const startCameraScanner = async () => {
    setCameraError(null);
    setCameraActive(true);

    try {
      await new Promise(r => setTimeout(r, 150));

      const readerElem = document.getElementById('qr-reader');
      if (!readerElem) return;

      if (html5QrcodeRef.current) {
        try { await html5QrcodeRef.current.stop(); } catch (e) {}
      }

      const html5Qr = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          stopCameraScanner();
          handleMarkAttendance(decodedText);
        },
        (errorMessage) => {}
      );
    } catch (err: any) {
      console.error('Camera Scanner Error:', err);
      setCameraActive(false);
      setCameraError('Unable to access phone camera. Please switch to the 6-Digit Passkey tab below.');
    }
  };

  // Stop Camera Scanner
  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      html5QrcodeRef.current = null;
    }
    setCameraActive(false);
  };

  // Helper to extract hour/minute in IST (Asia/Kolkata UTC+5:30)
  const getISTTimeDetails = (dateInput?: string | Date) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    const istTimeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const [h, m] = istTimeStr.split(':').map(Number);
    const decimalHours = h + m / 60;
    return { hour: h, minute: m, decimalHours };
  };

  // Helper to calculate daily attendance points (10 vs 5 vs 0) strictly in IST
  const calculatePoints = (inTimeStr?: string, outTimeStr?: string): { points: number; status: 'present_full' | 'present_half' | 'absent' } => {
    if (!inTimeStr) return { points: 0, status: 'absent' };

    const inDetails = getISTTimeDetails(inTimeStr);
    const isOnTimeCheckIn = inDetails.decimalHours <= 10.08; // 10:05 AM in IST

    if (outTimeStr) {
      const outDetails = getISTTimeDetails(outTimeStr);
      const isFullDayCheckOut = outDetails.decimalHours >= 15.95; // 4:00 PM in IST

      if (isOnTimeCheckIn && isFullDayCheckOut) {
        return { points: 10, status: 'present_full' };
      } else {
        return { points: 5, status: 'present_half' };
      }
    }

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
      const nowDetails = getISTTimeDetails(now);
      const nowIso = now.toISOString();

      if (!todayLog) {
        // --- FIRST SCAN OF THE DAY (CHECK-IN) ---
        const checkInStatus = nowDetails.decimalHours <= 10.08 ? 'on_time' : 'late';
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

        const checkOutStatus = nowDetails.hour >= 16 ? 'on_time' : 'early';
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
    <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: '1px solid rgba(201, 156, 51, 0.3)', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(201, 156, 51, 0.15)', padding: '0.75rem', borderRadius: '12px', color: '#c99c33', border: '1px solid rgba(201, 156, 51, 0.3)' }}>
            <QrCode size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                Daily QR Attendance
              </h3>
              {todayLog?.status === 'present_full' && (
                <span style={{ background: 'rgba(201, 156, 51, 0.2)', color: '#e6be65', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.4)' }}>
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

        {/* Scan Action Button in Official Academy Gold */}
        <div>
          {(!todayLog || !todayLog.check_out_time) ? (
            <button
              onClick={() => setShowScannerModal(true)}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #c99c33 0%, #a67c22 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(201, 156, 51, 0.3)'
              }}
            >
              <QrCode size={18} />
              {!todayLog ? '📱 Scan Check-In QR' : '📱 Scan Check-Out QR'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e6be65', fontWeight: 800, fontSize: '0.85rem' }}>
              <CheckCircle2 size={20} /> Attendance Complete (+{todayLog.points_awarded} XP)
            </div>
          )}
        </div>

      </div>

      {message && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: message.type === 'success' ? 'rgba(201, 156, 51, 0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${message.type === 'success' ? '#c99c33' : '#ef4444'}`, color: message.type === 'success' ? '#e6be65' : '#f87171', fontSize: '0.85rem', fontWeight: 700 }}>
          {message.text}
        </div>
      )}

      {/* --- RESPONSIVE ACADEMY THEMED MOBILE MODAL --- */}
      {showScannerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', boxSizing: 'border-box' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(201, 156, 51, 0.3)', padding: '1.25rem 1.5rem', borderRadius: '20px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', color: 'white', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.65rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#c99c33', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <QrCode size={18} /> Record Attendance
              </h4>
              <button onClick={() => { stopCameraScanner(); setShowScannerModal(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.2rem' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs: Camera vs Passkey */}
            <div style={{ display: 'flex', background: '#1e293b', borderRadius: '10px', padding: '0.25rem', marginBottom: '1.25rem', border: '1px solid rgba(201, 156, 51, 0.2)' }}>
              <button
                onClick={() => setModalTab('camera')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: modalTab === 'camera' ? '#c99c33' : 'transparent',
                  color: modalTab === 'camera' ? 'white' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                <Camera size={14} /> Scan Camera QR
              </button>

              <button
                onClick={() => setModalTab('passkey')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: modalTab === 'passkey' ? '#c99c33' : 'transparent',
                  color: modalTab === 'passkey' ? 'white' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem'
                }}
              >
                <Key size={14} /> Enter Passkey
              </button>
            </div>

            {/* --- TAB 1: LIVE CAMERA QR SCANNER --- */}
            {modalTab === 'camera' && (
              <div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 0, textAlign: 'center' }}>
                  Point your camera at the classroom QR code:
                </p>

                {cameraError ? (
                  <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
                    {cameraError}
                  </div>
                ) : (
                  <div style={{ overflow: 'hidden', borderRadius: '14px', border: '2px solid #c99c33', background: '#000', marginBottom: '1rem' }}>
                    <div id="qr-reader" style={{ width: '100%' }}></div>
                  </div>
                )}
              </div>
            )}

            {/* --- TAB 2: PASSKEY INPUT FORM --- */}
            {modalTab === 'passkey' && (
              <div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 0 }}>
                  Enter the 6-digit daily passkey displayed under the classroom QR code:
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. 948271"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '2px solid #c99c33', background: '#1e293b', color: 'white', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', letterSpacing: '0.12em', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  onClick={() => handleMarkAttendance(passkeyInput)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #c99c33 0%, #a67c22 100%)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
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
            )}

          </div>
        </div>
      )}

    </div>
  );
}
