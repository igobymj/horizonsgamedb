// Check for production mode override via URL parameter
// Usage: http://localhost:8000/?prod=true to use production tables locally
const urlParams = new URLSearchParams(window.location.search);
const FORCE_PROD = urlParams.get('prod') === 'true';

// Detect if running locally
// const IS_DEV = (window.location.hostname === 'localhost' ||
//     window.location.hostname === '127.0.0.1' ||
//     window.location.hostname.includes('127.0.0.1') ||
//     window.location.protocol === 'file:' ||  // Local file system
//     window.location.href.includes('beta') ||
//     window.location.href.includes('demo')) && !FORCE_PROD;  // Override if ?prod=true

const IS_DEV = false; // need to remove this for now. We're still in the midst of database migration

// Supabase connection (same for both) // TO DO these should be separate for prod and dev, eventually
// const PROJECT_URL = 'https://xylhehjbonypyjiyhkkt.supabase.co/';
// const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bGhlaGpib255cHlqaXloa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjkxNjEsImV4cCI6MjA3ODY0NTE2MX0.rWKrKSOCJBLVMPgSt5TAjjIYdFr6tO2Y7V0lQPDz9As';

const PROJECT_URL = 'https://xrogfxbkjbjhlhqrdgon.supabase.co'
const ANON_KEY = 'sb_publishable_V8RaJ7atfz4nGMleGZJ0DQ_ZQit7SeA';


// Table names switch based on environment // TO DO this switch has been deprecated in favor of having two separate databases 
const TABLES = {
    projects: IS_DEV ? '_projects_dev' : 'projects',
    institutions: IS_DEV ? '_institutions_dev' : 'institutions',
    people: IS_DEV ? '_people_dev' : 'people',
    people_projects: IS_DEV ? '_people_projects_dev' : 'people_projects',
    invites: IS_DEV ? '_invites_dev' : 'invites',
    keywords: IS_DEV ? '_keywords_dev' : 'keywords',
    genres: IS_DEV ? '_genres_dev' : 'genres'
};

// Storage bucket (optional - could also have games-images-dev)
const STORAGE_BUCKET = 'project-images';