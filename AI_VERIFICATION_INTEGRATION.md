# AI Document Verification Integration Guide

## Overview
This guide explains how to integrate the AI verification panel into the admin application review page.

## Backend Setup Complete ✅
1. ✅ AI verification service (`/lib/ai-verification.ts`)
2. ✅ API routes (`/app/api/admin/documents/verify/route.ts`)
3. ✅ Database migration (`/supabase/migrations/20251024_add_ai_verification.sql`)
4. ✅ Environment variable (`GOOGLE_GENAI_API_KEY` in `env.local`)
5. ✅ npm package installed (`@google/generative-ai`)
6. ✅ AI Verification Component (`/app/components/admin/AIVerificationPanel.tsx`)

## Step 1: Apply Database Migration

Run this SQL migration in your Supabase SQL Editor:

```bash
# Navigate to Supabase dashboard
# Go to SQL Editor
# Create a new query
# Copy and paste the contents of:
supabase/migrations/20251024_add_ai_verification.sql
# Run the query
```

**Or** use Supabase CLI:
```bash
cd c:\Users\Hazel Ann\Code\WORKING\APC_2025-2026_T1_SISTEM_IskoLAR
supabase db push
```

## Step 2: Integrate AI Verification Panel into Review Page

Open: `/app/admin/applications/school-year/[id]/[semesterID]/[userID]/page.tsx`

### Add Import
```typescript
import AIVerificationPanel from '@/app/components/admin/AIVerificationPanel';
```

### Add New Tab to the Tabs Section

Find the tabs navigation (around line 400-500) and add a new "AI Verification" tab:

```typescript
const tabs = [
  { name: "Personal Information", href: "#personal" },
  { name: "Contact Details", href: "#contact" },
  { name: "Documents", href: "#documents" },
  { name: "AI Verification", href: "#ai-verification" }, // ADD THIS
];
```

### Add AI Verification Tab Content

Find the tab content sections (around line 500-600) and add this after the Documents section:

```typescript
{/* AI Verification Tab */}
{activeTab === "#ai-verification" && (
  <div className="bg-white shadow rounded-lg p-6">
    <AIVerificationPanel 
      userId={params.userID}
      onVerificationComplete={fetchApplicationData}
    />
  </div>
)}
```

### Update Active Tab State (Optional)
If you want AI Verification to be the default tab, change the initial state:

```typescript
const [activeTab, setActiveTab] = useState("#ai-verification");
```

## Step 3: Test the Integration

1. **Start your development server:**
   ```bash
   cd iskolar
   npm run dev
   ```

2. **Navigate to an application:**
   - Go to Admin Dashboard
   - Click on any application
   - Click "AI Verification" tab

3. **Test AI Verification:**
   - Click "Verify with AI" button next to any document
   - Wait for processing (10-30 seconds depending on document size)
   - Review the AI summary, confidence level, and discrepancies

## How It Works

### Document Verification Flow
1. Admin clicks "Verify with AI" button
2. System downloads document from Supabase Storage
3. Document is processed by Gemini 2.0 Flash Exp model
4. AI extracts data (name, birthdate, address, ID numbers)
5. System compares extracted data with registration data
6. AI generates summary and identifies discrepancies
7. Results saved to database with confidence level
8. UI displays results with color-coded confidence indicators

### Confidence Levels
- **HIGH (Green)**: All data matches, no significant discrepancies
- **MEDIUM (Yellow)**: Minor discrepancies or formatting differences
- **LOW (Red)**: Major discrepancies requiring admin attention

### Discrepancy Severity
- **Low**: Minor formatting differences (e.g., "Jan 1, 2000" vs "January 1, 2000")
- **Medium**: Partial matches (e.g., middle name missing)
- **High**: Significant mismatches (e.g., different birthdate)

## API Endpoints

### Verify Single Document
```http
POST /api/admin/documents/verify
Content-Type: application/json

{
  "documentId": "uuid-here"
}

Response:
{
  "success": true,
  "summary": "AI-generated summary...",
  "discrepancies": [...],
  "confidence": "high"
}
```

### Get Verification Status
```http
GET /api/admin/documents/verify?userId=uuid-here

Response:
{
  "documents": [...],
  "summary": {
    "total": 5,
    "verified": 3,
    "pending": 2,
    "highConfidence": 2,
    "mediumConfidence": 1,
    "lowConfidence": 0
  }
}
```

## Troubleshooting

### Error: "GOOGLE_GENAI_API_KEY not configured"
- Check that `env.local` has the API key
- Restart dev server after adding environment variable

### Error: "Column ai_verified does not exist"
- Run the database migration (Step 1)
- Verify columns were added to documents table

### Error: "Document not found"
- Check that document exists in Supabase Storage
- Verify bucket permissions allow admin access

### AI Returns "Unable to extract data"
- Document may be low quality or unclear
- Try re-uploading a higher quality scan
- Check that document type is supported (PDF, JPEG, PNG)

## Features Implemented

✅ Extract data from documents using Gemini Vision API
✅ Cross-validate extracted data against registration form
✅ Generate AI summaries for admin review
✅ Confidence level scoring (low/medium/high)
✅ Discrepancy detection with severity levels
✅ Color-coded UI for quick assessment
✅ Expandable details for extracted data
✅ Timestamp tracking for verifications
✅ Support for PDF, JPEG, PNG formats

## Next Steps (Optional Enhancements)

- [ ] Add "Verify All" button to process all documents at once
- [ ] Add notification when verification completes
- [ ] Create admin settings page to configure confidence thresholds
- [ ] Add retry mechanism for failed verifications
- [ ] Export verification report as PDF
- [ ] Add verification history/audit trail
- [ ] Implement batch verification for multiple applications

## Support

If you encounter any issues or need modifications to the AI verification logic, the main files to edit are:

- **AI Logic**: `/lib/ai-verification.ts`
- **API Routes**: `/app/api/admin/documents/verify/route.ts`
- **UI Component**: `/app/components/admin/AIVerificationPanel.tsx`
- **Database Schema**: `/supabase/migrations/20251024_add_ai_verification.sql`

All AI prompts and validation logic can be customized in the AI verification service file.
