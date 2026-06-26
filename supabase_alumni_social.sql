-- 1. Extend the alumni_profiles table to support mentoring and contact visibility toggles
ALTER TABLE public.alumni_profiles 
    ADD COLUMN IF NOT EXISTS is_open_to_mentoring BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS show_contact_links BOOLEAN DEFAULT true;

-- 2. Create alumni_posts table (Forum-style feed)
CREATE TABLE IF NOT EXISTS public.alumni_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('general', 'career', 'arabic', 'meetups')),
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create alumni_post_likes table (Tracks unique likes on posts)
CREATE TABLE IF NOT EXISTS public.alumni_post_likes (
    post_id UUID REFERENCES public.alumni_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- 4. Create alumni_comments table (Threaded replies for posts)
CREATE TABLE IF NOT EXISTS public.alumni_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.alumni_posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Add Performance Indexes (Ensures queries use minimal DB CPU and memory)
CREATE INDEX IF NOT EXISTS idx_alumni_posts_created_at ON public.alumni_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alumni_posts_author_id ON public.alumni_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_alumni_comments_post_id ON public.alumni_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_alumni_post_likes_post_id ON public.alumni_post_likes (post_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.alumni_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alumni_posts
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.alumni_posts;
CREATE POLICY "Enable read for authenticated users" 
    ON public.alumni_posts FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.alumni_posts;
CREATE POLICY "Enable insert for authenticated users" 
    ON public.alumni_posts FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Enable delete for owners or staff" ON public.alumni_posts;
CREATE POLICY "Enable delete for owners or staff" 
    ON public.alumni_posts FOR DELETE 
    TO authenticated 
    USING (
        auth.uid() = author_id OR 
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );

-- RLS Policies for alumni_post_likes
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.alumni_post_likes;
CREATE POLICY "Enable read for authenticated users" 
    ON public.alumni_post_likes FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.alumni_post_likes;
CREATE POLICY "Enable insert for authenticated users" 
    ON public.alumni_post_likes FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for owner" ON public.alumni_post_likes;
CREATE POLICY "Enable delete for owner" 
    ON public.alumni_post_likes FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- RLS Policies for alumni_comments
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.alumni_comments;
CREATE POLICY "Enable read for authenticated users" 
    ON public.alumni_comments FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.alumni_comments;
CREATE POLICY "Enable insert for authenticated users" 
    ON public.alumni_comments FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Enable delete for owners or staff" ON public.alumni_comments;
CREATE POLICY "Enable delete for owners or staff" 
    ON public.alumni_comments FOR DELETE 
    TO authenticated 
    USING (
        auth.uid() = author_id OR 
        EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE id = auth.uid() AND status = 'active'
        )
    );
