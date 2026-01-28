# 🚀 Deployment Checklist

Use this checklist every time you deploy to production to ensure all steps are completed.

## Pre-Deployment

- [ ] All features tested locally
- [ ] Code committed and pushed to main branch
- [ ] Review all migration files in `supabase/migrations/`

## Database Migrations

**⚠️ CRITICAL: Run migrations BEFORE deploying code changes**

### Pending Migrations to Run:

- [ ] `fix_user_deletion_constraints.sql` - FK constraint fixes for user deletion
- [ ] `separate_admin_from_user_type.sql` - Separate admin flag from user_type

### How to Run Migrations:

1. Open Supabase Dashboard → SQL Editor
2. Copy migration file contents
3. **TEST IN DEV FIRST:**
   - Run in DEV database
   - Verify results with the verification queries at bottom of migration
4. **Run in PROD:**
   - Run in PROD database
   - Verify results again
5. Mark migration as complete in this checklist

### Post-Migration Verification:

```sql
-- Verify admin users
SELECT id, name, email, user_type, is_admin 
FROM "public"."people" 
WHERE is_admin = true;

-- Verify all user types
SELECT user_type, is_admin, COUNT(*) 
FROM "public"."people" 
GROUP BY user_type, is_admin;
```

## Code Deployment

- [ ] Deploy frontend files to hosting
- [ ] Verify environment variables are set correctly
- [ ] Test critical user flows:
  - [ ] Login/Signup
  - [ ] Upload project
  - [ ] Edit profile
  - [ ] Admin panel access (admins only)
  - [ ] Grant/remove admin privileges

## Post-Deployment

- [ ] Verify navbar shows correctly on all pages
- [ ] Test admin management features
- [ ] Check browser console for errors
- [ ] Test on mobile device

## Rollback Plan

If issues occur:
1. Revert code deployment
2. Database changes are harder to rollback - see individual migration files for rollback instructions
3. Check Sentry/logs for errors

---

## Migration History

| Date | Migration | Status | Notes |
|------|-----------|--------|-------|
| YYYY-MM-DD | `separate_admin_from_user_type.sql` | ⏳ Pending | Adds is_admin field |
| YYYY-MM-DD | `fix_user_deletion_constraints.sql` | ✅ Complete | FK constraint fixes |

---

**💡 Tip:** Keep this checklist updated with each deployment. Mark completed migrations with ✅ and date.
