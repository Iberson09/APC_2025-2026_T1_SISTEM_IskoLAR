# Fix for Scholarship Tab - Semester Display Issue

## Problem
The scholarship tab in the scholar sidebar is only showing "Second Semester" and it's not clickable, preventing scholars from submitting applications.

## Root Causes
1. **Database Naming Mismatch**: The code expects semester names as `'FIRST'` and `'SECOND'` (uppercase), but the database might have `'First Semester'` or `'Second Semester'`
2. **Missing Semesters**: Only one semester might exist in the database for A.Y. 2025-2026
3. **Inactive/Closed Semesters**: Semesters might not have `applications_open = true` or proper start/end dates

## Solution

### Step 1: Fix Database Migration Files ✅ (Already Done)
- Updated `20251019_add_school_years.sql` to use `('FIRST', 'SECOND')`
- Updated `20251021_add_semester_dates.sql` to use `('FIRST', 'SECOND')`

### Step 2: Fix Existing Data in Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix existing semester names to match the expected format
-- Drop the constraint temporarily
ALTER TABLE semesters 
DROP CONSTRAINT IF EXISTS semesters_name_check;

-- Update existing semester names
UPDATE semesters 
SET name = 'FIRST' 
WHERE name ILIKE '%first%' OR name = '1st' OR name = '1st Semester';

UPDATE semesters 
SET name = 'SECOND' 
WHERE name ILIKE '%second%' OR name = '2nd' OR name = '2nd Semester';

-- Re-add the correct constraint
ALTER TABLE semesters
ADD CONSTRAINT semesters_name_check 
CHECK (name IN ('FIRST', 'SECOND'));

-- Verify the changes
SELECT 
    sy.academic_year,
    s.id,
    s.name,
    s.applications_open,
    s.start_date,
    s.end_date
FROM semesters s
JOIN school_years sy ON s.school_year_id = sy.id
WHERE sy.is_active = true
ORDER BY s.name;
```

### Step 3: Create Missing Semesters (if needed)

If the query above shows only one semester or none, run this:

```sql
-- Create both semesters for A.Y. 2025-2026
DO $$
DECLARE
    v_school_year_id UUID;
    v_first_exists BOOLEAN;
    v_second_exists BOOLEAN;
BEGIN
    -- Get the school year ID for 2025-2026
    SELECT id INTO v_school_year_id 
    FROM school_years 
    WHERE academic_year = 2025 AND is_active = true;
    
    IF v_school_year_id IS NULL THEN
        RAISE EXCEPTION 'Active school year 2025-2026 not found. Please create it first using the admin panel.';
    END IF;
    
    -- Check if semesters exist
    SELECT EXISTS (
        SELECT 1 FROM semesters 
        WHERE school_year_id = v_school_year_id AND name = 'FIRST'
    ) INTO v_first_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM semesters 
        WHERE school_year_id = v_school_year_id AND name = 'SECOND'
    ) INTO v_second_exists;
    
    -- Create First Semester if missing
    IF NOT v_first_exists THEN
        INSERT INTO semesters (school_year_id, name, applications_open, start_date, end_date)
        VALUES (
            v_school_year_id,
            'FIRST',
            true,  -- Set to true to allow applications
            '2025-08-01',  -- First day of August 2025
            '2025-12-31'   -- Last day of December 2025
        );
        RAISE NOTICE 'Created First Semester for A.Y. 2025-2026';
    ELSE
        RAISE NOTICE 'First Semester already exists';
    END IF;
    
    -- Create Second Semester if missing
    IF NOT v_second_exists THEN
        INSERT INTO semesters (school_year_id, name, applications_open, start_date, end_date)
        VALUES (
            v_school_year_id,
            'SECOND',
            true,  -- Set to true to allow applications
            '2026-01-01',  -- First day of January 2026
            '2026-05-31'   -- Last day of May 2026
        );
        RAISE NOTICE 'Created Second Semester for A.Y. 2025-2026';
    ELSE
        RAISE NOTICE 'Second Semester already exists';
    END IF;
END $$;

-- Verify both semesters were created
SELECT 
    sy.academic_year,
    s.name,
    s.applications_open,
    s.start_date,
    s.end_date,
    CASE 
        WHEN s.name = 'FIRST' THEN 'First Semester'
        WHEN s.name = 'SECOND' THEN 'Second Semester'
    END as display_name
FROM semesters s
JOIN school_years sy ON s.school_year_id = sy.id
WHERE sy.academic_year = 2025
ORDER BY s.name;
```

### Step 4: Verify the Fix

After running the SQL:

1. **Check the database**: The last query above should show both FIRST and SECOND semesters
2. **Refresh the application**: Reload your Next.js app (it should auto-reload in dev mode)
3. **Check the sidebar**: Navigate to the scholar dashboard and expand the "Scholarship" dropdown
4. **Expected result**: 
   - You should see "A.Y. 2025 – 2026"
   - Under it: "First Semester" and "Second Semester"
   - Both should be clickable
   - If `applications_open = true` and dates are current, you'll see a green "Open" badge

## What Was Fixed in the Code

1. **ScholarSideBar.tsx**: 
   - Removed all Summer Term logic
   - Simplified to only handle FIRST and SECOND semesters
   - Fixed dropdown state management

2. **Application & Status Pages**:
   - Updated formatSemesterName() to only handle FIRST/SECOND
   - Removed Summer Term cases

3. **Type Definitions**:
   - Updated AppSemester type to only include "First Semester" | "Second Semester"

4. **Database Migrations**:
   - Ensured CHECK constraints only allow 'FIRST' and 'SECOND'

## Troubleshooting

If semesters still don't show:

1. **Check browser console** for any errors
2. **Verify database connection**: Make sure Supabase credentials are correct in `.env.local`
3. **Check RLS policies**: Ensure scholars can read from `school_years` and `semesters` tables
4. **Verify school year is active**: Run `SELECT * FROM school_years WHERE academic_year = 2025;` and check `is_active = true`

## Next Steps for Admin Interface

Consider adding a UI in the admin panel to:
- Create/edit semesters
- Toggle `applications_open` status
- Set semester start/end dates
- This would make it easier to manage without SQL queries
