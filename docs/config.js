// Detect if running locally
const IS_DEV = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.href.includes('beta');

// Supabase connection (same for both)
const PROJECT_URL = 'https://xylhehjbonypyjiyhkkt.supabase.co/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bGhlaGpib255cHlqaXloa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjkxNjEsImV4cCI6MjA3ODY0NTE2MX0.rWKrKSOCJBLVMPgSt5TAjjIYdFr6tO2Y7V0lQPDz9As';

// Table names switch based on environment
const TABLES = {
    projects: IS_DEV ? '_projects_dev' : 'projects',
    institutions: IS_DEV ? '_institutions_dev' : 'institutions',
    people: IS_DEV ? '_people_dev' : 'people',
    people_projects: IS_DEV ? '_people_projects_dev' : 'people_projects',
    invites: IS_DEV ? '_invites_dev' : 'invites'
};

// Storage bucket (optional - could also have games-images-dev)
const STORAGE_BUCKETS = {
    images: IS_DEV ? 'game-images-dev' : 'game-images'
};