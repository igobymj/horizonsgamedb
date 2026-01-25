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

/**
 * Show generic confirmation modal
 * @param {string} message - The message to display
 * @param {string} title - The modal title
 * @param {boolean} isDestructive - If true, styles as danger (red), otherwise primary (blue)
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showConfirmModal(message, title = 'Confirm Action', isDestructive = false) {
    return new Promise((resolve) => {
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        const modalHeader = document.getElementById('confirm-modal-header');
        const modalTitle = document.getElementById('confirm-modal-title');
        const modalMessage = document.getElementById('confirm-modal-message');
        const confirmBtn = document.getElementById('confirm-modal-btn');

        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Clean up previous event listeners (handled by cleanup function below)

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

        // Cleanup listeners to prevent memory leaks and duplicates
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            document.getElementById('confirmModal').removeEventListener('hidden.bs.modal', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        document.getElementById('confirmModal').addEventListener('hidden.bs.modal', handleCancel, { once: true });

        modal.show();
    });
}
