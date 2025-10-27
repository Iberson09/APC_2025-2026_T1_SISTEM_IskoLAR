# Admin Role Privileges Comparison

## Role Privilege Matrix

### Complete Feature Comparison

| Feature | Scholar | Admin (formerly super_admin) | Super Admin (new) |
|---------|---------|------------------------------|-------------------|
| **Authentication** |
| Sign in to scholar portal | ✅ | ❌ | ❌ |
| Sign in to admin portal | ❌ | ✅ | ✅ |
| Reset password | ✅ | ✅ | ✅ |
| **Dashboard & Overview** |
| View admin dashboard | ❌ | ✅ | ✅ |
| View application statistics | ❌ | ✅ | ✅ |
| View announcements | ✅ | ✅ | ✅ |
| **Application Management** |
| Submit scholarship application | ✅ | ❌ | ❌ |
| View own application status | ✅ | ❌ | ❌ |
| View all applications | ❌ | ✅ | ✅ |
| Update application status | ❌ | ✅ | ✅ |
| Delete applications | ❌ | ❌ | ✅ |
| **School Year Management** |
| View school years | ✅ | ✅ | ✅ |
| Create school year | ❌ | ❌ | ✅ |
| Update school year (toggle active) | ❌ | ❌ | ✅ |
| Delete school year | ❌ | ❌ | ✅ |
| Undo school year deletion (24hr) | ❌ | ❌ | ✅ |
| **Semester Management** |
| View semesters | ✅ | ✅ | ✅ |
| Create semester | ❌ | ❌ | ✅ |
| Update semester dates | ❌ | ✅ | ✅ |
| Toggle applications_open | ❌ | ✅ | ✅ |
| Delete semester | ❌ | ❌ | ✅ |
| **User Management** |
| View all users | ❌ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ |
| Delete users | ❌ | ❌ | ✅ |
| **Admin Management** |
| View admin list | ❌ | ✅ | ✅ |
| Create admin accounts | ❌ | ❌ | ✅ |
| Update admin accounts | ❌ | ❌ | ✅ |
| Delete admin accounts | ❌ | ❌ | ✅ |
| Promote to super_admin | ❌ | ❌ | ✅ |
| Demote to admin | ❌ | ❌ | ✅ |
| **Announcements** |
| View announcements | ✅ | ✅ | ✅ |
| Create announcements | ❌ | ✅ | ✅ |
| Edit announcements | ❌ | ✅ | ✅ |
| Delete announcements | ❌ | ❌ | ✅ |
| **Releases** |
| View releases | ✅ | ✅ | ✅ |
| Create releases | ❌ | ✅ | ✅ |
| Edit releases | ❌ | ✅ | ✅ |
| Delete releases | ❌ | ❌ | ✅ |
| **Reports & Analytics** |
| View application reports | ❌ | ✅ | ✅ |
| Export data | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |

## Key Differences

### Admin (Application Management)
**Focus:** Day-to-day application and semester management

**Can Do:**
- Review and process scholarship applications
- Update application statuses (pending → approved/rejected)
- Toggle semester application windows (open/close)
- Update semester dates
- Manage announcements and releases
- View all users and applications
- Generate reports

**Cannot Do:**
- Create or delete school years/semesters (structural changes)
- Delete applications (permanent data removal)
- Manage admin accounts (security/access control)
- Perform destructive operations

**Use Case:** Regular administrators who handle application processing, not system configuration

---

### Super Admin (Full Platform Access)
**Focus:** Complete system administration and configuration

**Everything Admin can do, PLUS:**
- Create and delete school years (with password confirmation)
- Create and delete semesters (with password confirmation)
- Delete applications (with password confirmation)
- Create/update/delete admin accounts
- Promote/demote admin roles
- Undo critical operations (24-hour window for school years)
- Access audit logs and system settings

**Use Case:** Senior administrators or IT staff responsible for system configuration and security

---

## Migration Impact on Existing Users

### ✅ What Stays the Same for Current Admins
If you were logged in as "super_admin" before the migration:

1. **Your account automatically becomes "admin"**
2. **All your current permissions are retained:**
   - ✅ Process applications
   - ✅ Toggle semester status
   - ✅ Update semester dates
   - ✅ Manage announcements
   - ✅ View users and reports

3. **You LOSE access to:**
   - ❌ Creating/deleting school years
   - ❌ Creating/deleting semesters
   - ❌ Deleting applications
   - ❌ Managing admin accounts

### 🔐 What Changes for New Super Admins
If you're promoted to "super_admin":

1. **You gain elevated privileges:**
   - ✅ All structural changes (school years, semesters)
   - ✅ All destructive operations (deletions)
   - ✅ Admin account management
   - ✅ System configuration

2. **Additional safeguards apply:**
   - 🔒 Password confirmation required for destructive actions
   - 🔒 24-hour undo window for school year deletions
   - 🔒 Audit logging for all super_admin actions

---

## Security Considerations

### Why the Separation?

1. **Principle of Least Privilege:** Most admin tasks don't require destructive capabilities
2. **Reduced Risk:** Limiting who can delete data or create structural changes
3. **Accountability:** Clear separation between operational and administrative tasks
4. **Compliance:** Better audit trail for sensitive operations

### Best Practices

- **Regular staff:** Assign "admin" role for daily operations
- **Senior staff/IT:** Assign "super_admin" only when needed
- **Regular audits:** Review who has super_admin access
- **Training:** Ensure super_admins understand the impact of destructive operations

---

## UI Indicators

### Admin Dashboard
- **Admin:** Displays "Application Management" subtitle
- **Super Admin:** Displays "Super Administrator" subtitle

### Navigation
- **Admin:** Sees standard menu (Dashboard, Applications, Releases, Users)
- **Super Admin:** Sees additional options (Delete buttons, Admin Management)

### Action Buttons
- **Admin:** "Update" and "Toggle" buttons visible
- **Super Admin:** "Delete" and "Create" buttons also visible

---

## Rollback Scenario

If you need to restore the old structure:

```sql
-- Revert role name
UPDATE public.role 
SET name = 'super_admin' 
WHERE role_id = '4f53ccf0-9d4a-4345-8061-50a1e728494d';

-- Remove new super_admin role
DELETE FROM public.role 
WHERE role_id = 'ebfbc2ad-e3e6-43c2-bae8-f54637964b37';
```

All existing admins would regain full privileges.
