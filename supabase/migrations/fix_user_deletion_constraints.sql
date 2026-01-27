-- Fix Foreign Key Constraints to Allow User Deletion
-- This migration updates FK constraints to handle user deletion gracefully

-- ============================================================
-- 1. DROP EXISTING CONSTRAINTS
-- ============================================================

-- Drop existing FK constraints that prevent user deletion
ALTER TABLE "public"."invites" 
    DROP CONSTRAINT IF EXISTS "invites_created_by_fkey";

ALTER TABLE "public"."keywords" 
    DROP CONSTRAINT IF EXISTS "keywords_created_by_fkey";

ALTER TABLE "public"."people" 
    DROP CONSTRAINT IF EXISTS "people_user_id_fkey";

-- ============================================================
-- 2. ADD NEW CONSTRAINTS WITH CASCADING BEHAVIOR
-- ============================================================

-- INVITES: Set created_by to NULL when user is deleted
-- (Preserves invitation codes but loses creator attribution)
ALTER TABLE "public"."invites" 
    ADD CONSTRAINT "invites_created_by_fkey" 
    FOREIGN KEY ("created_by") 
    REFERENCES "auth"."users"("id") 
    ON DELETE SET NULL;

-- KEYWORDS: Set created_by to NULL when user is deleted
-- (Preserves keywords but loses creator attribution)
ALTER TABLE "public"."keywords" 
    ADD CONSTRAINT "keywords_created_by_fkey" 
    FOREIGN KEY ("created_by") 
    REFERENCES "auth"."users"("id") 
    ON DELETE SET NULL;

-- PEOPLE: Delete profile when auth user is deleted
-- (Maintains data integrity - no orphaned profiles)
ALTER TABLE "public"."people" 
    ADD CONSTRAINT "people_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "auth"."users"("id") 
    ON DELETE CASCADE;

-- ============================================================
-- 3. OPTIONAL: HANDLE PROJECTS TABLE (if needed)
-- ============================================================

-- If projects table has a user reference, you may want to either:
-- Option A: CASCADE delete (remove user's projects when they're deleted)
-- Option B: SET NULL (keep projects but lose ownership)
-- Option C: Transfer to system user

-- Uncomment if you want to handle projects:
-- ALTER TABLE "public"."projects" 
--     DROP CONSTRAINT IF EXISTS "projects_created_by_fkey";
-- 
-- ALTER TABLE "public"."projects" 
--     ADD CONSTRAINT "projects_created_by_fkey" 
--     FOREIGN KEY ("created_by") 
--     REFERENCES "auth"."users"("id") 
--     ON DELETE CASCADE;  -- or ON DELETE SET NULL

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Run this to verify the constraints are updated:
-- SELECT 
--     tc.table_name,
--     kcu.column_name,
--     rc.delete_rule,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--     ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--     ON tc.constraint_name = rc.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--     ON rc.constraint_name = ccu.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--     AND ccu.table_name = 'users'
--     AND tc.table_schema = 'public'
-- ORDER BY tc.table_name;
