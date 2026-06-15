-- 1. Create staff_profiles table
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    designation TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'gm', 'md', 'director')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL DEFAULT 'one_off' CHECK (task_type IN ('daily', 'one_off')),
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Create daily_task_logs table
CREATE TABLE IF NOT EXISTS public.daily_task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    completed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (task_id, completed_date)
);

ALTER TABLE public.daily_task_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Set up automatically created profiles trigger on auth signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, email, name, designation, role, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'designation', 'Staff Member'),
    'staff',
    'pending'
  );
  
  -- Create an initial activity log for the signup
  INSERT INTO public.activity_logs (actor_name, action_type, details)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    'staff_signup',
    'Signed up for a new staff account (Pending Approval)'
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security Policies

-- STAFF_PROFILES Policies
CREATE POLICY "Enable select for authenticated users" 
ON public.staff_profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.staff_profiles FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for leadership roles" 
ON public.staff_profiles FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

CREATE POLICY "Enable delete for leadership roles" 
ON public.staff_profiles FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

-- TASKS Policies
CREATE POLICY "Enable read for assigned tasks or leadership" 
ON public.tasks FOR SELECT 
TO authenticated 
USING (
    assigned_to = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

CREATE POLICY "Enable insert for leadership" 
ON public.tasks FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

CREATE POLICY "Enable update for assigned staff or leadership" 
ON public.tasks FOR UPDATE 
TO authenticated 
USING (
    assigned_to = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

CREATE POLICY "Enable delete for leadership" 
ON public.tasks FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

-- DAILY_TASK_LOGS Policies
CREATE POLICY "Enable read daily logs for authenticated users" 
ON public.daily_task_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert daily logs for assigned staff" 
ON public.daily_task_logs FOR INSERT 
TO authenticated 
WITH CHECK (
    completed_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

CREATE POLICY "Enable delete daily logs for leadership" 
ON public.daily_task_logs FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

-- ACTIVITY_LOGS Policies
CREATE POLICY "Enable read activity logs for leadership" 
ON public.activity_logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = auth.uid() AND role IN ('gm', 'md', 'director') AND status = 'active'
    )
);

CREATE POLICY "Enable insert activity logs for authenticated users" 
ON public.activity_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);
