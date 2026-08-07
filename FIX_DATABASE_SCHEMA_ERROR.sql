-- ====================================================================
-- MASTER FIX FOR SUPABASE AUTH, PERMISSIONS & CLASSROOM ACCESS
-- Run this script once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ====================================================================

-- 1. Grant full schema permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. Drop legacy failing triggers on auth.users that crash GoTrue Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Enable RLS safely on all tables
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_logs ENABLE ROW LEVEL SECURITY;

-- 4. Clean non-recursive, universal SELECT/UPDATE/INSERT policies for all users
DROP POLICY IF EXISTS "Enable select for all users" ON public.staff_profiles;
CREATE POLICY "Enable select for all users" ON public.staff_profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.staff_profiles;
CREATE POLICY "Enable insert for all users" ON public.staff_profiles FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.staff_profiles;
CREATE POLICY "Enable update for all users" ON public.staff_profiles FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Enable select for all users" ON public.student_profiles;
CREATE POLICY "Enable select for all users" ON public.student_profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable read activity logs for all users" ON public.activity_logs;
CREATE POLICY "Enable read activity logs for all users" ON public.activity_logs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable all access for activity_logs" ON public.activity_logs;
CREATE POLICY "Enable all access for activity_logs" ON public.activity_logs FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read tasks for all users" ON public.tasks;
CREATE POLICY "Enable read tasks for all users" ON public.tasks FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable update tasks for all users" ON public.tasks;
CREATE POLICY "Enable update tasks for all users" ON public.tasks FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Enable read scoring_intervals for all users" ON public.scoring_intervals;
CREATE POLICY "Enable read scoring_intervals for all users" ON public.scoring_intervals FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable read courses for all users" ON public.courses;
CREATE POLICY "Enable read courses for all users" ON public.courses FOR SELECT TO public USING (true);

-- SCORES TABLE RLS POLICIES (UNIVERSAL PERMISSIONS)
DROP POLICY IF EXISTS "Enable read scores for all users" ON public.scores;
DROP POLICY IF EXISTS "Enable all access for scores" ON public.scores;
DROP POLICY IF EXISTS "Enable all access for authenticated scores" ON public.scores;
DROP POLICY IF EXISTS "Enable all access for anon scores" ON public.scores;

CREATE POLICY "Enable all access for scores" ON public.scores FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated scores" ON public.scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon scores" ON public.scores FOR ALL TO anon USING (true) WITH CHECK (true);

-- DAILY ATTENDANCE LOGS RLS POLICIES
DROP POLICY IF EXISTS "Enable read daily_attendance_logs for all users" ON public.daily_attendance_logs;
DROP POLICY IF EXISTS "Enable all access for daily_attendance_logs" ON public.daily_attendance_logs;
DROP POLICY IF EXISTS "Enable all access for authenticated daily_attendance_logs" ON public.daily_attendance_logs;

CREATE POLICY "Enable all access for daily_attendance_logs" ON public.daily_attendance_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated daily_attendance_logs" ON public.daily_attendance_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DAILY TASK LOGS RLS POLICIES
DROP POLICY IF EXISTS "Enable all access for daily_task_logs" ON public.daily_task_logs;
CREATE POLICY "Enable all access for daily_task_logs" ON public.daily_task_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. SECURITY DEFINER helper to update task status bypassing all RLS restrictions
CREATE OR REPLACE FUNCTION public.update_task_status(target_task_id UUID, new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tasks
    SET status = new_status
    WHERE id = target_task_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. SECURITY DEFINER helper to fetch all scoring intervals with 0 RLS blocks for new staff
CREATE OR REPLACE FUNCTION public.get_all_scoring_intervals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    res JSONB;
BEGIN
    SELECT jsonb_agg(to_jsonb(i)) INTO res
    FROM (
        SELECT * FROM public.scoring_intervals ORDER BY created_at DESC
    ) i;
    
    RETURN COALESCE(res, '[]'::jsonb);
END;
$$;

-- 7. SECURITY DEFINER helper to fetch all courses with 0 RLS blocks for new staff
CREATE OR REPLACE FUNCTION public.get_all_courses()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    res JSONB;
BEGIN
    SELECT jsonb_agg(to_jsonb(c)) INTO res
    FROM (
        SELECT * FROM public.courses ORDER BY name ASC
    ) c;
    
    RETURN COALESCE(res, '[]'::jsonb);
END;
$$;

-- 8. Custom RPC Login Engine (Bypasses Auth Schema Errors)
CREATE OR REPLACE FUNCTION public.custom_staff_login(user_email TEXT, user_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_user_id UUID;
    stored_hash TEXT;
    found_profile RECORD;
BEGIN
    user_email := lower(trim(user_email));
    user_password := trim(user_password);

    SELECT id, encrypted_password INTO found_user_id, stored_hash
    FROM auth.users
    WHERE lower(email) = user_email;

    IF found_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid login credentials');
    END IF;

    IF stored_hash IS NOT NULL AND stored_hash = crypt(user_password, stored_hash) THEN
        SELECT * INTO found_profile FROM public.staff_profiles WHERE id = found_user_id;

        IF found_profile.id IS NULL THEN
            INSERT INTO public.staff_profiles (id, email, name, designation, role, status)
            VALUES (found_user_id, user_email, 'Staff Member', 'Staff Member', 'staff', 'active');
            
            SELECT * INTO found_profile FROM public.staff_profiles WHERE id = found_user_id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'user_id', found_user_id,
            'email', user_email,
            'status', COALESCE(found_profile.status, 'active'),
            'role', COALESCE(found_profile.role, 'staff'),
            'name', COALESCE(found_profile.name, 'Staff Member')
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid login credentials');
    END IF;
END;
$$;

-- 9. Helper RPC to fetch staff profile safely
CREATE OR REPLACE FUNCTION public.get_my_staff_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    res JSONB;
BEGIN
    SELECT to_jsonb(p) INTO res
    FROM public.staff_profiles p
    WHERE p.id = auth.uid();
    
    RETURN res;
END;
$$;

-- 10. Security Definer RPC helper to log student score bypassing all RLS restrictions
CREATE OR REPLACE FUNCTION public.log_student_score(
    p_student_id UUID,
    p_interval_id UUID,
    p_score_type TEXT,
    p_points NUMERIC,
    p_max_points NUMERIC,
    p_activity_name TEXT,
    p_logged_by UUID,
    p_logged_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete previous entry if exists to avoid conflict without requiring unique index constraints
    DELETE FROM public.scores
    WHERE student_id = p_student_id
      AND logged_date = p_logged_date
      AND score_type = p_score_type
      AND activity_name = p_activity_name;

    INSERT INTO public.scores (
        student_id, interval_id, score_type, points, max_points, activity_name, logged_by, logged_date
    ) VALUES (
        p_student_id, p_interval_id, p_score_type, p_points, p_max_points, p_activity_name, p_logged_by, p_logged_date
    );
        
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 11. Security Definer RPC helper to delete student score bypassing all RLS restrictions
CREATE OR REPLACE FUNCTION public.delete_student_score(
    p_student_id UUID,
    p_score_type TEXT,
    p_logged_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.scores
    WHERE student_id = p_student_id
      AND score_type = p_score_type
      AND logged_date = p_logged_date;
      
    RETURN jsonb_build_object('success', true);
END;
$$;
