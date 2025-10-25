-- Fix orphaned documents that have invalid user_id references
-- This query finds documents with user_ids that don't exist in users table
-- and updates them to use the correct user_id based on other documents

-- Step 1: Find orphaned documents (documents with user_id not in users)
SELECT 
    d.documents_id,
    d.document_type,
    d.user_id as invalid_user_id,
    d.file_name,
    d.created_at
FROM documents d
LEFT JOIN users u ON d.user_id = u.user_id
WHERE u.user_id IS NULL;

-- Step 2: Fix orphaned documents by matching them to the correct user
-- This finds other documents with similar filenames/paths and updates the user_id
UPDATE documents d1
SET user_id = (
    SELECT DISTINCT d2.user_id
    FROM documents d2
    INNER JOIN users u ON d2.user_id = u.user_id
    WHERE d2.documents_id != d1.documents_id
    AND (
        -- Match by similar file path or name pattern
        d2.file_path LIKE '%' || SUBSTRING(d1.file_path FROM POSITION('/' IN d1.file_path) + 1) || '%'
        OR d1.file_path LIKE '%' || SUBSTRING(d2.file_path FROM POSITION('/' IN d2.file_path) + 1) || '%'
    )
    LIMIT 1
)
WHERE d1.user_id NOT IN (SELECT user_id FROM users)
AND EXISTS (
    SELECT 1
    FROM documents d2
    INNER JOIN users u ON d2.user_id = u.user_id
    WHERE d2.documents_id != d1.documents_id
    AND (
        d2.file_path LIKE '%' || SUBSTRING(d1.file_path FROM POSITION('/' IN d1.file_path) + 1) || '%'
        OR d1.file_path LIKE '%' || SUBSTRING(d2.file_path FROM POSITION('/' IN d2.file_path) + 1) || '%'
    )
);

-- Alternative: If you know the correct user_id, update directly
-- Replace 'CORRECT_USER_ID' with the actual user_id from your application
-- UPDATE documents 
-- SET user_id = 'CORRECT_USER_ID'
-- WHERE user_id NOT IN (SELECT user_id FROM users);

-- Step 3: Verify the fix
SELECT 
    d.documents_id,
    d.document_type,
    d.user_id,
    u.first_name,
    u.last_name,
    d.file_name
FROM documents d
LEFT JOIN users u ON d.user_id = u.user_id
ORDER BY d.created_at DESC;
