import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { StudentProfile, DailyAttendanceLog } from '../../lib/types';
import { QrCode, CheckCircle2, AlertCircle, Camera, Key, X, Clock, Award, Sparkles, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { getISTDateString, getISTTimeString } from '../../lib/dateUtils';

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

  const todayStr = getISTDateString();

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
      await new Promise(r => setTimeout(r, 200));

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

        // Fetch active scoring interval for student's course & batch
        const { data: activeInterval } = await supabase
          .from('scoring_intervals')
          .select('id')
          .eq('course_id', currentStudent.course_id)
          .eq('batch_number', currentStudent.batch_number)
          .eq('is_active', true)
          .maybeSingle();

        let targetIntervalId = activeInterval?.id;
        if (!targetIntervalId) {
          const { data: latestInt } = await supabase
            .from('scoring_intervals')
            .select('id')
            .eq('course_id', currentStudent.course_id)
            .eq('batch_number', currentStudent.batch_number)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          targetIntervalId = latestInt?.id;
        }

        const attStatusText = checkInStatus === 'on_time' ? 'On Time' : 'Late';

        // Sync points to scores leaderboard under active term interval
        await supabase.from('scores').upsert({
          student_id: currentStudent.id,
          interval_id: targetIntervalId,
          score_type: 'attendance',
          points: initialPoints,
          max_points: 10,
          activity_name: `Attendance: ${attStatusText}`,
          logged_by: currentStudent.id,
          logged_date: todayStr
        }, { onConflict: 'student_id,interval_id,score_type,logged_date' });

        setTodayLog(inserted as DailyAttendanceLog);
        setMessage({
          type: 'success',
          text: `🎉 Check-In Successful at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Status: ${attStatusText} (+${initialPoints} XP)`
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

        // Fetch active scoring interval for student's course & batch
        const { data: activeInterval } = await supabase
          .from('scoring_intervals')
          .select('id')
          .eq('course_id', currentStudent.course_id)
          .eq('batch_number', currentStudent.batch_number)
          .eq('is_active', true)
          .maybeSingle();

        let targetIntervalId = activeInterval?.id;
        if (!targetIntervalId) {
          const { data: latestInt } = await supabase
            .from('scoring_intervals')
            .select('id')
            .eq('course_id', currentStudent.course_id)
            .eq('batch_number', currentStudent.batch_number)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          targetIntervalId = latestInt?.id;
        }

        const finalStatusText = finalPoints === 10 ? 'On Time' : (finalPoints === 7 ? 'Late' : (finalPoints === 5 ? 'Half Day' : 'Absent'));

        // Update score log for afternoon completion
        await supabase.from('scores').upsert({
          student_id: currentStudent.id,
          interval_id: targetIntervalId,
          score_type: 'attendance',
          points: finalPoints,
          max_points: 10,
          activity_name: `Attendance: ${finalStatusText}`,
          logged_by: currentStudent.id,
          logged_date: todayStr
        }, { onConflict: 'student_id,interval_id,score_type,logged_date' });

        setTodayLog(updated as DailyAttendanceLog);
        setMessage({
          type: 'success',
          text: `🎯 Check-Out Recorded at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Final Today Points: +${finalPoints} XP (${finalStatusText})`
        });
      }

      stopCameraScanner();
      setShowScannerModal(false);
      if (onAttendanceMarked) onAttendanceMarked();

    } catch (err: any) {
      console.error('Error marking attendance:', err);
      setMessage({ type: 'error', text: `Failed to mark attendance: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Render Full-Screen Modal Portal directly at document.body
  const renderFullScreenModal = () => {
    if (!showScannerModal) return null;

    const modalContent = (
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100dvh', 
          background: '#0f172a', 
          zIndex: 999999, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          padding: '1rem 1.25rem 1.5rem 1.25rem', 
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        {/* CSS Fix for html5-qrcode video element */}
        <style>{`
          #qr-reader {
            border: none !important;
            width: 100% !important;
            background: #000 !important;
          }
          #qr-reader video {
            width: 100% !important;
            max-height: 48vh !important;
            object-fit: cover !important;
            border-radius: 16px !important;
          }
          #qr-reader img {
            display: none !important;
          }
          #qr-reader__scan_region {
            border-radius: 16px !important;
            overflow: hidden !important;
          }
        `}</style>

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: '#c99c33', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <QrCode size={20} /> Daily Attendance Scanner
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {!todayLog ? 'Morning Check-In' : 'Afternoon Check-Out'} • Academy of Excellence
            </span>
          </div>
          <button 
            onClick={() => { stopCameraScanner(); setShowScannerModal(false); }} 
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Mode Selector Tabs */}
        <div style={{ display: 'flex', background: '#1e293b', borderRadius: '12px', padding: '0.3rem', marginBottom: '1.25rem', border: '1px solid rgba(201, 156, 51, 0.3)' }}>
          <button
            onClick={() => setModalTab('camera')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '9px',
              border: 'none',
              background: modalTab === 'camera' ? '#c99c33' : 'transparent',
              color: modalTab === 'camera' ? 'white' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Camera size={16} /> Scan Camera QR
          </button>

          <button
            onClick={() => setModalTab('passkey')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '9px',
              border: 'none',
              background: modalTab === 'passkey' ? '#c99c33' : 'transparent',
              color: modalTab === 'passkey' ? 'white' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Key size={16} /> Enter Passkey
          </button>
        </div>

        {/* Modal Main View Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {/* CAMERA SCANNER TAB */}
          {modalTab === 'camera' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem', marginTop: 0 }}>
                Point your phone camera at the classroom QR code on screen:
              </p>

              {cameraError ? (
                <div style={{ padding: '1.25rem', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
                  {cameraError}
                </div>
              ) : (
                <div style={{ overflow: 'hidden', borderRadius: '20px', border: '2px solid #c99c33', background: '#000', margin: '0 auto 1rem auto', maxWidth: '360px', boxShadow: '0 15px 30px rgba(0,0,0,0.5)' }}>
                  <div id="qr-reader" style={{ width: '100%' }}></div>
                </div>
              )}
            </div>
          )}

          {/* PASSKEY ENTRY TAB */}
          {modalTab === 'passkey' && (
            <div style={{ maxWidth: '360px', margin: '0 auto', width: '100%' }}>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem', marginTop: 0, textAlign: 'center' }}>
                Enter the 6-digit daily passkey displayed under the classroom QR code:
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  placeholder="e.g. 948271"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '14px', border: '2px solid #c99c33', background: '#1e293b', color: 'white', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', letterSpacing: '0.15em', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={() => handleMarkAttendance(passkeyInput)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #c99c33 0%, #a67c22 100%)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(201, 156, 51, 0.3)'
                }}
              >
                {loading ? 'Submitting...' : 'Confirm & Mark Attendance'}
              </button>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div style={{ textAlign: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Academy of Excellence • Automated QR Attendance
          </span>
        </div>

      </div>
    );

    return createPortal(modalContent, document.body);
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

        {/* Scan Action Button */}
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

      {/* Render Full Screen Modal Portal */}
      {renderFullScreenModal()}

    </div>
  );
}
