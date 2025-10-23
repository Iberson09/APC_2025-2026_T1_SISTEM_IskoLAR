-- Check and create missing semesters for A.Y. 2025-2026
-- Run this in Supabase SQL Editor

-- First, let's see what we have
SELECT 
    sy.id as school_year_id,
    sy.academic_year,
    sy.is_active,
    s.id as semester_id,
    s.name,
    s.applications_open,
    s.start_date,
    s.end_date
FROM school_years sy
LEFT JOIN semesters s ON sy.id = s.school_year_id
WHERE sy.academic_year = 2025
ORDER BY sy.academic_year, s.name;

-- If you need to create missing semesters, uncomment and run:
-- (Make sure to replace <school_year_id> with the actual ID from the query above)

/*
-- Get the school year ID for 2025-2026
DO $$
DECLARE
    v_school_year_id UUID;
    v_first_exists BOOLEAN;
    v_second_exists BOOLEAN;
BEGIN
    -- Get the school year ID
    SELECT id INTO v_school_year_id 
    FROM school_years 
    WHERE academic_year = 2025;
    
    IF v_school_year_id IS NULL THEN
        RAISE EXCEPTION 'School year 2025-2026 not found. Please create it first.';
    END IF;
    
    -- Check if semesters exist
    SELECT EXISTS (SELECT 1 FROM semesters WHERE school_year_id = v_school_year_id AND name = 'FIRST') INTO v_first_exists;
    SELECT EXISTS (SELECT 1 FROM semesters WHERE school_year_id = v_school_year_id AND name = 'SECOND') INTO v_second_exists;
    
    -- Create First Semester if missing
    IF NOT v_first_exists THEN
        INSERT INTO semesters (school_year_id, name, applications_open, start_date, end_date)
        VALUES (
            v_school_year_id,
            'FIRST',
            true,  -- Set to true if you want applications open
            '2025-08-01',  -- Adjust dates as needed
            '2025-12-31'
        );
        RAISE NOTICE 'Created First Semester for A.Y. 2025-2026';
    END IF;
    
    -- Create Second Semester if missing
    IF NOT v_second_exists THEN
        INSERT INTO semesters (school_year_id, name, applications_open, start_date, end_date)
        VALUES (
            v_school_year_id,
            'SECOND',
            false,  -- Set to true if you want applications open
            '2026-01-01',  -- Adjust dates as needed
            '2026-05-31'
        );
        RAISE NOTICE 'Created Second Semester for A.Y. 2025-2026';
    END IF;
END $$;
*/

-- After running, verify both semesters exist:
SELECT 
    sy.academic_year,
    s.name,
    s.applications_open,
    s.start_date,
    s.end_date
FROM semesters s
JOIN school_years sy ON s.school_year_id = sy.id
WHERE sy.academic_year = 2025
ORDER BY s.name;
