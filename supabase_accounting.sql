-- =========================================================
-- ACADEMY OF EXCELLENCE - FINANCIAL & ACCOUNTING SCHEMA
-- =========================================================

-- 1. Student Fee Profiles (Discounts & Net Agreed Fees)
CREATE TABLE IF NOT EXISTS public.student_fee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    standard_fee NUMERIC(10, 2) NOT NULL DEFAULT 25000.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_reason TEXT,
    total_agreed_fee NUMERIC(10, 2) NOT NULL DEFAULT 25000.00,
    total_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(10, 2) NOT NULL DEFAULT 25000.00,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'fully_paid', 'overdue')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Fee Payment Transactions (Income)
CREATE TABLE IF NOT EXISTS public.fee_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no TEXT UNIQUE NOT NULL, -- e.g. REC-2026-0001
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE RESTRICT NOT NULL,
    student_name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT,
    batch_number INTEGER NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('gpay_bank', 'office_cash')),
    installment_label TEXT DEFAULT 'Fee Installment', -- 'Admission', 'Month 1', 'Month 3', 'Custom'
    notes TEXT,
    logged_by TEXT NOT NULL DEFAULT 'Staff',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Academy Expenses (Outflow)
CREATE TABLE IF NOT EXISTS public.academy_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('rent', 'utilities', 'salaries', 'supplies', 'marketing', 'maintenance', 'other')),
    amount NUMERIC(10, 2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('gpay_bank', 'office_cash')),
    notes TEXT,
    logged_by TEXT NOT NULL DEFAULT 'Staff',
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON public.fee_payment_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.academy_expenses(expense_date);

-- Enable Row Level Security
ALTER TABLE public.student_fee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can manage fee profiles" ON public.student_fee_profiles;
DROP POLICY IF EXISTS "Staff can manage fee transactions" ON public.fee_payment_transactions;
DROP POLICY IF EXISTS "Staff can manage academy expenses" ON public.academy_expenses;

-- RLS Policies
CREATE POLICY "Staff can manage fee profiles" ON public.student_fee_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Staff can manage fee transactions" ON public.fee_payment_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Staff can manage academy expenses" ON public.academy_expenses FOR ALL USING (true) WITH CHECK (true);
