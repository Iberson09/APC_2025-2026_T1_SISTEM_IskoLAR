-- Quick Setup Script for Semester-Scoped Applications
-- Run this in Supabase SQL Editor

-- This script combines all necessary changes for semester-scoped applications

-- 1. Ensure semester_id exists in application_details table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'application_details' AND column_name = 'semester_id'
    ) THEN
        ALTER TABLE application_details 
        ADD COLUMN semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add unique constraint
DROP INDEX IF EXISTS application_details_user_semester_uniq;
CREATE UNIQUE INDEX application_details_user_semester_uniq ON application_details(user_id, semester_id) 
WHERE semester_id IS NOT NULL;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_details_semester ON application_details(semester_id);
CREATE INDEX IF NOT EXISTS idx_application_details_user ON application_details(user_id);
CREATE INDEX IF NOT EXISTS idx_application_details_status ON application_details(status);

-- 4. Create helper function to get active open semester
CREATE OR REPLACE FUNCTION get_active_open_semester()
RETURNS TABLE (
    semester_id UUID,
    semester_name TEXT,
    school_year_id UUID,
    academic_year INTEGER,
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as semester_id,
        s.name as semester_name,
        sy.id as school_year_id,
        sy.academic_year,
        s.start_date,
        s.end_date
    FROM semesters s
    JOIN school_years sy ON s.school_year_id = sy.id
    WHERE sy.is_active = true
      AND s.applications_open = true
      AND CURRENT_DATE BETWEEN s.start_date AND s.end_date
    ORDER BY s.start_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create validation function
CREATE OR REPLACE FUNCTION can_accept_applications(p_semester_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_accept BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM semesters s
        JOIN school_years sy ON s.school_year_id = sy.id
        WHERE s.id = p_semester_id
          AND sy.is_active = true
          AND s.applications_open = true
          AND CURRENT_DATE BETWEEN s.start_date AND s.end_date
    ) INTO v_can_accept;
    
    RETURN v_can_accept;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop old RLS policies
DROP POLICY IF EXISTS "Enable read for own applications" ON application_details;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON application_details;
DROP POLICY IF EXISTS "Enable update/delete for admins only" ON application_details;
DROP POLICY IF EXISTS "Scholars can read own applications" ON application_details;
DROP POLICY IF EXISTS "Admins can read all applications" ON application_details;
DROP POLICY IF EXISTS "Scholars can insert own applications" ON application_details;
DROP POLICY IF EXISTS "Admins can update applications" ON application_details;
DROP POLICY IF EXISTS "Scholars can insert applications in open semesters" ON application_details;
DROP POLICY IF EXISTS "Admins can update application status" ON application_details;
DROP POLICY IF EXISTS "Admins can delete applications" ON application_details;

-- 7. Create new RLS policies
CREATE POLICY "Scholars can read own applications" ON application_details
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM admin
            WHERE admin.email_address = (auth.jwt() ->> 'email')
        )
    );

CREATE POLICY "Scholars can insert applications in open semesters" ON application_details
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND
        NOT EXISTS (
            SELECT 1 FROM admin
            WHERE admin.email_address = (auth.jwt() ->> 'email')
        )
        AND
        can_accept_applications(semester_id)
    );

CREATE POLICY "Admins can update application status" ON application_details
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin
            WHERE admin.email_address = (auth.jwt() ->> 'email')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin
            WHERE admin.email_address = (auth.jwt() ->> 'email')
        )
    );

CREATE POLICY "Admins can delete applications" ON application_details
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin
            WHERE admin.email_address = (auth.jwt() ->> 'email')
            AND admin.role_id = '4f53ccf0-9d4a-4345-8061-50a1e728494d'
        )
    );

-- 8. Create statistics view
CREATE OR REPLACE VIEW application_stats_by_semester AS
SELECT 
    s.id as semester_id,
    s.name as semester_name,
    sy.academic_year,
    sy.id as school_year_id,
    s.applications_open,
    s.start_date,
    s.end_date,
    COUNT(a.appdet_id) as total_applications,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count
FROM semesters s
JOIN school_years sy ON s.school_year_id = sy.id
LEFT JOIN application_details a ON s.id = a.semester_id
GROUP BY s.id, s.name, sy.academic_year, sy.id, s.applications_open, s.start_date, s.end_date;

GRANT SELECT ON application_stats_by_semester TO authenticated;

-- 9. Add update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_applications_updated_at ON application_details;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON application_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Update application status constraint to only allow 3 statuses
ALTER TABLE application_details 
DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE application_details
ADD CONSTRAINT applications_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update any existing records with old statuses
UPDATE application_details 
SET status = 'pending' 
WHERE status IN ('submitted', 'under_review', 'withdrawn');

COMMENT ON COLUMN application_details.status IS 
'Application status: pending (awaiting review), approved (accepted), rejected (denied)';

-- Done! Semester-scoped applications are now configured.
-- Test with: SELECT * FROM get_active_open_semester();
