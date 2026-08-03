-- RPC Function to link or create a staff profile for existing or new auth users
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
    -- Check if caller is active leadership (gm, md, director)
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only active leadership can link staff profiles.';
    END IF;

    -- Look up target_email in auth.users
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE lower(email) = lower(target_email);

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
            lower(target_email),
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
        lower(target_email),
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
