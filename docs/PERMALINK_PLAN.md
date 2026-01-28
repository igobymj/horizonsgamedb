# Project Permalink Implementation Plan

## 📌 Overview
Add shareable, permanent links to individual projects in the Horizons Student Game Archive.

---

## 🎯 Requirements

### Core Features
- ✅ Direct link to view a specific project
- ✅ Share links via email, social media, etc.
- ✅ Bookmarkable URLs
- ✅ SEO-friendly URLs
- ✅ Handle deleted/invalid projects gracefully

---

## 🏗️ Implementation Options

### **Option 1: Query Parameter with ID** (Recommended ⭐)
**URL Format:** `https://yoursite.com/?project=123`

**Pros:**
- ✅ Simple to implement
- ✅ Works with static hosting (no server config needed)
- ✅ Reliable (IDs never change)
- ✅ Fast lookups (indexed by ID)

**Cons:**
- ❌ URLs aren't human-readable
- ❌ Not as SEO-friendly

**Implementation:**
```javascript
// Check for project parameter on page load
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('project');
if (projectId) {
    openProjectById(projectId);
}
```

---

### **Option 2: Query Parameter with Slug** (Best for SEO ⭐⭐)
**URL Format:** `https://yoursite.com/?project=my-awesome-rpg-game`

**Pros:**
- ✅ Human-readable URLs
- ✅ Better for SEO
- ✅ More shareable (people can guess what it's about)
- ✅ Works with static hosting

**Cons:**
- ❌ Requires slug generation
- ❌ Need to handle slug conflicts
- ❌ Slightly slower lookups (unless indexed)

**Implementation:**
- Add `slug` column to `projects` table
- Generate slug from title when project is created
- Handle slug uniqueness (append number if duplicate)
- Query by slug instead of ID

---

### **Option 3: Dedicated Project Page** (Best UX ⭐⭐⭐)
**URL Format:** `https://yoursite.com/project.html?slug=my-awesome-rpg-game`

**Pros:**
- ✅ Clean separation of concerns
- ✅ Better for SEO (dedicated page)
- ✅ Can add more detail than modal
- ✅ Better social media previews

**Cons:**
- ❌ Requires new page
- ❌ More code to maintain

---

### **Option 4: Hash-based Routing**
**URL Format:** `https://yoursite.com/#/project/my-awesome-rpg-game`

**Pros:**
- ✅ Works with static hosting
- ✅ Enables SPA-style routing
- ✅ Can bookmark and share

**Cons:**
- ❌ Harder to crawl for SEO
- ❌ More complex JavaScript

---

## 🚀 Recommended Approach: Option 2 + Enhancement

**Use slugs with query parameters, plus these enhancements:**

### Phase 1: Basic Permalinks
1. Add `slug` column to `projects` table
2. Generate slugs automatically on project creation/edit
3. Add permalink detection on page load
4. Open project modal when permalink is detected

### Phase 2: Sharing Features
1. Add "Copy Link" button to project cards/modal
2. Add social share buttons (optional)
3. Update URL hash when viewing project (non-intrusive)

### Phase 3: SEO & Polish
1. Add Open Graph meta tags for social sharing
2. Create sitemap with project pages (optional)
3. Handle 404s gracefully for deleted projects

---

## 📋 Database Changes Needed

### Migration: Add slug column

```sql
-- Add slug column to projects table
ALTER TABLE "public"."projects" 
    ADD COLUMN IF NOT EXISTS "slug" text;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS "idx_projects_slug" 
    ON "public"."projects" ("slug");

-- Generate slugs for existing projects
-- (Run a script to populate slugs based on titles)
UPDATE "public"."projects"
SET "slug" = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE("title", '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
    )
)
WHERE "slug" IS NULL;
```

---

## 🛠️ Implementation Steps

### 1. Create Slug Generation Utility
```javascript
// slug-utils.js
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-')           // Remove duplicate hyphens
        .replace(/^-|-$/g, '')         // Trim hyphens from ends
        .substring(0, 100);            // Limit length
}

async function ensureUniqueSlug(baseSlug, projectId = null) {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
        const { data, error } = await supabaseClient
            .from(TABLES.projects)
            .select('id')
            .eq('slug', slug)
            .maybeSingle();
        
        if (!data || data.id === projectId) {
            return slug; // Slug is unique
        }
        
        // Try with counter
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}
```

### 2. Update Upload/Edit Forms
```javascript
// When saving a project:
const slug = await ensureUniqueSlug(generateSlug(title), projectId);
const projectData = {
    // ... other fields
    slug: slug
};
```

### 3. Add Permalink Detection
```javascript
// In archive.js - on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check for project permalink
    const urlParams = new URLSearchParams(window.location.search);
    const projectSlug = urlParams.get('project');
    
    if (projectSlug) {
        await openProjectBySlug(projectSlug);
    }
    
    // ... rest of initialization
});

async function openProjectBySlug(slug) {
    try {
        const { data: project, error } = await supabaseClient
            .from(TABLES.projects)
            .select('*')
            .eq('slug', slug)
            .single();
        
        if (error || !project) {
            showError('Project not found');
            return;
        }
        
        viewProject(project.id);
    } catch (error) {
        console.error('Error loading project:', error);
    }
}
```

### 4. Add Copy Permalink Button
```javascript
// Add to project modal
function getProjectPermalink(project) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?project=${project.slug}`;
}

function copyPermalink(project) {
    const url = getProjectPermalink(project);
    navigator.clipboard.writeText(url);
    showSuccess('Link copied to clipboard!');
}
```

### 5. Add Share Button to Modal
```html
<button class="btn btn-outline-primary" onclick="copyPermalink(currentProject)">
    <i class="fas fa-link me-1"></i> Copy Link
</button>
```

---

## 🎨 UI Additions

### Project Card
- Add small "link" icon on hover
- Click to copy permalink

### Project Modal
- "Share" button in header or footer
- Copy permalink
- Optional: Share to social media

---

## ✅ Testing Checklist

- [ ] Slug generation works correctly
- [ ] Duplicate titles get unique slugs (appended numbers)
- [ ] Permalink opens correct project
- [ ] Invalid permalinks show error message
- [ ] Copy button works
- [ ] URL updates when viewing project (optional)
- [ ] Works with filters active
- [ ] Works on mobile

---

## 🔮 Future Enhancements

1. **Short URLs**: Create a URL shortener (`/p/abc123`)
2. **QR Codes**: Generate QR codes for physical displays
3. **Analytics**: Track how often projects are viewed via permalink
4. **Canonical URLs**: Add to prevent duplicate content issues
5. **Preview Cards**: Rich social media previews with game screenshots

---

## 📊 Estimated Effort

- **Database Migration**: 15 min
- **Slug Generation Utils**: 30 min
- **Update Upload/Edit**: 30 min
- **Permalink Detection**: 30 min
- **Copy Link Feature**: 30 min
- **Testing**: 30 min

**Total**: ~3 hours

---

## 🚨 Edge Cases to Handle

1. **Special Characters**: Remove or convert (é → e)
2. **Very Long Titles**: Truncate slug to reasonable length
3. **Duplicate Slugs**: Append numbers (game-1, game-2)
4. **Slug Changes**: What happens if title changes? (Keep old slug vs regenerate)
5. **Deleted Projects**: Show "Project not found" message
6. **Private Projects**: Don't allow permalinks or show "Access denied"

---

## 🎯 Recommendation

**Start with Option 2 (Query Parameter with Slug)**

It provides the best balance of:
- Easy implementation
- SEO benefits
- User-friendly URLs
- No server configuration needed

Then add the "Copy Link" button for easy sharing!
