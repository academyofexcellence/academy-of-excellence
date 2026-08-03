-- Create get_leaderboard PostgreSQL RPC function to calculate leaderboards server-side.
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
            (
                -- 1. Sum all points from scores table
                COALESCE((
                    SELECT SUM(s.points) 
                    FROM public.scores s 
                    WHERE s.student_id = sp.id 
                      AND (
                          p_interval_id = 'cumulative' 
                          OR s.interval_id = p_interval_id::uuid
                      )
                ), 0)
                +
                -- 2. Sum daily_attendance_logs points not yet in scores table
                COALESCE((
                    SELECT SUM(dal.points_awarded) 
                    FROM public.daily_attendance_logs dal 
                    WHERE dal.student_id = sp.id 
                      AND NOT EXISTS (
                          SELECT 1 FROM public.scores s 
                          WHERE s.student_id = dal.student_id 
                            AND s.score_type = 'attendance' 
                            AND s.logged_date = dal.date
                      )
                      AND (
                          p_interval_id = 'cumulative' 
                          OR EXISTS (
                              SELECT 1 FROM public.scoring_intervals si 
                              WHERE si.id = p_interval_id::uuid 
                                AND (si.start_date IS NULL OR dal.date >= si.start_date)
                                AND (si.end_date IS NULL OR dal.date <= si.end_date)
                          )
                      )
                ), 0)
            )::INTEGER AS aggregated_score
        FROM public.student_profiles sp
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
