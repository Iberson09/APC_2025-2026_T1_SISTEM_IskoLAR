-- SIMPLE FIX FOR ORPHANED DOCUMENTS
-- Run these queries in Supabase SQL Editor in order:

-- STEP 1: Find the orphaned PSA Birth Certificate document
SELECT 
    d.documents_id,
    d.document_type,
    d.user_id as current_invalid_user_id,
    d.file_path,
    d.file_name
FROM documents d
WHERE d.document_type = 'PSA Birth Certificate'
AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.user_id = d.user_id
);

-- STEP 2: Find what the correct user_id should be
-- This finds other documents in the same "folder" (same user's documents)
SELECT DISTINCT
    d2.user_id as correct_user_id,
    u.first_name,
    u.last_name,
    u.email_address,
    COUNT(*) as other_documents_count
FROM documents d1
CROSS JOIN documents d2
INNER JOIN users u ON d2.user_id = u.user_id
WHERE d1.document_type = 'PSA Birth Certificate'
AND NOT EXISTS (SELECT 1 FROM users WHERE user_id = d1.user_id)
AND d2.documents_id != d1.documents_id
-- Try to match by file path pattern (documents usually stored in user-specific folders)
AND (
    SPLIT_PART(d1.file_path, '/', 1) = SPLIT_PART(d2.file_path, '/', 1)
    OR d1.file_path LIKE '%' || d2.user_id || '%'
)
GROUP BY d2.user_id, u.first_name, u.last_name, u.email_address
ORDER BY other_documents_count DESC
LIMIT 5;

-- STEP 3: Update the PSA Birth Certificate to use the correct user_id
-- REPLACE 'PASTE_CORRECT_USER_ID_HERE' with the user_id from Step 2
/*
UPDATE documents
SET user_id = 'PASTE_CORRECT_USER_ID_HERE'
WHERE document_type = 'PSA Birth Certificate'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE user_id = documents.user_id
);
*/

-- STEP 4: Verify the fix worked
SELECT 
    d.documents_id,
    d.document_type,
    d.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    d.file_name,
    CASE 
        WHEN u.user_id IS NULL THEN '❌ ORPHANED'
        ELSE '✅ OK'
    END as status
FROM documents d
LEFT JOIN users u ON d.user_id = u.user_id
WHERE d.document_type = 'PSA Birth Certificate';
