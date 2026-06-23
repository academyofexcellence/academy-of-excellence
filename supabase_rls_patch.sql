-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Alter student_profiles to add work experience columns
ALTER TABLE public.student_profiles 
    ADD COLUMN IF NOT EXISTS total_experience_years TEXT,
    ADD COLUMN IF NOT EXISTS experience_details TEXT;

-- 2. Alter alumni_profiles table to add spouse & family tracking columns
ALTER TABLE public.alumni_profiles 
    ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'single' CHECK (marital_status IN ('single', 'married')),
    ADD COLUMN IF NOT EXISTS spouse_name TEXT,
    ADD COLUMN IF NOT EXISTS spouse_profession TEXT,
    ADD COLUMN IF NOT EXISTS spouse_company TEXT,
    ADD COLUMN IF NOT EXISTS spouse_work_location TEXT;

-- Update employment status check constraint
ALTER TABLE public.alumni_profiles DROP CONSTRAINT IF EXISTS alumni_profiles_employment_status_check;
ALTER TABLE public.alumni_profiles ADD CONSTRAINT alumni_profiles_employment_status_check
    CHECK (employment_status IN ('unemployed_looking', 'unemployed_not_looking', 'employed', 'employed_looking', 'higher_studies'));

-- 3. Enable students to update their own student_profiles row (contact, address, experience etc.)
DROP POLICY IF EXISTS "Enable update for users on own profile" ON public.student_profiles;
CREATE POLICY "Enable update for users on own profile"
ON public.student_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Verify and enable RLS updates for alumni_profiles (just to be safe)
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

-- 5. Recreate trigger function public.handle_new_user() to copy signup address/career/spouse/experience metadata
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

