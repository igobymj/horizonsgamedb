# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Horizons Student Game Archive - A web application for archiving and browsing student-made video games and interactive projects. The site allows students and instructors to upload projects, browse the archive, and manage their profiles.

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 with Bootstrap 5.3
- **Backend**: Supabase (PostgreSQL database + Storage + Auth)
- **Hosting**: Cloudflare Pages (static site)
- **Dependencies**: Loaded via CDN (no build step required)
  - Bootstrap 5.3.2
  - Font Awesome 6.4.2
  - Supabase JS client v2
  - browser-image-compression 2.0.2

## Development

### Local Development

Serve the `docs/` directory with any static file server:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve docs
```

### Environment Switching

- Add `?dev=true` to URL to force DEV database
- Add `?prod=true` to URL to force PROD database
- Localhost automatically uses DEV database
- Production domains (configured in `config.js`) use PROD database

## Architecture

### Page Structure

Each page follows the same pattern:
1. HTML includes early access banner, empty `<header>` for navbar
2. Script loading order: Supabase CDN → Bootstrap → config.js → navbar.js → utility modules → page-specific JS

### Key Files

- **config.js**: Environment detection, Supabase credentials, table names, storage bucket config
- **navbar.js**: IIFE that generates consistent navigation across all pages, handles auth state display
- **archive.js**: Main page logic - fetches projects, renders cards, handles search/filter, project modal with view/edit modes
- **upload.js**: Project upload form with tag inputs, image compression, multi-step submission
- **admin.js**: Admin-only features - invitation codes, user management, storage monitoring, keyword/genre CRUD
- **profile.js**: User profile editing

### Shared Utility Modules

- **tag-utils.js**: Keyword/genre validation and database operations (isNewKeyword, isValidGenre, insertKeywordIfNew)
- **image-utils.js**: Image compression config, compressImage/compressImages, storage upload/delete helpers
- **validation-utils.js**: Form validation utilities
- **modal-utils.js**: Reusable modal functions (showWarning, showConfirmModal)

### Database Schema (Supabase)

Main tables (defined in `TABLES` object in config.js):
- **projects**: Core project data (title, description, year, term, image_urls array, etc.)
- **people**: User profiles (name, email, bio, is_admin flag, institution_id)
- **people_projects**: Junction table linking people to projects with role ('creator' or 'instructor')
- **institutions**: Institution names
- **keywords**: User-created tags (can be added during upload)
- **genres**: Admin-managed genres (must exist before use)
- **invites**: Invitation codes for registration

### Authentication Flow

- Supabase Auth handles login/signup
- `people` table stores profile data linked via email
- Admin check: `is_admin === true` in people table
- Protected pages check auth via `supabaseClient.auth.getSession()`

### Project Modal Edit Mode

The archive page's project modal has dual modes:
- **View mode**: Display-only project details
- **Edit mode**: Converts fields to inputs/textareas, tag editors for arrays (creators, keywords, etc.)
- Toggle via `toggleEditMode()`, save via `saveProjectChanges()`
- People-related edits update the `people_projects` junction table

### Image Handling

- Max 5 images per project
- Compressed to 0.5MB max, 1920px max dimension via browser-image-compression
- Stored in Supabase Storage bucket 'project-images'
- URLs stored as array in project.image_urls

## Common Patterns

### Supabase Query Pattern
```javascript
const { data, error } = await supabaseClient
    .from(TABLES.tablename)
    .select('*')
    .eq('column', value);
if (error) throw error;
```

### Tag Input Pattern
Tag inputs (creators, keywords, genres) use Enter key to add, store in arrays, validate against database before adding.

### Global Variables
Each page creates its own `supabaseClient`. Global arrays store runtime state (e.g., `allProjects`, `creators`, `compressedImages`).
