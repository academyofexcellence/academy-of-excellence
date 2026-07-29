-- =========================================================
-- ACADEMY OF EXCELLENCE - CERTIFICATE VERIFICATION SCHEMA
-- =========================================================

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_code TEXT UNIQUE NOT NULL, -- e.g. DPT0208/26/001
    batch_code_prefix TEXT NOT NULL,       -- e.g. DPT0208
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    student_name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT NOT NULL,
    course_name TEXT NOT NULL,
    batch_number INTEGER NOT NULL,
    roll_number TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    grade_description TEXT DEFAULT 'Completed Course',
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON public.certificates(student_id);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Access (Anyone with a link or scanning a QR code can verify)
DROP POLICY IF EXISTS "Enable public read access for certificates" ON public.certificates;
CREATE POLICY "Enable public read access for certificates"
ON public.certificates FOR SELECT
TO public
USING (true);

-- 2. Staff & Leadership Full Access (Insert, Update, Delete for authenticated staff/admin)
DROP POLICY IF EXISTS "Enable all for staff and leadership on certificates" ON public.certificates;
CREATE POLICY "Enable all for staff and leadership on certificates"
ON public.certificates FOR ALL
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
