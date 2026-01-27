// Initialize Supabase client
const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

let currentUser = null;
let currentPersonId = null;

// Check authentication on page load
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return false;
    }

    currentUser = session.user;
    return true;
}

// Load user's profile data
async function loadUserProfile() {
    try {
        if (!currentUser) return;

        // Find person record by email
        const { data: person, error } = await supabaseClient
            .from(TABLES.people)
            .select('*')
            .eq('email', currentUser.email)
            .maybeSingle();

        if (error) throw error;

        if (!person) {
            showMessage('Profile not found. Please contact admin.', 'warning');
            return;
        }

        currentPersonId = person.id;

        // Populate form fields
        document.getElementById('email').value = person.email || currentUser.email;
        document.getElementById('name').value = person.name || '';
        document.getElementById('bio').value = person.bio || '';
        document.getElementById('degree').value = person.degree || '';
        document.getElementById('graduation-year').value = person.graduation_year || '';
        document.getElementById('institution').value = person.institution_id || '';
        document.getElementById('website').value = person.website || '';
        document.getElementById('linkedin').value = person.linkedin_url || '';
        document.getElementById('social-media').value = person.social_media_url || '';
        document.getElementById('is-public').checked = person.is_public !== false;

    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('Error loading profile data', 'danger');
    }
}

// Load institutions for dropdown
async function loadInstitutions() {
    try {
        const { data: institutions, error } = await supabaseClient
            .from(TABLES.institutions)
            .select('id, institutionname')
            .order('institutionname');

        if (error) throw error;

        const select = document.getElementById('institution');
        institutions.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst.id;
            option.textContent = inst.institutionname;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading institutions:', error);
    }
}

// Save profile
async function saveProfile(event) {
    event.preventDefault();

    if (!currentPersonId) {
        showMessage('Profile not found', 'danger');
        return;
    }

    try {
        const profileData = {
            name: document.getElementById('name').value.trim(),
            bio: document.getElementById('bio').value.trim() || null,
            degree: document.getElementById('degree').value.trim() || null,
            graduation_year: document.getElementById('graduation-year').value ?
                parseInt(document.getElementById('graduation-year').value) : null,
            institution_id: document.getElementById('institution').value || null,
            institution_other: null, // Clear institution_other when institution_id is set
            website: document.getElementById('website').value.trim() || null,
            linkedin_url: document.getElementById('linkedin').value.trim() || null,
            social_media_url: document.getElementById('social-media').value.trim() || null,
            is_public: document.getElementById('is-public').checked
        };

        const { error } = await supabaseClient
            .from(TABLES.people)
            .update(profileData)
            .eq('id', currentPersonId);

        if (error) throw error;

        showMessage('Profile saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving profile:', error);
        showMessage('Error saving profile: ' + error.message, 'danger');
    }
}

// Show message to user
function showMessage(message, type) {
    const container = document.getElementById('message-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.innerHTML = '';
    container.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}


// NOTE: Logout function removed - now handled by navbar.js

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    // Pre-fill email field
    document.getElementById('email').value = currentUser.email;

    await loadInstitutions();
    await loadUserProfile();

    // Event listeners
    document.getElementById('profile-form').addEventListener('submit', saveProfile);

    // NOTE: Logout is now handled by navbar.js

    // Update privacy help text when toggle changes
    const isPublicToggle = document.getElementById('is-public');
    const privacyHelpText = document.getElementById('privacy-help-text');

    function updatePrivacyText() {
        if (isPublicToggle.checked) {
            privacyHelpText.textContent = 'Your entire profile will be visible to the public';
        } else {
            privacyHelpText.textContent = 'Only your display name will be visible to the public';
        }
    }

    // Update on change
    isPublicToggle.addEventListener('change', updatePrivacyText);

    // Set initial text
    updatePrivacyText();
});
