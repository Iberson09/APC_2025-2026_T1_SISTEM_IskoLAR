-- Migration: Semester-scoped Applications
-- This migration ensures applications are properly linked to semesters with appropriate constraints

-- Step 1: Ensure semester_id exists and is properly constrained
DO $$ 
BEGIN
    -- Check if semester_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'application_details' AND column_name = 'semester_id'
    ) THEN
        ALTER TABLE application_details 
        ADD COLUMN semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 2: Add unique constraint to prevent duplicate applications per semester
DROP INDEX IF EXISTS application_details_user_semester_uniq;
CREATE UNIQUE INDEX application_details_user_semester_uniq ON application_details(user_id, semester_id) 
WHERE semester_id IS NOT NULL;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_application_details_semester ON application_details(semester_id);
CREATE INDEX IF NOT EXISTS idx_application_details_user ON application_details(user_id);
CREATE INDEX IF NOT EXISTS idx_application_details_status ON application_details(status);

-- Step 4: Create function to get active open semester
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

-- Step 5: Create function to check if semester accepts applications
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

-- Step 6: Drop existing RLS policies on application_details
DROP POLICY IF EXISTS "Enable read for own applications" ON application_details;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON application_details;
DROP POLICY IF EXISTS "Enable update/delete for admins only" ON application_details;
DROP POLICY IF EXISTS "Scholars can read own applications" ON application_details;
DROP POLICY IF EXISTS "Admins can read all applications" ON application_details;
DROP POLICY IF EXISTS "Scholars can insert own applications" ON application_details;
DROP POLICY IF EXISTS "Admins can update applications" ON application_details;

-- Step 7: Create new RLS policies

-- SELECT: Scholars see their own, admins see all
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

-- INSERT: Only scholars can create applications in open semesters of active years
CREATE POLICY "Scholars can insert applications in open semesters" ON application_details
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Must be their own application
        user_id = auth.uid()
        AND
        -- Must not be an admin (scholars only)
        NOT EXISTS (
            SELECT 1 FROM admin
            WHERE admin.email_address = (auth.jwt() ->> 'email')
        )
        AND
        -- Semester must accept applications
        can_accept_applications(semester_id)
    );

-- UPDATE: Admins can update status, scholars cannot update after creation
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

-- DELETE: Only admins can soft-delete (we'll use status updates instead)
CREATE POLICY "Admins can delete applications" ON application_details
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin
            WHERE admin.email_address = (auth.jwt() ->> 'email')
            AND admin.role_id = '4f53ccf0-9d4a-4345-8061-50a1e728494d' -- super_admin
        )
    );

-- Step 8: Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_application_details_updated_at ON application_details;
CREATE TRIGGER update_application_details_updated_at
    BEFORE UPDATE ON application_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create view for admin dashboard statistics
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

-- Grant permissions on the view
GRANT SELECT ON application_stats_by_semester TO authenticated;

-- Step 10: Add comments for documentation
COMMENT ON FUNCTION get_active_open_semester() IS 
'Returns the currently active and open semester for new applications. Returns single row or empty if none available.';

COMMENT ON FUNCTION can_accept_applications(UUID) IS 
'Checks if a semester can accept new applications based on active status, open flag, and date range.';

COMMENT ON TABLE application_details IS 
'Stores scholarship applications. Each application is linked to a specific semester via semester_id.';

COMMENT ON COLUMN application_details.semester_id IS 
'Foreign key to semesters table. Determines which semester this application belongs to.';

COMMENT ON INDEX application_details_user_semester_uniq IS 
'Ensures a user can only have one application per semester.';
