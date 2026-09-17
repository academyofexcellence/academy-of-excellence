import { supabase } from './supabase';
import { StudentProfile, Course, DailyAttendanceLog } from './types';

export interface LateArrivalRecord {
  date: string;
  dayOfWeek: string;
  checkInTimeFormatted: string;
  delayMinutes: number;
  checkOutTimeFormatted: string;
  pointsAwarded: number;
  notes: string;
}

export interface AbsenceRecord {
  date: string;
  dayOfWeek: string;
  status: 'Full Day Absent' | 'Half Day / Incomplete' | 'Excused Leave';
  notes: string;
}

export interface StudentAttendanceAuditData {
  student: StudentProfile;
  courseName: string;
  batchNumber: number | string;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  presentDays: number;
  onTimeCount: number;
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
  attendanceRate: number;
  punctualityRate: number;
  lateArrivals: LateArrivalRecord[];
  absences: AbsenceRecord[];
  allLogs: Array<{
    date: string;
    dayOfWeek: string;
    checkInTime: string;
    checkOutTime: string;
    status: string;
    points: number;
    notes: string;
  }>;
}

/**
 * Helper to parse IST time details from an ISO string
 */
export const getISTTimeFromISO = (isoString?: string | null): { formatted: string; hours: number; minutes: number; totalMinutes: number } => {
  if (!isoString) {
    return { formatted: '-', hours: 0, minutes: 0, totalMinutes: 0 };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return { formatted: '-', hours: 0, minutes: 0, totalMinutes: 0 };
  }

  const formatted = d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const parts = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const totalMinutes = hours * 60 + minutes;

  return { formatted, hours, minutes, totalMinutes };
};

/**
 * Calculate minutes late past standard cutoff (10:00 AM IST = 600 minutes)
 */
export const calculateDelayMinutes = (isoString?: string | null, cutoffMinutes = 600): number => {
  if (!isoString) return 0;
  const { totalMinutes } = getISTTimeFromISO(isoString);
  if (totalMinutes <= cutoffMinutes) return 0;
  return totalMinutes - cutoffMinutes;
};

/**
 * Fetch and construct complete attendance audit for a student across their entire course or date range
 */
export async function fetchStudentAttendanceAuditData(
  student: StudentProfile,
  course?: Course,
  customStartDate?: string,
  customEndDate?: string
): Promise<StudentAttendanceAuditData> {
  const courseName = course?.name || student.courses?.name || 'Academic Course';
  const batchNum = student.batch_number || 1;

  // 1. Fetch all attendance logs for this student
  let query = supabase
    .from('daily_attendance_logs')
    .select('*')
    .eq('student_id', student.id)
    .order('date', { ascending: true });

  if (customStartDate) query = query.gte('date', customStartDate);
  if (customEndDate) query = query.lte('date', customEndDate);

  const { data: studentLogsRaw, error: studentLogsError } = await query;
  if (studentLogsError) throw studentLogsError;
  const studentLogs: DailyAttendanceLog[] = (studentLogsRaw as DailyAttendanceLog[]) || [];

  // 2. Fetch all distinct active session dates recorded for this batch to detect days the student missed completely
  let batchDatesQuery = supabase
    .from('daily_attendance_logs')
    .select('date')
    .eq('batch_number', batchNum)
    .order('date', { ascending: true });

  if (student.course_id) {
    batchDatesQuery = batchDatesQuery.eq('course_id', student.course_id);
  }
  if (customStartDate) batchDatesQuery = batchDatesQuery.gte('date', customStartDate);
  if (customEndDate) batchDatesQuery = batchDatesQuery.lte('date', customEndDate);

  const { data: batchDatesRaw } = await batchDatesQuery;
  const sessionDatesSet = new Set<string>();

  if (batchDatesRaw) {
    batchDatesRaw.forEach((row: { date: string }) => {
      if (row.date) sessionDatesSet.add(row.date);
    });
  }

  // Also ensure any dates logged for this student are in the session set
  studentLogs.forEach(l => {
    if (l.date) sessionDatesSet.add(l.date);
  });

  const sortedSessionDates = Array.from(sessionDatesSet).sort();

  const startDate = sortedSessionDates[0] || customStartDate || new Date().toISOString().split('T')[0];
  const endDate = sortedSessionDates[sortedSessionDates.length - 1] || customEndDate || new Date().toISOString().split('T')[0];

  // Map student logs by date
  const logsByDate = new Map<string, DailyAttendanceLog>();
  studentLogs.forEach(log => {
    logsByDate.set(log.date, log);
  });

  const lateArrivals: LateArrivalRecord[] = [];
  const absences: AbsenceRecord[] = [];
  const allLogs: StudentAttendanceAuditData['allLogs'] = [];

  let onTimeCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let absentCount = 0;

  sortedSessionDates.forEach(dateStr => {
    const log = logsByDate.get(dateStr);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    const checkInTimeInfo = getISTTimeFromISO(log?.check_in_time);
    const checkOutTimeInfo = getISTTimeFromISO(log?.check_out_time);

    // Determine status
    const hasCheckIn = !!log?.check_in_time;
    const isLate = log?.check_in_status === 'late' || (hasCheckIn && checkInTimeInfo.totalMinutes > 605); // past 10:05 AM
    const isHalfDay = log?.status === 'present_half' || log?.check_out_status === 'early' || (hasCheckIn && !log?.check_out_time);
    const isAbsent = !hasCheckIn || log?.status === 'absent' || (log?.points_awarded === 0 && !hasCheckIn);

    if (isAbsent) {
      absentCount++;
      const note = log?.notes || (log?.status === 'absent' ? 'Marked absent by instructor' : 'No check-in logged on session day');
      absences.push({
        date: dateStr,
        dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
        status: 'Full Day Absent',
        notes: note
      });

      allLogs.push({
        date: dateStr,
        dayOfWeek,
        checkInTime: '-',
        checkOutTime: '-',
        status: 'Absent',
        points: 0,
        notes: note
      });
    } else {
      if (isLate) {
        lateCount++;
        const delay = calculateDelayMinutes(log?.check_in_time, 600);
        lateArrivals.push({
          date: dateStr,
          dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
          checkInTimeFormatted: checkInTimeInfo.formatted,
          delayMinutes: delay > 0 ? delay : 0,
          checkOutTimeFormatted: checkOutTimeInfo.formatted,
          pointsAwarded: log?.points_awarded ?? 5,
          notes: log?.notes || (delay > 0 ? `${delay} minutes delay past 10:00 AM` : 'Late arrival logged')
        });
      } else {
        onTimeCount++;
      }

      if (isHalfDay && !isLate) {
        halfDayCount++;
      }

      let statusLabel = 'On Time (Full)';
      if (isLate && isHalfDay) statusLabel = 'Late & Early Departure';
      else if (isLate) statusLabel = 'Late Check-in';
      else if (isHalfDay) statusLabel = 'Half Day / Incomplete';

      allLogs.push({
        date: dateStr,
        dayOfWeek,
        checkInTime: checkInTimeInfo.formatted,
        checkOutTime: checkOutTimeInfo.formatted,
        status: statusLabel,
        points: log?.points_awarded ?? (isLate ? 5 : 10),
        notes: log?.notes || (isLate ? 'Late arrival' : 'On-time')
      });
    }
  });

  const totalWorkingDays = sortedSessionDates.length;
  const presentDays = onTimeCount + lateCount;
  const attendanceRate = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;
  const punctualityRate = presentDays > 0 ? Math.round((onTimeCount / presentDays) * 100) : 0;

  return {
    student,
    courseName,
    batchNumber: batchNum,
    startDate,
    endDate,
    totalWorkingDays,
    presentDays,
    onTimeCount,
    lateCount,
    halfDayCount,
    absentCount,
    attendanceRate,
    punctualityRate,
    lateArrivals,
    absences,
    allLogs
  };
}

/**
 * Generate and open printable HTML report for a student
 */
export function printStudentAttendanceReport(audit: StudentAttendanceAuditData) {
  const printDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const studentName = audit.student.name;
  const rollNumber = audit.student.roll_number ? `#${audit.student.roll_number}` : 'N/A';

  // Format Late Arrivals Rows
  const lateRowsHtml = audit.lateArrivals.length === 0
    ? `<tr><td colspan="6" style="padding: 14px; text-align: center; color: #16a34a; font-weight: 700; background: #f0fdf4;">🎉 Exemplary Punctuality! Zero late arrivals recorded across this entire course.</td></tr>`
    : audit.lateArrivals.map((rec, idx) => {
        const delayBadge = rec.delayMinutes > 0
          ? `<span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">+${rec.delayMinutes} mins</span>`
          : `<span style="color: #b45309; font-weight: 700;">Late</span>`;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">#${idx + 1}</td>
            <td style="padding: 8px 10px; font-weight: 600;">
              ${new Date(rec.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span style="color: #64748b; font-size: 11px; display: block;">${rec.dayOfWeek}</span>
            </td>
            <td style="padding: 8px 10px; font-weight: 800; color: #b45309; text-align: center;">
              ${rec.checkInTimeFormatted}
            </td>
            <td style="padding: 8px 10px; text-align: center;">
              ${delayBadge}
            </td>
            <td style="padding: 8px 10px; text-align: center; color: #334155;">
              ${rec.checkOutTimeFormatted}
            </td>
            <td style="padding: 8px 10px; color: #475569; font-size: 11px;">
              ${rec.notes}
            </td>
          </tr>
        `;
      }).join('');

  // Format Absences Rows
  const absenceRowsHtml = audit.absences.length === 0
    ? `<tr><td colspan="4" style="padding: 14px; text-align: center; color: #16a34a; font-weight: 700; background: #f0fdf4;">🌟 Perfect Attendance! Zero absentees recorded across this course.</td></tr>`
    : audit.absences.map((rec, idx) => {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">#${idx + 1}</td>
            <td style="padding: 8px 10px; font-weight: 600;">
              ${new Date(rec.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span style="color: #64748b; font-size: 11px; display: block;">${rec.dayOfWeek}</span>
            </td>
            <td style="padding: 8px 10px; font-weight: 800; color: #dc2626; text-align: center;">
              <span style="background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                ${rec.status}
              </span>
            </td>
            <td style="padding: 8px 10px; color: #475569; font-size: 11px;">
              ${rec.notes}
            </td>
          </tr>
        `;
      }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Official Attendance Audit Report - ${studentName} (${audit.courseName})</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 12mm 15mm 12mm;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          background: #ffffff;
          line-height: 1.4;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #c99c33;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .academy-logo {
          height: 64px;
          width: auto;
        }
        .academy-titles h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .academy-titles p {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }
        .report-badge {
          text-align: right;
        }
        .report-badge .doc-title {
          font-size: 14px;
          font-weight: 800;
          color: #c99c33;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }
        .report-badge .date-stamp {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }
        
        /* Student Meta Grid */
        .student-meta {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 14px;
          gap: 10px;
          margin-bottom: 16px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-item .label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .meta-item .val {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }

        /* KPI Cards */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .kpi-card {
          border-radius: 8px;
          padding: 10px 12px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .kpi-card.sessions { background: #f8fafc; border-color: #cbd5e1; }
        .kpi-card.present { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
        .kpi-card.late { background: #fffbeb; border-color: #fde68a; color: #b45309; }
        .kpi-card.absent { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
        .kpi-card.rate { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

        .kpi-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 3px;
        }
        .kpi-val {
          font-size: 20px;
          font-weight: 900;
        }
        .kpi-sub {
          font-size: 10px;
          opacity: 0.85;
          margin-top: 2px;
          display: block;
        }

        /* Sections */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 18px 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 2px solid #e2e8f0;
        }
        .section-header h3 {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .section-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
        }

        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th {
          background: #0f172a;
          color: white;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }
        th.center { text-align: center; }

        /* Remarks & Signatures */
        .signatures-grid {
          margin-top: 36px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          page-break-inside: avoid;
        }
        .sig-box {
          border-top: 1.5px dashed #94a3b8;
          padding-top: 8px;
          text-align: center;
        }
        .sig-box .title {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .sig-box .sub {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }

        .footer-note {
          margin-top: 20px;
          font-size: 10px;
          color: #94a3b8;
          text-align: center;
          border-top: 1px solid #f1f5f9;
          padding-top: 8px;
        }

        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      
      <!-- Top Header -->
      <div class="header-container">
        <div class="logo-wrap">
          <img src="https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg" class="academy-logo" alt="Academy Logo" onerror="this.style.display='none'" />
          <div class="academy-titles">
            <h1>ACADEMY OF EXCELLENCE</h1>
            <p>Official Department of Academic Registry & Student Affairs</p>
          </div>
        </div>
        <div class="report-badge">
          <p class="doc-title">Student Attendance & Punctuality Audit</p>
          <div class="date-stamp">Generated: ${printDateStr}</div>
        </div>
      </div>

      <!-- Student Meta -->
      <div class="student-meta">
        <div class="meta-item">
          <span class="label">Student Name</span>
          <span class="val">${studentName}</span>
        </div>
        <div class="meta-item">
          <span class="label">Roll Number</span>
          <span class="val">${rollNumber}</span>
        </div>
        <div class="meta-item">
          <span class="label">Course & Batch</span>
          <span class="val">${audit.courseName} • Batch ${audit.batchNumber}</span>
        </div>
        <div class="meta-item">
          <span class="label">Audit Range</span>
          <span class="val">${audit.startDate} to ${audit.endDate}</span>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-row">
        <div class="kpi-card sessions">
          <span class="kpi-title">Total Sessions</span>
          <span class="kpi-val" style="color: #0f172a;">${audit.totalWorkingDays}</span>
          <span class="kpi-sub" style="color: #64748b;">Working Days</span>
        </div>

        <div class="kpi-card present">
          <span class="kpi-title">Days Present</span>
          <span class="kpi-val">${audit.presentDays}</span>
          <span class="kpi-sub">${audit.onTimeCount} On-Time | ${audit.lateCount} Late</span>
        </div>

        <div class="kpi-card late">
          <span class="kpi-title">Late Arrivals</span>
          <span class="kpi-val">${audit.lateCount}</span>
          <span class="kpi-sub">Past 10:00 AM Cutoff</span>
        </div>

        <div class="kpi-card absent">
          <span class="kpi-title">Days Absent</span>
          <span class="kpi-val">${audit.absentCount}</span>
          <span class="kpi-sub">${audit.totalWorkingDays > 0 ? Math.round((audit.absentCount / audit.totalWorkingDays) * 100) : 0}% Missed</span>
        </div>

        <div class="kpi-card rate">
          <span class="kpi-title">Attendance Rate</span>
          <span class="kpi-val">${audit.attendanceRate}%</span>
          <span class="kpi-sub">Punctuality: ${audit.punctualityRate}%</span>
        </div>
      </div>

      <!-- SECTION 1: LATE ARRIVAL AUDIT -->
      <div class="section-header">
        <h3>
          <span style="color: #b45309;">⏰</span> Section 1: Detailed Late Arrival History
        </h3>
        <span class="section-badge" style="background: #fef3c7; color: #b45309;">
          Total Late Incidents: ${audit.lateArrivals.length}
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th style="width: 140px;">Date & Day</th>
            <th class="center" style="width: 110px;">Check-In Time</th>
            <th class="center" style="width: 110px;">Delay (Past 10 AM)</th>
            <th class="center" style="width: 110px;">Check-Out Time</th>
            <th>Notes & Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${lateRowsHtml}
        </tbody>
      </table>

      <!-- SECTION 2: ABSENCES RECORD -->
      <div class="section-header" style="margin-top: 24px;">
        <h3>
          <span style="color: #b91c1c;">📅</span> Section 2: Detailed Absence Record
        </h3>
        <span class="section-badge" style="background: #fee2e2; color: #b91c1c;">
          Total Absences: ${audit.absences.length}
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th style="width: 180px;">Date & Day</th>
            <th class="center" style="width: 140px;">Absence Status</th>
            <th>Reason / Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${absenceRowsHtml}
        </tbody>
      </table>

      <!-- Institutional Signatures -->
      <div class="signatures-grid">
        <div class="sig-box">
          <div class="title">Parent / Guardian Signature</div>
          <div class="sub">Acknowledgement of Attendance Record</div>
        </div>

        <div class="sig-box">
          <div class="title">Course Instructor / Tutor</div>
          <div class="sub">Faculty Verification</div>
        </div>

        <div class="sig-box">
          <div class="title">Director of Academic Affairs</div>
          <div class="sub">Official Academy Seal & Signature</div>
        </div>
      </div>

      <div class="footer-note">
        This document is an official computer-generated attendance audit issued by the Academy of Excellence Academic Management System.
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
