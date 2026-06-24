-- Create get_leaderboard PostgreSQL RPC function to calculate leaderboards server-side.
-- This handles thousands of score logs with minimum database egress, vercel, and client resources.
-- Run this in the SQL Editor of your Supabase Project.

CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_interval_id TEXT,
    p_course_id UUID,
    p_batch_number INTEGER
)
RETURNS TABLE (
    student_id UUID,
    name TEXT,
    total_score INTEGER,
    level INTEGER,
    rank INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH student_scores AS (
        SELECT 
            sp.id AS s_id,
            sp.name AS s_name,
            COALESCE(SUM(s.points), 0)::INTEGER AS aggregated_score
        FROM public.student_profiles sp
        LEFT JOIN public.scores s ON sp.id = s.student_id AND (
            p_interval_id = 'cumulative' OR s.interval_id = p_interval_id::uuid
        )
        WHERE sp.course_id = p_course_id 
          AND sp.batch_number = p_batch_number 
          AND sp.status = 'active'
        GROUP BY sp.id, sp.name
    )
    SELECT 
        s_id AS student_id,
        s_name AS name,
        aggregated_score AS total_score,
        GREATEST(1, FLOOR(aggregated_score / 100) + 1)::INTEGER AS level,
        DENSE_RANK() OVER (ORDER BY aggregated_score DESC)::INTEGER AS rank
    FROM student_scores
    ORDER BY aggregated_score DESC;
END;
$$;
