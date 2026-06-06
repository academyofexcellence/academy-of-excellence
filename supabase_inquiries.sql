-- 1. Create Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    course TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow anyone to submit an inquiry
CREATE POLICY "Public Insert Access" 
ON inquiries FOR INSERT 
WITH CHECK (true);

-- Allow authenticated admin users to read, update, or delete inquiries
CREATE POLICY "Admin Full Access" 
ON inquiries FOR ALL 
USING (auth.role() = 'authenticated');
