-- ====================================================================
-- FIX FOR "Database error querying schema" IN SUPABASE AUTH & POSTGRES
-- Run this script once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ====================================================================

-- 1. Grant full usage permissions on schema public to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. Drop any legacy failing triggers on auth.users that crash Supabase Auth during login/signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Ensure Row Level Security is enabled safely
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 4. Clean non-recursive RLS policies for staff_profiles & student_profiles
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.staff_profiles;
DROP POLICY IF EXISTS "Enable select for all users" ON public.staff_profiles;
CREATE POLICY "Enable select for all users" ON public.staff_profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.staff_profiles;
CREATE POLICY "Enable insert for authenticated users" ON public.staff_profiles FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.staff_profiles;
CREATE POLICY "Enable update for authenticated users" ON public.staff_profiles FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.student_profiles;
DROP POLICY IF EXISTS "Enable select for all users" ON public.student_profiles;
CREATE POLICY "Enable select for all users" ON public.student_profiles FOR SELECT TO public USING (true);

-- 5. Clean RLS policies for activity_logs, tasks, scoring_intervals, courses
DROP POLICY IF EXISTS "Enable read activity logs for authenticated users" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable read activity logs for all users" ON public.activity_logs;
CREATE POLICY "Enable read activity logs for all users" ON public.activity_logs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable read tasks for all users" ON public.tasks;
CREATE POLICY "Enable read tasks for all users" ON public.tasks FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable read scoring_intervals for all users" ON public.scoring_intervals;
CREATE POLICY "Enable read scoring_intervals for all users" ON public.scoring_intervals FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable read courses for all users" ON public.courses;
CREATE POLICY "Enable read courses for all users" ON public.courses FOR SELECT TO public USING (true);

-- 6. Custom RPC Login Engine (Bypasses Auth Schema Errors)
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

-- 7. Helper RPC to fetch staff profile safely
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
