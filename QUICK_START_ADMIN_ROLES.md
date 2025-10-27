# Quick Start: Admin Role Setup

## 1. Run Migration

In Supabase SQL Editor:
```sql
-- Copy and paste the entire contents of:
-- iskolar/supabase/migrations/20251027_refactor_admin_roles.sql
```

## 2. Create Your First Super Admin

### Option A: Promote Existing Admin
```sql
SELECT promote_to_super_admin('your.email@example.com');
```

### Option B: Create New Super Admin
```sql
-- First ensure the user exists in auth.users
-- Then add to admin table:
INSERT INTO public.admin (email_address, role_id)
VALUES ('newadmin@example.com', 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37')
ON CONFLICT (email_address) 
DO UPDATE SET role_id = 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37';
```

## 3. Verify Setup

```sql
-- Check all admins and their roles
SELECT 
  a.email_address, 
  r.name as role_name,
  r.description
FROM public.admin a
JOIN public.role r ON a.role_id = r.role_id
ORDER BY r.name, a.email_address;
```

Expected output:
```
email_address          | role_name    | description
-----------------------|--------------|------------------------------------------
admin@example.com      | admin        | Application Management...
superadmin@example.com | super_admin  | Super Administrator - Full platform access
```

## 4. Quick Test

### Test as Admin:
1. Sign in to `/admin-auth/signin`
2. Check sidebar shows "Application Management"
3. Try to create school year → Should fail with 403
4. Update semester status → Should work

### Test as Super Admin:
1. Sign in to `/admin-auth/signin`
2. Check sidebar shows "Super Administrator"
3. Create school year → Should work
4. Delete semester → Should work

## Role Permissions Summary

| Action | Admin | Super Admin |
|--------|-------|-------------|
| View Dashboard | ✅ | ✅ |
| View Applications | ✅ | ✅ |
| Update Semester Status | ✅ | ✅ |
| Create School Year | ❌ | ✅ |
| Delete School Year | ❌ | ✅ |
| Create Semester | ❌ | ✅ |
| Delete Semester | ❌ | ✅ |
| Delete Applications | ❌ | ✅ |
| Manage Admins | ❌ | ✅ |

## Common Commands

### Demote super_admin to admin:
```sql
SELECT demote_to_admin('user@example.com');
```

### Check specific user's role:
```sql
SELECT r.name
FROM public.admin a
JOIN public.role r ON a.role_id = r.role_id
WHERE a.email_address = 'user@example.com';
```

### List all super_admins:
```sql
SELECT a.email_address
FROM public.admin a
JOIN public.role r ON a.role_id = r.role_id
WHERE r.name = 'super_admin';
```

## Troubleshooting

### "Only super administrators can..." error
- Check user's role in database
- Verify email matches exactly
- Ensure migration ran successfully

### User can't sign in
- Check user exists in `auth.users`
- Check user exists in `admin` table
- Verify password is correct

### Role not showing in UI
- Clear browser cache
- Check `/api/admin-auth/me` endpoint response
- Verify AdminSidebar is fetching role

## Next Steps

1. ✅ Run migration
2. ✅ Create super_admin
3. ✅ Test both roles
4. 📋 Document team training
5. 📋 Create admin management UI (optional)
