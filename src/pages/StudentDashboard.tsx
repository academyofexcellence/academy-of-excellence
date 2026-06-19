import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Calendar, 
  TrendingUp, 
  Clock, 
  BookOpen,
  MessageSquare,
  Video,
  Award,
  FileText,
  Volume2,
  AlertTriangle,
  Globe,
  Sparkles,
  Compass,
  Printer
} from 'lucide-react';

interface StudentProfile {
  id: string;
  email: string;
  name: string;
  course_id: string;
  batch_number: number;
  roll_number?: string;
  status: 'pending' | 'active' | 'inactive';
  courses?: {
    name: string;
  };
}

interface LeaderboardEntry {
  student_id: string;
  name: string;
  total_score: number;
  rank: number;
  level: number;
}

interface ScoreLog {
  id: string;
  activity_name: string;
  score_type: 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia' | 'exam' | 'penalty' | 'custom' | 'attendance';
  points: number;
  max_points: number;
  logged_date: string;
  created_at: string;
}

interface Interval {
  id: string;
  name: string;
  is_active: boolean;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);

  // Interval selection for leaderboard
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
  } | null>(null);

  const fetchStudentRemarks = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_remarks')
        .select('strengths, weaknesses, career_path, general_remarks')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setRemarks({
          strengths: data.strengths || '',
          weaknesses: data.weaknesses || '',
          career_path: data.career_path || '',
          general_remarks: data.general_remarks || '',
        });
      }
    } catch (err) {
      console.error('Error fetching student remarks:', err);
    }
  };

  const handlePrintReport = (student: StudentProfile, scores: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report.');
      return;
    }
    
    // Format the date
    const printDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Calculate metrics
    const attendanceRecords = scores.filter(s => s.score_type === 'attendance');
    const totalAttendance = attendanceRecords.length;
    const onTimeCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('on time')).length;
    const lateCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('late')).length;
    const halfDayCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('half day')).length;
    const absentCount = attendanceRecords.filter(s => s.activity_name.toLowerCase().includes('absent')).length;
    const attendanceRate = totalAttendance > 0 ? Math.round((onTimeCount / totalAttendance) * 100) : 0;

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

    // Construct print template
    printWindow.document.write(`
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
                On Time: ${onTimeCount} | Late: ${lateCount} | Half Day: ${halfDayCount} | Absent: ${absentCount}
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
                <td style="font-size: 16px; font-weight: bold;">${vocabCount}</td>
                <td style="font-size: 16px; font-weight: bold;">${sentencesCount}</td>
                <td style="font-size: 16px; font-weight: bold;">${vlogCount}</td>
                <td style="font-size: 16px; font-weight: bold;">${videoReactionCount}</td>
                <td style="font-size: 16px; font-weight: bold;">${hadithulArabiaCount}</td>
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
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Allow styles to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
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

      if (student.status !== 'active') {
        await supabase.auth.signOut();
        navigate('/admin');
        return;
      }

      setCurrentStudent(student);
      
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

      // Fetch all scores for this interval
      const { data: scores } = await supabase
        .from('scores')
        .select('student_id, points')
        .eq('interval_id', intervalId);

      const scoreMap: { [key: string]: number } = {};
      students.forEach(s => { scoreMap[s.id] = 0; });

      if (scores) {
        scores.forEach(s => {
          if (scoreMap[s.student_id] !== undefined) {
            scoreMap[s.student_id] += s.points;
          }
        });
      }

      // Format & Rank entries
      const entries: LeaderboardEntry[] = students.map(s => {
        const total = scoreMap[s.id];
        // Gamified level: 1 level per 100 points, starting at Level 1 (caps at Level 100)
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
      // Fetch recent score adjustments for this student (all intervals, to align with UNIQUE constraint and weekly checklist)
      const { data: logs } = await supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (logs) {
        // Show only the selected interval's audit logs in history
        setRecentLogs(logs.filter(log => log.interval_id === intervalId));

        // Calculate weekly status (Mon-Fri checkins + weekly vlog)
        // Get start of current week (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
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
          // Vlog is checked weekly, check if any vlog is logged in current week (last 7 days)
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

  // XP level calculations (assuming 100 XP per level)
  const xpInCurrentLevel = myScore % 100;
  const levelProgressPercent = Math.min(100, Math.max(0, xpInCurrentLevel));

  // Determine Badge Ring styling based on Rank
  const getBadgeStyle = (rank: number) => {
    if (rank === 1) return { text: '🥇 Gold Roster', border: 'linear-gradient(135deg, #fbbf24, #d97706)', shadow: 'rgba(251, 191, 36, 0.4)' };
    if (rank >= 2 && rank <= 3) return { text: '🥈 Silver Roster', border: 'linear-gradient(135deg, #cbd5e1, #64748b)', shadow: 'rgba(148, 163, 184, 0.4)' };
    if (rank >= 4 && rank <= 10) return { text: '🥉 Bronze Roster', border: 'linear-gradient(135deg, #b45309, #78350f)', shadow: 'rgba(180, 83, 9, 0.3)' };
    return { text: '🎓 Active Learner', border: 'linear-gradient(135deg, var(--primary-light), var(--primary))', shadow: 'rgba(201,156,51,0.2)' };
  };

  const myBadge = getBadgeStyle(myRank);

  // Performance Report Calculations
  const attendanceLogs = recentLogs.filter(log => log.score_type === 'attendance');
  const totalAttendance = attendanceLogs.length;
  const onTimeCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('on time')).length;
  const lateCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('late')).length;
  const halfDayCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('half day')).length;
  const absentCount = attendanceLogs.filter(log => log.activity_name.toLowerCase().includes('absent')).length;
  const attendanceRate = totalAttendance > 0 ? Math.round((onTimeCount / totalAttendance) * 100) : 0;

  const vocabCount = recentLogs.filter(log => log.score_type === 'daily_vocab').length;
  const sentencesCount = recentLogs.filter(log => log.score_type === 'daily_sentences').length;
  const vlogCount = recentLogs.filter(log => log.score_type === 'weekly_vlog').length;
  const videoReactionCount = recentLogs.filter(log => log.score_type === 'video_reaction').length;
  const hadithulArabiaCount = recentLogs.filter(log => log.score_type === 'hadithul_arabia').length;

  const talkLogs = recentLogs.filter(log => log.score_type === 'custom' && log.activity_name === 'One Minute Talk');
  const talkAvg = talkLogs.length > 0 ? (talkLogs.reduce((sum, log) => sum + log.points, 0) / talkLogs.length).toFixed(1) : 'N/A';

  const examLogs = recentLogs.filter(log => log.score_type === 'exam');
  const examAvg = examLogs.length > 0 
    ? Math.round(examLogs.reduce((sum, log) => sum + (log.points / log.max_points) * 100, 0) / examLogs.length)
    : null;

  const penaltyLogs = recentLogs.filter(log => log.score_type === 'penalty');
  const totalPenaltiesCount = penaltyLogs.reduce((sum, log) => sum + Math.round(Math.abs(log.points) / 2), 0);

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '60px', minHeight: '100vh', background: 'var(--bg-light)' }} className="bg-grid-pattern">
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
          @media (max-width: 991px) {
            .student-dash-grid {
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
          @media (max-width: 768px) {
            .remarks-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        {/* Welcome & Gamified Badge Banner */}
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 15px 35px rgba(201, 156, 51, 0.1)', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-blob" style={{ width: '300px', height: '300px', top: '-50px', right: '-50px', background: 'radial-gradient(circle, rgba(201,156,51,0.15) 0%, rgba(253,251,247,0) 70%)' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', position: 'relative', zIndex: 10 }}>
            <div style={{ flex: '1 1 500px' }}>
              <span className="badge" style={{ background: 'rgba(201,156,51,0.15)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {currentStudent.courses?.name} • Batch {currentStudent.batch_number}
              </span>
              <h1 className="heading-xl" style={{ margin: '0.5rem 0 0.8rem 0', fontSize: '2.2rem', lineHeight: '1.1' }}>
                Hello, <span className="text-gradient">{currentStudent.name}</span>
              </h1>
              
              {/* Gamified Level & XP bar */}
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <span>Level {myLevel} Scholar</span>
                  <span style={{ color: 'var(--text-muted)' }}>{xpInCurrentLevel}/100 XP to Level {myLevel + 1}</span>
                </div>
                <div style={{ height: '12px', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${levelProgressPercent}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)', borderRadius: '10px', transition: 'width 0.5s ease-out' }}></div>
                </div>
              </div>
            </div>

            {/* Profile Rank Ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '160px' }}>
              <div 
                style={{
                  width: '110px', height: '110px', borderRadius: '50%',
                  background: 'white', border: '6px solid',
                  borderImageSource: myBadge.border, borderImageSlice: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 10px 25px ${myBadge.shadow}`, position: 'relative', marginBottom: '0.8rem',
                  borderStyle: 'solid'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Rank</span>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1' }}>#{myRank || '-'}</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{myBadge.text}</span>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', zIndex: 10 }}>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}>
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>

        {/* --- TWO-COLUMN GAMIFIED LAYOUT (SCOREBOARD IS MAIN FOCUS) --- */}
        <div className="student-dash-grid">
          
          {/* COLUMN 1: Live Leaderboard (Left Side - Large Focus Card) */}
          <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem', width: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201,156,51,0.12)', paddingBottom: '1rem', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} className="text-primary" /> Batch Leaderboard
              </h2>
              
              {/* Period Select Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period:</label>
                <select
                  value={selectedInterval}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(201,156,51,0.3)', outline: 'none', background: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {intervals.map(int => (
                    <option key={int.id} value={int.id}>
                      {int.name} {int.is_active ? '(Active)' : '(Archived)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No student rankings logged for this period.
                </div>
              ) : (
                leaderboard.map(entry => {
                  const isSelf = entry.student_id === currentStudent.id;
                  // Calculate relative percent to top score
                  const topScore = leaderboard[0]?.total_score || 100;
                  const relativePercent = topScore > 0 ? Math.min(100, Math.max(0, (entry.total_score / topScore) * 100)) : 0;
                  
                  // Get Rank styling
                  const getRankBadge = (rank: number) => {
                    if (rank === 1) return { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '👑 1st', color: 'white' };
                    if (rank === 2) return { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', text: '🥈 2nd', color: '#1e293b' };
                    if (rank === 3) return { bg: 'linear-gradient(135deg, #ffedd5, #b45309)', text: '🥉 3rd', color: '#78350f' };
                    return { bg: '#f1f5f9', text: `#${rank}`, color: '#64748b' };
                  };
                  
                  const rankBadge = getRankBadge(entry.rank);
                  const initials = entry.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?';

                  // Dynamic Avatar Gradient
                  const getAvatarGradient = (id: string, isMe: boolean) => {
                    if (isMe) return 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
                    const colors = [
                      'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
                      'linear-gradient(135deg, #10b981, #047857)', // Green
                      'linear-gradient(135deg, #8b5cf6, #5b21b6)', // Purple
                      'linear-gradient(135deg, #ec4899, #be185d)', // Pink
                      'linear-gradient(135deg, #f97316, #c2410c)'  // Orange
                    ];
                    // Simple hash based on student_id to choose consistent color
                    const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                    return colors[charCodeSum % colors.length];
                  };

                  return (
                    <div 
                      key={entry.student_id}
                      className={`rank-card ${isSelf ? 'rank-card-self' : ''}`}
                    >
                      {/* Rank Pill */}
                      <div 
                        className="rank-badge"
                        style={{
                          background: rankBadge.bg,
                          color: rankBadge.color,
                        }}
                      >
                        {rankBadge.text}
                      </div>

                      {/* Avatar Bubble */}
                      <div 
                        className="avatar-bubble"
                        style={{
                          background: getAvatarGradient(entry.student_id, isSelf)
                        }}
                      >
                        {initials}
                      </div>

                      {/* Name & Gamified Level progress bar */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 750, fontSize: '0.95rem', color: isSelf ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                            {entry.name}
                          </span>
                          {isSelf && (
                            <span style={{ background: 'var(--primary-dark)', color: 'white', fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                              You
                            </span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.7rem', background: isSelf ? 'rgba(201,156,51,0.2)' : 'rgba(0,0,0,0.06)', color: isSelf ? 'var(--primary-dark)' : 'var(--text-muted)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                            Lvl {entry.level}
                          </span>
                          <div style={{ height: '6px', flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden', maxWidth: '200px' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${relativePercent}%`, 
                                background: isSelf ? 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)' : 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)', 
                                borderRadius: '10px' 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Total points XP */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '45px' }}>
                        <span className="xp-badge" style={{ color: isSelf ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                          {entry.total_score}
                        </span>
                        <span className="xp-label">
                          XP
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: Sidebar (Checklists & Logs - Right Side) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            
            {/* 1. Weekly checklist */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                <Calendar size={18} className="text-primary" /> Weekly Checklist
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>Mon-Fri WhatsApp & Weekly Vlog tasks checkoffs.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                
                {/* Vocab row */}
                <div style={{ background: 'white', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <h4 style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', marginBottom: '0.6rem', fontWeight: 750 }}>
                    <BookOpen size={14} /> WhatsApp Vocab
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                    {Object.keys(weeklyStatus.vocab).map(dateStr => {
                      const dateObj = new Date(dateStr);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const done = weeklyStatus.vocab[dateStr];
                      return (
                        <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{dayName} ({dateStr.substring(8, 10)})</span>
                          <span style={{ color: done ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{done ? '✓ Logged' : 'Pending'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sentences row */}
                <div style={{ background: 'white', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <h4 style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', marginBottom: '0.6rem', fontWeight: 750 }}>
                    <MessageSquare size={14} /> WhatsApp Sentences
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                    {Object.keys(weeklyStatus.sentences).map(dateStr => {
                      const dateObj = new Date(dateStr);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const done = weeklyStatus.sentences[dateStr];
                      return (
                        <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{dayName} ({dateStr.substring(8, 10)})</span>
                          <span style={{ color: done ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>{done ? '✓ Logged' : 'Pending'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vlog item */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Video size={20} style={{ color: weeklyStatus.vlog ? '#16a34a' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Weekly Vlog Upload</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: weeklyStatus.vlog ? '#16a34a' : '#ea580c', fontWeight: 700, padding: '0.2rem 0.5rem', background: weeklyStatus.vlog ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', borderRadius: '50px' }}>
                    {weeklyStatus.vlog ? 'Approved' : 'Pending'}
                  </span>
                </div>

                {/* Video Reaction item */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <MessageSquare size={20} style={{ color: weeklyStatus.videoReaction ? '#16a34a' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Video Reaction Task</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: weeklyStatus.videoReaction ? '#16a34a' : '#ea580c', fontWeight: 700, padding: '0.2rem 0.5rem', background: weeklyStatus.videoReaction ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', borderRadius: '50px' }}>
                    {weeklyStatus.videoReaction ? 'Approved' : 'Pending'}
                  </span>
                </div>

                {/* Hadithul Arabia item */}
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Globe size={20} style={{ color: weeklyStatus.hadithulArabia ? '#16a34a' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Hadithul Arabia Attendance</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: weeklyStatus.hadithulArabia ? '#16a34a' : '#ea580c', fontWeight: 700, padding: '0.2rem 0.5rem', background: weeklyStatus.hadithulArabia ? 'rgba(34,197,94,0.1)' : 'rgba(234,88,12,0.1)', borderRadius: '50px' }}>
                    {weeklyStatus.hadithulArabia ? 'Approved' : 'Pending'}
                  </span>
                </div>

              </div>
            </div>

            {/* Academic Performance Report Card */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                  <Award size={18} className="text-primary" /> Performance Report
                </h3>
                <button
                  onClick={() => handlePrintReport(currentStudent, recentLogs)}
                  className="btn btn-outline"
                  style={{ 
                    padding: '0.35rem 0.75rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.3rem', 
                    borderColor: 'var(--primary)',
                    color: 'var(--primary-dark)',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={12} /> Print Report
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>A complete academic summary for this period.</p>

              {/* Grid of Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                {/* Attendance Rate */}
                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Rate</span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--primary-dark)' }}>{attendanceRate}%</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    On Time: {onTimeCount}/{totalAttendance} Days (Late: {lateCount}, Half Day: {halfDayCount}, Absent: {absentCount})
                  </span>
                </div>

                {/* Malayalam Penalties */}
                <div style={{ background: totalPenaltiesCount > 0 ? 'rgba(239,68,68,0.02)' : 'white', padding: '0.8rem', borderRadius: '12px', border: totalPenaltiesCount > 0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: totalPenaltiesCount > 0 ? '#b91c1c' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {totalPenaltiesCount > 0 && <AlertTriangle size={12} style={{ color: '#dc2626' }} />} Malayalam Penalties
                  </span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: totalPenaltiesCount > 0 ? '#dc2626' : 'var(--text-main)' }}>{totalPenaltiesCount}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Total Term Count
                  </span>
                </div>

                {/* Exam Average */}
                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Exam Average</span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-main)' }}>{examAvg !== null ? `${examAvg}%` : 'N/A'}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Across {examLogs.length} Exams
                  </span>
                </div>

                {/* One Minute Talk Average */}
                <div style={{ background: 'white', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Volume2 size={12} className="text-primary" /> One Minute Talk
                  </span>
                  <div style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--text-main)' }}>{talkAvg}</span>
                    {talkAvg !== 'N/A' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>/10</span>}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Average Oral Score
                  </span>
                </div>
              </div>

              {/* Checklist Tasks Breakdown */}
              <div style={{ background: 'rgba(201,156,51,0.03)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(201,156,51,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '1.2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vocabulary</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vocabCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sentences</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{sentencesCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vlogs</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{vlogCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reactions</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{videoReactionCount}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'rgba(201,156,51,0.2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hadithul A.</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{hadithulArabiaCount}</span>
                </div>
              </div>

              {/* Exams details */}
              {examLogs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} className="text-primary" /> Exam Breakdown
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                    {examLogs.map(exam => {
                      const examNameFormatted = exam.activity_name.replace(/^exam:\s*/i, '');
                      const percent = Math.round((exam.points / exam.max_points) * 100);
                      return (
                        <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 650, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, marginRight: '0.5rem' }}>{examNameFormatted}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{exam.points}/{exam.max_points} ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Recent Logs Card */}
            <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.8rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 750 }}>
                <Clock size={18} className="text-primary" /> Score Audits
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>Audit trail of your point credits/debits.</p>

              <div className="logs-scroll-container">
                {recentLogs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>No point logs recorded.</p>
                ) : (
                  recentLogs.slice(0, 15).map(log => {
                    const isPenalty = log.points < 0;
                    return (
                      <div 
                        key={log.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '0.75rem', 
                          background: isPenalty ? 'rgba(239,68,68,0.04)' : 'rgba(34,197,94,0.04)', 
                          borderLeft: isPenalty ? '3px solid #dc2626' : '3px solid #16a34a',
                          borderRadius: '0 8px 8px 0',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                          <strong style={{ display: 'block', color: 'var(--text-main)' }}>{log.activity_name}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(log.logged_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <span style={{ 
                            fontWeight: 800, 
                            color: isPenalty ? '#dc2626' : '#16a34a',
                            whiteSpace: 'nowrap'
                          }}>
                            {isPenalty ? '' : '+'}{log.points} XP
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

        {/* --- INSTRUCTOR REMARKS & COUNSELING --- */}
        <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem', marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <MessageSquare size={20} className="text-primary" /> Instructor Remarks & Counseling
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
            Personalized guidance, performance feedback, and career counseling remarks from the academy instructors.
          </p>

          {(() => {
            const hasAnyRemarks = remarks && (
              remarks.strengths?.trim() ||
              remarks.weaknesses?.trim() ||
              remarks.career_path?.trim() ||
              remarks.general_remarks?.trim()
            );

            if (hasAnyRemarks) {
              return (
                <div className="remarks-grid">
                  {/* Strengths */}
                  <div className="remarks-card" style={{ background: 'rgba(16, 185, 129, 0.015)', borderColor: 'rgba(16, 185, 129, 0.12)' }}>
                    <div className="remarks-title" style={{ color: '#047857' }}>
                      <Sparkles size={16} /> 💪 Strengths
                    </div>
                    <div className="remarks-content">
                      {remarks.strengths?.trim() ? remarks.strengths : <span className="remarks-empty">No strengths recorded yet.</span>}
                    </div>
                  </div>

                  {/* Weaknesses */}
                  <div className="remarks-card" style={{ background: 'rgba(239, 68, 68, 0.015)', borderColor: 'rgba(239, 68, 68, 0.12)' }}>
                    <div className="remarks-title" style={{ color: '#b91c1c' }}>
                      <AlertTriangle size={16} /> ⚠️ Areas for Improvement
                    </div>
                    <div className="remarks-content">
                      {remarks.weaknesses?.trim() ? remarks.weaknesses : <span className="remarks-empty">No improvement areas recorded yet.</span>}
                    </div>
                  </div>

                  {/* Career Path */}
                  <div className="remarks-card" style={{ background: 'rgba(59, 130, 246, 0.015)', borderColor: 'rgba(59, 130, 246, 0.12)' }}>
                    <div className="remarks-title" style={{ color: '#1d4ed8' }}>
                      <Compass size={16} /> 🎯 Apt Career Path
                    </div>
                    <div className="remarks-content">
                      {remarks.career_path?.trim() ? remarks.career_path : <span className="remarks-empty">No career path recommendations recorded yet.</span>}
                    </div>
                  </div>

                  {/* General Remarks */}
                  <div className="remarks-card" style={{ background: 'rgba(201, 156, 51, 0.015)', borderColor: 'rgba(201, 156, 51, 0.12)' }}>
                    <div className="remarks-title" style={{ color: 'var(--primary-dark)' }}>
                      <MessageSquare size={16} /> 📝 General Remarks
                    </div>
                    <div className="remarks-content">
                      {remarks.general_remarks?.trim() ? remarks.general_remarks : <span className="remarks-empty">No general remarks recorded yet.</span>}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center', background: 'rgba(201, 156, 51, 0.02)', borderRadius: '16px', border: '1px dashed rgba(201, 156, 51, 0.2)', marginTop: '1rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(201, 156, 51, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <MessageSquare size={28} className="text-primary" />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Remarks will appear here</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: 0 }}>
                  Once logged by your course instructors, your strengths, weaknesses, and career counseling remarks will be shown here.
                </p>
              </div>
            );
          })()}

        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
