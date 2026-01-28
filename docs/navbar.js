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

    function createNavbarElement(currentPage) {
        const container = document.createElement('div');
        container.className = 'container d-flex justify-content-between align-items-center';

        // Left side: Site branding
        const branding = document.createElement('div');
        const brandLink = document.createElement('a');
        brandLink.href = 'index.html';
        brandLink.className = 'text-white text-decoration-none';
        brandLink.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="${NAV_CONFIG.siteIcon} me-2"></i>
                <div>
                    <h1 class="h4 mb-0">${NAV_CONFIG.siteName}</h1>
                    <small class="text-white-50 d-none d-md-block">A curated collection of student-made video games and interactive projects.</small>
                </div>
            </div>
        `;
        branding.appendChild(brandLink);

        // Add dev/prod environment indicator (only in dev mode or when explicitly toggled)
        const showEnvBadge = typeof IS_DEV !== 'undefined' && (
            IS_DEV ||
            typeof FORCE_DEV !== 'undefined' && FORCE_DEV ||
            typeof FORCE_PROD !== 'undefined' && FORCE_PROD
        );

        if (showEnvBadge) {
            const envBadge = document.createElement('div');
            envBadge.className = 'ms-3';
            envBadge.style.cursor = 'pointer';
            envBadge.title = 'Click to toggle database environment';

            if (IS_DEV) {
                envBadge.innerHTML = `
                    <span class="badge bg-warning text-dark">
                        <i class="fas fa-flask me-1"></i>DEV Database
                    </span>
                `;
                envBadge.onclick = () => {
                    if (confirm('Switch to PROD database?\n\nThis will reload the page.')) {
                        const url = new URL(window.location);
                        url.searchParams.set('prod', 'true');
                        url.searchParams.delete('dev');
                        window.location.href = url.toString();
                    }
                };
            } else {
                envBadge.innerHTML = `
                    <span class="badge bg-success">
                        <i class="fas fa-check-circle me-1"></i>PROD Database
                    </span>
                `;
                envBadge.onclick = () => {
                    if (confirm('Switch to DEV database?\n\nThis will reload the page.')) {
                        const url = new URL(window.location);
                        url.searchParams.set('dev', 'true');
                        url.searchParams.delete('prod');
                        window.location.href = url.toString();
                    }
                };
            }
            branding.appendChild(envBadge);
        }


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
            link.href = page.url;
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
                window.location.href = 'login.html';
            };
            navItems.appendChild(logoutBtn);
        } else if (currentPage !== 'login') {
            // Only show login button if not already on login page
            const loginBtn = document.createElement('a');
            loginBtn.href = 'login.html';
            loginBtn.className = 'btn btn-sm btn-outline-light';
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i> Login';
            navItems.appendChild(loginBtn);
        }
    }

    // Export for manual refresh if needed
    window.refreshNavbar = updateNavbarAuthState;
})();
