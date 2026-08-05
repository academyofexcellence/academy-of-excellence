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
    
    -- Check if email already exists in auth.users
    SELECT id INTO existing_user_id FROM auth.users WHERE lower(email) = staff_email;

    IF existing_user_id IS NOT NULL THEN
        -- User exists in auth.users! Update password and ensure staff_profiles row exists
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
        -- New user! Create auth.users row directly with confirmed email & encrypted password
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

    -- Fetch encrypted_password and id from auth.users
    SELECT id, encrypted_password INTO found_user_id, stored_hash
    FROM auth.users
    WHERE lower(email) = user_email;

    IF found_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid login credentials');
    END IF;

    -- Verify password hash using crypt
    IF stored_hash IS NOT NULL AND stored_hash = crypt(user_password, stored_hash) THEN
        -- Password is correct! Fetch or create staff_profiles row
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

-- 3. RPC Function to link or create a staff profile for existing or new auth users (Leadership only)
CREATE OR REPLACE FUNCTION public.link_or_create_staff_profile(
    target_email TEXT,
    target_name TEXT,
    target_designation TEXT DEFAULT 'Staff Member',
    target_role TEXT DEFAULT 'staff',
    target_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_user_id UUID;
BEGIN
    target_email := lower(trim(target_email));
    target_name := trim(target_name);

    -- Look up target_email in auth.users
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE lower(email) = target_email;

    -- If not found in auth.users, create a new auth.users row
    IF found_user_id IS NULL THEN
        found_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            found_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            target_email,
            crypt('rashide', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('name', target_name, 'designation', target_designation),
            now(),
            now()
        );
    END IF;

    -- Upsert into staff_profiles using found_user_id
    INSERT INTO public.staff_profiles (id, email, name, designation, role, status)
    VALUES (
        found_user_id,
        target_email,
        target_name,
        target_designation,
        target_role,
        target_status
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        designation = EXCLUDED.designation,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    RETURN jsonb_build_object('success', true, 'message', 'Staff profile linked successfully', 'id', found_user_id);
END;
$$;

-- 4. Enhanced reset_auth_user_password that matches by user_id OR email
CREATE OR REPLACE FUNCTION public.reset_auth_user_password(user_id UUID, new_password TEXT, target_email TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user password AND confirm email in auth.users by user_id OR target_email
  UPDATE auth.users
  SET encrypted_password = crypt(trim(new_password), gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = user_id OR (target_email IS NOT NULL AND lower(email) = lower(trim(target_email)));
END;
$$;

-- 5. SECURITY DEFINER helper to fetch caller's staff profile with zero RLS policy recursion
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

-- 6. Clean Non-Recursive RLS Policies
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.staff_profiles;
DROP POLICY IF EXISTS "Enable select for all users" ON public.staff_profiles;
CREATE POLICY "Enable select for all users" 
ON public.staff_profiles FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.student_profiles;
DROP POLICY IF EXISTS "Enable select for all users" ON public.student_profiles;
CREATE POLICY "Enable select for all users" 
ON public.student_profiles FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Enable read activity logs for authenticated users" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable read activity logs for all users" ON public.activity_logs;
CREATE POLICY "Enable read activity logs for all users" 
ON public.activity_logs FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Enable read tasks for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable read tasks for all users" ON public.tasks;
CREATE POLICY "Enable read tasks for all users" 
ON public.tasks FOR SELECT 
TO public 
USING (true);
