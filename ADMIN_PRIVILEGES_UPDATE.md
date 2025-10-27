# Admin Privileges Update - School Year & Semester Management

## Overview
Updated the admin role system to ensure that both `admin` and `super_admin` roles have full privileges for managing school years and semesters. The only distinction between the two roles is that `super_admin` can manage admin accounts (CRUD operations on the admin table), while `admin` cannot.

## Changes Made

### 1. Database Migration (RLS Policies)
**File**: `iskolar/supabase/migrations/20251027_refactor_admin_roles.sql`

#### School Years Table
Updated all RLS policies to allow both admin and super_admin:
- `school_years_insert_admin` - Both roles can create school years
- `school_years_update_admin` - Both roles can update school years
- `school_years_delete_admin` - Both roles can delete school years

**Changed from**:
```sql
WHERE r.name = 'super_admin'
```

**Changed to**:
```sql
WHERE r.name IN ('admin', 'super_admin')
```

#### Semesters Table
Updated INSERT and DELETE policies to allow both roles:
- `semesters_insert_admin` - Both roles can create semesters (was super_admin-only)
- `semesters_update_admin` - Both roles can update semesters (already working)
- `semesters_delete_admin` - Both roles can delete semesters (was super_admin-only)

**Changed from**:
```sql
-- INSERT policy
CREATE POLICY "semesters_insert_super_admin" ...
WHERE r.name = 'super_admin'

-- DELETE policy  
CREATE POLICY "semesters_delete_super_admin" ...
WHERE r.name = 'super_admin'
```

**Changed to**:
```sql
-- INSERT policy
CREATE POLICY "semesters_insert_admin" ...
WHERE r.name IN ('admin', 'super_admin')

-- DELETE policy
CREATE POLICY "semesters_delete_admin" ...
WHERE r.name IN ('admin', 'super_admin')
```

### 2. API Routes Authorization

#### School Years POST (Create)
**File**: `iskolar/app/api/admin/school-years/route.ts`

**Changed import**:
```typescript
// Before
import { isSuperAdmin } from '@/lib/auth/roles';

// After
import { hasPermission } from '@/lib/auth/roles';
```

**Changed authorization check** (line ~116):
```typescript
// Before
const isSuperAdminUser = await isSuperAdmin(adminEmail);
if (!isSuperAdminUser) {
  return NextResponse.json({ 
    error: 'Only super administrators can create academic years' 
  }, { status: 403 });
}

// After
const hasAdminPermission = await hasPermission(adminEmail, 'admin');
if (!hasAdminPermission) {
  return NextResponse.json({ 
    error: 'Only administrators can create academic years' 
  }, { status: 403 });
}
```

#### School Years DELETE
**File**: `iskolar/app/api/admin/school-years/[id]/route.ts`

**Changed import**:
```typescript
// Before
import { isSuperAdmin } from '@/lib/auth/roles';

// After
import { hasPermission } from '@/lib/auth/roles';
```

**Changed authorization check** (line ~100):
```typescript
// Before
const isSuperAdminUser = await isSuperAdmin(adminEmail);
if (!isSuperAdminUser) {
  console.error('User not super admin:', { email: adminEmail });
  return NextResponse.json(
    { error: 'Only super administrators can delete academic years' },
    { status: 403 }
  );
}

// After
const hasAdminPermission = await hasPermission(adminEmail, 'admin');
if (!hasAdminPermission) {
  console.error('User not an administrator:', { email: adminEmail });
  return NextResponse.json(
    { error: 'Only administrators can delete academic years' },
    { status: 403 }
  );
}
```

#### Semesters DELETE
**File**: `iskolar/app/api/admin/semesters/[id]/route.ts`

**Changed import**:
```typescript
// Before
import { isSuperAdmin, hasPermission } from '@/lib/auth/roles';

// After
import { hasPermission } from '@/lib/auth/roles';
```

**Changed authorization check** (line ~115):
```typescript
// Before
const isSuperAdminUser = await isSuperAdmin(adminEmail);
if (!isSuperAdminUser) {
  console.error('User not super admin:', { email: adminEmail });
  return NextResponse.json(
    { error: 'Only super administrators can delete semesters' },
    { status: 403 }
  );
}

// After
const hasAdminPermission = await hasPermission(adminEmail, 'admin');
if (!hasAdminPermission) {
  console.error('User not an administrator:', { email: adminEmail });
  return NextResponse.json(
    { error: 'Only administrators can delete semesters' },
    { status: 403 }
  );
}
```

### 3. User Management (Admin & Super Admin)

#### User List View
**File**: `iskolar/app/api/admin/users/route.ts`

**Updated authorization** (both admin and super_admin can view):
```typescript
// Get admin email from auth
const { data: { user } } = await supabase.auth.getUser();
if (!user?.email) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Check if user has admin permissions (both admin and super_admin allowed)
const hasAdminPermission = await hasPermission(user.email, 'admin');
if (!hasAdminPermission) {
  return NextResponse.json(
    { error: 'Only administrators can view user list' },
    { status: 403 }
  );
}
```

#### Create User Account (POST) - SUPER_ADMIN ONLY
**File**: `iskolar/app/api/users/route.ts`

**New endpoint added**:
```typescript
export async function POST(request: Request) {
  // Validates super_admin role
  // Creates user in Supabase Auth with password
  // Creates user record in database
  // Rollback auth user if database insert fails
  // Returns created user object
}
```

**Request body**:
```json
{
  "adminEmail": "super@admin.com",
  "password": "secure_password",
  "userData": {
    "email_address": "newuser@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "middle_name": "Smith",
    "mobile_number": "+1234567890"
  }
}
```

#### Edit User Details (PUT) - SUPER_ADMIN ONLY
**File**: `iskolar/app/api/users/[id]/route.ts`

**Endpoint details**:
```typescript
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Validates super_admin role
  // Updates user data in database
  // Optionally updates email in Supabase Auth if email_address changed
  // Returns updated user object
}
```

**Request body**:
```json
{
  "adminEmail": "super@admin.com",
  "userData": {
    "first_name": "John",
    "last_name": "Doe",
    "email_address": "newemail@example.com",
    "mobile_number": "+1234567890"
  }
}
```

#### Deactivate/Archive User (PATCH) - BOTH ADMIN & SUPER_ADMIN
**File**: `iskolar/app/api/users/[id]/route.ts`

**Updated with authorization**:
```typescript
// Before: Super_admin only
// After: Both admin and super_admin can deactivate/archive users

const hasAdminPermission = await hasPermission(adminEmail, 'admin');
if (!hasAdminPermission) {
  return NextResponse.json(
    { error: 'Only administrators can manage users' },
    { status: 403 }
  );
}

// Bans user for 10 years (effectively permanent)
await supabaseAdmin.auth.admin.updateUserById(
  id,
  { ban_duration: '87600h' }
);
```

#### Delete User (DELETE) - SUPER_ADMIN ONLY
**File**: `iskolar/app/api/users/[id]/route.ts`

**Authorization details**:
```typescript
// Requires super_admin role

const isSuperAdminUser = await isSuperAdmin(adminEmail);
if (!isSuperAdminUser) {
  return NextResponse.json(
    { error: 'Only super administrators can delete users' },
    { status: 403 }
  );
}

// Deletes from Supabase Auth
await supabaseAdmin.auth.admin.deleteUser(id);

// Deletes from users table (safety net)
await supabaseAdmin.from('users').delete().eq('user_id', id);
```

### 4. Database RLS Policies for Users

**File**: `iskolar/supabase/migrations/20251027_refactor_admin_roles.sql`

**Added policies**:
```sql
-- Both admin and super_admin can SELECT all users (for user management dashboard)
CREATE POLICY "users_select_admin" ON public.users
    FOR SELECT TO authenticated
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
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );

-- Super admin can UPDATE users (edit user details, archive/deactivate)
CREATE POLICY "users_update_super_admin" ON public.users
    FOR UPDATE TO authenticated
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
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin a
            JOIN public.role r ON a.role_id = r.role_id
            WHERE a.email_address = (auth.jwt() ->> 'email')
            AND r.name = 'super_admin'
        )
    );
```

**Note**: These policies are **additive** and work alongside existing user self-management policies from `20251002_users_rls_policies.sql`. Regular users can still view and edit their own profiles.

## Role Privilege Summary

### Admin Role (`admin`)
**Can do:**
- ✅ Create, update, and delete school years
- ✅ Create, update, and delete semesters
- ✅ Manage applications
- ✅ View all user accounts (scholars)
- ✅ Archive/deactivate user accounts
- ✅ View announcements and releases
- ✅ All application management tasks

**Cannot do:**
- ❌ Create new admin accounts
- ❌ Delete admin accounts
- ❌ Update admin account roles
- ❌ View other admin account details
- ❌ Create new user accounts (scholars)
- ❌ Edit user account details (scholars)
- ❌ Delete user accounts permanently (scholars)

### Super Admin Role (`super_admin`)
**Can do:**
- ✅ Everything `admin` can do
- ✅ Create new admin accounts
- ✅ Delete admin accounts
- ✅ Update admin account roles (promote/demote)
- ✅ Manage the admin table (full CRUD)
- ✅ **Create user accounts** (register new scholars with credentials)
- ✅ **Edit user accounts** (update profile details, email, etc.)
- ✅ **Delete user accounts** (permanent deletion)
- ✅ **Archive/deactivate user accounts** (ban from authentication)

## Implementation Notes

### Authorization Pattern Used
All API routes now use the `hasPermission(email, 'admin')` check, which returns `true` for both `admin` and `super_admin` roles. This is because:
1. `hasPermission` is hierarchical - if you have `super_admin`, you automatically have `admin` permissions
2. It's more maintainable than checking both roles explicitly
3. It follows the principle that super_admin inherits all admin capabilities

### RLS Policy Pattern
Database RLS policies explicitly check for both role names:
```sql
WHERE r.name IN ('admin', 'super_admin')
```

This approach:
1. Is explicit and clear at the database level
2. Provides defense in depth (even if API checks are bypassed)
3. Makes debugging easier (can see exactly which roles are allowed)
4. Doesn't rely on application-level role hierarchy

## Testing Checklist

After running the migration, verify:

### School Year & Semester Management
- [ ] Admin can create school years
- [ ] Admin can delete school years
- [ ] Admin can create semesters
- [ ] Admin can delete semesters
- [ ] Super admin can create school years
- [ ] Super admin can delete school years
- [ ] Super admin can create semesters
- [ ] Super admin can delete semesters

### Admin Account Management
- [ ] Admin CANNOT access admin management endpoints
- [ ] Super admin CAN access admin management endpoints
- [ ] Super admin can view list of admin accounts
- [ ] Super admin can create new admin accounts
- [ ] Super admin can promote admin to super_admin
- [ ] Super admin can demote super_admin to admin

### User (Scholar) Management
- [ ] Admin CAN view user list
- [ ] Admin CAN archive/deactivate user accounts
- [ ] Admin CANNOT create new user accounts
- [ ] Admin CANNOT edit user account details
- [ ] Admin CANNOT delete user accounts permanently
- [ ] Super admin CAN view user list
- [ ] Super admin CAN create new user accounts with credentials
- [ ] Super admin CAN edit user details (name, email, phone)
- [ ] Super admin CAN archive/deactivate users
- [ ] Super admin CAN delete users permanently
- [ ] Email changes sync to Supabase Auth
- [ ] User creation includes rollback on database error

## Next Steps

1. **Run the migration**:
   ```sql
   -- In Supabase SQL Editor
   -- Execute: iskolar/supabase/migrations/20251027_refactor_admin_roles.sql
   ```

2. **Bootstrap a super admin** (if needed):
   ```sql
   SELECT promote_to_super_admin('admin@example.com');
   ```

3. **Test the changes**:
   - Login as `admin` role and verify school year/semester CRUD works
   - Login as `super_admin` and verify same operations work
   - Verify admin cannot access admin management pages
   - Verify super_admin can access admin management pages

4. **Monitor for issues**:
   - Check API logs for authorization errors
   - Verify RLS policies are working correctly
   - Test edge cases (deleted roles, missing roles, etc.)

## Files Modified

1. `iskolar/supabase/migrations/20251027_refactor_admin_roles.sql`
   - Updated school_years RLS policies (3 policies)
   - Updated semesters RLS policies (2 policies)
   - **Added users table RLS policies (4 policies)**
     - `users_select_admin`: Both admin and super_admin can view users
     - `users_insert_super_admin`: Super_admin can create users
     - `users_update_super_admin`: Super_admin can edit users
     - `users_delete_super_admin`: Super_admin can delete users

2. `iskolar/app/api/admin/school-years/route.ts`
   - Changed import from `isSuperAdmin` to `hasPermission`
   - Updated POST authorization check

3. `iskolar/app/api/admin/school-years/[id]/route.ts`
   - Changed import from `isSuperAdmin` to `hasPermission`
   - Updated DELETE authorization check

4. `iskolar/app/api/admin/semesters/[id]/route.ts`
   - Removed `isSuperAdmin` from imports
   - Updated DELETE authorization check

5. **`iskolar/app/api/users/route.ts`** (NEW CHANGES)
   - Added `isSuperAdmin` import
   - **POST endpoint (NEW)**: Create new user accounts (super_admin-only)
     - Creates user in Supabase Auth with password
     - Creates user record in database
     - Includes rollback logic if database insert fails

6. **`iskolar/app/api/users/[id]/route.ts`** (UPDATED)
   - Added `hasPermission` import alongside `isSuperAdmin`
   - PATCH endpoint: Changed to use `hasPermission` - now both admin and super_admin can deactivate users
   - DELETE endpoint: Kept super_admin-only check for deleting users
   - PUT endpoint (existing): Super_admin-only for editing user details

7. **`iskolar/app/api/admin/users/route.ts`** (UPDATED)
   - Changed import from `isSuperAdmin` to `hasPermission`
   - GET endpoint: Changed to use `hasPermission` - now both admin and super_admin can view user list

## Rollback Plan

If issues arise, you can:

1. **Revert RLS policies**:
   ```sql
   -- Change back to super_admin only for specific operations
   DROP POLICY IF EXISTS "school_years_insert_admin" ON public.school_years;
   CREATE POLICY "school_years_insert_super_admin" ON public.school_years
       FOR INSERT TO authenticated
       WITH CHECK (
           EXISTS (
               SELECT 1 FROM public.admin a
               JOIN public.role r ON a.role_id = r.role_id
               WHERE a.email_address = (auth.jwt() ->> 'email')
               AND r.name = 'super_admin'
           )
       );
   ```

2. **Revert API routes**: Change `hasPermission(email, 'admin')` back to `isSuperAdmin(email)`

3. **Update error messages**: Change "Only administrators" back to "Only super administrators"

---

**Last Updated**: 2025-01-27
**Migration Version**: 20251027_refactor_admin_roles
**Status**: ✅ Complete - Ready for testing
