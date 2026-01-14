# GitHub Copilot Instructions — horizonsgamedb (docs)

Purpose: Give an AI coding agent immediate, actionable context for working in this repo — architecture, critical workflows, conventions, and short examples.

## Big picture
- This is a **static, client-side website** (plain HTML/CSS/JS) that reads/writes data directly to a Supabase project from the browser.
- Key pages: `index.html` (archive listing + modal), `upload.html` (upload form), `login.html` (auth form). Shared config and logic live in `config.js`, `archive.js`, `upload.js`, `auth-ui.js`, `login.js`.
- Data flow: browser -> Supabase (DB + Storage) via `@supabase/supabase-js` (CDN). Images are compressed client-side (`browser-image-compression`) then uploaded to Supabase Storage; metadata is inserted into a DB table.

## Key files & responsibilities
- `config.js` — central configuration (PROJECT_URL, ANON_KEY, `IS_DEV` detection, `TABLES`, `STORAGE_BUCKETS`). MUST be loaded before other scripts.
- `index.html` + `archive.js` — fetch `TABLES.projects` and render cards + detail modal. Uses fields like `title`, `briefDescription`, `creators`, `image_urls`, `institution`, `year`, `term`, `instructors`, `keywords`, `genre`.
- `upload.html` + `upload.js` — handles authenticated upload, image compression, storage uploads, and DB insert. Form IDs: `gameTitle`, `gameGenre`, `creators-input`, `images`, etc. The script builds `gameData` and inserts it.
- `login.html` + `login.js` — sign-in flow, redirect logic, `getRedirectUrl()` helper.
- `auth-ui.js` — renders login/logout UI depending on Supabase session.

## Conventions & important patterns (project-specific)
- Environment detection: `IS_DEV` checks `window.location.hostname` for `localhost` or `127.0.0.1` and toggles table names to `_<table>_dev` when true. When adding tables, follow this naming pattern.
- `config.js` exports simple constants (global vars). Other files assume `PROJECT_URL`, `ANON_KEY`, `TABLES`, `STORAGE_BUCKETS` exist globally.
- Scripts rely on `DOMContentLoaded` and expect DOM IDs to match exactly (e.g., `upload-form`, `project-results`). Changing an ID requires updating all referencing code.
- No bundler or server-side code — changes are local and visible immediately in the browser.

## Supabase specifics & gotchas
- ANON key is embedded in `config.js` (public-anon token). It's expected for client usage, but treat it as a key you can rotate in Supabase if necessary.
- Storage bucket names are defined in `STORAGE_BUCKETS`. Image upload uses `STORAGE_BUCKETS.images`.
- Dev tables follow `_name_dev` pattern; `config.js` replaces `TABLES.*` accordingly.

## Known issues / immediate PR suggestions (high priority)
- (Fixed) `upload.js` previously called `supabase.from(TABLES.games)` and used `gameTitle`/`gameGenre`. It now inserts into `TABLES.projects` and uses `title`/`genre`. If you prefer keeping a separate `games` table, add `games: IS_DEV ? '_games_dev' : 'games'` to `TABLES` in `config.js` and ensure the table schema matches the payload.
- Field naming mismatch: `upload.js` constructs `gameData` with keys `gameTitle` and `gameGenre`, while `archive.js` expects `project.title` and `project.genre` (or `project.briefDescription`, `project.image_urls`, `project.creators`). When adding/updating fields, update both the upload pipeline and the rendering code.

## How to run & debug locally (concrete steps)
- Serve the `docs` directory (so `IS_DEV` detection works):
  - Python: `cd docs && python3 -m http.server 8000`
  - Or `npx serve docs` (if `serve` is available)
- Open `http://localhost:8000/index.html` and use browser devtools (Console/Network) to observe Supabase requests and errors (e.g., missing `TABLES.*` or mismatched field names).
- Check Supabase Dashboard for: table schemas, storage objects, and auth session logs.

## Common debugging tips
- Console errors often indicate: missing `TABLES` key, mismatched field names, or CORS/auth failures on Supabase. Reproduce workflow (upload, fetch, render) to capture the failing request + payload.
- Use `console.log()` strategically in `upload.js` / `archive.js` to confirm DB payload shapes.
- Verify scripts load order in HTML: `@supabase/supabase-js` ➜ `config.js` ➜ app scripts.

## PR guidance & checks for content changes
- When adding a new DB field: update `upload.html` (form id), map it in `upload.js` (exact key mapping), then update `archive.js` render + modal to display the new field.
- If you change table names or add a table, update `config.js.TABLES` to include the name and follow `_name_dev` for dev mode.
- Update `README.md` (top-level) when changing deployment or run instructions so future contributors don't rely solely on this Copilot doc.

## Search shortcuts (for agents)
- Look for table references: `TABLES\.`
- Look for Supabase usage: `supabaseClient` / `supabase.createClient` / `.from(`
- Important files to open first: `config.js`, `archive.js`, `upload.js`, `upload.html`, `index.html`.

---
If anything in this file seems unclear or you'd like more examples (e.g., a suggested PR patch to fix `TABLES.games` + field mapping), tell me which part to expand and I will update this doc. ✅
