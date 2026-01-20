
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

// Load institutions for autocomplete
async function loadInstitutions() {
    try {
        const { data: institutions, error } = await supabaseClient
            .from(TABLES.institutions)
            .select('institutionname')
            .order('institutionname');

        if (error) {
            console.error('Error loading institutions:', error);
            return;
        }

        const datalist = document.getElementById('institutions-list');
        institutions.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst.institutionname;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading institutions:', error);
    }
}

// Signup Form
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const institution = document.getElementById('signup-institution').value.trim();
    const userType = document.getElementById('signup-type').value;
    const code = document.getElementById('signup-code').value.trim().toUpperCase();
    const password = document.getElementById('signup-password').value;
    const signupBtn = document.getElementById('signup-btn');

    signupBtn.disabled = true;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating account...';

    try {
        // Step 1: Validate invitation code
        const { data: inviteData, error: inviteError } = await supabaseClient
            .from(TABLES.invites)
            .select('*')
            .eq('code', code)
            .eq('email', email)
            .single();

        if (inviteError || !inviteData) {
            throw new Error('Invalid invitation code or email does not match');
        }

        if (inviteData.used_at !== null) {
            throw new Error('This invitation code has already been used');
        }

        if (inviteData.is_active === false) {
            throw new Error('This invitation code is no longer active');
        }

        // Step 2: Check if email already exists in people table
        const { data: existingUser } = await supabaseClient
            .from(TABLES.people)
            .select('email')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            throw new Error('A user already exists with this email address');
        }

        // Step 3: Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (authError) throw authError;

        // Step 4: Lookup institution
        let institutionId = null;
        let institutionOther = null;

        const { data: institutionData, error: institutionLookupError } = await supabaseClient
            .from(TABLES.institutions)
            .select('id')
            .ilike('institutionname', institution)
            .single();

        if (institutionData && !institutionLookupError) {
            // Institution found in database
            institutionId = institutionData.id;
        } else {
            // Institution not found, store as arbitrary string
            institutionOther = institution;
        }

        // Step 5: Add user to people table
        const { error: peopleError } = await supabaseClient
            .from(TABLES.people)
            .insert([{
                user_id: authData.user.id,
                email: email,
                name: name,
                institution_id: institutionId,
                institution_other: institutionOther,
                user_type: userType
            }]);

        if (peopleError) throw peopleError;

        // Step 6: Mark invitation code as used
        const { error: updateError } = await supabaseClient
            .from(TABLES.invites)
            .update({
                used_at: new Date().toISOString()
            })
            .eq('id', inviteData.id);

        if (updateError) throw updateError;

        showMessage('Account created successfully! You can now log in.', false);

        // Switch to login tab and clear form
        document.getElementById('login-tab').click();
        document.getElementById('signup-form').reset();

    } catch (error) {
        console.error('Signup error:', error);
        showMessage(error.message || 'Signup failed. Please try again.', true);
    } finally {
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadInstitutions();
});