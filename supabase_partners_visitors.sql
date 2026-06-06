-- 1. Create Partners Table (if not exists)
CREATE TABLE IF NOT EXISTS partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Partners
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Policies for Partners
DROP POLICY IF EXISTS "Public Read Access" ON partners;
CREATE POLICY "Public Read Access" ON partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access" ON partners;
CREATE POLICY "Admin Full Access" ON partners FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public Insert Access" ON partners;
CREATE POLICY "Public Insert Access" ON partners FOR INSERT WITH CHECK (true);


-- 2. Create Visitors Table (Guests, Mentors, Leaders)
CREATE TABLE IF NOT EXISTS visitors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    organization TEXT,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Visitors
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Policies for Visitors
DROP POLICY IF EXISTS "Public Read Access" ON visitors;
CREATE POLICY "Public Read Access" ON visitors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access" ON visitors;
CREATE POLICY "Admin Full Access" ON visitors FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public Insert Access" ON visitors;
CREATE POLICY "Public Insert Access" ON visitors FOR INSERT WITH CHECK (true);
