// Metrics Dashboard JavaScript
// Handles fetching and displaying usage metrics from Cloudflare and Supabase

// ============================================================
// AUTHENTICATION CHECK
// ============================================================

async function checkAdminAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            window.location.href = 'login.html';
            return false;
        }

        // Check if user is admin
        const { data: person } = await supabaseClient
            .from(TABLES.people)
            .select('is_admin')
            .eq('email', session.user.email)
            .maybeSingle();

        if (!person || person.is_admin !== true) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function showSuccess(message) {
    const alert = document.getElementById('success-message');
    const text = document.getElementById('success-text');
    text.textContent = message;
    alert.classList.remove('d-none');
    setTimeout(() => alert.classList.add('d-none'), 5000);
}

function showError(message) {
    const alert = document.getElementById('error-message');
    const text = document.getElementById('error-text');
    text.textContent = message;
    alert.classList.remove('d-none');
    setTimeout(() => alert.classList.add('d-none'), 5000);
}

function updateLastRefreshed() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-updated').textContent = timeString;
}

// ============================================================
// CLOUDFLARE METRICS (MOCK DATA FOR NOW)
// ============================================================

async function fetchCloudflareMetrics() {
    // NOTE: This is mock data. To implement real Cloudflare metrics:
    // 1. Create a Supabase Edge Function to proxy Cloudflare API calls
    // 2. Store your Cloudflare API token as an environment variable
    // 3. Call that edge function from here

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                requests24h: 1247,
                requests7d: [850, 920, 1100, 980, 1150, 1200, 1247],
                bandwidth: 45 * 1024 * 1024, // 45 MB
                cacheHitRatio: 85.3,
                threatsBlocked: 12,
                uniqueVisitors: 342
            });
        }, 800);
    });
}

function displayCloudflareMetrics(metrics) {
    document.getElementById('cf-requests-24h').textContent = formatNumber(metrics.requests24h);
    document.getElementById('cf-bandwidth').textContent = formatBytes(metrics.bandwidth);
    document.getElementById('cf-cache-ratio').textContent = metrics.cacheHitRatio.toFixed(1) + '%';
    document.getElementById('cf-threats').textContent = formatNumber(metrics.threatsBlocked);

    // Update status indicator
    const statusBadge = document.getElementById('cf-status');
    statusBadge.innerHTML = '<span class="status-indicator success"></span>Live';

    // Create requests chart
    createRequestsChart(metrics.requests7d);
}

function createRequestsChart(data) {
    const ctx = document.getElementById('cf-requests-chart');

    // Destroy existing chart if it exists
    if (window.requestsChart) {
        window.requestsChart.destroy();
    }

    const labels = ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'];

    window.requestsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Requests',
                data: data,
                borderColor: 'rgb(13, 110, 253)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Requests (Last 7 Days)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// ============================================================
// SUPABASE METRICS
// ============================================================

async function fetchSupabaseMetrics() {
    try {
        // Get database size (approximate from row counts)
        const { count: projectCount } = await supabaseClient
            .from(TABLES.projects)
            .select('*', { count: 'exact', head: true });

        const { count: userCount } = await supabaseClient
            .from(TABLES.people)
            .select('*', { count: 'exact', head: true });

        // Calculate storage usage
        const storageUsage = await calculateStorageUsage();

        // Estimate active users (users created in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: activeUsers } = await supabaseClient
            .from(TABLES.people)
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        return {
            databaseSize: estimateDatabaseSize(userCount, projectCount),
            storageSize: storageUsage.totalSize,
            storageFiles: storageUsage.fileCount,
            activeUsers: activeUsers || 0,
            totalUsers: userCount || 0,
            totalProjects: projectCount || 0,
            apiRequests: 'N/A' // Would need Supabase Management API for this
        };
    } catch (error) {
        console.error('Error fetching Supabase metrics:', error);
        throw error;
    }
}

function estimateDatabaseSize(userCount, projectCount) {
    // Rough estimate: 
    // - Each user record ~2KB
    // - Each project record ~5KB (includes metadata)
    const userBytes = (userCount || 0) * 2048;
    const projectBytes = (projectCount || 0) * 5120;
    return userBytes + projectBytes;
}

async function calculateStorageUsage() {
    try {
        const { data: files, error } = await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .list('', {
                limit: 1000,
                sortBy: { column: 'name', order: 'asc' }
            });

        if (error) throw error;

        let totalSize = 0;
        let fileCount = 0;

        // Recursive function to count all files
        async function countFilesInPath(path = '') {
            const { data: items } = await supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .list(path, {
                    limit: 1000,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (!items) return;

            for (const item of items) {
                if (item.id) {
                    // It's a file
                    totalSize += item.metadata?.size || 0;
                    fileCount++;
                } else {
                    // It's a folder, recurse
                    const folderPath = path ? `${path}/${item.name}` : item.name;
                    await countFilesInPath(folderPath);
                }
            }
        }

        await countFilesInPath();

        return { totalSize, fileCount };
    } catch (error) {
        console.error('Error calculating storage:', error);
        return { totalSize: 0, fileCount: 0 };
    }
}

function displaySupabaseMetrics(metrics) {
    // Database size
    const dbSize = formatBytes(metrics.databaseSize);
    const dbPercent = ((metrics.databaseSize / (500 * 1024 * 1024)) * 100).toFixed(1);
    document.getElementById('sb-db-size').textContent = dbSize;
    document.getElementById('sb-db-progress').style.width = Math.min(dbPercent, 100) + '%';

    // Update progress bar color based on usage
    const dbProgress = document.getElementById('sb-db-progress');
    dbProgress.className = 'progress-bar';
    if (dbPercent > 90) {
        dbProgress.classList.add('bg-danger');
    } else if (dbPercent > 70) {
        dbProgress.classList.add('bg-warning');
    } else {
        dbProgress.classList.add('bg-success');
    }

    // Storage size
    const storageSize = formatBytes(metrics.storageSize);
    const storagePercent = ((metrics.storageSize / (1024 * 1024 * 1024)) * 100).toFixed(1);
    document.getElementById('sb-storage-size').textContent = storageSize;
    document.getElementById('sb-storage-progress').style.width = Math.min(storagePercent, 100) + '%';

    // Update storage progress bar color
    const storageProgress = document.getElementById('sb-storage-progress');
    storageProgress.className = 'progress-bar';
    if (storagePercent > 90) {
        storageProgress.classList.add('bg-danger');
    } else if (storagePercent > 70) {
        storageProgress.classList.add('bg-warning');
    } else {
        storageProgress.classList.add('bg-success');
    }

    // Active users
    document.getElementById('sb-active-users').textContent = formatNumber(metrics.activeUsers);

    // API requests
    document.getElementById('sb-api-requests').textContent = metrics.apiRequests;

    // Update overview cards
    document.getElementById('total-users').textContent = formatNumber(metrics.totalUsers);
    document.getElementById('total-projects').textContent = formatNumber(metrics.totalProjects);

    // Update status indicator
    const statusBadge = document.getElementById('sb-status');
    statusBadge.innerHTML = '<span class="status-indicator success"></span>Live';

    // Platform status
    document.getElementById('platform-status').innerHTML = '<span class="status-indicator success"></span>Operational';
}

// ============================================================
// COST CALCULATION
// ============================================================

function calculateCosts(cloudflareMetrics, supabaseMetrics) {
    let cloudfareCost = 0;
    let supabaseCost = 0;

    // Cloudflare - Free plan is very generous
    // Would need to check specific plan limits
    const cfPlanStatus = 'Free Plan';

    // Supabase Free Tier Limits:
    // - Database: 500MB
    // - Storage: 1GB  
    // - Bandwidth: 2GB/month
    // - MAU: 50,000

    const dbLimit = 500 * 1024 * 1024; // 500MB
    const storageLimit = 1024 * 1024 * 1024; // 1GB
    const mauLimit = 50000;

    let sbPlanStatus = 'Free Tier';
    let costNotice = null;

    // Check if over limits
    if (supabaseMetrics.databaseSize > dbLimit ||
        supabaseMetrics.storageSize > storageLimit ||
        supabaseMetrics.activeUsers > mauLimit) {

        supabaseCost = 25; // Pro plan base cost
        sbPlanStatus = 'Upgrade Required - Pro Plan ($25/mo)';

        const reasons = [];
        if (supabaseMetrics.databaseSize > dbLimit) {
            reasons.push('database size');
        }
        if (supabaseMetrics.storageSize > storageLimit) {
            reasons.push('storage');
        }
        if (supabaseMetrics.activeUsers > mauLimit) {
            reasons.push('active users');
        }

        costNotice = `You are exceeding free tier limits for: ${reasons.join(', ')}. Consider upgrading to Supabase Pro.`;
    } else if (
        supabaseMetrics.databaseSize > dbLimit * 0.8 ||
        supabaseMetrics.storageSize > storageLimit * 0.8 ||
        supabaseMetrics.activeUsers > mauLimit * 0.8
    ) {
        costNotice = 'You are approaching free tier limits. Monitor your usage closely.';
    }

    const totalCost = cloudfareCost + supabaseCost;

    return {
        cloudflare: cloudfareCost,
        supabase: supabaseCost,
        total: totalCost,
        cfPlanStatus,
        sbPlanStatus,
        costNotice
    };
}

function displayCosts(costs) {
    document.getElementById('cost-cloudflare').textContent = '$' + costs.cloudflare.toFixed(2);
    document.getElementById('cost-supabase').textContent = '$' + costs.supabase.toFixed(2);
    document.getElementById('cost-total').textContent = '$' + costs.total.toFixed(2);

    document.getElementById('cf-plan-status').innerHTML =
        '<i class="fas fa-check-circle text-success"></i> ' + costs.cfPlanStatus;

    const sbStatusElement = document.getElementById('sb-plan-status');
    if (costs.supabase > 0) {
        sbStatusElement.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> ' + costs.sbPlanStatus;
    } else {
        sbStatusElement.innerHTML = '<i class="fas fa-check-circle text-success"></i> ' + costs.sbPlanStatus;
    }

    const totalStatusElement = document.getElementById('total-plan-status');
    if (costs.total === 0) {
        totalStatusElement.innerHTML = '<i class="fas fa-check-circle"></i> Within free tier';
        totalStatusElement.className = 'small text-success';
    } else {
        totalStatusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Paid tier required';
        totalStatusElement.className = 'small text-warning';
    }

    // Show cost notice if applicable
    const noticeElement = document.getElementById('cost-notice');
    if (costs.costNotice) {
        document.getElementById('cost-notice-text').textContent = costs.costNotice;
        noticeElement.classList.remove('d-none');
    } else {
        noticeElement.classList.add('d-none');
    }
}

// ============================================================
// MAIN LOAD FUNCTION
// ============================================================

async function loadAllMetrics() {
    try {
        // Show loading state
        const refreshBtn = document.getElementById('refresh-all-btn');
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';

        // Fetch metrics in parallel
        const [cloudflareMetrics, supabaseMetrics] = await Promise.all([
            fetchCloudflareMetrics(),
            fetchSupabaseMetrics()
        ]);

        // Display metrics
        displayCloudflareMetrics(cloudflareMetrics);
        displaySupabaseMetrics(supabaseMetrics);

        // Calculate and display costs
        const costs = calculateCosts(cloudflareMetrics, supabaseMetrics);
        displayCosts(costs);

        // Update timestamp
        updateLastRefreshed();

        showSuccess('Metrics updated successfully');
    } catch (error) {
        console.error('Error loading metrics:', error);
        showError('Failed to load metrics: ' + error.message);

        // Update error status
        document.getElementById('cf-status').innerHTML = '<span class="status-indicator error"></span>Error';
        document.getElementById('sb-status').innerHTML = '<span class="status-indicator error"></span>Error';
    } finally {
        // Re-enable refresh button
        const refreshBtn = document.getElementById('refresh-all-btn');
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh All';
    }
}

// Global refresh function
window.refreshAllMetrics = loadAllMetrics;

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return;

    // Load metrics on page load
    await loadAllMetrics();
});
