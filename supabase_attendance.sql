-- =========================================================
-- ACADEMY OF EXCELLENCE - DAILY ATTENDANCE LOGS SCHEMA
-- =========================================================

CREATE TABLE IF NOT EXISTS public.daily_attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    student_name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT,
    batch_number INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_status TEXT DEFAULT 'pending', -- 'on_time', 'late', 'pending'
    check_out_status TEXT DEFAULT 'pending', -- 'on_time', 'early', 'pending'
    points_awarded INTEGER DEFAULT 0, -- 10 or 5 or 0
    status TEXT NOT NULL DEFAULT 'absent', -- 'present_full', 'present_half', 'absent', 'manual_override'
    method TEXT DEFAULT 'qr_scan', -- 'qr_scan' or 'manual_override'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, date)
);

-- Index for fast lookup by date and student
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON public.daily_attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_student_id ON public.daily_attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_course_batch ON public.daily_attendance_logs(course_id, batch_number);

-- Enable RLS
ALTER TABLE public.daily_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public and students can view attendance logs" ON public.daily_attendance_logs;
DROP POLICY IF EXISTS "Staff and students can insert/update attendance logs" ON public.daily_attendance_logs;

-- Allow public/students to view logs
CREATE POLICY "Public and students can view attendance logs"
    ON public.daily_attendance_logs
    FOR SELECT
    USING (true);

-- Allow authenticated students and staff to insert/update logs
CREATE POLICY "Staff and students can insert/update attendance logs"
    ON public.daily_attendance_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
