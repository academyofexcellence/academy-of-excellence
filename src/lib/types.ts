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
  education_degree?: string;
  education_degree_college?: string;
  education_degree_year?: string;
  education_pg?: string;
  education_pg_college?: string;
  education_pg_year?: string;
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

export interface CertificateRecord {
  id: string;
  certificate_code: string;
  batch_code_prefix: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  batch_number: number;
  roll_number?: string;
  issue_date: string;
  certificate_type?: 'DPT' | 'CAT';
  grade_description: string;
  status: 'valid' | 'revoked';
  created_at: string;
}

export interface DailyAttendanceLog {
  id: string;
  student_id: string;
  student_name: string;
  course_id?: string;
  batch_number: number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_status?: 'on_time' | 'late' | 'pending';
  check_out_status?: 'on_time' | 'early' | 'pending';
  points_awarded: number; // 10, 5, or 0
  status: 'present_full' | 'present_half' | 'absent' | 'manual_override';
  method?: 'qr_scan' | 'manual_override';
  notes?: string;
  created_at?: string;
}

export interface StudentFeeProfile {
  id?: string;
  student_id: string;
  standard_fee: number;
  discount_amount: number;
  discount_reason?: string;
  total_agreed_fee: number;
  total_paid: number;
  balance_due: number;
  status: 'unpaid' | 'partially_paid' | 'fully_paid' | 'overdue';
  updated_at?: string;
}

export interface FeePaymentTransaction {
  id: string;
  receipt_no: string;
  student_id: string;
  student_name: string;
  course_id?: string;
  batch_number: number;
  amount_paid: number;
  payment_mode: 'gpay_bank' | 'office_cash';
  installment_label: string;
  notes?: string;
  logged_by: string;
  payment_date: string;
  created_at?: string;
}

export interface AcademyExpense {
  id: string;
  title: string;
  category: 'rent' | 'utilities' | 'salaries' | 'supplies' | 'marketing' | 'maintenance' | 'other';
  amount: number;
  payment_mode: 'gpay_bank' | 'office_cash';
  notes?: string;
  logged_by: string;
  expense_date: string;
  created_at?: string;
}
