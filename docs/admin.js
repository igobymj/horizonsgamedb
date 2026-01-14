const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

// Add invites table to config
const INVITE_TABLE = IS_DEV ? '_invites_dev' : 'invites';

// Check if user is admin
async function checkAdminAccess() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Not logged in, redirect to login
        window.location.href = 'login.html?redirect=admin.html';
        return false;
    }
    
    // Check if user is admin
    const { data: person, error } = await supabaseClient
        .from(TABLES.people)
        .select('type')
        .eq('user_id', session.user.id)
        .single();
    
    if (error || !person || person.type !== 'admin') {
        // Not an admin, show access denied
        document.getElementById('access-denied').classList.remove('d-none');
        return false;
    }
    
    // Is admin, show admin content
    document.getElementById('admin-content').classList.remove('d-none');
    return true;
}

// Generate random invite code in format: GAME-XXXX-XXXX
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
    
    const segment1 = Array.from({ length: 4 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    
    const segment2 = Array.from({ length: 4 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    
    return `TEST-${segment1}-${segment2}`;
}

// Generate invite form submission
document.getElementById('generate-invite-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('invite-email').value.trim().toLowerCase();
    const generateBtn = document.getElementById('generate-btn');
    const successDiv = document.getElementById('invite-success');
    const errorDiv = document.getElementById('invite-error');
    
    // Hide previous messages
    successDiv.classList.add('d-none');
    errorDiv.classList.add('d-none');
    
    // Disable button
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
    
    try {
        // Get current user session
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        // Check if email already has an active invite
        const { data: existingInvites } = await supabaseClient
            .from(INVITE_TABLE)
            .select('*')
            .eq('email', email)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString());
        
        if (existingInvites && existingInvites.length > 0) {
            throw new Error(`An active invite already exists for ${email}`);
        }
        
        // Generate unique code
        let code = generateInviteCode();
        let isUnique = false;
        let attempts = 0;
        
        // Ensure code is unique (very unlikely to collide, but just in case)
        while (!isUnique && attempts < 10) {
            const { data: existing } = await supabaseClient
                .from(INVITE_TABLE)
                .select('code')
                .eq('code', code)
                .single();
            
            if (!existing) {
                isUnique = true;
            } else {
                code = generateInviteCode();
                attempts++;
            }
        }
        
        if (!isUnique) {
            throw new Error('Failed to generate unique code. Please try again.');
        }
        
        // Insert invite into database
        const { data: invite, error: insertError } = await supabaseClient
            .from(INVITE_TABLE)
            .insert([{
                email: email,
                code: code,
                created_by: session.user.id
            }])
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        // Show success message
        document.getElementById('success-email').textContent = email;
        document.getElementById('generated-code').textContent = code;
        successDiv.classList.remove('d-none');
        
        // Clear form
        document.getElementById('invite-email').value = '';
        
        // Reload invites list
        loadInvites();
        
    } catch (error) {
        console.error('Error generating invite:', error);
        document.getElementById('error-text').textContent = error.message;
        errorDiv.classList.remove('d-none');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Generate Code';
    }
});

// Copy code to clipboard
function copyCode() {
    const code = document.getElementById('generated-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const copyBtn = document.getElementById('copy-code-btn');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
        copyBtn.classList.remove('btn-outline-success');
        copyBtn.classList.add('btn-success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.remove('btn-success');
            copyBtn.classList.add('btn-outline-success');
        }, 2000);
    });
}

// Load all invites
async function loadInvites() {
    const loadingDiv = document.getElementById('invites-loading');
    const emptyDiv = document.getElementById('invites-empty');
    const tableContainer = document.getElementById('invites-table-container');
    const invitesList = document.getElementById('invites-list');
    
    // Show loading
    loadingDiv.classList.remove('d-none');
    emptyDiv.classList.add('d-none');
    tableContainer.classList.add('d-none');
    
    try {
        const { data: invites, error } = await supabaseClient
            .from(INVITE_TABLE)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        loadingDiv.classList.add('d-none');
        
        if (!invites || invites.length === 0) {
            emptyDiv.classList.remove('d-none');
            return;
        }
        
        // Populate table
        invitesList.innerHTML = '';
        const now = new Date();
        
        invites.forEach(invite => {
            const row = document.createElement('tr');
            row.className = 'invite-row';
            
            const expiresAt = new Date(invite.expires_at);
            const createdAt = new Date(invite.created_at);
            const usedAt = invite.used_at ? new Date(invite.used_at) : null;
            
            const isExpired = expiresAt < now;
            const isUsed = !!usedAt;
            
            let status, statusClass;
            if (isUsed) {
                status = 'Used';
                statusClass = 'bg-success';
            } else if (isExpired) {
                status = 'Expired';
                statusClass = 'bg-danger';
            } else {
                status = 'Active';
                statusClass = 'bg-primary';
            }
            
            // Code cell with copy button
            const codeCell = document.createElement('td');
            const codeElement = document.createElement('code');
            codeElement.className = isExpired || isUsed ? 'expired' : '';
            codeElement.textContent = invite.code;
            codeCell.appendChild(codeElement);
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-sm btn-outline-secondary ms-2 copy-btn';
            copyBtn.disabled = isExpired || isUsed;
            copyBtn.onclick = () => copyInviteCode(invite.code);
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            codeCell.appendChild(copyBtn);
            
            // Email cell
            const emailCell = document.createElement('td');
            emailCell.textContent = invite.email;
            
            // Status cell
            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');
            statusBadge.className = `badge ${statusClass} badge-status`;
            statusBadge.textContent = status;
            statusCell.appendChild(statusBadge);
            
            // Created cell
            const createdCell = document.createElement('td');
            const createdSmall = document.createElement('small');
            createdSmall.textContent = `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`;
            createdCell.appendChild(createdSmall);
            
            // Expires cell
            const expiresCell = document.createElement('td');
            const expiresSmall = document.createElement('small');
            expiresSmall.textContent = `${expiresAt.toLocaleDateString()} ${expiresAt.toLocaleTimeString()}`;
            expiresCell.appendChild(expiresSmall);
            
            // Used cell
            const usedCell = document.createElement('td');
            const usedSmall = document.createElement('small');
            usedSmall.textContent = usedAt ? `${usedAt.toLocaleDateString()} ${usedAt.toLocaleTimeString()}` : '-';
            usedCell.appendChild(usedSmall);
            
            // Actions cell
            const actionsCell = document.createElement('td');
            if (!isUsed && !isExpired) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.onclick = () => deleteInvite(invite.id);
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                actionsCell.appendChild(deleteBtn);
            } else {
                actionsCell.textContent = '-';
            }
            
            // Append all cells to row
            row.appendChild(codeCell);
            row.appendChild(emailCell);
            row.appendChild(statusCell);
            row.appendChild(createdCell);
            row.appendChild(expiresCell);
            row.appendChild(usedCell);
            row.appendChild(actionsCell);
            
            invitesList.appendChild(row);
        });
        
        tableContainer.classList.remove('d-none');
        
    } catch (error) {
        console.error('Error loading invites:', error);
        loadingDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Error loading invites: ${error.message}
            </div>
        `;
    }
}

// Copy invite code from table
function copyInviteCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        // Could add a toast notification here
        console.log('Code copied:', code);
    });
}

// Delete an invite
async function deleteInvite(inviteId) {
    if (!confirm('Are you sure you want to delete this invite code?')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from(INVITE_TABLE)
            .delete()
            .eq('id', inviteId);
        
        if (error) throw error;
        
        // Reload invites
        loadInvites();
        
    } catch (error) {
        console.error('Error deleting invite:', error);
        alert('Failed to delete invite: ' + error.message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAccess();
    if (isAdmin) {
        loadInvites();
    }
});