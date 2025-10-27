-- ============================================
-- CRITICAL FIX: Admin RLS Policy
-- Run this SQL in your Supabase SQL Editor
-- ============================================
-- This fixes the circular dependency in the admin table RLS policy
-- that is causing "Failed to fetch admins" error

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "admin_select_all" ON public.admin;

-- 2. Create new policy that allows authenticated users to read admin table
CREATE POLICY "admin_select_all" ON public.admin
  FOR SELECT 
  TO authenticated
  USING (true);

-- 3. Verify the policy was created successfully
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

-- Expected result: You should see one row with:
-- - policyname: admin_select_all
-- - cmd: SELECT
-- - qual: true

-- ============================================
-- TESTING
-- ============================================
-- After running the above SQL, test with these queries:

-- Test 1: Can you read from admin table?
SELECT 
  admin_id,
  email_address,
  role_id,
  created_at
FROM public.admin
ORDER BY created_at DESC;

-- Test 2: Can you join with role table?
SELECT 
  a.admin_id,
  a.email_address,
  r.name as role_name,
  r.description as role_description
FROM public.admin a
LEFT JOIN public.role r ON a.role_id = r.role_id
ORDER BY a.created_at DESC;

-- If both queries return results, your fix is working! ✅
-- Now refresh your admin management page and the "Failed to fetch admins" error should be gone.
