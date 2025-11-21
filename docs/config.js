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
    games: IS_DEV ? 'games_dev' : 'games'
};

// Storage bucket (optional - could also have games-images-dev)
const STORAGE_BUCKETS = {
    images: IS_DEV ? 'game-images-dev' : 'game-images'
};