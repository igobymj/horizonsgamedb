// Initialize Supabase
const PROJECT_URL = 'https://xylhehjbonypyjiyhkkt.supabase.co/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bGhlaGpib255cHlqaXloa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjkxNjEsImV4cCI6MjA3ODY0NTE2MX0.rWKrKSOCJBLVMPgSt5TAjjIYdFr6tO2Y7V0lQPDz9As';

const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

// Get redirect URL from query params or referrer, default to index.html
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    
    if (redirect) {
        return redirect;
    }
    
    // Check document.referrer
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
        return document.referrer;
    }
    
    // Default to index
    return 'index.html';
}

const redirectUrl = getRedirectUrl();

// Check if already logged in
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        // Already logged in, redirect to home page
        window.location.href = 'index.html';
    }
}

// Show message helper
function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('auth-message');
    messageDiv.textContent = message;
    messageDiv.className = `alert mt-3 ${isError ? 'alert-danger' : 'alert-success'}`;
    messageDiv.classList.remove('d-none');
}

// Login Form
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        showMessage('Login successful! Redirecting...', false);
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message || 'Login failed. Please check your credentials.', true);
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});