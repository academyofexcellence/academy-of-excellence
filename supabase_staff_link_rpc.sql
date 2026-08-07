-- 1. RPC Function for seamless Staff Registration (auto-creates auth.users + staff_profiles)
CREATE OR REPLACE FUNCTION public.register_new_staff_account(
    staff_email TEXT,
    staff_password TEXT,
    staff_name TEXT,
    staff_designation TEXT DEFAULT 'Staff Member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_user_id UUID;
    new_user_id UUID;
BEGIN
    staff_email := lower(trim(staff_email));
    staff_password := trim(staff_password);
    staff_name := trim(staff_name);
    
    SELECT id INTO existing_user_id FROM auth.users WHERE lower(email) = staff_email;

    IF existing_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = crypt(staff_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = existing_user_id;

        INSERT INTO public.staff_profiles (id, email, name, designation, role, status)
        VALUES (existing_user_id, staff_email, staff_name, staff_designation, 'staff', 'pending')
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            designation = EXCLUDED.designation;

        RETURN jsonb_build_object('success', true, 'message', 'Staff profile linked and updated successfully (Pending Approval).', 'id', existing_user_id);
    ELSE
        new_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            staff_email,
            crypt(staff_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('name', staff_name, 'designation', staff_designation, 'is_student', false),
            now(),
            now()
        );

        INSERT INTO public.staff_profiles (id, email, name, designation, role, status)
        VALUES (new_user_id, staff_email, staff_name, staff_designation, 'staff', 'pending');

        RETURN jsonb_build_object('success', true, 'message', 'Staff registration successful (Pending Approval).', 'id', new_user_id);
    END IF;
END;
$$;

-- 2. Custom RPC Login (Bypasses GoTrue Auth Schema Query Errors)
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

-- 3. SECURITY DEFINER helper to update task status bypassing all RLS restrictions
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

-- 4. SECURITY DEFINER helper to fetch all scoring intervals with 0 RLS blocks for new staff
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

-- 5. SECURITY DEFINER helper to fetch all courses with 0 RLS blocks for new staff
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

-- 6. SECURITY DEFINER helper to fetch caller's staff profile with zero RLS policy recursion
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
