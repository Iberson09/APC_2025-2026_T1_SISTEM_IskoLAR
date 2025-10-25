-- DIRECT FIX FOR ORPHANED PSA BIRTH CERTIFICATE
-- The orphaned user_id is: 1df1cea3-a3ca-4a99-b8c9-17bc17b650e9

-- STEP 1: First, let's find this orphaned document and see other documents that might belong to the same user
SELECT 
    d.documents_id,
    d.document_type,
    d.user_id,
    d.file_path,
    d.file_name,
    d.created_at
FROM documents d
WHERE d.user_id = '1df1cea3-a3ca-4a99-b8c9-17bc17b650e9'
ORDER BY d.created_at;

-- STEP 2: Find documents that might belong to the same user (based on similar upload time or file path)
-- This will help us identify the correct user_id
SELECT 
    d.documents_id,
    d.document_type,
    d.user_id,
    u.first_name,
    u.last_name,
    u.email_address,
    d.file_path,
    d.created_at
FROM documents d
INNER JOIN users u ON d.user_id = u.user_id
WHERE d.created_at BETWEEN 
    (SELECT created_at - INTERVAL '1 hour' FROM documents WHERE user_id = '1df1cea3-a3ca-4a99-b8c9-17bc17b650e9' LIMIT 1)
    AND
    (SELECT created_at + INTERVAL '1 hour' FROM documents WHERE user_id = '1df1cea3-a3ca-4a99-b8c9-17bc17b650e9' LIMIT 1)
ORDER BY d.created_at;

-- STEP 3: Once you identify the correct user_id from Step 2, update the orphaned document
-- REPLACE 'PASTE_CORRECT_USER_ID_HERE' with the actual user_id
/*
UPDATE documents
SET user_id = 'PASTE_CORRECT_USER_ID_HERE'
WHERE user_id = '1df1cea3-a3ca-4a99-b8c9-17bc17b650e9';
*/

-- STEP 4: Verify the fix
SELECT 
    d.documents_id,
    d.document_type,
    d.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.email_address,
    d.file_name,
    CASE 
        WHEN u.user_id IS NULL THEN '❌ ORPHANED'
        ELSE '✅ OK'
    END as status
FROM documents d
LEFT JOIN users u ON d.user_id = u.user_id
WHERE d.documents_id IN (
    SELECT documents_id FROM documents WHERE user_id = 'PASTE_CORRECT_USER_ID_HERE'
)
ORDER BY d.document_type;
