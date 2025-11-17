// Use existing Supabase client from scripts.js
// (scripts.js must load before this file)

// Check authentication and render appropriate UI
async function setupAuthUI() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const container = document.getElementById('auth-ui-container');
    
    if (session) {
        // User is logged in - show floating upload button
        const uploadBtn = document.createElement('a');
        uploadBtn.href = 'upload.html';
        uploadBtn.className = 'btn btn-success btn-lg position-fixed shadow';
        uploadBtn.style.cssText = 'bottom: 30px; right: 30px; z-index: 1000; font-size: 1.1rem; padding: 15px 25px;';
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Upload Game';
             
        container.appendChild(uploadBtn);
        
        // Also add a small logout link in header
        const header = document.querySelector('header .container');
        const logoutLink = document.createElement('div');
        logoutLink.className = 'position-absolute top-0 end-0 p-3';
        logoutLink.innerHTML = `
            <small class="text-white-50 me-2">Logged in</small>
            <a href="#" id="logout-link" class="text-white text-decoration-none">
                <i class="fas fa-sign-out-alt me-1"></i>Logout
            </a>
        `;
        header.style.position = 'relative';
        header.appendChild(logoutLink);
        
        // Logout handler
        document.getElementById('logout-link').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.reload();
        });
        
    } else {
        // User is not logged in - show small login link in header
        const header = document.querySelector('header .container');
        const loginLink = document.createElement('div');
        loginLink.className = 'position-absolute top-0 end-0 p-3';
        loginLink.innerHTML = `
            <a href="login.html?redirect=index.html" class="text-white text-decoration-none">
                <i class="fas fa-sign-in-alt me-1"></i>Login
            </a>
        `;
        header.style.position = 'relative';
        header.appendChild(loginLink);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupAuthUI();
});