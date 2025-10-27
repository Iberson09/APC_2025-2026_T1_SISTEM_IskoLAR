-- ============================================================================
-- Fix Admin Table RLS Policy
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the circular dependency issue
-- that prevents admins from querying their own role information
-- ============================================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "admin_select_all" ON public.admin;

-- Create new policy that allows all authenticated users to read admin records
-- This allows admins to query their role information after login
CREATE POLICY "admin_select_all" ON public.admin
    FOR SELECT
    TO authenticated
    USING (true);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'admin' 
AND policyname = 'admin_select_all';

-- Expected output:
-- The policy should exist and show:
-- - permissive: PERMISSIVE
-- - roles: {authenticated}
-- - cmd: SELECT
-- - qual: true
