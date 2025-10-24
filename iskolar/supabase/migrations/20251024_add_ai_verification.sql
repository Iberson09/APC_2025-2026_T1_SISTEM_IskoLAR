-- Add AI verification columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_discrepancies JSONB,
ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20) CHECK (confidence_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS extracted_data JSONB;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_documents_ai_verified ON documents(ai_verified);
CREATE INDEX IF NOT EXISTS idx_documents_confidence_level ON documents(confidence_level);

-- Add comment
COMMENT ON COLUMN documents.ai_verified IS 'Indicates if document has been AI-verified';
COMMENT ON COLUMN documents.ai_summary IS 'AI-generated summary of document contents';
COMMENT ON COLUMN documents.ai_discrepancies IS 'JSON array of discrepancies found';
COMMENT ON COLUMN documents.confidence_level IS 'Confidence level of verification: low, medium, high';
COMMENT ON COLUMN documents.verification_date IS 'When AI verification was performed';
COMMENT ON COLUMN documents.extracted_data IS 'Data extracted from document by AI';
