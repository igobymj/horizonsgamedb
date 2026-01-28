-- Separate admin flag from user_type field
-- Admin is a permission level, not a role

-- ============================================================
-- 1. ADD is_admin COLUMN
-- ============================================================

-- Add new is_admin boolean column (defaults to false)
ALTER TABLE "public"."people" 
    ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;

-- ============================================================
-- 2. MIGRATE EXISTING ADMIN USERS
-- ============================================================

-- Set is_admin = true for users who have user_type = 'admin'
UPDATE "public"."people" 
SET "is_admin" = true 
WHERE "user_type" = 'admin';

-- Update admin users to have a proper role
-- (Change 'admin' to 'instructor' or whatever makes sense for your data)
-- You may want to do this manually based on your specific users
UPDATE "public"."people" 
SET "user_type" = 'instructor' 
WHERE "user_type" = 'admin';

-- ============================================================
-- 3. UPDATE CHECK CONSTRAINT
-- ============================================================

-- Drop the old constraint
ALTER TABLE "public"."people" 
    DROP CONSTRAINT IF EXISTS "people_type_check";

-- Add new constraint without 'admin' option
ALTER TABLE "public"."people" 
    ADD CONSTRAINT "people_type_check" 
    CHECK ("user_type" = ANY (ARRAY['instructor'::text, 'student'::text, 'contributor'::text]));

-- ============================================================
-- 4. CREATE INDEX FOR ADMIN LOOKUPS
-- ============================================================

-- Add index for efficient admin queries
CREATE INDEX IF NOT EXISTS "idx_people_is_admin" 
    ON "public"."people" ("is_admin");

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these to verify the migration:
-- 
-- Check current admin users:
-- SELECT id, name, email, user_type, is_admin FROM "public"."people" WHERE is_admin = true;
--
-- Check all user types:
-- SELECT user_type, is_admin, COUNT(*) FROM "public"."people" GROUP BY user_type, is_admin;
