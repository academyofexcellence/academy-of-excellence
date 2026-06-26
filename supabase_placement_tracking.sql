-- 1. Alter job_applications to add tracking status and internal notes
ALTER TABLE public.job_applications 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'requested' 
        CHECK (status IN ('requested', 'cv_sent', 'interview', 'placed', 'closed')),
    ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 2. Create placement_tasks table for general tracking
CREATE TABLE IF NOT EXISTS public.placement_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' 
        CHECK (status IN ('todo', 'in_progress', 'waiting', 'completed')),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create meeting_minutes table for log keeping
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    attendees TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.placement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for placement_tasks (Active staff/admin only)
DROP POLICY IF EXISTS "Enable all operations for active staff" ON public.placement_tasks;
CREATE POLICY "Enable all operations for active staff" 
    ON public.placement_tasks FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

-- 6. RLS Policies for meeting_minutes (Active staff/admin only)
DROP POLICY IF EXISTS "Enable all operations for active staff" ON public.meeting_minutes;
CREATE POLICY "Enable all operations for active staff" 
    ON public.meeting_minutes FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
     )
     WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
     );
