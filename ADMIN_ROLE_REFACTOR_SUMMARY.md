# Admin Role Refactoring - Implementation Summary

**Date:** October 27, 2025  
**Status:** Implementation Complete - Ready for Testing

## Overview

Successfully refactored the admin role model from a single "super_admin" role to a two-tier system:
- **admin** - Application Management (previously "super_admin")
- **super_admin** - Super Administrator with full platform access

## Changes Implemented

### 1. Database Migration ✅
**File:** `iskolar/supabase/migrations/20251027_refactor_admin_roles.sql`

- Renames existing 'super_admin' role to 'admin' (keeps UUID: `4f53ccf0-9d4a-4345-8061-50a1e728494d`)
- Creates new 'super_admin' role (UUID: `ebfbc2ad-e3e6-43c2-bae8-f54637964b37`)
- Updates all RLS policies to use role name checks instead of hardcoded GUIDs
- Adds RLS for admin table (super_admin can CRUD admins)
- Provides bootstrap functions: `promote_to_super_admin()`, `demote_to_admin()`
- Idempotent - safe to run multiple times

### 2. Role Constants and Guards ✅
**File:** `iskolar/lib/auth/roles.ts`

Created centralized role management with:
- `ROLE_NAMES`: Constants for all role names
- `ROLE_IDS`: UUID mappings for all roles
- `ROLE_INFO`: Display titles and descriptions for each role
- `isAdmin(email)`: Checks if user is admin or super_admin
- `isSuperAdmin(email)`: Checks if user is specifically super_admin
- `hasPermission(email, requiredRole)`: Permission check helper
- `getAdminByEmail(email)`: Fetches full admin data with role

### 3. API Route Updates ✅

**Updated Files:**
- `app/api/admin/school-years/route.ts` - POST requires super_admin
- `app/api/admin/school-years/[id]/route.ts` - DELETE requires super_admin
- `app/api/admin/semesters/[id]/route.ts` - DELETE requires super_admin
- `app/api/admin-auth/me/route.ts` - NEW: Returns current admin's role info

**Authorization Rules:**
- School Year CREATE/DELETE → super_admin only
- School Year UPDATE (is_active) → super_admin only
- Semester CREATE/DELETE → super_admin only
- Semester UPDATE (dates, applications_open) → admin OR super_admin
- Application DELETE → super_admin only
- Admin CRUD → super_admin only

### 4. Token and Auth Updates ✅
**File:** `iskolar/lib/utils/tokens.ts`

Extended `TokenData` interface to include:
```typescript
roleName?: 'admin' | 'super_admin' | 'finance' | 'reviewer';
```

### 5. UI Updates ✅
**File:** `iskolar/app/components/admin/AdminSidebar.tsx`

- Fetches admin role from `/api/admin-auth/me`
- Displays role-based subtitle:
  - admin → "Application Management"
  - super_admin → "Super Administrator"
- Shows "Administrator" vs "Super Admin" label based on role

### 6. RLS Policy Updates ✅

All policies now use role name checks via JOIN instead of hardcoded GUIDs:

```sql
EXISTS (
  SELECT 1 FROM public.admin a
  JOIN public.role r ON a.role_id = r.role_id
  WHERE a.email_address = (auth.jwt() ->> 'email')
  AND r.name = 'super_admin'
)
```

## Role ID Mapping

| Role | UUID | Previous Name |
|------|------|---------------|
| admin | `4f53ccf0-9d4a-4345-8061-50a1e728494d` | super_admin |
| super_admin | `ebfbc2ad-e3e6-43c2-bae8-f54637964b37` | (new) |

## Testing Instructions

### Step 1: Run the Migration

```sql
-- In Supabase SQL Editor, run:
-- File: iskolar/supabase/migrations/20251027_refactor_admin_roles.sql
```

### Step 2: Bootstrap a Super Admin

```sql
-- Option A: Promote existing admin
SELECT promote_to_super_admin('youradmin@example.com');

-- Option B: Create new super_admin directly
INSERT INTO public.admin (email_address, role_id)
VALUES ('superadmin@example.com', 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37')
ON CONFLICT (email_address) DO UPDATE SET role_id = EXCLUDED.role_id;
```

### Step 3: Verify Roles

```sql
-- Check all admins and their roles
SELECT a.email_address, r.name as role, r.description
FROM public.admin a
JOIN public.role r ON a.role_id = r.role_id
ORDER BY r.name, a.email_address;
```

### Step 4: Test Admin (Application Management)

**Login as admin**, then test:

✅ **Should Work:**
- View dashboard
- View all applications
- Update semester dates
- Toggle applications_open
- View users
- Create/edit announcements

❌ **Should Fail (403 Forbidden):**
- Create new school year
- Delete school year
- Create new semester
- Delete semester
- Delete applications
- Create/delete admin users

**Expected UI:**
- Sidebar shows: "Administrator" / "Application Management"
- No "Create Admin" buttons visible

### Step 5: Test Super Admin

**Login as super_admin**, then test:

✅ **Should Work:**
- Everything admin can do, plus:
- Create new school year
- Delete school year (with password confirmation)
- Create new semester
- Delete semester (with password confirmation)
- Delete applications
- Create/update/delete admin users

**Expected UI:**
- Sidebar shows: "Super Admin" / "Super Administrator"
- Admin management features visible

### Step 6: Test API Endpoints

```bash
# Test school year creation (super_admin only)
curl -X POST http://localhost:3000/api/admin/school-years \
  -H "Content-Type: application/json" \
  -d '{
    "adminEmail": "superadmin@example.com",
    "adminPassword": "password"
  }'

# Test admin info endpoint
curl -X GET http://localhost:3000/api/admin-auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 7: Test RLS Policies

```sql
-- Test as admin (should succeed)
SET request.jwt.claims = '{"email": "admin@example.com"}';
UPDATE semesters SET applications_open = true WHERE id = 'some-uuid';

-- Test as admin (should fail)
DELETE FROM school_years WHERE id = 'some-uuid';

-- Test as super_admin (should succeed)
SET request.jwt.claims = '{"email": "superadmin@example.com"}';
DELETE FROM school_years WHERE id = 'some-uuid';
```

## Verification Checklist

- [ ] Migration runs without errors
- [ ] Existing admins automatically become 'admin' role
- [ ] Can create new super_admin
- [ ] Admin login shows "Application Management" subtitle
- [ ] Super Admin login shows "Super Administrator" subtitle
- [ ] Admin cannot create/delete school years
- [ ] Admin cannot delete semesters
- [ ] Admin CAN update semester dates/status
- [ ] Super Admin can perform all destructive operations
- [ ] RLS policies enforce role restrictions
- [ ] API endpoints return 403 for unauthorized roles
- [ ] `/api/admin-auth/me` returns correct role information

## Rollback Plan

If issues occur:

```sql
-- Revert role names
UPDATE public.role SET name = 'super_admin' WHERE role_id = '4f53ccf0-9d4a-4345-8061-50a1e728494d';
DELETE FROM public.role WHERE role_id = 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37';

-- Restore old policies (if needed, check git history for:
-- iskolar/supabase/migrations/20251023_add_school_year_active_and_audit.sql
```

## Next Steps

1. **Test thoroughly** with both admin and super_admin accounts
2. **Create admin management UI** for super_admin (CRUD admin users)
3. **Add audit logging** for super_admin actions
4. **Update documentation** for new role model
5. **Train team** on new permission structure

## Files Changed

### Created:
- `iskolar/supabase/migrations/20251027_refactor_admin_roles.sql`
- `iskolar/lib/auth/roles.ts`
- `iskolar/app/api/admin-auth/me/route.ts`

### Modified:
- `iskolar/lib/utils/tokens.ts`
- `iskolar/app/api/admin/school-years/route.ts`
- `iskolar/app/api/admin/school-years/[id]/route.ts`
- `iskolar/app/api/admin/semesters/[id]/route.ts`
- `iskolar/app/components/admin/AdminSidebar.tsx`

## Support

For issues or questions:
1. Check migration logs in Supabase
2. Verify role table data
3. Check API logs for authorization failures
4. Review RLS policy execution in Supabase

---
**Implementation by:** GitHub Copilot  
**Date:** October 27, 2025
