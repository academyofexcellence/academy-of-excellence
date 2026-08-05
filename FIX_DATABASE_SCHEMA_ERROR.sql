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

-- 4. Clean non-recursive RLS policies for staff_profiles
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.staff_profiles;
DROP POLICY IF EXISTS "Enable select for all users" ON public.staff_profiles;
CREATE POLICY "Enable select for all users" 
ON public.staff_profiles FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.staff_profiles;
CREATE POLICY "Enable insert for authenticated users" 
ON public.staff_profiles FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.staff_profiles;
CREATE POLICY "Enable update for authenticated users" 
ON public.staff_profiles FOR UPDATE 
TO public 
USING (true);

-- 5. Clean non-recursive RLS policies for student_profiles
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.student_profiles;
DROP POLICY IF EXISTS "Enable select for all users" ON public.student_profiles;
CREATE POLICY "Enable select for all users" 
ON public.student_profiles FOR SELECT 
TO public 
USING (true);

-- 6. Clean RLS policies for activity_logs and tasks
DROP POLICY IF EXISTS "Enable read activity logs for authenticated users" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable read activity logs for all users" ON public.activity_logs;
CREATE POLICY "Enable read activity logs for all users" 
ON public.activity_logs FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Enable read tasks for all users" ON public.tasks;
CREATE POLICY "Enable read tasks for all users" 
ON public.tasks FOR SELECT 
TO public 
USING (true);

-- 7. Security Definer RPC helper to fetch staff profile with zero RLS recursion
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
