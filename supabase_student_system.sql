-- 1. Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.courses;

CREATE POLICY "Enable select for all users" 
ON public.courses FOR SELECT 
USING (true);

CREATE POLICY "Enable all for leadership" 
ON public.courses FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);


-- 2. Create student_profiles table
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT NOT NULL,
    batch_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable select for authenticated users" 
ON public.student_profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable all for staff and leadership" 
ON public.student_profiles FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
    )
);


-- 3. Create scoring_intervals table
CREATE TABLE IF NOT EXISTS public.scoring_intervals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    batch_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for scoring_intervals
ALTER TABLE public.scoring_intervals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable select for authenticated users" 
ON public.scoring_intervals FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable all for leadership" 
ON public.scoring_intervals FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);


-- 4. Create scores table
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    interval_id UUID REFERENCES public.scoring_intervals(id) ON DELETE CASCADE NOT NULL,
    activity_name TEXT NOT NULL,
    score_type TEXT NOT NULL CHECK (score_type IN ('daily_vocab', 'daily_sentences', 'weekly_vlog', 'exam', 'penalty', 'custom')),
    points INTEGER NOT NULL,
    max_points INTEGER NOT NULL,
    logged_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Daily checkins (vocab, sentences) should only be logged once per student per day
    UNIQUE (student_id, logged_date, score_type)
);

-- Enable RLS for scores
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable select for authenticated users" 
ON public.scores FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for staff and leadership" 
ON public.scores FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
    )
);

CREATE POLICY "Enable delete for staff and leadership" 
ON public.scores FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
    )
);


-- 5. Recreate handle_new_user function to support both Staff and Student signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    is_student BOOLEAN;
    selected_course_id UUID;
    student_batch INTEGER;
BEGIN
    -- Check if metadata specifies student account
    is_student := COALESCE((new.raw_user_meta_data->>'is_student')::boolean, false);

    IF is_student THEN
        -- Extract course and batch
        selected_course_id := (new.raw_user_meta_data->>'course_id')::uuid;
        student_batch := (new.raw_user_meta_data->>'batch_number')::integer;

        INSERT INTO public.student_profiles (id, email, name, course_id, batch_number, status)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'name', 'Student User'),
            selected_course_id,
            student_batch,
            'pending'
        );
        
        INSERT INTO public.activity_logs (actor_name, action_type, details)
        VALUES (
            COALESCE(new.raw_user_meta_data->>'name', new.email),
            'student_signup',
            'Registered a new student account (Pending Approval) for batch ' || student_batch::text
        );
    ELSE
        -- Insert into staff profiles
        INSERT INTO public.staff_profiles (id, email, name, designation, role, status)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'name', 'Staff Member'),
            COALESCE(new.raw_user_meta_data->>'designation', 'Staff Member'),
            'staff',
            'pending'
        );
        
        INSERT INTO public.activity_logs (actor_name, action_type, details)
        VALUES (
            COALESCE(new.raw_user_meta_data->>'name', new.email),
            'staff_signup',
            'Registered a new staff account (Pending Approval)'
        );
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Insert Default Seed Data (Courses & Initial Active Intervals)
-- Insert standard courses
INSERT INTO public.courses (id, name)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'Professional Diploma in Translation and Office Administration'),
    ('c2222222-2222-2222-2222-222222222222', 'Gulf Spoken Arabic')
ON CONFLICT (name) DO NOTHING;

-- Seed default active intervals for Course 1 (PDTOA Batch 25) and Course 2 (Spoken Arabic Batch 9)
INSERT INTO public.scoring_intervals (id, name, course_id, batch_number, is_active)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'Phase 1 - Initial Term', 'c1111111-1111-1111-1111-111111111111', 25, true),
    ('a2222222-2222-2222-2222-222222222222', 'Phase 1 - Initial Term', 'c2222222-2222-2222-2222-222222222222', 9, true)
ON CONFLICT DO NOTHING;

-- 7. Reset user password and Delete user RPC functions (Leadership only)
CREATE OR REPLACE FUNCTION public.reset_auth_user_password(user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is active leadership (gm, md, director)
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active leadership can reset passwords.';
  END IF;

  -- Update user password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_auth_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is active leadership (gm, md, director)
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active leadership can delete accounts.';
  END IF;

  -- Prevent self-deletion
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot delete your own account.';
  END IF;

  -- Delete from auth.users (cascades to public profiles)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

