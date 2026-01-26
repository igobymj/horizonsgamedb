-- Run this in Supabase SQL Editor to check if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- Also check if the bucket exists
SELECT * FROM storage.buckets WHERE id = 'project-images';
