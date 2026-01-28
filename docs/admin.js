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
        .select('is_admin')
        .eq('email', session.user.email)
        .single();

    if (error || !personData || personData.is_admin !== true) {
        // Not an admin, redirect to index with error
        showWarning('Access denied. Admin privileges required.', 'Access Denied', 'error');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

// ===== STORAGE USAGE MONITORING =====

const STORAGE_LIMIT_GB = 1; // Supabase free tier limit
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;

// Format bytes to human-readable size
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Calculate and display storage usage
async function loadStorageUsage() {
    try {
        // List all files in the bucket
        const { data: files, error } = await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .list('', {
                limit: 10000, // Get all files
                offset: 0,
                sortBy: { column: 'name', order: 'asc' }
            });

        if (error) {
            console.error('Error fetching storage:', error);
            showStorageError();
            return;
        }

        // Calculate total size
        let totalBytes = 0;
        let fileCount = 0;

        // Recursive function to count files and sizes
        async function countFilesInPath(path = '') {
            const { data: items, error } = await supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .list(path, {
                    limit: 1000,
                    offset: 0
                });

            if (error) return;

            for (const item of items || []) {
                if (item.id) { // It's a file
                    totalBytes += item.metadata?.size || 0;
                    fileCount++;
                } else if (item.name) { // It's a folder
                    await countFilesInPath(path ? `${path}/${item.name}` : item.name);
                }
            }
        }

        await countFilesInPath();

        // Calculate percentages
        const usedPercent = (totalBytes / STORAGE_LIMIT_BYTES) * 100;
        const remainingBytes = STORAGE_LIMIT_BYTES - totalBytes;

        // Update UI
        updateStorageUI(totalBytes, remainingBytes, usedPercent, fileCount);

    } catch (error) {
        console.error('Error calculating storage:', error);
        showStorageError();
    }
}

// Update storage UI elements
function updateStorageUI(usedBytes, remainingBytes, percentUsed, fileCount) {
    // Update progress bar
    const progressBar = document.getElementById('storage-progress-bar');
    const percentage = Math.min(percentUsed, 100).toFixed(1);

    progressBar.style.width = percentage + '%';
    progressBar.setAttribute('aria-valuenow', percentage);

    // Color code based on usage
    progressBar.className = 'progress-bar';
    if (percentUsed < 50) {
        progressBar.classList.add('bg-success');
    } else if (percentUsed < 80) {
        progressBar.classList.add('bg-warning');
    } else {
        progressBar.classList.add('bg-danger');
        progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
    }

    // Update text elements
    document.getElementById('storage-percentage').textContent = percentage + '%';
    document.getElementById('storage-used-text').textContent = formatBytes(usedBytes);
    document.getElementById('storage-used').textContent = formatBytes(usedBytes);
    document.getElementById('storage-remaining').textContent = formatBytes(remainingBytes);
    document.getElementById('storage-file-count').textContent = fileCount.toLocaleString();

    // Show warning if approaching limit
    if (percentUsed > 80 && percentUsed < 100) {
        showWarning(
            `Storage is ${percentage}% full. Consider cleaning up old files or upgrading.`,
            'Storage Warning',
            'warning'
        );
    } else if (percentUsed >= 100) {
        showWarning(
            'Storage limit reached! New uploads will fail until space is freed.',
            'Storage Full',
            'error'
        );
    }
}

// Show error state in storage UI
function showStorageError() {
    document.getElementById('storage-percentage').textContent = 'Error';
    document.getElementById('storage-used-text').textContent = 'Error loading';
    document.getElementById('storage-used').textContent = 'N/A';
    document.getElementById('storage-remaining').textContent = 'N/A';
    document.getElementById('storage-file-count').textContent = 'N/A';
}

// Refresh storage usage (called by button)
window.refreshStorageUsage = function () {
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');

    // Animate refresh icon
    icon.classList.add('fa-spin');
    btn.disabled = true;

    loadStorageUsage().finally(() => {
        setTimeout(() => {
            icon.classList.remove('fa-spin');
            btn.disabled = false;
        }, 500);
    });
};

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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return;

    loadStorageUsage(); // Load storage usage stats
    loadInvitationCodes();
    loadUsers(); // Load users for admin management
    loadGenres(); // Load genres on startup
    loadKeywords(); // Load keywords on startup
    loadProfanityList(); // Load bad words list
});

// ===== USER ADMIN MANAGEMENT =====

let allUsers = []; // Store all users for filtering

// Load all users for admin management
async function loadUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from(TABLES.people)
            .select('id, name, email, user_type, is_admin')
            .order('name');

        if (error) throw error;

        allUsers = users || [];
        renderUsers(allUsers);

    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error loading users: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Render users table
function renderUsers(users) {
    const tbody = document.getElementById('users-table-body');

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-users-slash me-2"></i>No users found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => {
        const isAdmin = user.is_admin === true;
        const statusBadge = isAdmin
            ? '<span class="badge bg-danger">Admin</span>'
            : '<span class="badge bg-secondary">Regular User</span>';

        const roleDisplay = user.user_type
            ? user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)
            : '<span class="text-muted">Not set</span>';

        return `
                <tr>
                    <td>${user.name || '<span class="text-muted">No name</span>'}</td>
                    <td>${user.email}</td>
                    <td>${roleDisplay}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${isAdmin
                ? `<button class="btn btn-sm btn-warning" onclick="toggleUserAdmin(${user.id}, false, '${user.name || user.email}')">
                                <i class="fas fa-user-minus me-1"></i>Remove Admin
                               </button>`
                : `<button class="btn btn-sm btn-success" onclick="toggleUserAdmin(${user.id}, true, '${user.name || user.email}')">
                                <i class="fas fa-user-shield me-1"></i>Make Admin
                               </button>`
            }
                    </td>
            </tr>
        `;
    }).join('');
}

// Search/filter users
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allUsers.filter(user =>
                (user.name && user.name.toLowerCase().includes(query)) ||
                (user.email && user.email.toLowerCase().includes(query))
            );
            renderUsers(filtered);
        });
    }
});

// Toggle user admin status
async function toggleUserAdmin(userId, makeAdmin, userName) {
    const action = makeAdmin ? 'grant' : 'remove';
    const actionText = makeAdmin ? 'Make Admin' : 'Remove Admin';

    const confirmed = await showConfirm(
        `Are you sure you want to ${action} admin privileges ${makeAdmin ? 'to' : 'from'} ${userName}?`,
        actionText
    );

    if (!confirmed) return;

    try {
        const { error } = await supabaseClient
            .from(TABLES.people)
            .update({ is_admin: makeAdmin })
            .eq('id', userId);

        if (error) throw error;

        showSuccess(`Admin privileges ${makeAdmin ? 'granted to' : 'removed from'} ${userName}`);
        loadUsers(); // Reload table

    } catch (error) {
        console.error('Error toggling admin status:', error);
        showError('Failed to update admin status: ' + error.message);
    }
}

// ... (existing code) ...


// ===== KEYWORD MANAGEMENT =====

let allKeywords = []; // Store locally for filtering
let selectedKeywordIds = new Set(); // Store selected IDs

// Load keywords into table
async function loadKeywords() {
    const tableBody = document.getElementById('keywords-table-body');
    const countBadge = document.getElementById('keyword-count');

    try {
        const { data: keywords, error } = await supabaseClient
            .from(TABLES.keywords)
            .select('*')
            .order('keyword');

        if (error) throw error;

        allKeywords = keywords || [];

        // Flag bad words
        allKeywords.forEach(k => {
            k.isBadWord = containsProfanity(k.keyword);
        });

        // Sort: Bad words first, then alphabetical
        allKeywords.sort((a, b) => {
            if (a.isBadWord && !b.isBadWord) return -1;
            if (!a.isBadWord && b.isBadWord) return 1;
            return a.keyword.localeCompare(b.keyword);
        });

        if (countBadge) {
            countBadge.textContent = allKeywords.length;
        }

        // Reset selection
        selectedKeywordIds.clear();
        updateBatchDeleteUI();

        renderKeywords(allKeywords);

    } catch (error) {
        console.error('Load keywords error:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-circle me-2"></i>Error loading keywords: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Render keywords table
function renderKeywords(keywordsToRender) {
    const tableBody = document.getElementById('keywords-table-body');

    if (!keywordsToRender || keywordsToRender.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-4">
                    No keywords found.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = keywordsToRender.map(k => {
        const isBad = k.isBadWord;
        const rowClass = isBad ? 'table-danger' : '';
        const warningIcon = isBad ? '<i class="fas fa-exclamation-triangle text-danger me-2" title="Possible offensive term"></i>' : '';

        return `
        <tr class="${rowClass}">
            <td class="text-center">
                <input class="form-check-input keyword-checkbox" type="checkbox" 
                       value="${k.id}" ${selectedKeywordIds.has(k.id) ? 'checked' : ''}>
            </td>
            <td class="align-middle fw-bold">
                ${warningIcon}${k.keyword}
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger btn-delete-keyword" 
                        data-id="${k.id}" 
                        data-keyword="${k.keyword.replace(/"/g, '&quot;')}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
        `;
    }).join('');

    // Re-attach listeners to new checkboxes
    document.querySelectorAll('.keyword-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedKeywordIds.add(e.target.value);
            } else {
                selectedKeywordIds.delete(e.target.value);
            }
            updateBatchDeleteUI();
        });
    });
}

// Update Batch Delete Button UI
function updateBatchDeleteUI() {
    const btn = document.getElementById('delete-selected-btn');
    const countSpan = document.getElementById('selected-count');

    if (!btn || !countSpan) {
        console.warn('Batch delete UI elements not found');
        return;
    }

    countSpan.textContent = selectedKeywordIds.size;

    if (selectedKeywordIds.size > 0) {
        btn.classList.remove('d-none');
    } else {
        btn.classList.add('d-none');
    }
}

// Delete Keyword Listener (Delegated)
document.getElementById('keywords-table-body').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete-keyword');
    if (btn) {
        const id = btn.dataset.id;
        const keyword = btn.dataset.keyword;
        deleteKeyword(id, keyword);
    }
});

// Batch Delete Logic
const batchDeleteBtn = document.getElementById('delete-selected-btn');
console.log('Batch delete button found:', batchDeleteBtn);
if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', async () => {
        console.log('Batch delete clicked, selected IDs:', Array.from(selectedKeywordIds));
        const count = selectedKeywordIds.size;
        if (count === 0) {
            console.log('No keywords selected, aborting');
            return;
        }

        console.log('Showing confirmation modal...');
        const confirmed = await showConfirmModal(
            `Are you sure you want to delete ${count} selected keywords?\n\nWARNING: usage of these keywords will be removed from all projects!`,
            'Batch Delete Keywords',
            true
        );

        console.log('Modal confirmed:', confirmed);
        if (!confirmed) return;

        try {
            const idsToDelete = Array.from(selectedKeywordIds);
            console.log('Deleting keywords with IDs:', idsToDelete);

            // First, get the keyword names for the IDs we're deleting
            const { data: keywordsToDelete, error: fetchKeywordsError } = await supabaseClient
                .from(TABLES.keywords)
                .select('keyword')
                .in('id', idsToDelete);

            if (fetchKeywordsError) throw fetchKeywordsError;

            const keywordNames = keywordsToDelete.map(k => k.keyword);
            console.log('Keyword names to remove from projects:', keywordNames);

            // Get all projects that have any of these keywords
            const { data: projects, error: fetchProjectsError } = await supabaseClient
                .from(TABLES.projects)
                .select('id, keywords')
                .or(keywordNames.map(name => `keywords.cs.{${name}}`).join(','));

            if (fetchProjectsError) throw fetchProjectsError;

            // Remove the keywords from each project
            if (projects && projects.length > 0) {
                for (const project of projects) {
                    const updatedKeywords = project.keywords.filter(k => !keywordNames.includes(k));
                    const { error: updateError } = await supabaseClient
                        .from(TABLES.projects)
                        .update({ keywords: updatedKeywords })
                        .eq('id', project.id);

                    if (updateError) throw updateError;
                }
            }

            // Then delete the keywords themselves
            const { error } = await supabaseClient
                .from(TABLES.keywords)
                .delete()
                .in('id', idsToDelete);

            if (error) throw error;

            console.log('Delete successful');
            showSuccess(`${count} keywords deleted successfully from ${projects?.length || 0} project(s)`);
            loadKeywords(); // Reload list (clears selection)

        } catch (error) {
            console.error('Batch delete error:', error);
            showWarning(error.message || 'Failed to delete selected keywords', 'Error', 'error');
        }
    });
}

// Filter keywords
document.getElementById('keyword-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allKeywords.filter(k => k.keyword.toLowerCase().includes(query));
    renderKeywords(filtered);
});

// Delete keyword
async function deleteKeyword(id, name) {
    console.log('Delete requested for:', id, name);
    const confirmed = await showConfirmModal(
        `Are you sure you want to delete the keyword "${name}"?\n\nWARNING: usage of this keyword will be removed from all projects!`,
        'Delete Keyword',
        true // isDestructive
    );

    if (!confirmed) return;

    try {
        // First, get all projects that have this keyword
        const { data: projects, error: fetchError } = await supabaseClient
            .from(TABLES.projects)
            .select('id, keywords')
            .contains('keywords', [name]);

        if (fetchError) throw fetchError;

        // Remove the keyword from each project
        if (projects && projects.length > 0) {
            for (const project of projects) {
                const updatedKeywords = project.keywords.filter(k => k !== name);
                const { error: updateError } = await supabaseClient
                    .from(TABLES.projects)
                    .update({ keywords: updatedKeywords })
                    .eq('id', project.id);

                if (updateError) throw updateError;
            }
        }

        // Then delete the keyword itself
        const { error } = await supabaseClient
            .from(TABLES.keywords)
            .delete()
            .eq('id', id);

        if (error) throw error;

        showSuccess(`Keyword "${name}" deleted successfully from ${projects?.length || 0} project(s)`);
        // If it was selected, remove from selection
        if (selectedKeywordIds.has(id)) {
            selectedKeywordIds.delete(id);
            updateBatchDeleteUI();
        }
        loadKeywords(); // Reload list

    } catch (error) {
        console.error('Delete keyword error:', error);
        showWarning(error.message || 'Failed to delete keyword', 'Error', 'error');
    }
}


// ===== GENRE MANAGEMENT =====

// Load genres into table
async function loadGenres() {
    const tableBody = document.getElementById('genres-table-body');
    const countBadge = document.getElementById('genre-count');

    try {
        const { data: genres, error } = await supabaseClient
            .from(TABLES.genres)
            .select('*')
            .order('genre');

        if (error) throw error;

        countBadge.textContent = genres ? genres.length : 0;

        if (!genres || genres.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="2" class="text-center text-muted py-4">
                        No genres found. Add one on the left!
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = genres.map(g => `
            <tr>
                <td class="align-middle fw-bold">${g.genre}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="deleteGenre('${g.id}', '${g.genre.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Load genres error:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-circle me-2"></i>Error loading genres: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Add new genre
document.getElementById('add-genre-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = document.getElementById('new-genre-input');
    const genreName = input.value.trim();
    const btn = document.getElementById('add-genre-btn');

    if (btn.disabled) return; // Prevent double submission
    if (!genreName) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';

    try {
        // Check if exists first (case-insensitive check handled by DB constraints usually, but good to be safe)
        // Actually, we'll let unique constraint handle it or do a pre-check

        // Insert
        const { error } = await supabaseClient
            .from(TABLES.genres)
            .insert([{ genre: genreName }]);

        if (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('This genre already exists!');
            }
            throw error;
        }

        showSuccess(`Genre "${genreName}" added successfully`);
        input.value = '';
        loadGenres(); // Reload list

    } catch (error) {
        console.error('Add genre error:', error);
        showWarning(error.message || 'Failed to add genre', 'Error', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Genre';
    }
});

// Delete genre
async function deleteGenre(id, name) {
    const confirmed = await showConfirmModal(
        `Are you sure you want to delete the genre "${name}"?\n\nWARNING: usage of this genre will be removed from all projects!`,
        'Delete Genre',
        true // isDestructive
    );

    if (!confirmed) return;

    try {
        const { error } = await supabaseClient
            .from(TABLES.genres)
            .delete()
            .eq('id', id);

        if (error) throw error;

        showSuccess(`Genre "${name}" deleted successfully`);
        loadGenres(); // Reload list

    } catch (error) {
        console.error('Delete genre error:', error);
        showWarning(error.message || 'Failed to delete genre', 'Error', 'error');
    }
}


