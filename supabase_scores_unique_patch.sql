-- SQL Migration Patch: Update unique constraint on scores table to include activity_name
-- This allows multiple exams, custom activities, or penalties to be logged for the same student on the same date.

ALTER TABLE public.scores 
DROP CONSTRAINT IF EXISTS scores_student_id_logged_date_score_type_key;

ALTER TABLE public.scores 
DROP CONSTRAINT IF EXISTS scores_student_id_logged_date_score_type_activity_name_key;

ALTER TABLE public.scores 
ADD CONSTRAINT scores_student_id_logged_date_score_type_activity_name_key 
UNIQUE (student_id, logged_date, score_type, activity_name);
