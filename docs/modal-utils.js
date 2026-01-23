// Modal Utilities - Shared modal functions for consistent UX
// Used across all pages for alerts, confirmations, and warnings

/**
 * Show custom warning/alert modal (instead of system alert dialog)
 * @param {string} message - The message to display
 * @param {string} title - The modal title (default: 'Warning')
 * @param {string} type - Modal type: 'warning' (yellow), 'success' (green), 'error' (red)
 */
function showWarning(message, title = 'Warning', type = 'warning') {
    const modal = new bootstrap.Modal(document.getElementById('warningModal'));
    const modalHeader = document.querySelector('#warningModal .modal-header');

    // Set header color based on type
    modalHeader.className = 'modal-header';
    if (type === 'success') {
        modalHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'error') {
        modalHeader.classList.add('bg-danger', 'text-white');
    } else {
        modalHeader.classList.add('bg-warning', 'text-dark');
    }

    document.getElementById('warning-title').textContent = title;
    document.getElementById('warning-message').textContent = message;
    modal.show();
}

/**
 * Show custom keyword confirmation modal
 * @param {string} keyword - The keyword to confirm
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showKeywordConfirmModal(keyword) {
    return new Promise((resolve) => {
        const modal = new bootstrap.Modal(document.getElementById('keywordConfirmModal'));
        const keywordText = document.getElementById('new-keyword-text');
        const confirmBtn = document.getElementById('confirm-keyword-btn');

        keywordText.textContent = `"${keyword}"`;

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
            document.getElementById('keywordConfirmModal').removeEventListener('hidden.bs.modal', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        document.getElementById('keywordConfirmModal').addEventListener('hidden.bs.modal', handleCancel, { once: true });

        modal.show();
    });
}
