-- Add AI verification columns to documents table
-- This migration adds support for AI-powered document verification

-- Add new columns for AI verification
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_discrepancies JSONB,
ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(10) CHECK (confidence_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_ai_verified ON documents(ai_verified);
CREATE INDEX IF NOT EXISTS idx_documents_confidence_level ON documents(confidence_level);

-- Add comments for documentation
COMMENT ON COLUMN documents.ai_verified IS 'Whether the document has been verified by AI';
COMMENT ON COLUMN documents.ai_summary IS 'AI-generated summary for admin review';
COMMENT ON COLUMN documents.ai_discrepancies IS 'JSON array of discrepancies found during verification';
COMMENT ON COLUMN documents.confidence_level IS 'Confidence level of verification: low, medium, or high';
COMMENT ON COLUMN documents.verification_date IS 'Timestamp when AI verification was performed';
COMMENT ON COLUMN documents.extracted_data IS 'Raw data extracted from the document by AI';
