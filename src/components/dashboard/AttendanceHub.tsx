import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Course, StudentProfile, DailyAttendanceLog } from '../../lib/types';
import { Calendar, QrCode, Printer, RefreshCw, CheckCircle2, Clock, AlertTriangle, UserCheck, ShieldCheck, Search, Filter, Edit3, Save, X, PlusCircle, FlaskConical, Play, Sparkles, FileText, User, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { fetchStudentAttendanceAuditData, printStudentAttendanceReport, StudentAttendanceAuditData } from '../../lib/studentAttendanceReport';

const ensureValidUuid = (idVal: string | null | undefined): string => {
  const fallbackUuid = 'c1111111-1111-1111-1111-111111111111';
  if (!idVal || typeof idVal !== 'string') return fallbackUuid;
  const match = idVal.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  return match ? match[0] : fallbackUuid;
};

interface AttendanceHubProps {
  coursesList: Course[];
  studentList: StudentProfile[];
}

export default function AttendanceHub({ coursesList, studentList }: AttendanceHubProps) {
  // Dynamically detect default course & batch from studentList
  const defaultCourseId = coursesList[0]?.id || studentList[0]?.course_id || '';
  const foundBatches = Array.from(new Set(studentList.map(s => Number(s.batch_number)))).filter(Boolean).sort((a, b) => a - b);
  const defaultBatch = foundBatches.length > 0 ? foundBatches[0] : 26;

  const [selectedCourseId, setSelectedCourseId] = useState<string>(defaultCourseId);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | string>(defaultBatch);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subTab, setSubTab] = useState<'qr_screen' | 'daily_register' | 'history_logs' | 'test_simulator'>('daily_register');

  // Auto-align selectedCourseId & selectedBatchNumber when props update
  useEffect(() => {
    if (coursesList.length > 0 && !selectedCourseId) {
      setSelectedCourseId(coursesList[0].id);
    }
    if (studentList.length > 0) {
      const batches = Array.from(new Set(studentList.map(s => Number(s.batch_number)))).filter(Boolean).sort((a, b) => a - b);
      if (batches.length > 0 && !batches.includes(Number(selectedBatchNumber))) {
        setSelectedBatchNumber(batches[0]);
      }
    }
  }, [coursesList, studentList]);

  // Logs & Loading
  const [attendanceLogs, setAttendanceLogs] = useState<DailyAttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // QR Code Screen state
  const [qrType, setQrType] = useState<'check_in' | 'check_out'>('check_in');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Manual Attendance & Time Edit Modal state
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [editingLog, setEditingLog] = useState<DailyAttendanceLog | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editCheckIn, setEditCheckIn] = useState<string>('');
  const [editCheckOut, setEditCheckOut] = useState<string>('');
  const [editCheckInStatus, setEditCheckInStatus] = useState<'on_time' | 'late' | 'pending'>('on_time');
  const [editCheckOutStatus, setEditCheckOutStatus] = useState<'on_time' | 'early' | 'pending'>('on_time');
  const [editPoints, setEditPoints] = useState<number>(10);
  const [editStatus, setEditStatus] = useState<'present_full' | 'present_half' | 'absent' | 'manual_override'>('present_full');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // INDIVIDUAL STUDENT ATTENDANCE AUDIT STATE
  const [auditStudentId, setAuditStudentId] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditData, setAuditData] = useState<StudentAttendanceAuditData | null>(null);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

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

  // Unstoppable Active Student Filtering (With Resilient Fallbacks)
  let activeStudents = studentList.filter(
    s => (s.course_id === selectedCourseId || !selectedCourseId) &&
         (Number(s.batch_number) === Number(selectedBatchNumber) || !selectedBatchNumber) &&
         s.status === 'active'
  );

  // Fallback 1: If no exact batch match, show all active students for selected course
  if (activeStudents.length === 0 && selectedCourseId) {
    activeStudents = studentList.filter(s => s.course_id === selectedCourseId && s.status === 'active');
  }

  // Fallback 2: If still empty, show all active students in the entire academy
  if (activeStudents.length === 0) {
    activeStudents = studentList.filter(s => s.status === 'active' || !s.status);
  }

  const [qrMode, setQrMode] = useState<'persistent' | 'daily'>('persistent');
  const [passkeySeed, setPasskeySeed] = useState<number>(123456);

  useEffect(() => {
    fetchLogs();
  }, [selectedDate, selectedCourseId, selectedBatchNumber]);

  // Regenerate live / persistent QR code
  useEffect(() => {
    generateQrToken();
  }, [selectedDate, selectedCourseId, selectedBatchNumber, qrType, qrMode, passkeySeed]);

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

  // Generate QR token (Persistent Wall Poster vs Dynamic Daily Token)
  const generateQrToken = async () => {
    try {
      let qrPayload = '';
      if (qrMode === 'persistent') {
        qrPayload = JSON.stringify({
          type: 'AOE_PERSISTENT_QR',
          course_id: selectedCourseId,
          batch: selectedBatchNumber,
          station: 'AOE_CLASSROOM_STATION',
          passkey: String(passkeySeed)
        });
      } else {
        const todayPasskey = Math.abs(
          (selectedDate.split('-').reduce((acc, part) => acc + parseInt(part), 0) + passkeySeed) * 98765
        ).toString().slice(0, 6).padStart(6, '9');

        qrPayload = JSON.stringify({
          type: 'AOE_ATTENDANCE_TOKEN',
          slot: qrType,
          date: selectedDate,
          course_id: selectedCourseId,
          batch: selectedBatchNumber,
          passkey: todayPasskey
        });
      }

      const url = await QRCode.toDataURL(qrPayload, { width: 340, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrDataUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const handleRegenerateCode = () => {
    const newSeed = Math.floor(100000 + Math.random() * 900000);
    setPasskeySeed(newSeed);
    setMessage('✅ New Secret Passkey / QR Code Generated successfully!');
    setTimeout(() => setMessage(''), 3000);
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

    const inPts = checkInStatus === 'on_time' ? 5 : (checkInStatus === 'late' ? 3 : 0);
    const outPts = checkOutStatus === 'on_time' ? 5 : (checkOutStatus === 'early' ? 3 : 0);
    const totalPts = inPts + outPts;

    let overallStatus: 'present_full' | 'present_half' | 'absent' = 'absent';
    if (totalPts >= 10) overallStatus = 'present_full';
    else if (totalPts > 0) overallStatus = 'present_half';

    return { points: totalPts, status: overallStatus, check_in_status: checkInStatus, check_out_status: checkOutStatus };
  };

  // Helper to extract HH:mm in IST (Asia/Kolkata) from an ISO timestamp
  const getHHMMFromIso = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Helper to create unambiguous ISO string anchored in IST (UTC+05:30)
  const createIsoFromIST = (dateStr: string, timeStr?: string): string | null => {
    if (!timeStr || !timeStr.trim()) return null;
    try {
      const trimmed = timeStr.trim();
      if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return null;
      const formatted = trimmed.length === 4 ? `0${trimmed}` : trimmed;
      const d = new Date(`${dateStr}T${formatted}:00+05:30`);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  };

  // Handler when staff modifies Check-In time in modal
  const handleCheckInChange = (newInTime: string) => {
    setEditCheckIn(newInTime);
    if (newInTime) {
      const hours = getHoursInIST(newInTime);
      const inStat = hours <= 10.08 ? 'on_time' : 'late';
      setEditCheckInStatus(inStat);
      const res = evaluatePointsAndStatus(newInTime, editCheckOut);
      setEditPoints(res.points);
      setEditStatus(res.status);
    } else {
      setEditCheckInStatus('pending');
      const res = evaluatePointsAndStatus(undefined, editCheckOut);
      setEditPoints(res.points);
      setEditStatus(res.status);
    }
  };

  // Handler when staff modifies Check-Out time in modal
  const handleCheckOutChange = (newOutTime: string) => {
    setEditCheckOut(newOutTime);
    if (newOutTime) {
      const hours = getHoursInIST(newOutTime);
      const outStat = hours >= 15.95 ? 'on_time' : 'early';
      setEditCheckOutStatus(outStat);
      const res = evaluatePointsAndStatus(editCheckIn, newOutTime);
      setEditPoints(res.points);
      setEditStatus(res.status);
    } else {
      setEditCheckOutStatus('pending');
      const res = evaluatePointsAndStatus(editCheckIn, undefined);
      setEditPoints(res.points);
      setEditStatus(res.status);
    }
  };

  // Open Edit Modal for a student
  const handleOpenEditModal = (student: StudentProfile, existingLog?: DailyAttendanceLog) => {
    setEditingStudent(student);
    setEditingLog(existingLog || null);
    setEditDate(existingLog?.date || selectedDate);

    if (existingLog) {
      const inTime = getHHMMFromIso(existingLog.check_in_time);
      const outTime = getHHMMFromIso(existingLog.check_out_time);
      setEditCheckIn(inTime);
      setEditCheckOut(outTime);
      setEditCheckInStatus(existingLog.check_in_status || (inTime ? (getHoursInIST(inTime) <= 10.08 ? 'on_time' : 'late') : 'pending'));
      setEditCheckOutStatus(existingLog.check_out_status || (outTime ? (getHoursInIST(outTime) >= 15.95 ? 'on_time' : 'early') : 'pending'));
      setEditPoints(existingLog.points_awarded ?? 10);
      setEditStatus(existingLog.status || 'present_full');
      setEditNotes(existingLog.notes || '');
    } else {
      // Default to 10:00 AM check-in, 16:00 check-out, on-time full day
      setEditCheckIn('10:00');
      setEditCheckOut('16:00');
      setEditCheckInStatus('on_time');
      setEditCheckOutStatus('on_time');
      setEditPoints(10);
      setEditStatus('present_full');
      setEditNotes('Manual entry by staff');
    }
  };

  // Open Edit Modal for a log from history table
  const handleOpenEditForLog = (log: DailyAttendanceLog) => {
    const student = studentList.find(s => s.id === log.student_id) || ({
      id: log.student_id,
      name: log.student_name,
      course_id: log.course_id || selectedCourseId,
      batch_number: log.batch_number || Number(selectedBatchNumber),
      status: 'active'
    } as StudentProfile);
    handleOpenEditModal(student, log);
  };

  // Save / Update Attendance Record manually or via override
  const handleQuickMarkAttendance = async (
    student: StudentProfile,
    pointsOverride: number,
    statusOverride: string,
    inStatusOverride?: string,
    outStatusOverride?: string
  ) => {
    try {
      const nowIso = new Date().toISOString();
      const existingLog = attendanceLogs.find(l => l.student_id === student.id);

      let checkInTime = existingLog?.check_in_time || (pointsOverride > 0 ? nowIso : undefined);
      let checkOutTime = existingLog?.check_out_time || (pointsOverride === 10 ? nowIso : undefined);

      const inStatus = inStatusOverride || (pointsOverride >= 5 ? 'on_time' : (pointsOverride === 3 ? 'late' : 'pending'));
      const outStatus = outStatusOverride || (pointsOverride === 10 ? 'on_time' : 'pending');

      const recordToUpsert = {
        student_id: student.id,
        student_name: student.name,
        course_id: student.course_id,
        batch_number: student.batch_number,
        date: selectedDate,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        check_in_status: inStatus,
        check_out_status: outStatus,
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
      const validIntervalId = ensureValidUuid(intervalId);
      const { error: scoreErr } = await supabase.from('scores').upsert({
        student_id: studentId,
        interval_id: validIntervalId,
        score_type: 'attendance',
        points: points,
        max_points: 10,
        activity_name: `Daily QR Attendance (${selectedDate})`,
        logged_date: selectedDate
      }, { onConflict: 'student_id,interval_id,score_type,logged_date' });

      if (scoreErr) {
        await supabase.rpc('log_student_score', {
          p_student_id: studentId,
          p_interval_id: validIntervalId,
          p_score_type: 'attendance',
          p_points: points,
          p_max_points: 10,
          p_activity_name: `Daily QR Attendance (${selectedDate})`,
          p_logged_by: null,
          p_logged_date: selectedDate
        });
      }
    } catch (err) {
      console.error('Error syncing score:', err);
    }
  };

  // Print Daily Attendance Register
  const handlePrintAttendanceRegister = () => {
    const courseName = selectedCourse?.name || 'Academic Course';
    const totalCount = activeStudents.length;
    const inCount = activeStudents.filter(s => {
      const log = attendanceLogs.find(l => l.student_id === s.id);
      return log && (log.check_in_time || log.points_awarded > 0);
    }).length;
    const outCount = activeStudents.filter(s => {
      const log = attendanceLogs.find(l => l.student_id === s.id);
      return log && (log.check_out_time || log.points_awarded === 10);
    }).length;
    const absCount = Math.max(0, totalCount - inCount);

    const rowsHtml = activeStudents.map((s, idx) => {
      const log = attendanceLogs.find(l => l.student_id === s.id);
      const inTime = log?.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const outTime = log?.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const inStat = log?.check_in_status === 'on_time' ? 'On Time (+5 XP)' : (log?.check_in_status === 'late' ? 'Late (+3 XP)' : 'Not Logged In');
      const outStat = log?.check_out_status === 'on_time' ? 'On Time (+5 XP)' : (log?.check_out_status === 'early' ? 'Early (+3 XP)' : 'Not Logged Out');
      const pts = log?.points_awarded ?? 0;

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">#${idx + 1} ${s.name} ${s.roll_number ? `(Roll #${s.roll_number})` : ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${inTime}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${log?.check_in_status === 'on_time' ? '#15803d' : (log?.check_in_status === 'late' ? '#b45309' : '#888')};">${inStat}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${outTime}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${log?.check_out_status === 'on_time' ? '#1d4ed8' : '#888'};">${outStat}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${pts > 0 ? '#15803d' : '#888'};">+${pts} XP</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Attendance Register - ${courseName} Batch ${selectedBatchNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; }
          .header { text-align: center; border-bottom: 3px solid #c99c33; padding-bottom: 15px; margin-bottom: 20px; }
          .header h2 { margin: 0; color: #0f172a; font-size: 22px; }
          .header p { margin: 5px 0 0 0; color: #64748b; font-size: 13px; }
          .stats { display: flex; justify-content: space-around; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
          .stat-box { text-align: center; }
          .stat-box .num { font-size: 20px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th { background: #0f172a; color: white; padding: 10px; text-align: left; }
          th.center { text-align: center; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
          .signature { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>ACADEMY OF EXCELLENCE</h2>
          <p>Official Daily Classroom Attendance Register</p>
          <p style="font-weight: bold; color: #c99c33; font-size: 14px; margin-top: 5px;">
            ${courseName} • Batch ${selectedBatchNumber} • Date: ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div class="stats">
          <div class="stat-box"><div>Total Roster</div><div class="num" style="color:#c99c33">${totalCount}</div></div>
          <div class="stat-box"><div>Morning Login</div><div class="num" style="color:#15803d">${inCount} (${totalCount > 0 ? Math.round((inCount/totalCount)*100) : 0}%)</div></div>
          <div class="stat-box"><div>Evening Logout</div><div class="num" style="color:#1d4ed8">${outCount} (${totalCount > 0 ? Math.round((outCount/totalCount)*100) : 0}%)</div></div>
          <div class="stat-box"><div>Pending / Absent</div><div class="num" style="color:#b91c1c">${absCount}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th class="center">Login Time</th>
              <th class="center">Login Status (+5 XP)</th>
              <th class="center">Logout Time</th>
              <th class="center">Logout Status (+5 XP)</th>
              <th class="center">Total XP</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="signature">Staff Instructor Signature</div>
          <div class="signature">Academic Director Signature</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  // Print Classroom QR Code Poster
  const handlePrintQrCodePoster = () => {
    const courseName = selectedCourse?.name || 'Academic Course';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Classroom QR Code Poster - ${courseName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; color: #0f172a; background: white; }
          .poster { border: 8px solid #c99c33; padding: 40px; border-radius: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .logo { height: 80px; margin-bottom: 20px; }
          h1 { margin: 0; color: #0f172a; font-size: 28px; font-weight: 900; }
          h2 { margin: 10px 0 20px 0; color: #c99c33; font-size: 20px; font-weight: 700; }
          .qr-img { width: 320px; height: 320px; margin: 20px auto; display: block; border: 4px solid #0f172a; border-radius: 16px; padding: 10px; }
          .instructions { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 15px; margin-top: 20px; font-size: 14px; color: #334155; }
        </style>
      </head>
      <body>
        <div class="poster">
          <img src="https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg" class="logo" alt="Logo" />
          <h1>ACADEMY OF EXCELLENCE</h1>
          <h2>${courseName} • Batch ${selectedBatchNumber}</h2>
          <p style="font-size: 16px; font-weight: 700; color: #475569;">DAILY CLASSROOM ATTENDANCE SCANNER</p>
          <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
          <div class="instructions">
            <strong>📲 How Students Scan:</strong><br/>
            1. Open your Student Portal on your phone.<br/>
            2. Tap <strong>Scan QR Attendance</strong>.<br/>
            3. Point your camera at this code to log your daily attendance instantly!
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  // Generate & Print Student Attendance Audit Report
  const handleGenerateAuditReport = async (studentIdToAudit?: string) => {
    const targetId = studentIdToAudit || auditStudentId;
    if (!targetId) {
      alert('Please select a student to generate their course attendance audit report.');
      return;
    }
    const targetStudent = studentList.find(s => s.id === targetId);
    if (!targetStudent) {
      alert('Student record not found in directory.');
      return;
    }

    setAuditLoading(true);
    try {
      const audit = await fetchStudentAttendanceAuditData(targetStudent, selectedCourse);
      setAuditData(audit);
      printStudentAttendanceReport(audit);
    } catch (err: any) {
      console.error('Error generating student attendance audit:', err);
      alert(`Failed to generate attendance report: ${err.message}`);
    } finally {
      setAuditLoading(false);
    }
  };

  // Preview Student Attendance Audit Report in UI
  const handlePreviewAuditReport = async (studentIdToAudit: string) => {
    setAuditStudentId(studentIdToAudit);
    const targetStudent = studentList.find(s => s.id === studentIdToAudit);
    if (!targetStudent) return;

    setAuditLoading(true);
    try {
      const audit = await fetchStudentAttendanceAuditData(targetStudent, selectedCourse);
      setAuditData(audit);
    } catch (err: any) {
      console.error('Error previewing student attendance audit:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Save manual attendance and time edits
  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const targetDate = editDate || selectedDate;
      const inIso = createIsoFromIST(targetDate, editCheckIn);
      const outIso = createIsoFromIST(targetDate, editCheckOut);

      const recordToUpsert = {
        student_id: editingStudent.id,
        student_name: editingStudent.name,
        course_id: editingStudent.course_id || selectedCourseId,
        batch_number: editingStudent.batch_number || Number(selectedBatchNumber),
        date: targetDate,
        check_in_time: inIso,
        check_out_time: outIso,
        check_in_status: editCheckIn ? editCheckInStatus : 'pending',
        check_out_status: editCheckOut ? editCheckOutStatus : 'pending',
        points_awarded: editPoints,
        status: editStatus,
        method: 'manual_override',
        notes: editNotes || 'Manual time adjustment by staff'
      };

      const { error } = await supabase
        .from('daily_attendance_logs')
        .upsert(recordToUpsert, { onConflict: 'student_id,date' });

      if (error) throw error;

      await syncScoreToLeaderboard(editingStudent.id, editPoints);
      setMessage(`✅ Updated attendance times for ${editingStudent.name} (${targetDate})`);
      setEditingStudent(null);
      setEditingLog(null);
      await fetchLogs();
    } catch (err: any) {
      console.error('Error saving attendance edit:', err);
      alert(`Error saving attendance: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Delete / Reset Attendance Log
  const handleDeleteLog = async () => {
    if (!editingLog) return;
    if (!window.confirm(`Are you sure you want to remove the attendance log for ${editingLog.student_name} on ${editingLog.date}? Leaderboard XP will be reset to 0.`)) {
      return;
    }

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('daily_attendance_logs')
        .delete()
        .eq('id', editingLog.id);

      if (error) throw error;

      await syncScoreToLeaderboard(editingLog.student_id, 0);
      setMessage(`🗑️ Removed attendance log for ${editingLog.student_name}`);
      setEditingStudent(null);
      setEditingLog(null);
      await fetchLogs();
    } catch (err: any) {
      console.error('Error deleting attendance log:', err);
      alert(`Error deleting attendance: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
      setTimeout(() => setMessage(''), 4000);
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
      {subTab === 'daily_register' && (() => {
        const totalStudents = activeStudents.length;
        const loggedInCount = activeStudents.filter(s => {
          const log = attendanceLogs.find(l => l.student_id === s.id);
          return log && (log.check_in_time || log.points_awarded > 0);
        }).length;

        const loggedOutCount = activeStudents.filter(s => {
          const log = attendanceLogs.find(l => l.student_id === s.id);
          return log && (log.check_out_time || log.points_awarded === 10);
        }).length;

        const pendingCount = Math.max(0, totalStudents - loggedInCount);

        return (
          <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
            
            {/* Header Bar matching screenshot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar className="text-primary" size={22} /> Daily Attendance Sessions
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.3rem 0 0 0' }}>
                  Date: <strong>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong> • Course: <strong>{selectedCourse?.name || 'Academic Course'}</strong> • Batch: <strong>{selectedBatchNumber}</strong>
                </p>
              </div>

              {/* Selectors & QR / Print Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSubTab('qr_screen')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '50px',
                    background: 'linear-gradient(135deg, #c99c33 0%, #a47c20 100%)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(201, 156, 51, 0.3)'
                  }}
                >
                  <QrCode size={16} /> Classroom QR Code
                </button>

                <button
                  onClick={handlePrintQrCodePoster}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '50px',
                    background: '#0f172a',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Printer size={16} /> Print QR Poster
                </button>

                <button
                  onClick={handlePrintAttendanceRegister}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '50px',
                    background: '#15803d',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Printer size={16} /> Print Register
                </button>

                <button
                  onClick={() => {
                    const firstStudent = activeStudents[0] || studentList[0];
                    if (firstStudent) {
                      const existing = attendanceLogs.find(l => l.student_id === firstStudent.id);
                      handleOpenEditModal(firstStudent, existing);
                    }
                  }}
                  style={{
                    padding: '0.5rem 1.1rem',
                    borderRadius: '50px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
                  }}
                  title="Staff Time Control: Set custom check-in/out times, XP, or attendance for any student"
                >
                  <Edit3 size={15} /> Custom Time Entry
                </button>

                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
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

            {/* 4 Summary Cards matching user screenshot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(201,156,51,0.08), rgba(201,156,51,0.02))', border: '1px solid rgba(201,156,51,0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Batch Roster</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#c99c33', marginTop: '0.2rem' }}>{totalStudents}</div>
              </div>

              <div className="glass-card" style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login (Morning Scan)</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#15803d', marginTop: '0.2rem' }}>
                  {loggedInCount} <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>({totalStudents > 0 ? Math.round((loggedInCount / totalStudents) * 100) : 0}%)</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logout (Evening Scan)</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.2rem' }}>
                  {loggedOutCount} <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 700 }}>({totalStudents > 0 ? Math.round((loggedOutCount / totalStudents) * 100) : 0}%)</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending / Absent</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#b91c1c', marginTop: '0.2rem' }}>{pendingCount}</div>
              </div>
            </div>

            {activeStudents.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                No active students found in this course and batch. Select another course or batch above.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>Student Name</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800, textAlign: 'center' }}>Login Time</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800, textAlign: 'center' }}>Login Status (+5 XP)</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800, textAlign: 'center' }}>Logout Time</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800, textAlign: 'center' }}>Logout Status (+5 XP)</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800, textAlign: 'center' }}>Total Attendance XP</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800, textAlign: 'right' }}>Quick Staff Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudents.map((student, idx) => {
                      const log = attendanceLogs.find(l => l.student_id === student.id);
                      const inTimeStr = log?.check_in_time
                        ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-';
                      const outTimeStr = log?.check_out_time
                        ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-';

                      const inStatus = log?.check_in_status || (log?.check_in_time ? 'on_time' : 'pending');
                      const outStatus = log?.check_out_status || (log?.check_out_time ? 'on_time' : 'pending');
                      const points = log?.points_awarded ?? 0;

                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                            <span style={{ color: '#c99c33', fontWeight: 800, marginRight: '0.4rem' }}>#{idx + 1}</span>
                            {student.name}
                            {student.roll_number && <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: 500 }}>(Roll #{student.roll_number})</span>}
                          </td>

                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: 700, color: log?.check_in_time ? '#15803d' : '#94a3b8' }}>
                            {inTimeStr}
                          </td>

                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                            {inStatus === 'on_time' ? (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.65rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.75rem' }}>
                                On Time (+5 XP)
                              </span>
                            ) : inStatus === 'late' ? (
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.25rem 0.65rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.75rem' }}>
                                Late (+3 XP)
                              </span>
                            ) : (
                              <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '0.25rem 0.65rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.75rem' }}>
                                Not Logged In
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: 700, color: log?.check_out_time ? '#1d4ed8' : '#94a3b8' }}>
                            {outTimeStr}
                          </td>

                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                            {outStatus === 'on_time' ? (
                              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.65rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.75rem' }}>
                                On Time (+5 XP)
                              </span>
                            ) : outStatus === 'early' ? (
                              <span style={{ background: '#ffedd5', color: '#c2410c', padding: '0.25rem 0.65rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.75rem' }}>
                                Early (+3 XP)
                              </span>
                            ) : (
                              <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '0.25rem 0.65rem', borderRadius: '50px', fontWeight: 600, fontSize: '0.75rem' }}>
                                Not Logged Out
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem', color: points === 10 ? '#16a34a' : (points === 5 ? '#b45309' : '#94a3b8') }}>
                            +{points} XP
                          </td>

                          <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleQuickMarkAttendance(student, 5, 'present_half', 'on_time', 'pending')}
                                title="Mark Morning Login On Time (+5 XP)"
                                style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: '#16a34a', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}
                              >
                                +5 Login
                              </button>
                              <button
                                onClick={() => handleQuickMarkAttendance(student, 3, 'present_half', 'late', 'pending')}
                                title="Mark Morning Login Late (+3 XP)"
                                style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: '#d97706', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}
                              >
                                +3 Late
                              </button>
                              <button
                                onClick={() => handleQuickMarkAttendance(student, 10, 'present_full', 'on_time', 'on_time')}
                                title="Mark Full Day Present (+10 XP)"
                                style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: '#2563eb', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}
                              >
                                +10 Full Day
                              </button>
                              <button
                                onClick={() => handleQuickMarkAttendance(student, 0, 'absent', 'pending', 'pending')}
                                title="Mark Absent (0 XP)"
                                style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: '#dc2626', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}
                              >
                                Absent
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(student, log)}
                                title="Staff Attendance Time Editor: Set custom In/Out times, XP & status"
                                style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#e0e7ff', color: '#3730a3', fontWeight: 800, border: '1px solid #c7d2fe', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Edit3 size={11} /> Edit Time
                              </button>
                              <button
                                onClick={() => handleGenerateAuditReport(student.id)}
                                title="Print Full Course Attendance & Late-Coming Audit Report"
                                style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: '#0f172a', color: '#fbbf24', fontWeight: 800, border: '1px solid rgba(251,191,36,0.3)', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Printer size={11} /> Audit
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
        );
      })()}

      {/* --- SUB-TAB 2: CLASSROOM QR SCREEN --- */}
      {subTab === 'qr_screen' && (
        <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', textAlign: 'center', background: '#0f172a', color: 'white' }}>
          
          {/* Mode Switcher: Persistent vs Daily */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setQrMode('persistent')}
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: '50px',
                border: 'none',
                background: qrMode === 'persistent' ? 'linear-gradient(135deg, #c99c33 0%, #a47c20 100%)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: qrMode === 'persistent' ? '0 4px 12px rgba(201, 156, 51, 0.4)' : 'none'
              }}
            >
              📌 Persistent Wall Poster (Never Expires)
            </button>

            <button
              onClick={() => setQrMode('daily')}
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: '50px',
                border: 'none',
                background: qrMode === 'daily' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              ⚡ Live Daily Passkey Mode
            </button>

            <button
              onClick={handleRegenerateCode}
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#facc15',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <RefreshCw size={16} /> 🔄 Regenerate Secret Passkey
            </button>

            <button
              onClick={handlePrintQrCodePoster}
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: '50px',
                border: 'none',
                background: '#15803d',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={16} /> 🖨️ Print Wall Poster
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', margin: '0 0 0.5rem 0' }}>
              {qrMode === 'persistent' ? '📌 Persistent Classroom QR Poster (Print & Display on Wall)' : '⚡ Live Passkey Mode'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              {selectedCourse?.name || 'Academic Course'} • Batch {selectedBatchNumber}
            </p>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'inline-block', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>CLASSROOM SECRET PASSKEY</span>
              <strong style={{ fontSize: '1.8rem', letterSpacing: '0.25em', color: '#facc15' }}>
                {passkeySeed}
              </strong>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB 3: LOG HISTORY & PRINTABLE REPORT --- */}
      {subTab === 'history_logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Dedicated Individual Student Course Attendance & Late-Coming Audit Card */}
          <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1.5px solid rgba(201, 156, 51, 0.3)', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', color: '#b45309', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Clock size={13} /> Complete Course Audit & Printable Report
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Student Attendance, Absentees & Late-Coming Audit
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                  Generate a complete official report for any student stating their entire course absentees, late arrivals with dates, exact check-in times, delay minutes, and parent/faculty signature blocks.
                </p>
              </div>

              {auditData && (
                <button
                  onClick={() => printStudentAttendanceReport(auditData)}
                  disabled={auditLoading}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#fbbf24',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                  }}
                >
                  <Printer size={16} /> Print {auditData.student.name}'s Report
                </button>
              )}
            </div>

            {/* Student Search & Select Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Select Student from Course Roster
                </label>
                <select
                  value={auditStudentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAuditStudentId(id);
                    if (id) handlePreviewAuditReport(id);
                  }}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                >
                  <option value="">-- Choose Student to Audit --</option>
                  {studentList
                    .filter(s => (s.course_id === selectedCourseId || !selectedCourseId) && (Number(s.batch_number) === Number(selectedBatchNumber) || !selectedBatchNumber))
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.roll_number ? `(Roll #${s.roll_number})` : ''} - Batch {s.batch_number}
                      </option>
                    ))}
                  {/* Fallback to show all students if none matched above */}
                  <option disabled>────────── All Academy Students ──────────</option>
                  {studentList.map(s => (
                    <option key={`all-${s.id}`} value={s.id}>
                      {s.name} {s.roll_number ? `(Roll #${s.roll_number})` : ''} ({s.courses?.name || 'Course'} - Batch {s.batch_number})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                <button
                  onClick={() => auditStudentId && handlePreviewAuditReport(auditStudentId)}
                  disabled={!auditStudentId || auditLoading}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    cursor: auditStudentId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RefreshCw size={15} className={auditLoading ? 'animate-spin' : ''} /> {auditLoading ? 'Loading...' : 'Refresh Audit'}
                </button>

                <button
                  onClick={() => handleGenerateAuditReport()}
                  disabled={!auditStudentId || auditLoading}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    background: auditStudentId ? '#059669' : '#94a3b8',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: auditStudentId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: auditStudentId ? '0 4px 10px rgba(5, 150, 105, 0.3)' : 'none'
                  }}
                >
                  <Printer size={15} /> Print Full Course Report
                </button>
              </div>
            </div>

            {/* Live Audit Preview when student is selected */}
            {auditData && (
              <div style={{ marginTop: '1rem' }}>
                
                {/* 5 KPI Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Course Sessions</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>{auditData.totalWorkingDays}</div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Working Days</span>
                  </div>

                  <div style={{ background: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Days Present</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '0.2rem' }}>{auditData.presentDays}</div>
                    <span style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>{auditData.onTimeCount} On-Time</span>
                  </div>

                  <div style={{ background: '#fffbeb', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #fde68a', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Late Arrivals</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#b45309', marginTop: '0.2rem' }}>{auditData.lateCount}</div>
                    <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>Past 10:00 AM</span>
                  </div>

                  <div style={{ background: '#fef2f2', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #fecaca', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase' }}>Days Absent</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#dc2626', marginTop: '0.2rem' }}>{auditData.absentCount}</div>
                    <span style={{ fontSize: '0.65rem', color: '#b91c1c', fontWeight: 600 }}>
                      {auditData.totalWorkingDays > 0 ? Math.round((auditData.absentCount / auditData.totalWorkingDays) * 100) : 0}% Missed
                    </span>
                  </div>

                  <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Rate</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb', marginTop: '0.2rem' }}>{auditData.attendanceRate}%</div>
                    <span style={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: 600 }}>Punctuality: {auditData.punctualityRate}%</span>
                  </div>
                </div>

                {/* Grid of Late Coming & Absentees Previews */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  
                  {/* Late Arrivals Box */}
                  <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #fde68a', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #fef3c7', paddingBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={16} /> Late Arrivals Breakdown ({auditData.lateArrivals.length})
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#92400e', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                        Cutoff: 10:00 AM
                      </span>
                    </div>

                    {auditData.lateArrivals.length === 0 ? (
                      <p style={{ margin: 0, padding: '1rem 0', color: '#16a34a', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
                        ✓ Zero late arrivals recorded! Student was punctual on all sessions.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {auditData.lateArrivals.map((l, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', background: '#fffbeb', borderRadius: '6px', fontSize: '0.78rem' }}>
                            <div>
                              <strong style={{ color: '#0f172a' }}>{l.date}</strong> ({l.dayOfWeek})
                              <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Departed: {l.checkOutTimeFormatted}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ color: '#b45309', fontWeight: 800 }}>{l.checkInTimeFormatted}</span>
                              {l.delayMinutes > 0 && (
                                <span style={{ display: 'block', fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>+{l.delayMinutes}m delay</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Absences Box */}
                  <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #fecaca', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #fee2e2', paddingBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertTriangle size={16} /> Absentees Record ({auditData.absences.length})
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#991b1b', background: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                        {auditData.absentCount} Days Missed
                      </span>
                    </div>

                    {auditData.absences.length === 0 ? (
                      <p style={{ margin: 0, padding: '1rem 0', color: '#16a34a', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
                        ✓ Perfect Attendance! Student did not miss any active class sessions.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {auditData.absences.map((a, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', background: '#fef2f2', borderRadius: '6px', fontSize: '0.78rem' }}>
                            <div>
                              <strong style={{ color: '#0f172a' }}>{a.date}</strong> ({a.dayOfWeek})
                              <span style={{ color: '#7f1d1d', fontSize: '0.7rem', display: 'block' }}>{a.notes}</span>
                            </div>
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Daily Logs Table Card */}
          <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Daily Attendance Log History & Audit
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Showing logs for selected date: <strong>{selectedDate}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handlePrintAttendanceRegister}
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', background: '#059669', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Printer size={16} /> Print Daily Register
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
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No logs found for this date.</td>
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
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEditForLog(l)}
                          title="Edit check-in/out times, XP, or status"
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            background: '#f8fafc',
                            color: '#0f172a',
                            fontWeight: 700,
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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

      {/* --- STAFF MANUAL ATTENDANCE TIME EDIT MODAL --- */}
      {editingStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflowY: 'auto'
          }}
          onClick={() => !isSavingEdit && setEditingStudent(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: 'white',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #c99c33'
              }}
            >
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Edit3 size={13} /> Staff Attendance & Time Control
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: 'white' }}>
                  {editingStudent.name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {editingStudent.roll_number ? `Roll #${editingStudent.roll_number} • ` : ''}Batch {editingStudent.batch_number} • Date: {editDate || selectedDate}
                </span>
              </div>

              <button
                onClick={() => !isSavingEdit && setEditingStudent(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Student & Date Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                    Student
                  </label>
                  <select
                    value={editingStudent.id}
                    onChange={(e) => {
                      const found = activeStudents.find(s => s.id === e.target.value) || studentList.find(s => s.id === e.target.value);
                      if (found) {
                        const existing = attendanceLogs.find(l => l.student_id === found.id);
                        handleOpenEditModal(found, existing);
                      }
                    }}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                  >
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.roll_number ? `(Roll #${s.roll_number})` : ''} - Batch {s.batch_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                    Attendance Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                  />
                </div>
              </div>

              {/* MORNING CHECK-IN CARD */}
              <div style={{ background: '#f0fdf4', borderRadius: '14px', border: '1.5px solid #86efac', padding: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={15} /> Morning Check-In (IST)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#15803d', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '50px', fontWeight: 700 }}>
                    Cutoff: 10:00 AM (10:05 AM Grace)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #86efac',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: 'white'
                    }}
                  />

                  {/* Preset quick buttons */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCheckInChange('09:55')}
                      style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontWeight: 700, border: '1px solid #bbf7d0', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      09:55 AM (On-Time)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckInChange('10:15')}
                      style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', background: '#fef3c7', color: '#92400e', fontWeight: 700, border: '1px solid #fde68a', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      10:15 AM (Late)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckInChange('')}
                      style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', fontWeight: 700, border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Check-In Status Override Chips */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>Status:</span>
                  <button
                    type="button"
                    onClick={() => setEditCheckInStatus('on_time')}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '50px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: editCheckInStatus === 'on_time' ? '#16a34a' : '#e2e8f0',
                      color: editCheckInStatus === 'on_time' ? 'white' : '#475569'
                    }}
                  >
                    ✓ On Time (+5 XP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCheckInStatus('late')}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '50px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: editCheckInStatus === 'late' ? '#d97706' : '#e2e8f0',
                      color: editCheckInStatus === 'late' ? 'white' : '#475569'
                    }}
                  >
                    ⚠️ Late (+3 XP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCheckInStatus('pending')}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '50px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: editCheckInStatus === 'pending' ? '#64748b' : '#e2e8f0',
                      color: editCheckInStatus === 'pending' ? 'white' : '#475569'
                    }}
                  >
                    Not Logged In
                  </button>
                </div>
              </div>

              {/* EVENING CHECK-OUT CARD */}
              <div style={{ background: '#eff6ff', borderRadius: '14px', border: '1.5px solid #93c5fd', padding: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={15} /> Evening Check-Out (IST)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#1d4ed8', background: '#dbeafe', padding: '0.15rem 0.5rem', borderRadius: '50px', fontWeight: 700 }}>
                    Cutoff: 04:00 PM (16:00 IST)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => handleCheckOutChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #93c5fd',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: 'white'
                    }}
                  />

                  {/* Preset quick buttons */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCheckOutChange('16:05')}
                      style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', background: '#dbeafe', color: '#1e40af', fontWeight: 700, border: '1px solid #bfdbfe', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      04:05 PM (Full Day)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckOutChange('15:30')}
                      style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', background: '#ffedd5', color: '#c2410c', fontWeight: 700, border: '1px solid #fed7aa', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      03:30 PM (Early)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckOutChange('')}
                      style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', fontWeight: 700, border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Check-Out Status Override Chips */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>Status:</span>
                  <button
                    type="button"
                    onClick={() => setEditCheckOutStatus('on_time')}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '50px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: editCheckOutStatus === 'on_time' ? '#2563eb' : '#e2e8f0',
                      color: editCheckOutStatus === 'on_time' ? 'white' : '#475569'
                    }}
                  >
                    ✓ Full Day (+5 XP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCheckOutStatus('early')}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '50px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: editCheckOutStatus === 'early' ? '#ea580c' : '#e2e8f0',
                      color: editCheckOutStatus === 'early' ? 'white' : '#475569'
                    }}
                  >
                    ⚠️ Early Departure (+3 XP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCheckOutStatus('pending')}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '50px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      background: editCheckOutStatus === 'pending' ? '#64748b' : '#e2e8f0',
                      color: editCheckOutStatus === 'pending' ? 'white' : '#475569'
                    }}
                  >
                    Not Logged Out
                  </button>
                </div>
              </div>

              {/* POINTS & ATTENDANCE STATUS CARD */}
              <div style={{ background: '#fffbeb', borderRadius: '14px', border: '1.5px solid #fde68a', padding: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={15} /> Award Attendance Points & Status
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: editPoints >= 10 ? '#16a34a' : (editPoints > 0 ? '#b45309' : '#dc2626') }}>
                    +{editPoints} XP Leaderboard
                  </span>
                </div>

                {/* Quick XP selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem', marginBottom: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => { setEditPoints(10); setEditStatus('present_full'); }}
                    style={{
                      padding: '0.5rem 0.4rem',
                      borderRadius: '8px',
                      border: editPoints === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: editPoints === 10 ? '#dcfce7' : 'white',
                      color: editPoints === 10 ? '#15803d' : '#334155',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    +10 XP (Full Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditPoints(5); setEditStatus('present_half'); }}
                    style={{
                      padding: '0.5rem 0.4rem',
                      borderRadius: '8px',
                      border: editPoints === 5 ? '2px solid #d97706' : '1px solid #cbd5e1',
                      background: editPoints === 5 ? '#fef3c7' : 'white',
                      color: editPoints === 5 ? '#b45309' : '#334155',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    +5 XP (Half Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditPoints(3); setEditStatus('present_half'); }}
                    style={{
                      padding: '0.5rem 0.4rem',
                      borderRadius: '8px',
                      border: editPoints === 3 ? '2px solid #ea580c' : '1px solid #cbd5e1',
                      background: editPoints === 3 ? '#ffedd5' : 'white',
                      color: editPoints === 3 ? '#c2410c' : '#334155',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    +3 XP (Late Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditPoints(0); setEditStatus('absent'); }}
                    style={{
                      padding: '0.5rem 0.4rem',
                      borderRadius: '8px',
                      border: editPoints === 0 ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: editPoints === 0 ? '#fee2e2' : 'white',
                      color: editPoints === 0 ? '#b91c1c' : '#334155',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    0 XP (Absent)
                  </button>
                </div>

                {/* Overall Attendance Status Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                      Overall Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                    >
                      <option value="present_full">Full Day Present (present_full)</option>
                      <option value="present_half">Half Day Present (present_half)</option>
                      <option value="absent">Absent (absent)</option>
                      <option value="manual_override">Manual Staff Override</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                      Custom XP (Points)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={editPoints}
                      onChange={(e) => setEditPoints(Math.max(0, Math.min(10, Number(e.target.value))))}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}
                    />
                  </div>
                </div>
              </div>

              {/* STAFF NOTES & REASON */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Staff Note / Audit Reason
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Bus delay excused by faculty, medical emergency, manual entry..."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.4rem' }}
                />

                {/* Quick note chips */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {['🚌 Bus / Traffic Delay', '🏥 Medical Leave', '👨‍🏫 Staff Manual Adjustment', '📱 Scanner Glitch', '🌧️ Weather Permission'].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setEditNotes(reason)}
                      style={{ padding: '0.25rem 0.55rem', borderRadius: '50px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div
              style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                {editingLog && (
                  <button
                    type="button"
                    onClick={handleDeleteLog}
                    disabled={isSavingEdit}
                    style={{
                      padding: '0.55rem 0.9rem',
                      borderRadius: '8px',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontWeight: 800,
                      border: '1px solid #fecaca',
                      cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    title="Remove this attendance log completely for this student on this date"
                  >
                    <Trash2 size={14} /> Delete Log
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  disabled={isSavingEdit}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    background: '#e2e8f0',
                    color: '#475569',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: 'white',
                    fontWeight: 800,
                    border: 'none',
                    cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)'
                  }}
                >
                  <Save size={16} /> {isSavingEdit ? 'Saving...' : 'Save Attendance Time'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
