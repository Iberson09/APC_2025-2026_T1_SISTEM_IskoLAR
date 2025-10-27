-- Quick check: View all semesters for the current academic year
SELECT 
    sy.academic_year,
    sy.is_active,
    s.name,
    s.applications_open,
    s.start_date,
    s.end_date,
    CASE 
        WHEN s.name = 'FIRST' THEN 'First Semester'
        WHEN s.name = 'SECOND' THEN 'Second Semester'
        ELSE s.name
    END as display_name,
    CASE 
        WHEN s.applications_open AND s.start_date <= CURRENT_DATE AND s.end_date >= CURRENT_DATE 
        THEN 'OPEN'
        ELSE 'CLOSED'
    END as status
FROM school_years sy
LEFT JOIN semesters s ON sy.id = s.school_year_id
WHERE sy.academic_year = 2025
ORDER BY sy.academic_year, s.name;

-- If you need to add missing semesters or update existing ones:
-- Uncomment the section below and adjust as needed

/*
-- Get the school year ID
DO $$
DECLARE
    v_school_year_id UUID;
BEGIN
    SELECT id INTO v_school_year_id 
    FROM school_years 
    WHERE academic_year = 2025 AND is_active = true;
    
    IF v_school_year_id IS NULL THEN
        RAISE EXCEPTION 'School year 2025-2026 not found or not active';
    END IF;
    
    -- Insert or update First Semester
    INSERT INTO semesters (school_year_id, name, applications_open, start_date, end_date)
    VALUES (
        v_school_year_id,
        'FIRST',
        false,  -- Change to true to open applications
        '2025-08-01',
        '2025-12-31'
    )
    ON CONFLICT (school_year_id, name) 
    DO UPDATE SET
        applications_open = EXCLUDED.applications_open,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date;
    
    -- Insert or update Second Semester
    INSERT INTO semesters (school_year_id, name, applications_open, start_date, end_date)
    VALUES (
        v_school_year_id,
        'SECOND',
        true,  -- Change to true to open applications
        '2026-01-01',
        '2026-05-31'
    )
    ON CONFLICT (school_year_id, name) 
    DO UPDATE SET
        applications_open = EXCLUDED.applications_open,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date;
        
    RAISE NOTICE 'Semesters configured successfully';
END $$;
*/

-- Verify the result
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
