import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  TrendingUp, 
  Award,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { StudentProgress } from '../components/student/StudentProgress';
import { StudentLeaderboard } from '../components/student/StudentLeaderboard';
import { StudentAppeals } from '../components/student/StudentAppeals';
import { StudentProfile as StudentProfileView } from '../components/student/StudentProfile';
import { StudentProfile, Interval, LeaderboardEntry, ScoreLog } from '../lib/types';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'progress' | 'leaderboard' | 'appeals' | 'profile'>('progress');
  const [prefillAppeal, setPrefillAppeal] = useState<{
    date: string;
    type: 'attendance' | 'checklist' | 'scoring';
    activity: string;
    currentValue: string;
  } | null>(null);

  // Interval selection for data queries
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<string>('');

  // Dashboard Data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<ScoreLog[]>([]);
  const [weeklyStatus, setWeeklyStatus] = useState<{
    vocab: { [key: string]: boolean };
    sentences: { [key: string]: boolean };
    vlog: boolean;
    videoReaction: boolean;
    hadithulArabia: boolean;
  }>({ vocab: {}, sentences: {}, vlog: false, videoReaction: false, hadithulArabia: false });

  // Counselor/Instructor Remarks
  const [remarks, setRemarks] = useState<{
    strengths: string;
    weaknesses: string;
    career_path: string;
    general_remarks: string;
    mock_interview_mark: number | null;
    mock_interview_remark: string;
    industrial_visit_mark: number | null;
    industrial_visit_remark: string;
  } | null>(null);

  const fetchStudentRemarks = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_remarks')
        .select('strengths, weaknesses, career_path, general_remarks, mock_interview_mark, mock_interview_remark, industrial_visit_mark, industrial_visit_remark')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setRemarks({
          strengths: data.strengths || '',
          weaknesses: data.weaknesses || '',
          career_path: data.career_path || '',
          general_remarks: data.general_remarks || '',
          mock_interview_mark: data.mock_interview_mark,
          mock_interview_remark: data.mock_interview_remark || '',
          industrial_visit_mark: data.industrial_visit_mark,
          industrial_visit_remark: data.industrial_visit_remark || '',
        });
      }
    } catch (err) {
      console.error('Error fetching student remarks:', err);
    }
  };

  const getDatesRange = (startDateStr: string, endDateStr?: string) => {
    const dates: string[] = [];
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return dates;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    const end = endDateStr ? new Date(endDateStr) : new Date();
    end.setHours(0, 0, 0, 0);

    const boundary = end < new Date() ? end : new Date();
    boundary.setHours(0, 0, 0, 0);

    while (current <= boundary) {
      // Mon-Fri only
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates.reverse(); // Show newest first
  };

  const handleOpenAppealForDate = (dateStr: string, type: 'attendance' | 'checklist' | 'scoring', activity?: string, currentVal?: string) => {
    setPrefillAppeal({
      date: dateStr,
      type,
      activity: activity || (type === 'attendance' ? 'Attendance' : type === 'checklist' ? 'Daily Vocab' : ''),
      currentValue: currentVal || (type === 'attendance' ? 'Absent' : type === 'checklist' ? 'Incomplete' : '')
    });
    setActiveTab('appeals');
  };

  const printHtml = (htmlContent: string) => {
    const printDiv = document.createElement('div');
    printDiv.id = 'print-section';
    printDiv.innerHTML = htmlContent;

    const style = document.createElement('style');
    style.id = 'print-style';
    style.innerHTML = `
      @media print {
        body > *:not(#print-section) {
          display: none !important;
        }
        #print-section {
          display: block !important;
          width: 100% !important;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(printDiv);

    window.print();

    const cleanup = () => {
      const el = document.getElementById('print-section');
      if (el) el.remove();
      const st = document.getElementById('print-style');
      if (st) st.remove();
    };

    window.onafterprint = cleanup;
    setTimeout(cleanup, 1000);
  };

  const handlePrintReport = (student: StudentProfile, scores: any[]) => {
    // Format the date
    const printDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Calculate metrics
    const currentIntervalObj = intervals.find(i => i.id === selectedInterval);
    const totalWorkingDays = currentIntervalObj?.total_working_days ?? 20;
    const totalVocab = currentIntervalObj?.total_vocab_tasks ?? 20;
    const totalSentences = currentIntervalObj?.total_sentences_tasks ?? 20;
    const totalVlog = currentIntervalObj?.total_vlog_tasks ?? 4;
    const totalReaction = currentIntervalObj?.total_reaction_tasks ?? 4;
    const totalHadithul = currentIntervalObj?.total_hadithul_tasks ?? 4;

    const attendanceRecords = scores.filter(s => s.score_type === 'attendance');
    const totalAttendance = attendanceRecords.length;
    const onTimeCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('on time')).length;
    const lateCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('late')).length;
    const halfDayCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('half day')).length;
    const absentCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('absent')).length;
    
    const presentDays = onTimeCount + lateCount + (halfDayCount * 0.5);
    const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;

    const vocabCount = scores.filter(s => s.score_type === 'daily_vocab').length;
    const sentencesCount = scores.filter(s => s.score_type === 'daily_sentences').length;
    const vlogCount = scores.filter(s => s.score_type === 'weekly_vlog').length;
    const videoReactionCount = scores.filter(s => s.score_type === 'video_reaction').length;
    const hadithulArabiaCount = scores.filter(s => s.score_type === 'hadithul_arabia').length;

    const talkScores = scores.filter(s => s.score_type === 'custom' && s.activity_name === 'One Minute Talk');
    const talkAvg = talkScores.length > 0 ? (talkScores.reduce((sum, s) => sum + s.points, 0) / talkScores.length).toFixed(1) : 'N/A';

    const examScoresList = scores.filter(s => s.score_type === 'exam');
    const examAvg = examScoresList.length > 0 
      ? Math.round(examScoresList.reduce((sum, s) => sum + (s.points / s.max_points) * 100, 0) / examScoresList.length) 
      : null;

    const penaltyRecords = scores.filter(s => s.score_type === 'penalty');
    const totalPenaltiesCount = penaltyRecords.reduce((sum, r) => sum + Math.round(Math.abs(r.points) / 2), 0);

    // Format Attendance Rows
    const attendanceRows = attendanceRecords.length === 0 
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #888; font-style: italic;">No attendance logged.</td></tr>`
      : attendanceRecords.map(rec => {
          const status = rec.activity_name.replace('Attendance: ', '');
          let statusColor = '#666';
          if (status === 'On Time') statusColor = '#16a34a';
          else if (status === 'Late') statusColor = '#b45309';
          else if (status === 'Half Day') statusColor = '#3b82f6';
          else if (status === 'Absent') statusColor = '#dc2626';
          
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 10px;">${new Date(rec.logged_date).toLocaleDateString()}</td>
              <td style="padding: 8px 10px; font-weight: bold; color: ${statusColor};">${status}</td>
              <td style="padding: 8px 10px; text-align: right;">${rec.points > 0 ? '+' : ''}${rec.points} XP</td>
            </tr>
          `;
        }).join('');

    // Format Work Rows
    const workTypes = ['daily_vocab', 'daily_sentences', 'weekly_vlog', 'video_reaction', 'hadithul_arabia'];
    const workRecords = scores.filter(s => workTypes.includes(s.score_type));
    const workGroupByDate = workRecords.reduce((acc, score) => {
      const d = score.logged_date;
      if (!acc[d]) {
        acc[d] = { daily_vocab: false, daily_sentences: false, weekly_vlog: false, video_reaction: false, hadithul_arabia: false };
      }
      acc[d][score.score_type] = true;
      return acc;
    }, {} as any);
    const workDatesSorted = Object.keys(workGroupByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const workRows = workDatesSorted.length === 0
      ? `<tr><td colspan="6" style="padding: 10px; text-align: center; color: #888; font-style: italic;">No work logged.</td></tr>`
      : workDatesSorted.map(dateStr => {
          const entry = workGroupByDate[dateStr];
          const check = (done: boolean) => done ? `<span style="color: #16a34a; font-weight: bold;">✓</span>` : `<span style="color: #ccc;">-</span>`;
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 10px;">${new Date(dateStr).toLocaleDateString()}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.daily_vocab)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.daily_sentences)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.weekly_vlog)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.video_reaction)}</td>
              <td style="padding: 8px 10px; text-align: center;">${check(entry.hadithul_arabia)}</td>
            </tr>
          `;
        }).join('');

    // Format Grades/Penalties Rows
    const gradeTypes = ['exam', 'penalty', 'custom'];
    const gradeRecords = scores.filter(s => gradeTypes.includes(s.score_type));
    const gradeRows = gradeRecords.length === 0
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #888; font-style: italic;">No grades or penalties logged.</td></tr>`
      : gradeRecords.map(rec => {
          let title = rec.activity_name;
          let score = `${rec.points > 0 ? '+' : ''}${rec.points} XP`;
          let color = rec.points >= 0 ? '#333' : '#dc2626';

          if (rec.score_type === 'exam') {
            const pct = Math.round((rec.points / rec.max_points) * 100);
            title = `📝 Exam: ${rec.activity_name.replace(/^exam:\s*/i, '')}`;
            score = `${rec.points}/${rec.max_points} (${pct}%)`;
            color = '#c99c33';
          } else if (rec.score_type === 'penalty') {
            const count = Math.round(Math.abs(rec.points) / 2);
            title = `⚠️ Malayalam Speaking violation`;
            score = `-${Math.abs(rec.points)} XP (${count} ${count === 1 ? 'penalty' : 'penalties'})`;
            color = '#dc2626';
          } else if (rec.score_type === 'custom' && rec.activity_name === 'One Minute Talk') {
            title = `🎙️ One Minute Talk`;
            score = `${rec.points} / 10`;
          }

          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 10px;">${new Date(rec.logged_date).toLocaleDateString()}</td>
              <td style="padding: 8px 10px; font-weight: 600;">${title}</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: ${color};">${score}</td>
            </tr>
          `;
        }).join('');

    // Remarks content formatting
    const rStrengths = remarks?.strengths || 'No strengths recorded yet.';
    const rWeaknesses = remarks?.weaknesses || 'No improvement areas recorded yet.';
    const rCareerPath = remarks?.career_path || 'No career path recommendations recorded yet.';
    const rGeneral = remarks?.general_remarks || 'No general remarks recorded yet.';
    const rMockInterviewMark = remarks?.mock_interview_mark !== null && remarks?.mock_interview_mark !== undefined ? `${remarks.mock_interview_mark}` : 'N/A';
    const rMockInterviewRemark = remarks?.mock_interview_remark || 'No feedback recorded yet.';
    const rIndustrialVisitMark = remarks?.industrial_visit_mark !== null && remarks?.industrial_visit_mark !== undefined ? `${remarks.industrial_visit_mark}` : 'N/A';
    const rIndustrialVisitRemark = remarks?.industrial_visit_remark || 'No feedback recorded yet.';

    // Construct print template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Academic Report Card - ${student.name}</title>
          <style>
            body {
              font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #c99c33;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title-section h1 {
              margin: 0 0 5px 0;
              font-size: 24px;
              font-weight: 800;
              color: #1e293b;
            }
            .title-section p {
              margin: 0;
              color: #64748b;
              font-size: 14px;
            }
            .academy-info {
              text-align: right;
            }
            .academy-info h2 {
              margin: 0 0 5px 0;
              font-size: 18px;
              font-weight: 800;
              color: #c99c33;
            }
            .academy-info p {
              margin: 0;
              font-size: 12px;
              color: #64748b;
            }
            .student-profile {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px 20px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .profile-item {
              display: flex;
              flex-direction: column;
            }
            .profile-item span.label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 700;
              margin-bottom: 3px;
            }
            .profile-item span.value {
              font-size: 14px;
              font-weight: bold;
              color: #0f172a;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .metric-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              text-align: center;
              background: #ffffff;
            }
            .metric-card span.label {
              display: block;
              font-size: 11px;
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .metric-card span.value {
              display: block;
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
            }
            .section-title {
              font-size: 16px;
              font-weight: 800;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 8px;
              margin: 30px 0 15px 0;
              color: #0f172a;
              page-break-after: avoid;
            }
            .remarks-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .remarks-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              background: #fafafa;
            }
            .remarks-card h4 {
              margin: 0 0 8px 0;
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .remarks-card p {
              margin: 0;
              font-size: 13px;
              line-height: 1.5;
              white-space: pre-wrap;
              color: #334155;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            th {
              background: #f8fafc;
              border-bottom: 2px solid #cbd5e1;
              padding: 8px 10px;
              font-weight: 700;
              text-align: left;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #f1f5f9;
            }
            .checklist-table th {
              text-align: center;
            }
            .checklist-table td {
              text-align: center;
            }
            .page-break {
              page-break-before: always;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-section">
              <h1>ACADEMIC PERFORMANCE REPORT</h1>
              <p>Report Generated on: ${printDate}</p>
            </div>
            <div class="academy-info">
              <h2>ACADEMY OF EXCELLENCE</h2>
              <p>Elegance in Arabic Education</p>
            </div>
          </div>

          <div class="student-profile">
            <div class="profile-item">
              <span class="label">Student Name</span>
              <span class="value">${student.name}</span>
            </div>
            <div class="profile-item">
              <span class="label">Roll Number</span>
              <span class="value">${student.roll_number || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="label">Email Address</span>
              <span class="value">${student.email}</span>
            </div>
            <div class="profile-item">
              <span class="label">Course</span>
              <span class="value">${student.courses?.name || 'N/A'}</span>
            </div>
            <div class="profile-item">
              <span class="label">Batch Number</span>
              <span class="value">Batch ${student.batch_number}</span>
            </div>
            <div class="profile-item">
              <span class="label">Status</span>
              <span class="value" style="text-transform: capitalize;">${student.status}</span>
            </div>
          </div>

          <div class="section-title">Key Academic Statistics</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="label">Attendance Rate</span>
              <span class="value">${attendanceRate}%</span>
              <span class="label" style="font-size: 9px; margin-top: 5px; font-weight: normal; text-transform: none;">
                On Time: ${onTimeCount} | Late: ${lateCount} | Half Day: ${halfDayCount} | Absent: ${absentCount} (Present: ${presentDays} / ${totalWorkingDays} Working Days)
              </span>
            </div>
            <div class="metric-card" style="${totalPenaltiesCount > 0 ? 'border-color: #fca5a5; background: #fffafb;' : ''}">
              <span class="label" style="${totalPenaltiesCount > 0 ? 'color: #b91c1c;' : ''}">Malayalam Penalties</span>
              <span class="value" style="${totalPenaltiesCount > 0 ? 'color: #dc2626;' : ''}">${totalPenaltiesCount}</span>
            </div>
            <div class="metric-card">
              <span class="label">Exam Average</span>
              <span class="value">${examAvg !== null ? `${examAvg}%` : 'N/A'}</span>
            </div>
            <div class="metric-card">
              <span class="label">One Minute Talk</span>
              <span class="value">${talkAvg}${talkAvg !== 'N/A' ? '/10' : ''}</span>
            </div>
          </div>

          <div class="section-title">Checklist Tasks Completed Summary</div>
          <table class="checklist-table">
            <thead>
              <tr>
                <th>Vocabulary Tasks</th>
                <th>Sentences Tasks</th>
                <th>Weekly Vlogs</th>
                <th>Video Reactions</th>
                <th>Hadithul Arabia Attendance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-size: 16px; font-weight: bold;">${vocabCount} / ${totalVocab}</td>
                <td style="font-size: 16px; font-weight: bold;">${sentencesCount} / ${totalSentences}</td>
                <td style="font-size: 16px; font-weight: bold;">${vlogCount} / ${totalVlog}</td>
                <td style="font-size: 16px; font-weight: bold;">${videoReactionCount} / ${totalReaction}</td>
                <td style="font-size: 16px; font-weight: bold;">${hadithulArabiaCount} / ${totalHadithul}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">Instructor Remarks & Counseling</div>
          <div class="remarks-grid">
            <div class="remarks-card" style="border-left: 4px solid #10b981;">
              <h4 style="color: #047857;">💪 Strengths</h4>
              <p>${rStrengths}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #ef4444;">
              <h4 style="color: #b91c1c;">⚠️ Areas for Improvement</h4>
              <p>${rWeaknesses}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #3b82f6;">
              <h4 style="color: #1d4ed8;">🎯 Apt Career Path</h4>
              <p>${rCareerPath}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #c99c33;">
              <h4 style="color: #c99c33;">📝 General Remarks</h4>
              <p>${rGeneral}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #c99c33;">
              <h4 style="color: #c99c33;">👔 Mock Interview (Score: ${rMockInterviewMark})</h4>
              <p>${rMockInterviewRemark}</p>
            </div>
            <div class="remarks-card" style="border-left: 4px solid #c99c33;">
              <h4 style="color: #c99c33;">🚌 Industrial Visit (Score: ${rIndustrialVisitMark})</h4>
              <p>${rIndustrialVisitRemark}</p>
            </div>
          </div>

          <div class="page-break"></div>

          <div class="section-title">Attendance History Logs</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Date</th>
                <th style="width: 40%;">Status</th>
                <th style="width: 20%; text-align: right;">Points Credit</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRows}
            </tbody>
          </table>

          <div class="section-title">Grades & Penalty Audits</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30%;">Date</th>
                <th style="width: 50%;">Activity Description / Speaking Violation</th>
                <th style="width: 20%; text-align: right;">Result</th>
              </tr>
            </thead>
            <tbody>
              ${gradeRows}
            </tbody>
          </table>

          <div class="section-title">Daily Task Submission Timeline</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vocab</th>
                <th>Sentences</th>
                <th>Vlog</th>
                <th>Reaction</th>
                <th>Hadithul A.</th>
              </tr>
            </thead>
            <tbody>
              ${workRows}
            </tbody>
          </table>

          <div class="footer">
            <span>Academy of Excellence • Academic Performance Report</span>
            <span>Page 2 of 2</span>
          </div>
        </body>
      </html>
    `;

    printHtml(htmlContent);
  };

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
      return;
    }

    try {
      const { data: student, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          courses:course_id (name)
        `)
        .eq('id', session.user.id)
        .single();

      if (error || !student) {
        throw new Error('Student profile not found.');
      }

      if (student.status !== 'active' && student.status !== 'alumni') {
        await supabase.auth.signOut();
        navigate('/admin');
        return;
      }

      setCurrentStudent(student);
      if (student.status === 'alumni') {
        setActiveTab('profile');
      }
      
      // Load student data
      await fetchIntervalsAndData(student.course_id, student.batch_number, student.id);

      // Load counseling remarks
      await fetchStudentRemarks(student.id);
    } catch (err) {
      console.error(err);
      await supabase.auth.signOut();
      navigate('/admin');
    }
  };

  const fetchIntervalsAndData = async (courseId: string, batchNumber: number, studentId: string) => {
    try {
      // 1. Fetch scoring intervals for this course and batch
      const { data: intervalsData } = await supabase
        .from('scoring_intervals')
        .select('*')
        .eq('course_id', courseId)
        .eq('batch_number', batchNumber)
        .order('created_at', { ascending: false });

      if (intervalsData && intervalsData.length > 0) {
        setIntervals(intervalsData);
        // Default to active interval
        const active = intervalsData.find(i => i.is_active);
        const defaultIntervalId = active ? active.id : intervalsData[0].id;
        setSelectedInterval(defaultIntervalId);
        
        // Load Leaderboard for default interval
        fetchLeaderboard(defaultIntervalId, courseId, batchNumber);
        // Load Logs for default interval
        fetchLogsAndWeeklyCheckins(studentId, defaultIntervalId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (intervalId: string, courseId: string, batchNumber: number) => {
    try {
      // Fetch all students in batch
      const { data: students } = await supabase
        .from('student_profiles')
        .select('id, name')
        .eq('course_id', courseId)
        .eq('batch_number', batchNumber)
        .eq('status', 'active');

      if (!students) return;

      // Fetch all scores for this interval (or query all intervals if cumulative)
      let scoresData: any[] = [];
      if (intervalId === 'cumulative') {
        const { data: intervals } = await supabase
          .from('scoring_intervals')
          .select('id')
          .eq('course_id', courseId)
          .eq('batch_number', batchNumber);
        
        const intervalIds = intervals?.map(i => i.id) || [];
        if (intervalIds.length > 0) {
          const { data: scores } = await supabase
            .from('scores')
            .select('student_id, points')
            .in('interval_id', intervalIds)
            .limit(20000);
          if (scores) scoresData = scores;
        }
      } else {
        const { data: scores } = await supabase
          .from('scores')
          .select('student_id, points')
          .eq('interval_id', intervalId)
          .limit(20000);
        if (scores) scoresData = scores;
      }

      const scoreMap: { [key: string]: number } = {};
      students.forEach(s => { scoreMap[s.id] = 0; });

      if (scoresData.length > 0) {
        scoresData.forEach(s => {
          if (scoreMap[s.student_id] !== undefined) {
            scoreMap[s.student_id] += s.points;
          }
        });
      }

      // Format & Rank entries
      const entries: LeaderboardEntry[] = students.map(s => {
        const total = scoreMap[s.id];
        const computedLevel = Math.max(1, Math.floor(total / 100) + 1);
        return {
          student_id: s.id,
          name: s.name,
          total_score: total,
          level: computedLevel,
          rank: 0 // Will assign below
        };
      });

      // Sort by score desc
      entries.sort((a, b) => b.total_score - a.total_score);

      // Assign ranks (handle ties)
      let currentRank = 1;
      for (let i = 0; i < entries.length; i++) {
        if (i > 0 && entries[i].total_score < entries[i - 1].total_score) {
          currentRank += 1;
        }
        entries[i].rank = currentRank;
      }

      setLeaderboard(entries);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogsAndWeeklyCheckins = async (studentId: string, intervalId: string) => {
    try {
      const { data: logs } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (logs) {
        if (intervalId === 'cumulative') {
          setRecentLogs(logs);
        } else {
          setRecentLogs(logs.filter(log => log.interval_id === intervalId));
        }

        // Calculate weekly status
        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayDiff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.setDate(mondayDiff));
        monday.setHours(0, 0, 0, 0);

        const weekDates: string[] = [];
        for (let i = 0; i < 5; i++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          weekDates.push(date.toISOString().split('T')[0]);
        }

        const vocabMap: { [key: string]: boolean } = {};
        const sentenceMap: { [key: string]: boolean } = {};
        let hasVlog = false;
        let hasVideoReaction = false;
        let hasHadithulArabia = false;

        weekDates.forEach(d => {
          vocabMap[d] = false;
          sentenceMap[d] = false;
        });

        logs.forEach(log => {
          const logDateStr = log.logged_date;
          if (weekDates.includes(logDateStr)) {
            if (log.score_type === 'daily_vocab') vocabMap[logDateStr] = true;
            if (log.score_type === 'daily_sentences') sentenceMap[logDateStr] = true;
          }
          const logDateObj = new Date(log.logged_date);
          if (log.score_type === 'weekly_vlog' && logDateObj >= monday) {
            hasVlog = true;
          }
          if (log.score_type === 'video_reaction' && logDateObj >= monday) {
            hasVideoReaction = true;
          }
          if (log.score_type === 'hadithul_arabia' && logDateObj >= monday) {
            hasHadithulArabia = true;
          }
        });

        setWeeklyStatus({
          vocab: vocabMap,
          sentences: sentenceMap,
          vlog: hasVlog,
          videoReaction: hasVideoReaction,
          hadithulArabia: hasHadithulArabia
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIntervalChange = (intervalId: string) => {
    setSelectedInterval(intervalId);
    if (currentStudent) {
      fetchLeaderboard(intervalId, currentStudent.course_id, currentStudent.batch_number);
      fetchLogsAndWeeklyCheckins(currentStudent.id, intervalId);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  if (loading || !currentStudent) {
    return <div style={{ paddingTop: '150px', textAlign: 'center', fontFamily: 'inherit', color: 'var(--text-muted)', fontWeight: 600 }}>Loading Student Scoreboard...</div>;
  }

  // Get current student ranking statistics
  const selfEntry = leaderboard.find(e => e.student_id === currentStudent.id);
  const myRank = selfEntry ? selfEntry.rank : 0;
  const myScore = selfEntry ? selfEntry.total_score : 0;
  const myLevel = selfEntry ? selfEntry.level : 1;

  // XP level calculations
  const xpInCurrentLevel = myScore % 100;
  const levelProgressPercent = Math.min(100, Math.max(0, xpInCurrentLevel));

  // Badge Ring styling
  const getBadgeStyle = (rank: number) => {
    if (rank === 1) return { text: '🥇 Gold Roster', border: 'linear-gradient(135deg, #fbbf24, #d97706)', shadow: 'rgba(251, 191, 36, 0.4)' };
    if (rank >= 2 && rank <= 3) return { text: '🥈 Silver Roster', border: 'linear-gradient(135deg, #cbd5e1, #64748b)', shadow: 'rgba(148, 163, 184, 0.4)' };
    if (rank >= 4 && rank <= 10) return { text: '🥉 Bronze Roster', border: 'linear-gradient(135deg, #b45309, #78350f)', shadow: 'rgba(180, 83, 9, 0.3)' };
    return { text: '🎓 Active Learner', border: 'linear-gradient(135deg, var(--primary-light), var(--primary))', shadow: 'rgba(201,156,51,0.2)' };
  };

  const myBadge = getBadgeStyle(myRank);

  // Performance Report Calculations
  const currentIntervalObj = intervals.find(i => i.id === selectedInterval);
  const totalWorkingDays = currentIntervalObj?.total_working_days ?? 20;
  const totalVocab = currentIntervalObj?.total_vocab_tasks ?? 20;
  const totalSentences = currentIntervalObj?.total_sentences_tasks ?? 20;
  const totalVlog = currentIntervalObj?.total_vlog_tasks ?? 4;
  const totalReaction = currentIntervalObj?.total_reaction_tasks ?? 4;
  const totalHadithul = currentIntervalObj?.total_hadithul_tasks ?? 4;

  const attendanceLogs = recentLogs.filter(log => log.score_type === 'attendance');
  const totalAttendance = attendanceLogs.length;
  const onTimeCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('on time')).length;
  const lateCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('late')).length;
  const halfDayCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('half day')).length;
  const absentCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('absent')).length;
  
  const presentDays = onTimeCount + lateCount + (halfDayCount * 0.5);
  const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;

  const vocabCount = recentLogs.filter(log => log.score_type === 'daily_vocab').length;
  const sentencesCount = recentLogs.filter(log => log.score_type === 'daily_sentences').length;
  const vlogCount = recentLogs.filter(log => log.score_type === 'weekly_vlog').length;
  const videoReactionCount = recentLogs.filter(log => log.score_type === 'video_reaction').length;
  const hadithulArabiaCount = recentLogs.filter(log => log.score_type === 'hadithul_arabia').length;

  const talkLogs = recentLogs.filter(log => log.score_type === 'custom' && log.activity_name === 'One Minute Talk');
  const talkAvg = talkLogs.length > 0 ? parseFloat((talkLogs.reduce((sum, log) => sum + log.points, 0) / talkLogs.length).toFixed(1)) : 'N/A';

  const examLogs = recentLogs.filter(log => log.score_type === 'exam');
  const examAvg = examLogs.length > 0 
    ? Math.round(examLogs.reduce((sum, log) => sum + (log.points / log.max_points) * 100, 0) / examLogs.length)
    : null;

  const penaltyLogs = recentLogs.filter(log => log.score_type === 'penalty');
  const totalPenaltiesCount = penaltyLogs.reduce((sum, log) => sum + Math.round(Math.abs(log.points) / 2), 0);

  return (
    <div style={{ paddingTop: '90px', paddingBottom: '80px', minHeight: '100vh', background: 'var(--bg-light)' }} className="bg-grid-pattern">
      <div className="container" style={{ maxWidth: '1080px' }}>
        
        {/* Style block for gaming and layout classes */}
        <style>{`
          .student-dash-grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 1.5rem;
            align-items: start;
            margin-top: 1.5rem;
          }
          .leaderboard-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .rank-card {
            display: flex;
            align-items: center;
            padding: 1rem 1.2rem;
            background: white;
            border-radius: 16px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.01);
            gap: 1rem;
            position: relative;
            overflow: hidden;
            transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
          }
          .rank-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(201, 156, 51, 0.08);
            border-color: rgba(201, 156, 51, 0.25);
          }
          .rank-card-self {
            border: 2px solid var(--primary) !important;
            background: rgba(201, 156, 51, 0.04) !important;
            box-shadow: 0 8px 20px rgba(201, 156, 51, 0.15) !important;
          }
          .rank-badge {
            padding: 0.35rem 0.75rem;
            border-radius: 50px;
            font-weight: 800;
            font-size: 0.75rem;
            min-width: 52px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
          }
          .avatar-bubble {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.9rem;
            box-shadow: 0 3px 8px rgba(0,0,0,0.05);
          }
          .xp-badge {
            font-weight: 850;
            font-size: 1.15rem;
            line-height: 1;
          }
          .xp-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 0.15rem;
          }
          .logs-scroll-container {
            max-height: 380px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding-right: 0.25rem;
          }
          .remarks-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.2rem;
            margin-top: 1.2rem;
          }
          .remarks-card {
            padding: 1.2rem;
            border-radius: 12px;
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.01);
          }
          .remarks-title {
            font-size: 0.9rem;
            font-weight: 750;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .remarks-content {
            font-size: 0.85rem;
            color: var(--text-main);
            line-height: 1.5;
            white-space: pre-wrap;
          }
          .remarks-empty {
            font-style: italic;
            color: var(--text-muted);
          }
          .desktop-nav {
            display: flex;
          }
          .mobile-bottom-nav {
            display: none;
          }
          .nav-tab-btn {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.85rem;
            color: var(--text-muted);
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .nav-tab-btn:hover {
            color: var(--primary-dark);
            background: rgba(201, 156, 51, 0.05);
          }
          .nav-tab-btn.active {
            color: var(--primary-dark);
            background: rgba(201, 156, 51, 0.12);
          }
          @media (max-width: 991px) {
            .student-dash-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 768px) {
            .desktop-nav {
              display: none !important;
            }
            .mobile-bottom-nav {
              display: flex !important;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 64px;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(12px);
              border-top: 1px solid rgba(0, 0, 0, 0.08);
              z-index: 100;
              align-items: center;
              justify-content: space-around;
              padding-bottom: env(safe-area-inset-bottom);
            }
            .mobile-nav-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 0.2rem;
              color: var(--text-muted);
              font-size: 0.7rem;
              font-weight: 700;
              background: transparent;
              border: none;
              cursor: pointer;
              flex: 1;
            }
            .mobile-nav-item.active {
              color: var(--primary-dark);
            }
            .remarks-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 480px) {
            .rank-card {
              padding: 0.8rem 1rem;
              gap: 0.75rem;
            }
            .avatar-bubble {
              width: 36px;
              height: 36px;
              font-size: 0.8rem;
            }
            .xp-badge {
              font-size: 1rem;
            }
          }
        `}</style>

        {/* Global top bar */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <GraduationCap className="text-primary" size={26} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>Academy of Excellence</span>
          </div>
          
          {/* Desktop Tab Selector */}
          <div className="desktop-nav" style={{ gap: '0.4rem', alignItems: 'center' }}>
            {currentStudent.status === 'alumni' ? (
              <>
                <button 
                  onClick={() => setActiveTab('profile')} 
                  className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                >
                  Placement Profile
                </button>
                <button 
                  onClick={() => setActiveTab('progress')} 
                  className={`nav-tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                >
                  Academic Archive
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setActiveTab('progress')} 
                  className={`nav-tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                >
                  Progress
                </button>
                <button 
                  onClick={() => setActiveTab('leaderboard')} 
                  className={`nav-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                >
                  Leaderboard
                </button>
                <button 
                  onClick={() => setActiveTab('appeals')} 
                  className={`nav-tab-btn ${activeTab === 'appeals' ? 'active' : ''}`}
                >
                  Appeals
                </button>
                <button 
                  onClick={() => setActiveTab('profile')} 
                  className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                >
                  Profile
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span className="desktop-nav" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {currentStudent.name}
            </span>
            <button 
              onClick={handleLogout} 
              className="btn btn-outline" 
              style={{ 
                padding: '0.35rem 0.75rem', 
                fontSize: '0.75rem', 
                color: '#dc2626', 
                borderColor: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer'
              }}
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>

        {/* Alumni Global Welcome Banner */}
        {currentStudent.status === 'alumni' && (
          <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 15px 35px rgba(201, 156, 51, 0.1)', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div className="hero-blob" style={{ width: '300px', height: '300px', top: '-50px', right: '-50px', background: 'radial-gradient(circle, rgba(201,156,51,0.15) 0%, rgba(253,251,247,0) 70%)' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
              <div style={{ flex: '1 1 500px' }}>
                <span className="badge" style={{ background: 'rgba(201,156,51,0.15)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  {currentStudent.courses?.name} • Batch {currentStudent.batch_number} {currentStudent.roll_number && `• Roll #${currentStudent.roll_number}`}
                </span>
                <h1 className="heading-xl" style={{ margin: '0.5rem 0 0.3rem 0', fontSize: '2rem', lineHeight: '1.1' }}>
                  Hello, <span className="text-gradient">{currentStudent.name}</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Email: <strong>{currentStudent.email}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '140px', gap: '0.4rem' }}>
                <div 
                  style={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    background: 'white', border: '5px solid var(--primary)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(201, 156, 51, 0.15)', position: 'relative'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                  <GraduationCap size={32} style={{ color: 'var(--primary)', marginTop: '0.2rem' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-dark)', textAlign: 'center' }}>Academy Alumnus</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === 'progress' && (
          <div>
            {/* Welcome & Gamified Badge Banner (specific to progress tab) */}
            {currentStudent.status !== 'alumni' && (
              <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 15px 35px rgba(201, 156, 51, 0.1)', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div className="hero-blob" style={{ width: '300px', height: '300px', top: '-50px', right: '-50px', background: 'radial-gradient(circle, rgba(201,156,51,0.15) 0%, rgba(253,251,247,0) 70%)' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
                  <div style={{ flex: '1 1 500px' }}>
                    <span className="badge" style={{ background: 'rgba(201,156,51,0.15)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {currentStudent.courses?.name} • Batch {currentStudent.batch_number}
                    </span>
                    <h1 className="heading-xl" style={{ margin: '0.5rem 0 0.8rem 0', fontSize: '2rem', lineHeight: '1.1' }}>
                      Hello, <span className="text-gradient">{currentStudent.name}</span>
                    </h1>
                    
                    <div style={{ marginTop: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <span>Level {myLevel} Scholar</span>
                        <span style={{ color: 'var(--text-muted)' }}>{xpInCurrentLevel}/100 XP to Level {myLevel + 1}</span>
                      </div>
                      <div style={{ height: '10px', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${levelProgressPercent}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)', borderRadius: '10px', transition: 'width 0.5s ease-out' }}></div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '140px', gap: '0.4rem' }}>
                    <div 
                      style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'white', border: '5px solid',
                        borderImageSource: myBadge.border, borderImageSlice: 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 8px 20px ${myBadge.shadow}`, position: 'relative',
                        borderStyle: 'solid'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Rank</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1' }}>#{myRank || '-'}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', textAlign: 'center' }}>{myBadge.text}</span>
                  </div>
                </div>
              </div>
            )}

            <StudentProgress
              currentStudent={currentStudent}
              recentLogs={recentLogs}
              weeklyStatus={weeklyStatus}
              remarks={remarks}
              intervals={intervals}
              selectedInterval={selectedInterval}
              handleIntervalChange={handleIntervalChange}
              attendanceRate={attendanceRate}
              onTimeCount={onTimeCount}
              lateCount={lateCount}
              halfDayCount={halfDayCount}
              absentCount={absentCount}
              presentDays={presentDays}
              totalWorkingDays={totalWorkingDays}
              totalPenaltiesCount={totalPenaltiesCount}
              examAvg={examAvg}
              examLogs={examLogs}
              talkAvg={talkAvg}
              vocabCount={vocabCount}
              totalVocab={totalVocab}
              sentencesCount={sentencesCount}
              totalSentences={totalSentences}
              vlogCount={vlogCount}
              totalVlog={totalVlog}
              videoReactionCount={videoReactionCount}
              totalReaction={totalReaction}
              hadithulArabiaCount={hadithulArabiaCount}
              totalHadithul={totalHadithul}
              handleOpenAppealForDate={handleOpenAppealForDate}
              handlePrintReport={handlePrintReport}
              getDatesRange={getDatesRange}
            />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <StudentLeaderboard
            currentStudent={currentStudent}
            leaderboard={leaderboard}
            intervals={intervals}
            selectedInterval={selectedInterval}
            handleIntervalChange={handleIntervalChange}
          />
        )}

        {activeTab === 'appeals' && currentStudent.status !== 'alumni' && (
          <StudentAppeals
            studentId={currentStudent.id}
            studentName={currentStudent.name}
            prefillData={prefillAppeal}
            onClearPrefill={() => setPrefillAppeal(null)}
          />
        )}

        {activeTab === 'profile' && (
          <StudentProfileView
            currentStudent={currentStudent}
            onProfileUpdate={(updatedStudent) => {
              setCurrentStudent(updatedStudent);
            }}
          />
        )}

        {/* Mobile Fixed Bottom Navigation Bar */}
        <div className="mobile-bottom-nav">
          {currentStudent.status === 'alumni' ? (
            <>
              <button 
                onClick={() => setActiveTab('profile')} 
                className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              >
                <GraduationCap size={22} />
                <span>Placement Profile</span>
              </button>
              <button 
                onClick={() => setActiveTab('progress')} 
                className={`mobile-nav-item ${activeTab === 'progress' ? 'active' : ''}`}
              >
                <TrendingUp size={22} />
                <span>Academic Archive</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('progress')} 
                className={`mobile-nav-item ${activeTab === 'progress' ? 'active' : ''}`}
              >
                <TrendingUp size={22} />
                <span>Progress</span>
              </button>
              <button 
                onClick={() => setActiveTab('leaderboard')} 
                className={`mobile-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
              >
                <Award size={22} />
                <span>Leaderboard</span>
              </button>
              <button 
                onClick={() => setActiveTab('appeals')} 
                className={`mobile-nav-item ${activeTab === 'appeals' ? 'active' : ''}`}
              >
                <HelpCircle size={22} />
                <span>Appeals</span>
              </button>
              <button 
                onClick={() => setActiveTab('profile')} 
                className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              >
                <GraduationCap size={22} />
                <span>Profile</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
