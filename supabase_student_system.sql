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
    roll_number TEXT,
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
    score_type TEXT NOT NULL CHECK (score_type IN ('daily_vocab', 'daily_sentences', 'weekly_vlog', 'exam', 'penalty', 'custom', 'attendance', 'video_reaction', 'hadithul_arabia')),
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


-- 5. Recreate handle_new_user function to copy signup address/career/spouse/experience metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    is_student BOOLEAN;
    is_alumni BOOLEAN;
    selected_course_id UUID;
    student_batch INTEGER;
BEGIN
    -- Check if metadata specifies student account
    is_student := COALESCE((new.raw_user_meta_data->>'is_student')::boolean, false);
    is_alumni := COALESCE((new.raw_user_meta_data->>'is_alumni_signup')::boolean, false);

    IF is_student THEN
        -- Extract course and batch
        selected_course_id := (new.raw_user_meta_data->>'course_id')::uuid;
        student_batch := (new.raw_user_meta_data->>'batch_number')::integer;

        INSERT INTO public.student_profiles (
            id, email, name, course_id, batch_number, status, roll_number, is_alumni_signup,
            hometown, house_name, street, locality, district, state, pincode, mobile_number, whatsapp_number,
            total_experience_years, experience_details
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'name', 'Student User'),
            selected_course_id,
            student_batch,
            'pending',
            new.raw_user_meta_data->>'roll_number',
            is_alumni,
            new.raw_user_meta_data->>'hometown',
            new.raw_user_meta_data->>'house_name',
            new.raw_user_meta_data->>'street',
            new.raw_user_meta_data->>'locality',
            new.raw_user_meta_data->>'district',
            COALESCE(new.raw_user_meta_data->>'state', 'Kerala'),
            new.raw_user_meta_data->>'pincode',
            new.raw_user_meta_data->>'mobile_number',
            new.raw_user_meta_data->>'whatsapp_number',
            new.raw_user_meta_data->>'total_experience_years',
            new.raw_user_meta_data->>'experience_details'
        );
        
        -- If registering as alumni, insert their career and spouse details immediately
        IF is_alumni THEN
            INSERT INTO public.alumni_profiles (
                student_id,
                employment_status,
                preferred_location,
                preferred_roles,
                current_job_title,
                current_company,
                current_work_location,
                skills_learned,
                linkedin_url,
                marital_status,
                spouse_name,
                spouse_profession,
                spouse_company,
                spouse_work_location
            )
            VALUES (
                new.id,
                COALESCE(new.raw_user_meta_data->>'employment_status', 'unemployed_looking'),
                COALESCE(new.raw_user_meta_data->>'preferred_location', 'anywhere'),
                new.raw_user_meta_data->>'preferred_roles',
                new.raw_user_meta_data->>'current_job_title',
                new.raw_user_meta_data->>'current_company',
                new.raw_user_meta_data->>'current_work_location',
                new.raw_user_meta_data->>'skills_learned',
                new.raw_user_meta_data->>'linkedin_url',
                COALESCE(new.raw_user_meta_data->>'marital_status', 'single'),
                new.raw_user_meta_data->>'spouse_name',
                new.raw_user_meta_data->>'spouse_profession',
                new.raw_user_meta_data->>'spouse_company',
                new.raw_user_meta_data->>'spouse_work_location'
            );
        END IF;
        
        INSERT INTO public.activity_logs (actor_name, action_type, details)
        VALUES (
            COALESCE(new.raw_user_meta_data->>'name', new.email),
            'student_signup',
            CASE WHEN is_alumni THEN
                'Registered a new alumni account with career profile details (Pending Approval).'
            ELSE
                'Registered a new student account with contact & experience details (Pending Approval).'
            END
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


-- 9. Create student_remarks table
CREATE TABLE IF NOT EXISTS public.student_remarks (
    student_id UUID PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    strengths TEXT,
    weaknesses TEXT,
    career_path TEXT,
    general_remarks TEXT,
    updated_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.student_remarks ENABLE ROW LEVEL SECURITY;

-- Create RLS Select Policy
CREATE POLICY "Enable select for staff and self" 
ON public.student_remarks FOR SELECT 
TO authenticated 
USING (
    (auth.uid() = student_id) OR
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND status = 'active'
    )
);

-- Create RLS Write Policy
CREATE POLICY "Enable all for staff" 
ON public.student_remarks FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND status = 'active'
    )
);

-- 10. Add target column configurations to scoring_intervals
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS total_working_days INTEGER DEFAULT 20 NOT NULL;
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS total_vocab_tasks INTEGER DEFAULT 20 NOT NULL;
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS total_sentences_tasks INTEGER DEFAULT 20 NOT NULL;
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS total_vlog_tasks INTEGER DEFAULT 4 NOT NULL;
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS total_reaction_tasks INTEGER DEFAULT 4 NOT NULL;
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS total_hadithul_tasks INTEGER DEFAULT 4 NOT NULL;

-- 11. Add UPDATE policy to scores table
DROP POLICY IF EXISTS "Enable update for staff and leadership" ON public.scores;
CREATE POLICY "Enable update for staff and leadership" 
ON public.scores FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
    )
);

-- 12. Add start_date column to scoring_intervals
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS start_date DATE;
UPDATE public.scoring_intervals SET start_date = created_at::date WHERE start_date IS NULL;
ALTER TABLE public.scoring_intervals ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE public.scoring_intervals ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;
ALTER TABLE public.scoring_intervals ADD COLUMN IF NOT EXISTS end_date DATE;

-- 13. Add Mock Interview and Industrial Visit columns to student_remarks table
ALTER TABLE public.student_remarks ADD COLUMN IF NOT EXISTS mock_interview_mark NUMERIC;
ALTER TABLE public.student_remarks ADD COLUMN IF NOT EXISTS mock_interview_remark TEXT;
ALTER TABLE public.student_remarks ADD COLUMN IF NOT EXISTS industrial_visit_mark NUMERIC;
ALTER TABLE public.student_remarks ADD COLUMN IF NOT EXISTS industrial_visit_remark TEXT;

-- 14. Create correction_requests table
CREATE TABLE IF NOT EXISTS public.correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('attendance', 'scoring', 'checklist')),
    logged_date DATE NOT NULL,
    activity_name TEXT NOT NULL,
    current_value TEXT NOT NULL,
    expected_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "Enable select for authorized users" ON public.correction_requests;
CREATE POLICY "Enable select for authorized users"
ON public.correction_requests FOR SELECT
TO authenticated
USING (
    student_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND status = 'active'
    )
);

-- Insert policy (Students only)
DROP POLICY IF EXISTS "Enable insert for students" ON public.correction_requests;
CREATE POLICY "Enable insert for students"
ON public.correction_requests FOR INSERT
TO authenticated
WITH CHECK (
    student_id = auth.uid() AND
    NOT EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE id = auth.uid()
    )
);

-- Update policy (Staff/Admins only)
DROP POLICY IF EXISTS "Enable update for staff and leadership" ON public.correction_requests;
CREATE POLICY "Enable update for staff and leadership"
ON public.correction_requests FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND status = 'active'
    )
);


-- =====================================================================
-- 8. ALUMNI & PLACEMENT PORTAL SCHEMAS
-- =====================================================================

-- Update check constraint on student_profiles status to include 'alumni'
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_status_check;
ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_status_check 
    CHECK (status IN ('pending', 'active', 'inactive', 'alumni'));

-- Add structured address, contact, work experience, and registration columns to student_profiles
ALTER TABLE public.student_profiles 
    ADD COLUMN IF NOT EXISTS hometown TEXT,
    ADD COLUMN IF NOT EXISTS house_name TEXT,
    ADD COLUMN IF NOT EXISTS street TEXT,
    ADD COLUMN IF NOT EXISTS locality TEXT, -- Locality/Post Office/City
    ADD COLUMN IF NOT EXISTS district TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Kerala',
    ADD COLUMN IF NOT EXISTS pincode TEXT,
    ADD COLUMN IF NOT EXISTS mobile_number TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
    ADD COLUMN IF NOT EXISTS is_alumni_signup BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS total_experience_years TEXT,
    ADD COLUMN IF NOT EXISTS experience_details TEXT;

-- Create alumni_profiles table for post-graduation tracking
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
    student_id UUID PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    employment_status TEXT NOT NULL DEFAULT 'unemployed_looking' 
        CHECK (employment_status IN ('unemployed_looking', 'unemployed_not_looking', 'employed', 'employed_looking', 'higher_studies')),
    preferred_location TEXT NOT NULL DEFAULT 'anywhere' 
        CHECK (preferred_location IN ('near_home', 'india', 'abroad', 'anywhere')),
    preferred_roles TEXT,          -- Types of work they like (e.g. Translation, Web Dev, Teaching)
    current_job_title TEXT,        -- If employed
    current_company TEXT,          -- If employed
    current_work_location TEXT,    -- Current city/country
    skills_learned TEXT,           -- Key subjects, coding languages, specializations
    linkedin_url TEXT,
    marital_status TEXT NOT NULL DEFAULT 'single' CHECK (marital_status IN ('single', 'married')),
    spouse_name TEXT,
    spouse_profession TEXT,
    spouse_company TEXT,
    spouse_work_location TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for alumni_profiles
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alumni_profiles
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.alumni_profiles;
CREATE POLICY "Enable select for authenticated users" 
    ON public.alumni_profiles FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Enable insert for owners and staff" ON public.alumni_profiles;
CREATE POLICY "Enable insert for owners and staff" 
    ON public.alumni_profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (
        auth.uid() = student_id OR 
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Enable update for owners and staff" ON public.alumni_profiles;
CREATE POLICY "Enable update for owners and staff" 
    ON public.alumni_profiles FOR UPDATE 
    TO authenticated 
    USING (
        auth.uid() = student_id OR 
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
        )
    )
    WITH CHECK (
        auth.uid() = student_id OR 
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND role IN ('staff', 'gm', 'md', 'director') AND status = 'active'
        )
    );

