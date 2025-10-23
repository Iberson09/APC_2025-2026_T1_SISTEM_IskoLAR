-- Migration: Update application status to only allow pending, approved, rejected
-- This simplifies the application workflow

-- Drop the existing check constraint
ALTER TABLE applications 
DROP CONSTRAINT IF EXISTS applications_status_check;

-- Add new check constraint with only three statuses
ALTER TABLE applications
ADD CONSTRAINT applications_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update any existing records with old statuses to 'pending'
-- submitted and under_review -> pending
-- withdrawn -> rejected (or you can delete these if preferred)
UPDATE applications 
SET status = 'pending' 
WHERE status IN ('submitted', 'under_review', 'withdrawn');

-- Add comment explaining the status values
COMMENT ON COLUMN applications.status IS 
'Application status: pending (awaiting review), approved (accepted), rejected (denied)';
