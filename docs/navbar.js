// Unified Navigation Bar Component
// Automatically creates consistent navigation across all pages
// Handles authentication state and highlights current page

(function () {
    'use strict';

    // Configuration
    const NAV_CONFIG = {
        siteName: 'Horizons Student Game Archive',
        siteIcon: 'fas fa-gamepad',
        pages: {
            home: { title: 'Home', url: 'index.html', icon: 'fas fa-home', auth: false },
            upload: { title: 'Upload', url: 'upload.html', icon: 'fas fa-upload', auth: true },
            profile: { title: 'Profile', url: 'profile.html', icon: 'fas fa-user-edit', auth: true },
            admin: { title: 'Admin', url: 'admin.html', icon: 'fas fa-tools', auth: 'admin' }
        }
    };

    // Wait for DOM and Supabase client to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbar);
    } else {
        initNavbar();
    }

    async function initNavbar() {

        // Wait a tick for supabaseClient to be defined
        await new Promise(resolve => setTimeout(resolve, 0));

        if (typeof supabaseClient === 'undefined') {
            console.warn('Supabase client not loaded. Navbar will show guest mode.');
        }

        // Ensure confirm modal exists in DOM for database switching
        ensureConfirmModalExists();

        // Get current page
        const currentPage = getCurrentPage();

        // Create navbar structure
        const navbar = createNavbarElement(currentPage);

        // Find existing header or create one
        let existingHeader = document.querySelector('header');

        if (existingHeader) {
            // Replace content but keep the header element
            existingHeader.innerHTML = '';
            existingHeader.className = 'bg-dark text-white p-3 mb-4 shadow';
            existingHeader.appendChild(navbar);
        } else {
            // Create new header
            const header = document.createElement('header');
            header.className = 'bg-dark text-white p-3 mb-4 shadow';
            header.appendChild(navbar);

            // Insert at top of body (after dev banner if present)
            const devBanner = document.getElementById('dev-environment-banner');
            if (devBanner) {
                devBanner.after(header);
            } else {
                document.body.insertBefore(header, document.body.firstChild);
            }
        }

        // Update navbar with auth state
        await updateNavbarAuthState();
    }

    // Ensure confirm modal exists for database switching
    function ensureConfirmModalExists() {
        if (document.getElementById('confirmModal')) {
            return; // Modal already exists
        }

        const modalHTML = `
            <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white" id="confirm-modal-header">
                            <h5 class="modal-title" id="confirm-modal-title">Confirm Action</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p id="confirm-modal-message" class="mb-0"></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirm-modal-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Inline showConfirmModal if modal-utils.js isn't loaded
    if (typeof showConfirmModal === 'undefined') {
        window.showConfirmModal = function (message, title = 'Confirm Action', isDestructive = false) {
            return new Promise((resolve) => {
                const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
                const modalHeader = document.getElementById('confirm-modal-header');
                const modalTitle = document.getElementById('confirm-modal-title');
                const modalMessage = document.getElementById('confirm-modal-message');
                const confirmBtn = document.getElementById('confirm-modal-btn');

                modalTitle.textContent = title;
                modalMessage.textContent = message;

                // Style based on type
                modalHeader.className = 'modal-header text-white';
                if (isDestructive) {
                    modalHeader.classList.add('bg-danger');
                    confirmBtn.className = 'btn btn-danger';
                } else {
                    modalHeader.classList.add('bg-primary');
                    confirmBtn.className = 'btn btn-primary';
                }

                // Handle confirm
                const handleConfirm = () => {
                    modal.hide();
                    cleanup();
                    resolve(true);
                };

                // Handle cancel/close
                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                // Cleanup listeners
                const cleanup = () => {
                    confirmBtn.removeEventListener('click', handleConfirm);
                    document.getElementById('confirmModal').removeEventListener('hidden.bs.modal', handleCancel);
                };

                confirmBtn.addEventListener('click', handleConfirm);
                document.getElementById('confirmModal').addEventListener('hidden.bs.modal', handleCancel, { once: true });

                modal.show();
            });
        };
    }

    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

        // Map filenames to page keys
        const pageMap = {
            'index.html': 'home',
            'upload.html': 'upload',
            'profile.html': 'profile',
            'admin.html': 'admin',
            'login.html': 'login'
        };

        return pageMap[filename] || 'home';
    }

    // Helper function to preserve environment parameters when navigating
    function addEnvParams(url) {
        const urlParams = new URLSearchParams(window.location.search);
        const prod = urlParams.get('prod');
        const dev = urlParams.get('dev');

        if (prod === 'true') {
            return `${url}?prod=true`;
        } else if (dev === 'true') {
            return `${url}?dev=true`;
        }
        return url;
    }

    function createNavbarElement(currentPage) {
        const container = document.createElement('div');
        container.className = 'container d-flex justify-content-between align-items-center';

        // Left side: Site branding
        const branding = document.createElement('div');
        branding.className = 'd-flex align-items-center';

        const brandLink = document.createElement('a');
        brandLink.href = addEnvParams('index.html');
        brandLink.className = 'text-white text-decoration-none d-flex align-items-center';
        brandLink.innerHTML = `
            <i class="${NAV_CONFIG.siteIcon} me-2"></i>
            <h1 class="h4 mb-0">${NAV_CONFIG.siteName}</h1>
        `;
        branding.appendChild(brandLink);

        // Add dev/prod environment indicator as a separate button
        const envBadge = document.createElement('button');
        envBadge.type = 'button';  // Explicitly set as button to prevent form submission
        envBadge.className = 'btn btn-sm ms-3 p-0 border-0';
        envBadge.style.cursor = 'pointer';
        envBadge.style.background = 'none';
        envBadge.title = 'Click to toggle database environment';

        if (typeof IS_DEV !== 'undefined' && IS_DEV) {
            envBadge.innerHTML = `
                <span class="badge bg-warning text-dark">
                    <i class="fas fa-flask me-1"></i>DEV Database
                </span>
            `;
            envBadge.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                console.log('[DB Switch] DEV->PROD switch clicked');

                // Use custom modal instead of native confirm
                const confirmed = await showConfirmModal(
                    'You will be logged out and need to sign in again.\n\nThis will reload the page.',
                    'Switch to PROD Database?',
                    false  // Not destructive, just informational
                );

                console.log('[DB Switch] User confirmed:', confirmed);

                if (!confirmed) {
                    console.log('[DB Switch] User cancelled');
                    return;
                }

                // Perform cleanup before navigation
                try {
                    // Sign out from current database
                    if (typeof supabaseClient !== 'undefined') {
                        console.log('[DB Switch] Signing out from DEV database...');
                        await supabaseClient.auth.signOut();
                    }

                    console.log('[DB Switch] Clearing storage...');
                    // Clear all local storage to prevent auth conflicts
                    localStorage.clear();
                    sessionStorage.clear();

                    console.log('[DB Switch] Switching to PROD...');
                    // Small delay to ensure cleanup completes
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Now switch to PROD
                    const url = new URL(window.location);
                    url.searchParams.set('prod', 'true');
                    url.searchParams.delete('dev');
                    console.log('[DB Switch] Navigating to:', url.toString());
                    window.location.href = url.toString();
                } catch (error) {
                    console.error('[DB Switch] Error during switch:', error);
                    alert('Error switching databases. Please try again.');
                }
            });
        } else {
            envBadge.innerHTML = `
                <span class="badge bg-success">
                    <i class="fas fa-check-circle me-1"></i>PROD Database
                </span>
            `;
            envBadge.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                console.log('[DB Switch] PROD->DEV switch clicked');

                // Use custom modal instead of native confirm
                const confirmed = await showConfirmModal(
                    'You will be logged out and need to sign in again.\n\nThis will reload the page.',
                    'Switch to DEV Database?',
                    false  // Not destructive, just informational
                );

                console.log('[DB Switch] User confirmed:', confirmed);

                if (!confirmed) {
                    console.log('[DB Switch] User cancelled');
                    return;
                }

                // Perform cleanup before navigation
                try {
                    // Sign out from current database
                    if (typeof supabaseClient !== 'undefined') {
                        console.log('[DB Switch] Signing out from PROD database...');
                        await supabaseClient.auth.signOut();
                    }

                    console.log('[DB Switch] Clearing storage...');
                    // Clear all local storage to prevent auth conflicts
                    localStorage.clear();
                    sessionStorage.clear();

                    console.log('[DB Switch] Switching to DEV...');
                    // Small delay to ensure cleanup completes
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Now switch to DEV
                    const url = new URL(window.location);
                    url.searchParams.set('dev', 'true');
                    url.searchParams.delete('prod');
                    console.log('[DB Switch] Navigating to:', url.toString());
                    window.location.href = url.toString();
                } catch (error) {
                    console.error('[DB Switch] Error during switch:', error);
                    alert('Error switching databases. Please try again.');
                }
            });
        }

        branding.appendChild(envBadge);

        // Right side: Navigation items
        const navItems = document.createElement('nav');
        navItems.className = 'd-flex align-items-center gap-2';
        navItems.id = 'main-navbar-items';

        container.appendChild(branding);
        container.appendChild(navItems);

        return container;
    }

    async function updateNavbarAuthState() {
        const navItems = document.getElementById('main-navbar-items');
        if (!navItems) return;

        let isAuthenticated = false;
        let isAdmin = false;
        let userName = null;

        // Check authentication
        if (typeof supabaseClient !== 'undefined') {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();

                if (session) {
                    isAuthenticated = true;

                    // Fetch user's name, role, and admin status from people table
                    const { data: person } = await supabaseClient
                        .from(TABLES.people)
                        .select('name, user_type, is_admin')
                        .eq('email', session.user.email)
                        .maybeSingle();

                    if (person) {
                        // Use display name from profile, fallback to email prefix
                        userName = person.name || session.user.email.split('@')[0];

                        // Check if admin using is_admin flag
                        if (person.is_admin === true) {
                            isAdmin = true;
                        }
                    } else {
                        // No profile found, use email prefix
                        userName = session.user.email.split('@')[0];
                    }
                }
            } catch (error) {
                console.error('Error checking auth state:', error);
            }
        }

        // Build nav items
        navItems.innerHTML = '';

        const currentPage = getCurrentPage();

        // Add page links
        Object.entries(NAV_CONFIG.pages).forEach(([key, page]) => {
            if (page.auth === true && !isAuthenticated) return;
            if (page.auth === 'admin' && !isAdmin) return;

            const link = document.createElement('a');
            link.href = addEnvParams(page.url);  // Preserve environment params
            link.className = `btn btn-sm ${currentPage === key ? 'btn-light' : 'btn-outline-light'}`;
            link.innerHTML = `<i class="${page.icon} me-1"></i> ${page.title}`;
            navItems.appendChild(link);
        });

        // Add user greeting
        if (isAuthenticated && userName) {
            const greeting = document.createElement('span');
            greeting.className = 'text-white-50 ms-2 me-2';
            greeting.innerHTML = `<small>Hello, <strong>${userName}</strong></small>`;
            navItems.appendChild(greeting);
        }

        // Add login/logout button
        if (isAuthenticated) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'navbar-logout-btn';
            logoutBtn.className = 'btn btn-sm btn-outline-danger';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i> Logout';
            logoutBtn.onclick = async () => {
                if (typeof supabaseClient !== 'undefined') {
                    await supabaseClient.auth.signOut();
                }
                // Preserve environment params when redirecting to login
                window.location.href = addEnvParams('login.html');
            };
            navItems.appendChild(logoutBtn);
        } else if (currentPage !== 'login') {
            // Only show login button if not already on login page
            const loginBtn = document.createElement('a');
            loginBtn.href = addEnvParams('login.html');  // Preserve environment params
            loginBtn.className = 'btn btn-sm btn-outline-light';
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i> Login';
            navItems.appendChild(loginBtn);
        }
    }

    // Export for manual refresh if needed
    window.refreshNavbar = updateNavbarAuthState;
})();
