
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
            window.location.href = redirectUrl;
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message || 'Login failed. Please check your credentials.', true);
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
    }
});

// Invite table constant (matches admin.js)
const INVITE_TABLE = IS_DEV ? '_invites_dev' : 'invites';

// Signup message helper
function showSignupMessage(message, isError = false) {
    const messageDiv = document.getElementById('signup-message');
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = `alert mt-3 ${isError ? 'alert-danger' : 'alert-success'}`;
    messageDiv.classList.remove('d-none');
}

// Sign-up form handler (invite-based)
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('signup-invite-code').value.trim();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const password = document.getElementById('signup-password').value;
        const signupBtn = document.getElementById('signup-btn');

        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing up...';

        try {
            // Validate invite exists, not used, and not expired
            const { data: invite, error: inviteErr } = await supabaseClient
                .from(INVITE_TABLE)
                .select('*')
                .eq('code', code)
                .is('used_at', null)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (inviteErr || !invite) throw new Error('Invalid or expired invitation code');
            if (invite.email && invite.email.toLowerCase() !== email) throw new Error('Invitation code is assigned to a different email');

            // Create user
            const { data: signData, error: signError } = await supabaseClient.auth.signUp({
                email: email,
                password: password
            });

            if (signError) throw signError;

            // Try to sign the user in automatically (best-effort)
            let autoSignedIn = false;
            let signInResult = null;
            try {
                signInResult = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                const signInError = signInResult?.error;
                const signInData = signInResult?.data;
                if (!signInError && signInData?.session) {
                    autoSignedIn = true;
                }
            } catch (e) {
                console.warn('Auto sign-in failed:', e);
            }

            // Ensure a people record exists for the user (maps to _people_dev in dev)
            const userId = signData?.user?.id || signInResult?.data?.user?.id || signInResult?.data?.session?.user?.id;
            if (userId) {
                try {
                    const personPayload = {
                        user_id: userId,
                        email: email,
                        type: 'contributor'
                    };

                    const { error: personError } = await supabaseClient
                        .from(TABLES.people)
                        .upsert([personPayload], { onConflict: 'user_id' });

                    if (personError) console.warn('Failed to create/ensure people record:', personError.message);
                } catch (pe) {
                    console.warn('People upsert error:', pe);
                }
            } else {
                console.warn('No user id available to create people record yet.');
            }

            // Mark invite used (best effort)
            const updatePayload = { used_at: new Date().toISOString() };
            if (signData?.user?.id) updatePayload.used_by = signData.user.id;

            const { error: updateError } = await supabaseClient
                .from(INVITE_TABLE)
                .update(updatePayload)
                .eq('id', invite.id);

            if (updateError) console.warn('Failed to mark invite used:', updateError.message);

            if (autoSignedIn) {
                showSignupMessage('Signup successful! Redirecting...', false);
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1000);
            } else {
                // Account created but auto-login failed. Redirect to login so user can sign in or follow project-specific confirmation flow.
                showSignupMessage('Signup created — please sign in. Redirecting to login...', false);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }

        } catch (err) {
            console.error('Signup error:', err);
            showSignupMessage(err.message || 'Signup failed. Please check your code and email.', true);
            signupBtn.disabled = false;
            signupBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Sign Up';
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Prefill invite info from URL (e.g., ?invite=CODE&email=you@example.com)
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    const inviteEmail = urlParams.get('email');

    if (inviteCode) {
        const signupCodeInput = document.getElementById('signup-invite-code');
        if (signupCodeInput) signupCodeInput.value = inviteCode;
        const signupEmailInput = document.getElementById('signup-email');
        if (inviteEmail && signupEmailInput) signupEmailInput.value = inviteEmail;

        // Switch to Sign Up tab
        const signupTabEl = document.getElementById('signup-tab');
        if (signupTabEl) {
            const tab = bootstrap.Tab.getOrCreateInstance(signupTabEl);
            tab.show();
        }
    }

    // Update header depending on active tab
    function updateHeading() {
        const heading = document.getElementById('account-heading');
        if (!heading) return;
        const signupTab = document.getElementById('signup-tab');
        if (signupTab && signupTab.classList.contains('active')) {
            heading.innerHTML = '<i class="fas fa-user-circle me-2"></i>Create Your Account';
        } else {
            heading.innerHTML = '<i class="fas fa-user-circle me-2"></i>Sign In to Your Account';
        }
    }

    // Listen for tab clicks and Bootstrap shown event to update heading
    const loginTabEl = document.getElementById('login-tab');
    const signupTabEl2 = document.getElementById('signup-tab');
    if (loginTabEl) loginTabEl.addEventListener('click', updateHeading);
    if (signupTabEl2) signupTabEl2.addEventListener('click', updateHeading);
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tabBtn => {
        tabBtn.addEventListener('shown.bs.tab', updateHeading);
    });

    // Set initial heading
    updateHeading();
});