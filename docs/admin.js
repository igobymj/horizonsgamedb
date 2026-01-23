
const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

// Check authentication and admin status
async function checkAdminAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html?redirect=admin.html';
        return false;
    }

    // Check if user is admin by querying people table
    const { data: personData, error } = await supabaseClient
        .from(TABLES.people)
        .select('user_type')
        .eq('email', session.user.email)
        .single();

    if (error || !personData || personData.user_type !== 'admin') {
        // Not an admin, redirect to index with error
        alert('Access denied. Admin privileges required.');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

// Generate Steam-format invitation code
// Format: TEST-XXXX-XXXX
// For testing: First 4 characters are "TEST"
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like O, 0, 1, I
    let prefix = 'TEST'; // First 4 chars for testing
    let code = prefix + '-';

    // Generate second segment (4 chars)
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';

    // Generate third segment (4 chars)
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
}

// Show message helpers
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    const errorDiv = document.getElementById('error-message');

    successText.textContent = message;
    successDiv.classList.remove('d-none');
    errorDiv.classList.add('d-none');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        successDiv.classList.add('d-none');
    }, 5000);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const successDiv = document.getElementById('success-message');

    errorText.textContent = message;
    errorDiv.classList.remove('d-none');
    successDiv.classList.add('d-none');
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Copy code to clipboard
async function copyToClipboard(code) {
    try {
        await navigator.clipboard.writeText(code);
        showSuccess(`Code "${code}" copied to clipboard!`);
    } catch (error) {
        console.error('Copy failed:', error);
        showError('Failed to copy code to clipboard');
    }
}

// Toggle code activation status
async function toggleCodeActivation(codeId, setActive) {
    try {
        const { error } = await supabaseClient
            .from(TABLES.invites)
            .update({ is_active: setActive })
            .eq('id', codeId);

        if (error) throw error;

        const action = setActive ? 'activated' : 'deactivated';
        showSuccess(`Code ${action} successfully`);
        loadInvitationCodes(); // Reload the table
    } catch (error) {
        console.error('Toggle error:', error);
        showError(error.message || 'Failed to update code status');
    }
}

// Delete invitation code
async function deleteCode(codeId, code) {
    if (!confirm(`Are you sure you want to delete the code "${code}"?`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from(TABLES.invites)
            .delete()
            .eq('id', codeId);

        if (error) throw error;

        showSuccess(`Code "${code}" deleted successfully`);
        loadInvitationCodes(); // Reload the table
    } catch (error) {
        console.error('Delete error:', error);
        showError(error.message || 'Failed to delete code');
    }
}

// Load and display all invitation codes
async function loadInvitationCodes() {
    const tableBody = document.getElementById('codes-table-body');

    try {
        const { data: codes, error } = await supabaseClient
            .from(TABLES.invites)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!codes || codes.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No invitation codes found. Generate one above!
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = codes.map(code => {
            const isUsed = code.used_at !== null;
            const isInactive = code.is_active === false;

            let statusBadge;
            if (isUsed) {
                statusBadge = '<span class="badge bg-secondary status-badge">Used</span>';
            } else if (isInactive) {
                statusBadge = '<span class="badge bg-danger status-badge">Inactive</span>';
            } else {
                statusBadge = '<span class="badge bg-success status-badge">Active</span>';
            }

            // Show toggle button only if not used
            const toggleButton = !isUsed ? `
                <button class="btn btn-sm btn-outline-${isInactive ? 'success' : 'warning'} me-1" 
                        onclick="toggleCodeActivation('${code.id}', ${!isInactive})">
                    <i class="fas fa-${isInactive ? 'check' : 'ban'}"></i> ${isInactive ? 'Activate' : 'Deactivate'}
                </button>
            ` : '';

            return `
                <tr>
                    <td class="code-cell">${code.code}</td>
                    <td>${code.email}</td>
                    <td>${formatDate(code.created_at)}</td>
                    <td>${statusBadge}</td>
                    <td>${formatDate(code.used_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary copy-btn me-1" 
                                onclick="copyToClipboard('${code.code}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        ${toggleButton}
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="deleteCode('${code.id}', '${code.code}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Load error:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-circle me-2"></i>Error loading codes: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Handle generate form submission
document.getElementById('generate-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email-input');
    const email = emailInput.value.trim();
    const generateBtn = document.getElementById('generate-btn');

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';

    try {
        const code = generateInviteCode();
        const { data: { session } } = await supabaseClient.auth.getSession();

        const { error } = await supabaseClient
            .from(TABLES.invites)
            .insert([{
                code: code,
                email: email,
                created_by: session.user.id,
                is_active: true
            }]);

        if (error) throw error;

        showSuccess(`Invitation code "${code}" generated for ${email}`);
        emailInput.value = '';
        loadInvitationCodes(); // Reload the table

    } catch (error) {
        console.error('Generate error:', error);
        showError(error.message || 'Failed to generate invitation code');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-key me-2"></i>Generate Code';
    }
});

// Add logout functionality
function setupLogout() {
    const header = document.querySelector('header .container');
    const logoutDiv = document.createElement('div');
    logoutDiv.className = 'position-absolute top-0 end-0 p-3';
    logoutDiv.innerHTML = `
        <a href="index.html" class="text-white text-decoration-none me-3">
            <i class="fas fa-home me-1"></i>Home
        </a>
        <a href="#" id="logout-link" class="text-white text-decoration-none">
            <i class="fas fa-sign-out-alt me-1"></i>Logout
        </a>
    `;
    header.style.position = 'relative';
    header.appendChild(logoutDiv);

    document.getElementById('logout-link').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return;

    setupLogout();
    loadInvitationCodes();
});
