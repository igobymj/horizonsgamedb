// ============================================================
// ENVIRONMENT DETECTION
// ============================================================

// Check for environment override via URL parameters
// Usage: http://localhost:8000/?prod=true to force production mode locally
// Usage: https://your-site.com/?dev=true to force dev mode on live site
const urlParams = new URLSearchParams(window.location.search);
const FORCE_PROD = urlParams.get('prod') === 'true';
const FORCE_DEV = urlParams.get('dev') === 'true';

// Known production domains
const PROD_DOMAINS = [
    'beta01.horizons-db.pages.dev',
    'horizons-db.pages.dev',
    // Add more production domains here as needed
];

// Automatically detect development environment
const IS_DEV = FORCE_DEV || (
    !FORCE_PROD && // Not forcing production
    !PROD_DOMAINS.includes(window.location.hostname) && // Not a known production domain
    (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('127.0.0.1') ||
        window.location.protocol === 'file:'  // Local file system
    )
);

// Log current environment (helpful for debugging)
console.log(`[Config] Environment: ${IS_DEV ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`[Config] Hostname: ${window.location.hostname}`);
console.log(`[Config] Database: ${IS_DEV ? 'DEV' : 'PROD'}`);

// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

// Development Database (separate instance)
// TODO: Replace with your development Supabase credentials
const DEV_PROJECT_URL = 'https://xylhehjbonypyjiyhkkt.supabase.co';
const DEV_ANON_KEY = 'sb_publishable_4qtyT311I9gyj_OfJqDODw_uPzvHcsh';

// Production Database (separate instance)
const PROD_PROJECT_URL = 'https://xrogfxbkjbjhlhqrdgon.supabase.co';
const PROD_ANON_KEY = 'sb_publishable_V8RaJ7atfz4nGMleGZJ0DQ_ZQit7SeA';

// Select configuration based on environment
const PROJECT_URL = IS_DEV ? DEV_PROJECT_URL : PROD_PROJECT_URL;
const ANON_KEY = IS_DEV ? DEV_ANON_KEY : PROD_ANON_KEY;

// ============================================================
// TABLE CONFIGURATION
// ============================================================

// Table names (same across both databases - no more _dev suffix)
const TABLES = {
    projects: 'projects',
    institutions: 'institutions',
    people: 'people',
    people_projects: 'people_projects',
    invites: 'invites',
    keywords: 'keywords',
    genres: 'genres'
};

// ============================================================
// STORAGE CONFIGURATION
// ============================================================

// Storage bucket (same name in both environments)
const STORAGE_BUCKET = 'project-images';

// ============================================================
// SUPABASE CLIENT
// ============================================================

// Single shared client instance for all pages
const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);