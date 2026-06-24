export interface StaffProfile {
  id: string;
  email: string;
  name: string;
  designation: string;
  role: 'staff' | 'gm' | 'md' | 'director';
  status: 'active' | 'pending' | 'inactive';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  task_type: 'daily' | 'one_off';
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  staff_profiles?: StaffProfile;
}

export interface DailyLog {
  id: string;
  task_id: string;
  completed_by: string;
  completed_date: string;
}

export interface Course {
  id: string;
  name: string;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  email: string;
  name: string;
  course_id: string;
  batch_number: number;
  roll_number?: string;
  status: 'pending' | 'active' | 'inactive' | 'alumni';
  courses?: Course;
  is_alumni_signup?: boolean;
  hometown?: string;
  house_name?: string;
  street?: string;
  locality?: string;
  district?: string;
  state?: string;
  pincode?: string;
  mobile_number?: string;
  whatsapp_number?: string;
  total_experience_years?: string;
  experience_details?: string;
}

export interface ScoringInterval {
  id: string;
  name: string;
  course_id: string;
  batch_number: number;
  is_active: boolean;
  total_working_days?: number;
  total_vocab_tasks?: number;
  total_sentences_tasks?: number;
  total_vlog_tasks?: number;
  total_reaction_tasks?: number;
  total_hadithul_tasks?: number;
  created_at?: string;
  start_date?: string;
  end_date?: string;
}

export type Interval = ScoringInterval;

export interface LeaderboardEntry {
  student_id: string;
  name: string;
  total_score: number;
  level: number;
  rank: number;
}

export interface ScoreLog {
  id: string;
  student_id: string;
  interval_id: string;
  score_type: 'attendance' | 'daily_vocab' | 'daily_sentences' | 'weekly_vlog' | 'video_reaction' | 'hadithul_arabia' | 'penalty' | 'custom' | 'exam';
  points: number;
  max_points: number;
  activity_name: string;
  logged_by: string;
  logged_date: string;
}

export interface AppealRequest {
  id: string;
  student_id: string;
  student_name: string;
  request_type: 'attendance' | 'scoring' | 'checklist';
  activity_name: string;
  logged_date: string;
  current_value: string;
  expected_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}
