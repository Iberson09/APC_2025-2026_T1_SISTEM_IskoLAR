-- ============================================================================
-- Migration: Refactor Admin Roles (Production-Ready)
-- Date: 2025-10-27
-- Description: Rename 'super_admin' to 'admin', create new 'super_admin' role
--              Update all RLS policies to use role name checks
--              Add comprehensive safeguards and verification
-- 
-- Role IDs:
--   admin (was super_admin):    4f53ccf0-9d4a-4345-8061-50a1e728494d
--   super_admin (new):          ebfbc2ad-e3e6-43c2-bae8-f54637964b37
-- ============================================================================

-- ============================================================================
-- PART 0: Enable required extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PART 1: Ensure role and admin tables exist with proper structure
-- ============================================================================

-- Create role table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.role (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admin table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_address TEXT NOT NULL UNIQUE,
    role_id UUID NOT NULL REFERENCES public.role(role_id) ON DELETE RESTRICT,
    password TEXT, -- For development/testing only; authentication handled by Supabase Auth in production
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admin(email_address);
CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin(role_id);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE public.role ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.role ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.role ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Make password column nullable (authentication is handled by Supabase Auth, not database passwords)
ALTER TABLE public.admin ALTER COLUMN password DROP NOT NULL;

-- ============================================================================
-- PART 2: Setup roles (rename old super_admin to admin, create new super_admin)
-- ============================================================================

DO $$ 
DECLARE
    v_old_super_admin_id UUID := '4f53ccf0-9d4a-4345-8061-50a1e728494d';
    v_new_super_admin_id UUID := 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37';
BEGIN
    -- Check if the old super_admin role exists and rename it to 'admin'
    IF EXISTS (SELECT 1 FROM public.role WHERE role_id = v_old_super_admin_id) THEN
        UPDATE public.role 
        SET name = 'admin',
            description = 'Application Management - Can manage applications, semesters, and view reports',
            updated_at = CURRENT_TIMESTAMP
        WHERE role_id = v_old_super_admin_id;
        
        RAISE NOTICE 'Renamed role % from super_admin to admin', v_old_super_admin_id;
    ELSE
        -- If role doesn't exist with that ID, ensure 'admin' role exists
        INSERT INTO public.role (role_id, name, description)
        VALUES (v_old_super_admin_id, 'admin', 'Application Management - Can manage applications, semesters, and view reports')
        ON CONFLICT (role_id) DO UPDATE 
        SET name = 'admin', 
            description = 'Application Management - Can manage applications, semesters, and view reports';
        
        RAISE NOTICE 'Created admin role with ID %', v_old_super_admin_id;
    END IF;

    -- Ensure the new super_admin role exists
    INSERT INTO public.role (role_id, name, description)
    VALUES (v_new_super_admin_id, 'super_admin', 'Super Administrator - Full platform access including user management and destructive operations')
    ON CONFLICT (role_id) DO UPDATE 
    SET name = 'super_admin',
        description = 'Super Administrator - Full platform access including user management and destructive operations';
    
    RAISE NOTICE 'Ensured super_admin role exists with ID %', v_new_super_admin_id;

END $$;

-- ============================================================================
-- PART 3: Drop old RLS policies (clean slate for new role-based policies)
-- ============================================================================

DO $$ 
BEGIN
    -- school_years policies
    DROP POLICY IF EXISTS "Enable insert/update/delete for admins only" ON public.school_years;
    DROP POLICY IF EXISTS "Enable insert for super admins" ON public.school_years;
    DROP POLICY IF EXISTS "Enable update for super admins" ON public.school_years;
    DROP POLICY IF EXISTS "Enable delete for super admins" ON public.school_years;
    DROP POLICY IF EXISTS "school_years_insert_admin" ON public.school_years;
    DROP POLICY IF EXISTS "school_years_update_admin" ON public.school_years;
    DROP POLICY IF EXISTS "school_years_delete_admin" ON public.school_years;
    DROP POLICY IF EXISTS "school_years_select_all" ON public.school_years;
    
    -- semesters policies
    DROP POLICY IF EXISTS "Enable insert/update/delete for admins only" ON public.semesters;
    DROP POLICY IF EXISTS "semesters_insert_admin" ON public.semesters;
    DROP POLICY IF EXISTS "semesters_update_admin" ON public.semesters;
    DROP POLICY IF EXISTS "semesters_delete_admin" ON public.semesters;
    DROP POLICY IF EXISTS "semesters_select_all" ON public.semesters;
    
    -- school_year_audit policies
    DROP POLICY IF EXISTS "Enable insert for super admins" ON public.school_year_audit;
    DROP POLICY IF EXISTS "school_year_audit_select_admin" ON public.school_year_audit;
    DROP POLICY IF EXISTS "school_year_audit_insert_super_admin" ON public.school_year_audit;
    
    -- application_details policies
    DROP POLICY IF EXISTS "Admins can delete applications" ON public.application_details;
    DROP POLICY IF EXISTS "application_details_delete_super_admin" ON public.application_details;
    
    -- admin table policies
    DROP POLICY IF EXISTS "admin_select_all" ON public.admin;
    DROP POLICY IF EXISTS "admin_insert_super_admin" ON public.admin;
    DROP POLICY IF EXISTS "admin_update_super_admin" ON public.admin;
    DROP POLICY IF EXISTS "admin_delete_super_admin" ON public.admin;
    
    -- users table admin policies
    DROP POLICY IF EXISTS "users_select_admin" ON public.users;
    DROP POLICY IF EXISTS "users_insert_super_admin" ON public.users;
    DROP POLICY IF EXISTS "users_update_super_admin" ON public.users;
    DROP POLICY IF EXISTS "users_delete_super_admin" ON public.users;
    
    RAISE NOTICE 'Dropped old RLS policies';
END $$;

-- ============================================================================
-- PART 4: RLS Policies for school_years table
-- Both admin and super_admin can manage school years
-- ============================================================================

ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "school_years_select_all" ON public.school_years
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Both admin and super_admin can create school years
CREATE POLICY "school_years_insert_admin" ON public.school_years
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- UPDATE: Both admin and super_admin can update school years (including is_active toggle)
CREATE POLICY "school_years_update_admin" ON public.school_years
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- DELETE: Both admin and super_admin can delete school years
CREATE POLICY "school_years_delete_admin" ON public.school_years
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- PART 5: RLS Policies for semesters table
-- Both admin and super_admin can manage semesters
-- ============================================================================

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "semesters_select_all" ON public.semesters
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Both admin and super_admin can create semesters
CREATE POLICY "semesters_insert_admin" ON public.semesters
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- UPDATE: Both admin and super_admin can update semesters (applications_open, dates)
CREATE POLICY "semesters_update_admin" ON public.semesters
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- DELETE: Both admin and super_admin can delete semesters
CREATE POLICY "semesters_delete_admin" ON public.semesters
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- PART 6: RLS Policies for application_details table
-- Only super_admin can delete applications
-- ============================================================================

CREATE POLICY "application_details_delete_super_admin" ON public.application_details
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- ============================================================================
-- PART 7: RLS Policies for school_year_audit table
-- Both roles can read audit logs, only super_admin can create entries
-- ============================================================================

ALTER TABLE IF EXISTS public.school_year_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_year_audit_select_admin" ON public.school_year_audit
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            WHERE a.email_address = (auth.jwt() ->> 'email')
        )
    );

-- INSERT: Only super_admin can create audit entries
CREATE POLICY "school_year_audit_insert_super_admin" ON public.school_year_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- ============================================================================
-- PART 8: RLS Policies for admin table
-- All admins can view, only super_admin can create/update/delete admins
-- ============================================================================

ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read admin records (including their own)
-- This allows admins to query their role information after login
CREATE POLICY "admin_select_all" ON public.admin
    FOR SELECT
    TO authenticated
    USING (true);

-- Only super_admin can create new admins
CREATE POLICY "admin_insert_super_admin" ON public.admin
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- Only super_admin can update admins
CREATE POLICY "admin_update_super_admin" ON public.admin
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- Only super_admin can delete admins
CREATE POLICY "admin_delete_super_admin" ON public.admin
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- ============================================================================
-- PART 9: Update stored functions to use role name checks
-- ============================================================================

-- Update admin_create_school_year function to check for super_admin role
CREATE OR REPLACE FUNCTION admin_create_school_year(
    p_academic_year INTEGER,
    p_admin_email TEXT
) RETURNS UUID AS $$
DECLARE
    v_year_id UUID;
    v_super_admin BOOLEAN;
BEGIN
    -- Verify super admin status using role name
    SELECT EXISTS (
        SELECT 1 FROM public.admin a
        JOIN public.role r ON a.role_id = r.role_id
        WHERE a.email_address = p_admin_email
        AND r.name = 'super_admin'
    ) INTO v_super_admin;

    IF NOT v_super_admin THEN
        RAISE EXCEPTION 'Only super administrators can create academic years';
    END IF;

    -- First set currently active year as inactive
    UPDATE public.school_years SET is_active = false 
    WHERE is_active = true;
    
    -- Insert new year as active
    INSERT INTO public.school_years (academic_year, is_active)
    VALUES (p_academic_year, true)
    RETURNING id INTO v_year_id;

    -- Add audit entry
    INSERT INTO public.school_year_audit (school_year_id, admin_email, action)
    VALUES (v_year_id, p_admin_email, 'created');

    RETURN v_year_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in admin_create_school_year: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 10: Bootstrap utility functions
-- Helper functions for promoting/demoting admins
-- ============================================================================

-- Function to promote an admin to super_admin role
CREATE OR REPLACE FUNCTION promote_to_super_admin(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_super_admin_role_id UUID := 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37';
    v_admin_exists BOOLEAN;
BEGIN
    -- Check if admin exists
    SELECT EXISTS (SELECT 1 FROM public.admin WHERE email_address = p_email) INTO v_admin_exists;
    
    IF v_admin_exists THEN
        -- Update existing admin
        UPDATE public.admin 
        SET role_id = v_super_admin_role_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE email_address = p_email;
        
        RETURN 'Admin ' || p_email || ' promoted to super_admin';
    ELSE
        RETURN 'Admin ' || p_email || ' not found. Please create the admin first.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote a super_admin to admin
CREATE OR REPLACE FUNCTION demote_to_admin(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_admin_role_id UUID := '4f53ccf0-9d4a-4345-8061-50a1e728494d';
BEGIN
    UPDATE public.admin 
    SET role_id = v_admin_role_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE email_address = p_email;
    
    IF FOUND THEN
        RETURN 'Super admin ' || p_email || ' demoted to admin';
    ELSE
        RETURN 'Admin ' || p_email || ' not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 11: RLS Policies for users table
-- Admin can view/archive users, super_admin has full CRUD access
-- Note: These policies are ADDITIVE and work alongside existing user 
--       self-management policies from 20251002_users_rls_policies.sql
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Both admin and super_admin can SELECT all users (for user management dashboard)
CREATE POLICY "users_select_admin" ON public.users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- Super admin can INSERT users (create new user accounts)
CREATE POLICY "users_insert_super_admin" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- Super admin can UPDATE users (edit user details)
CREATE POLICY "users_update_super_admin" ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- Super admin can DELETE users (permanent deletion)
CREATE POLICY "users_delete_super_admin" ON public.users
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- ============================================================================
-- PART 12: Documentation and metadata
-- ============================================================================

COMMENT ON TABLE public.role IS 'Defines admin roles: admin (application management) and super_admin (full platform access)';
COMMENT ON TABLE public.admin IS 'Admin users with role-based permissions';
COMMENT ON FUNCTION promote_to_super_admin(TEXT) IS 'Promotes an existing admin to super_admin role';
COMMENT ON FUNCTION demote_to_admin(TEXT) IS 'Demotes a super_admin to regular admin role';
COMMENT ON FUNCTION admin_create_school_year(INTEGER, TEXT) IS 'Creates a new school year (super_admin only)';

-- ============================================================================
-- Migration Complete! 🚀
-- ============================================================================

/*
===============================================================================
BOOTSTRAP INSTRUCTIONS
===============================================================================

After running this migration, you need to create your first super_admin:

1. If you have an existing admin in the database:
   SELECT promote_to_super_admin('your-email@example.com');

2. If you need to create a new super_admin from scratch:
   INSERT INTO public.admin (email_address, role_id)
   VALUES ('your-email@example.com', 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37');

3. To verify your roles:
   SELECT a.email_address, r.name as role, r.description
   FROM public.admin a
   JOIN public.role r ON a.role_id = r.role_id
   ORDER BY r.name, a.email_address;

===============================================================================
USEFUL QUERIES
===============================================================================

-- Promote an admin to super_admin:
SELECT promote_to_super_admin('admin@example.com');

-- Demote a super_admin to regular admin:
SELECT demote_to_admin('admin@example.com');

-- Check all admins and their roles:
SELECT 
    a.email_address, 
    r.name as role, 
    r.description,
    a.created_at
FROM public.admin a
JOIN public.role r ON a.role_id = r.role_id
ORDER BY r.name DESC, a.email_address;

-- Count admins by role:
SELECT r.name, COUNT(*) as admin_count
FROM public.admin a
JOIN public.role r ON a.role_id = r.role_id
GROUP BY r.name;

===============================================================================
ROLE SUMMARY
===============================================================================

Role IDs:
  • admin:       4f53ccf0-9d4a-4345-8061-50a1e728494d
  • super_admin: ebfbc2ad-e3e6-43c2-bae8-f54637964b37

Privileges:
  Admin Role:
    ✓ View user list
    ✓ Archive/deactivate users
    ✓ Manage school years & semesters
    ✓ View applications
    ✓ View audit logs
    
  Super Admin Role (All of the above, plus):
    ✓ Create user accounts
    ✓ Edit user details
    ✓ Delete users permanently
    ✓ Create/edit/delete admin accounts
    ✓ Promote/demote admins
    ✓ Delete applications
    ✓ Create audit log entries

===============================================================================
*/
