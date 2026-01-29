// Helper function to preserve environment parameters when building URLs
function addEnvParams(url) {
    const urlParams = new URLSearchParams(window.location.search);
    const prod = urlParams.get('prod');
    const dev = urlParams.get('dev');

    // Check if URL already has query params
    const separator = url.includes('?') ? '&' : '?';

    if (prod === 'true') {
        return `${url}${separator}prod=true`;
    } else if (dev === 'true') {
        return `${url}${separator}dev=true`;
    }
    return url;
}

// Check if user came from valid reset link
async function checkResetToken() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // No valid session from reset link
        showMessage('Invalid or expired reset link. Please request a new one.', true);
        setTimeout(() => {
            window.location.href = addEnvParams('login.html');
        }, 3000);
    }
}

function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('reset-message');
    messageDiv.textContent = message;
    messageDiv.className = `alert mt-3 ${isError ? 'alert-danger' : 'alert-success'}`;
    messageDiv.classList.remove('d-none');
}

// Password Reset Form
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const resetBtn = document.getElementById('reset-btn');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match', true);
        return;
    }

    // Validate password length
    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters', true);
        return;
    }

    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Resetting...';

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showMessage('Password reset successful! Redirecting to login...', false);

        // Sign out and redirect to login
        await supabaseClient.auth.signOut();
        setTimeout(() => {
            window.location.href = addEnvParams('login.html?reset=success');
        }, 2000);

    } catch (error) {
        console.error('Reset error:', error);
        showMessage(error.message || 'Failed to reset password', true);
        resetBtn.disabled = false;
        resetBtn.innerHTML = '<i class="fas fa-check me-2"></i>Reset Password';
    }
});

// Check on page load
checkResetToken();
