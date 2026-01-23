
const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

// Check if user came from valid reset link
async function checkResetToken() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // No valid session from reset link
        showMessage('Invalid or expired reset link. Please request a new one.', true);
        setTimeout(() => {
            window.location.href = 'login.html';
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
            window.location.href = 'login.html?reset=success';
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
