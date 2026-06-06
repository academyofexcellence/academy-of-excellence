-- SQL script to enable uploads in your 'gallery-images' Storage Bucket
-- Run this in the SQL Editor of your Supabase project!

-- 1. Policy to allow authenticated admin users to upload files (INSERT)
CREATE POLICY "Allow Authenticated Uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'gallery-images');

-- 2. Policy to allow authenticated admin users to update files (UPDATE)
CREATE POLICY "Allow Authenticated Updates" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'gallery-images');

-- 3. Policy to allow authenticated admin users to delete files (DELETE)
CREATE POLICY "Allow Authenticated Deletes" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'gallery-images');

-- 4. Policy to allow everyone (including website visitors) to view files (SELECT)
CREATE POLICY "Allow Public Reads" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'gallery-images');
