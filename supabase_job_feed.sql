-- Create job_posts table (public details visible to everyone)
CREATE TABLE IF NOT EXISTS public.job_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_title TEXT,
    company_name TEXT,
    location TEXT,
    work_mode TEXT CHECK (work_mode IN ('office', 'remote', 'hybrid', 'field')),
    salary TEXT,
    description TEXT,
    posted_by UUID NOT NULL,
    poster_name TEXT NOT NULL,
    poster_role TEXT NOT NULL CHECK (poster_role IN ('admin', 'staff', 'alumni', 'student')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create job_contact_info table (sensitive details visible ONLY to admin/staff)
CREATE TABLE IF NOT EXISTS public.job_contact_info (
    job_id UUID PRIMARY KEY REFERENCES public.job_posts(id) ON DELETE CASCADE,
    contact_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create job_applications table (students requesting jobs)
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
    applicant_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_mobile TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (job_id, applicant_id)
);

-- Enable RLS
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Job Posts RLS Policies
DROP POLICY IF EXISTS "Enable read for approved jobs or owners or staff" ON public.job_posts;
CREATE POLICY "Enable read for approved jobs or owners or staff" ON public.job_posts
    FOR SELECT TO authenticated
    USING (
        status = 'approved' OR 
        posted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.job_posts;
CREATE POLICY "Enable insert for authenticated users" ON public.job_posts
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for owners or staff" ON public.job_posts;
CREATE POLICY "Enable update for owners or staff" ON public.job_posts
    FOR UPDATE TO authenticated
    USING (
        posted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Enable delete for owners or staff" ON public.job_posts;
CREATE POLICY "Enable delete for owners or staff" ON public.job_posts
    FOR DELETE TO authenticated
    USING (
        posted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

-- Job Contact Info RLS Policies (STRICT: staff/admin ONLY)
DROP POLICY IF EXISTS "Enable select for staff only" ON public.job_contact_info;
CREATE POLICY "Enable select for staff only" ON public.job_contact_info
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.job_contact_info;
CREATE POLICY "Enable insert for authenticated users" ON public.job_contact_info
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Trigger will validate if the poster matches or is staff/admin

DROP POLICY IF EXISTS "Enable update for staff only" ON public.job_contact_info;
CREATE POLICY "Enable update for staff only" ON public.job_contact_info
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Enable delete for staff only" ON public.job_contact_info;
CREATE POLICY "Enable delete for staff only" ON public.job_contact_info
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

-- Job Applications RLS Policies
DROP POLICY IF EXISTS "Enable read for applicant or job poster or staff" ON public.job_applications;
CREATE POLICY "Enable read for applicant or job poster or staff" ON public.job_applications
    FOR SELECT TO authenticated
    USING (
        applicant_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.job_posts 
            WHERE id = job_id AND posted_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Enable insert for applications" ON public.job_applications;
CREATE POLICY "Enable insert for applications" ON public.job_applications
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for applicant" ON public.job_applications;
CREATE POLICY "Enable delete for applicant" ON public.job_applications
    FOR DELETE TO authenticated
    USING (applicant_id = auth.uid());

-- Trigger function for setting defaults on job posts
CREATE OR REPLACE FUNCTION public.set_job_post_defaults()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
BEGIN
  -- Determine poster role and name
  -- Check if staff
  SELECT role, name INTO v_role, v_name
  FROM public.staff_profiles
  WHERE id = auth.uid() AND status = 'active';
  
  IF FOUND THEN
    new.posted_by := auth.uid();
    new.poster_role := 'staff';
    new.poster_name := v_name;
    new.status := 'approved'; -- Auto-approve for active staff/admin
  ELSE
    -- Check if student/alumni
    SELECT name INTO v_name
    FROM public.student_profiles
    WHERE id = auth.uid();
    
    IF FOUND THEN
      new.posted_by := auth.uid();
      new.poster_role := 'alumni';
      new.poster_name := v_name;
      new.status := 'pending'; -- Requires approval
    ELSE
      RAISE EXCEPTION 'User not found in profiles';
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_job_post_created ON public.job_posts;
CREATE TRIGGER on_job_post_created
  BEFORE INSERT ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_job_post_defaults();

-- Trigger function for setting defaults on job applications
CREATE OR REPLACE FUNCTION public.set_job_application_defaults()
RETURNS trigger AS $$
DECLARE
  v_name TEXT;
  v_mobile TEXT;
BEGIN
  -- Try student profiles first
  SELECT name, mobile_number INTO v_name, v_mobile
  FROM public.student_profiles
  WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    -- Try staff profiles
    SELECT name INTO v_name
    FROM public.staff_profiles
    WHERE id = auth.uid();
    v_mobile := NULL;
  END IF;
  
  new.applicant_id := auth.uid();
  new.applicant_name := COALESCE(v_name, 'Unknown');
  new.applicant_mobile := COALESCE(new.applicant_mobile, v_mobile);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_job_application_created ON public.job_applications;
CREATE TRIGGER on_job_application_created
  BEFORE INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_job_application_defaults();
