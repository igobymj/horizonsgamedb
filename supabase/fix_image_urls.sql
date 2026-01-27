-- Fix broken image URLs after renaming bucket from 'game-images' to 'project-images'
-- Run this script in your Supabase SQL Editor to update existing image links.

UPDATE public.projects
SET image_urls = ARRAY(
    SELECT REPLACE(url, '/game-images/', '/project-images/')
    FROM unnest(image_urls) AS url
)
WHERE image_urls IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(image_urls) AS u WHERE u LIKE '%/game-images/%'
  );
