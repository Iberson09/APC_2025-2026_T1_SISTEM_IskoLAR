# Authentication Fix for Admin Management

## Problem
The admin management page was showing "Unauthorized" error even when logged in as super admin. This was because:
1. The API route couldn't access the user session from cookies
2. Next.js App Router changed how cookies work in route handlers
3. The old `createRouteHandlerClient` approach wasn't compatible

## Solution
Changed from cookie-based authentication to **Authorization header with Bearer tokens**.

---

## Changes Made

### 1. API Route - Extract Token from Headers
**File:** `iskolar/app/api/admin-auth/admins/route.ts`

**Added helper function:**
```typescript
async function getUserFromRequest(request: NextRequest) {
  // Try Authorization header first (primary method)
  const authHeader = request.headers.get('authorization');
  let accessToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7);
  }
  
  // Fallback to cookies if no header
  if (!accessToken) {
    const cookieHeader = request.headers.get('cookie') || '';
    // Parse cookies...
  }

  // Verify token with Supabase
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
  return user;
}
```

**Updated GET and POST routes:**
```typescript
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...rest of logic
}
```

### 2. Frontend - Send Session Token in Headers
**File:** `iskolar/app/admin/admin-management/page.tsx`

**Import Supabase client:**
```typescript
import { supabaseBrowser } from '@/lib/supabase/browser';
```

**Updated fetchAdmins:**
```typescript
const fetchAdmins = async () => {
  // Get current session
  const supabase = supabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session. Please log in again.');
  }
  
  // Send token in Authorization header
  const response = await fetch('/api/admin-auth/admins', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
};
```

**Updated handleCreateAdmin:**
```typescript
const handleCreateAdmin = async () => {
  // Get session token
  const supabase = supabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch('/api/admin-auth/admins', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({...})
  });
};
```

---

## How It Works

### Before (Broken):
```
Browser → API Route
         ↓
         Tries to read cookies with Next.js helpers
         ↓
         ❌ Can't access session (Next.js 15 App Router issue)
         ↓
         Returns 401 Unauthorized
```

### After (Fixed):
```
Browser
  ↓
  1. Get session from Supabase: supabase.auth.getSession()
  ↓
  2. Extract access_token from session
  ↓
  3. Send in Authorization header: "Bearer <token>"
  ↓
API Route
  ↓
  4. Extract token from Authorization header
  ↓
  5. Verify token with Supabase: supabaseAdmin.auth.getUser(token)
  ↓
  6. Get user email and verify permissions
  ↓
  ✅ Returns data
```

---

## Testing

After these changes, test the following:

### ✅ 1. Load Admin Management Page
1. Navigate to `/admin/admin-management`
2. Console should show:
   ```
   [fetchAdmins] Getting session...
   [fetchAdmins] Session found, fetching admins...
   [getUserFromRequest] Found Bearer token in Authorization header
   [getUserFromRequest] Token verified for user: superadmin@iskolar.com
   [GET /api/admin-auth/admins] Is super admin? true
   [fetchAdmins] Fetched X admins
   ```
3. Admin list should load successfully ✅

### ✅ 2. Create New Admin
1. Click "Create Admin" button
2. Modal opens with blurred background ✅
3. Fill in email and password
4. Select role
5. Click "Create"
6. Console should show:
   ```
   [POST /api/admin-auth/admins] Creating new admin...
   [getUserFromRequest] Found Bearer token in Authorization header
   [POST /api/admin-auth/admins] Is super admin? true
   [POST /api/admin-auth/admins] Creating auth user...
   ```
7. Admin created successfully ✅

### ✅ 3. Session Expiry Handling
- If session expires, you'll get clear error: "No active session. Please log in again."
- User is prompted to log in again

---

## Benefits

1. **✅ Works with Next.js 15 App Router** - No reliance on deprecated auth helpers
2. **✅ More Secure** - Token explicitly passed, not relying on cookie parsing
3. **✅ Better Error Handling** - Clear messages when session is missing
4. **✅ Standard Pattern** - Uses standard OAuth2 Bearer token approach
5. **✅ Easier Debugging** - Can see exact token being sent in Network tab

---

## Don't Forget!

You still need to run the RLS policy fix in `FIX_ADMIN_FETCH_COMPLETE.sql` to allow authenticated users to read the admin table:

```sql
DROP POLICY IF EXISTS "admin_select_all" ON public.admin;

CREATE POLICY "admin_select_all" ON public.admin
  FOR SELECT TO authenticated USING (true);
```

---

## Console Logs to Watch

**Successful fetch:**
```
[fetchAdmins] Getting session...
[fetchAdmins] Session found, fetching admins...
[getUserFromRequest] Found Bearer token in Authorization header
[getUserFromRequest] Token verified for user: superadmin@iskolar.com
[GET /api/admin-auth/admins] Checking super admin status for: superadmin@iskolar.com
[GET /api/admin-auth/admins] Is super admin? true
[GET /api/admin-auth/admins] Fetching admins from database...
[GET /api/admin-auth/admins] Successfully fetched 2 admins
[fetchAdmins] Response status: 200
[fetchAdmins] Fetched 2 admins
```

**If session missing:**
```
[fetchAdmins] Getting session...
[fetchAdmins] No session found: <error>
Error: No active session. Please log in again.
```

**If not super admin:**
```
[GET /api/admin-auth/admins] Is super admin? false
[fetchAdmins] Error response: { error: 'Only super administrators can view admin list' }
```

---

## Related Files
- ✅ `iskolar/app/api/admin-auth/admins/route.ts` - API authentication
- ✅ `iskolar/app/admin/admin-management/page.tsx` - Frontend token sending
- ✅ `iskolar/lib/supabase/browser.ts` - Supabase client with session persistence
- ⏳ `FIX_ADMIN_FETCH_COMPLETE.sql` - RLS policy fix (user must run)
