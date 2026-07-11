-- Migration: Add detailed educational background to student_profiles
ALTER TABLE public.student_profiles 
    ADD COLUMN IF NOT EXISTS education_degree TEXT,
    ADD COLUMN IF NOT EXISTS education_degree_college TEXT,
    ADD COLUMN IF NOT EXISTS education_degree_year TEXT,
    ADD COLUMN IF NOT EXISTS education_pg TEXT,
    ADD COLUMN IF NOT EXISTS education_pg_college TEXT,
    ADD COLUMN IF NOT EXISTS education_pg_year TEXT;

-- Update trigger function handle_new_user to capture these fields from raw_user_meta_data on signUp
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
            total_experience_years, experience_details,
            education_degree, education_degree_college, education_degree_year,
            education_pg, education_pg_college, education_pg_year
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
            new.raw_user_meta_data->>'experience_details',
            new.raw_user_meta_data->>'education_degree',
            new.raw_user_meta_data->>'education_degree_college',
            new.raw_user_meta_data->>'education_degree_year',
            new.raw_user_meta_data->>'education_pg',
            new.raw_user_meta_data->>'education_pg_college',
            new.raw_user_meta_data->>'education_pg_year'
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
                'Registered a new alumni account with career and educational details (Pending Approval).'
            ELSE
                'Registered a new student account with contact, experience, and educational details (Pending Approval).'
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
