# Semester-Scoped Applications Implementation

## Overview
This implementation ensures scholarship applications are properly scoped to specific semesters. Scholars can only submit applications during active, open semesters, and each scholar can only have one application per semester.

## What Was Implemented

### 1. Database Migration (`20251024_semester_scoped_applications.sql`)

**Key Changes:**
- Added `semester_id` FK constraint on applications table
- Created unique index: `applications_user_semester_uniq` to prevent duplicate applications per semester
- Added helper functions:
  - `get_active_open_semester()`: Returns current open semester for new applications
  - `can_accept_applications(semester_id)`: Validates if a semester can accept applications
- Updated RLS policies:
  - Scholars can only insert applications in open semesters of active years
  - Admins can view all applications and update statuses
  - Prevents admins from submitting applications
- Created view `application_stats_by_semester` for dashboard statistics

**To Apply:**
```bash
# Run in Supabase SQL Editor
-- or use migration file directly
```

### 2. API Endpoints

#### POST /api/applications
**Purpose:** Scholar submits new application

**Flow:**
1. Validates user authentication
2. Checks user is not an admin
3. Fetches active open semester via `get_active_open_semester()`
4. Checks for duplicate application (unique constraint)
5. Creates application with status 'pending'

**Response:**
- 201: Application created successfully
- 400: No open semester available
- 409: Duplicate application exists
- 403: Admins cannot submit applications

#### GET /api/applications/me
**Purpose:** Scholar views their application history

**Returns:** All applications for authenticated user with semester and school year details

#### GET /api/admin/semesters/[id]/applications
**Purpose:** Admin views all applications for a specific semester

**Query Params:**
- `status`: Filter by application status (optional)
- `page`: Pagination page number (default: 1)
- `limit`: Results per page (default: 50)

**Returns:**
- Applications list with user details
- Semester information
- Statistics (total, pending, approved, etc.)
- Pagination metadata

### 3. Frontend Components

#### ApplicationsSection Component
**Location:** `app/components/admin/ApplicationsSection.tsx`

**Features:**
- Displays applications grouped by semester
- Shows semester status badges (Open/Closed/Ended)
- Real-time statistics per semester
- Expandable sections to view applications
- Status filtering
- Separates current and previous academic years

**Status Logic:**
- **Open**: `applications_open = true` AND within date range
- **Closed**: `applications_open = false` AND not ended
- **Ended**: Current date > end_date

#### ApplicationsList Sub-component
**Features:**
- Table view of applications
- Filter by status
- Shows scholar info, status, submission date
- Action buttons for viewing details

### 4. Updated Admin Applications Page
**Location:** `app/admin/applications/page.tsx`

**Changes:**
- Added `ApplicationsSection` component
- Maintains existing school year management
- Side-by-side display of year management and applications

### 5. Type Definitions
**Location:** `lib/types/school-year.ts`

**Added Types:**
```typescript
interface Application {
  id: string;
  user_id: string;
  semester_id: string;
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

interface SemesterStats {
  total_applications: number;
  pending_count: number;
  approved_count: number;
  // ... other status counts
}
```

## How It Works

### Scholar Submission Flow

1. **Scholar navigates to application form**
   ```typescript
   // Check if semester is open
   const { data: semester } = await supabase.rpc('get_active_open_semester');
   if (!semester) {
     // Show "Applications closed" message
   }
   ```

2. **Scholar submits application**
   ```typescript
   const response = await fetch('/api/applications', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${session.access_token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ /* optional fields */ })
   });
   ```

3. **Server validates and creates application**
   - Checks active open semester exists
   - Validates no duplicate application
   - Inserts with semester_id
   - RLS enforces constraints

### Admin Viewing Flow

1. **Admin views applications page**
   - Fetches all school years with semesters
   - Fetches statistics from `application_stats_by_semester` view
   - Groups by current vs previous years

2. **Admin expands semester**
   - Fetches applications via `/api/admin/semesters/[id]/applications`
   - Displays in table with filtering

3. **Admin filters by status**
   - Client-side re-fetch with status parameter
   - No full page reload

## Key Constraints & Validations

### Database Level
1. **Unique Constraint:** One application per user per semester
   ```sql
   CREATE UNIQUE INDEX applications_user_semester_uniq 
   ON applications(user_id, semester_id) WHERE semester_id IS NOT NULL;
   ```

2. **FK Constraint:** Applications must reference valid semesters
   ```sql
   semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL
   ```

3. **RLS Insert Policy:** Only accepts applications in open semesters
   ```sql
   WITH CHECK (
     user_id = auth.uid()
     AND can_accept_applications(semester_id)
     AND NOT EXISTS (SELECT 1 FROM admin WHERE email = auth.jwt() ->> 'email')
   )
   ```

### Application Level
1. **API validates:** Active year + open semester exists
2. **API validates:** No duplicate applications
3. **API validates:** User is not an admin
4. **API validates:** Date range is current

### UI Level
1. **Disable submit:** When no open semester
2. **Show status:** Open/Closed/Ended badges
3. **Disable actions:** For ended semesters
4. **Real-time refresh:** After mutations

## Testing Checklist

### Scholar Tests
- [ ] Cannot submit when no open semester
- [ ] Can submit to open semester
- [ ] Cannot submit duplicate application
- [ ] Can view own application history
- [ ] Admin accounts cannot submit applications

### Admin Tests
- [ ] Can view all applications by semester
- [ ] Can filter by status
- [ ] Pagination works correctly
- [ ] Statistics display correctly
- [ ] Can update application status
- [ ] Cannot intake applications (that's scholar-only)

### Edge Cases
- [ ] Multiple open semesters (should only allow one)
- [ ] Semester closes mid-submission
- [ ] Clock skew (end_date boundary)
- [ ] NULL semester_id (legacy data)
- [ ] RLS blocks unauthorized access

## Configuration

### Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Super Admin Role ID
```typescript
const SUPER_ADMIN_ROLE_ID = '4f53ccf0-9d4a-4345-8061-50a1e728494d';
```

## Next Steps

1. **Run the migration** in Supabase SQL Editor
2. **Test the API endpoints** using Postman or similar
3. **Update scholar submission forms** to use new API
4. **Add application detail view** for admins
5. **Add status update actions** for admins
6. **Implement notifications** when status changes
7. **Add export functionality** for reports

## Backward Compatibility

### Handling Existing Data
If applications table has rows with NULL `semester_id`:

```sql
-- Option 1: Backfill based on academic_year/semester strings (if they exist)
-- Option 2: Mark as legacy data and exclude from new constraints
-- Option 3: Manual admin review and assignment

-- Example backfill query:
UPDATE applications a
SET semester_id = s.id
FROM semesters s
JOIN school_years sy ON s.school_year_id = sy.id
WHERE a.semester_id IS NULL
  AND a.academic_year_column = sy.academic_year
  AND a.semester_column = s.name;
```

## Troubleshooting

### Applications not appearing
- Check RLS policies in Supabase dashboard
- Verify user authentication token
- Check semester is_active and applications_open flags

### Cannot submit application
- Verify semester is within date range
- Check unique constraint hasn't been violated
- Ensure user is not in admin table

### Statistics not updating
- Refresh `application_stats_by_semester` view
- Check if triggers are enabled
- Verify JOIN conditions

## Additional Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE`
- Soft deletes preferred over hard deletes for audit trail
- RLS policies enforce security at database level
- API adds additional business logic validation
- UI provides user-friendly feedback
