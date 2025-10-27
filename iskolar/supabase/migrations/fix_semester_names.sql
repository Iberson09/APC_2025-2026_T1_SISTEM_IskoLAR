-- Fix existing semester names to match the expected format
-- This script updates semester names from 'First Semester'/'Second Semester' to 'FIRST'/'SECOND'

-- First, check what we have
-- SELECT id, name, school_year_id FROM semesters;

-- Drop the constraint temporarily
ALTER TABLE semesters 
DROP CONSTRAINT IF EXISTS semesters_name_check;

-- Update existing semester names
UPDATE semesters 
SET name = 'FIRST' 
WHERE name = 'First Semester' OR name = 'first semester' OR name = '1st' OR name = '1st Semester';

UPDATE semesters 
SET name = 'SECOND' 
WHERE name = 'Second Semester' OR name = 'second semester' OR name = '2nd' OR name = '2nd Semester';

-- Re-add the correct constraint
ALTER TABLE semesters
ADD CONSTRAINT semesters_name_check 
CHECK (name IN ('FIRST', 'SECOND'));

-- Verify the changes
SELECT 
    sy.academic_year,
    s.name,
    s.applications_open,
    s.start_date,
    s.end_date
FROM semesters s
JOIN school_years sy ON s.school_year_id = sy.id
WHERE sy.is_active = true
ORDER BY s.name;
