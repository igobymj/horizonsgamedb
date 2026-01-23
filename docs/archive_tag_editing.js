// Tag editing helper functions for project editing
// Add this code to archive.js after the convertToEditMode function

// Convert array fields (creators, keywords, etc.) to tag editors
function convertArrayFieldsToTagEditors() {
    if (!currentProject) return;

    const modalDetails = document.getElementById('modal-details');

    // Helper function to create tag editor
    function createTagEditor(containerId, tags, placeholder) {
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'tag-editor mb-3';

        // Tags display area
        const tagsDisplay = document.createElement('div');
        tagsDisplay.className = 'tags-display mb-2';
        tagsDisplay.id = `${containerId}-display`;

        // Render existing tags
        tags.forEach(tag => {
            const badge = createTagBadge(tag, containerId);
            tagsDisplay.appendChild(badge);
        });

        // Input for new tags
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.placeholder = placeholder;
        input.id = `${containerId}-input`;

        // Add tag on Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = input.value.trim();
                if (value) {
                    const badge = createTagBadge(value, containerId);
                    tagsDisplay.appendChild(badge);
                    input.value = '';
                }
            }
        });

        container.appendChild(tagsDisplay);
        container.appendChild(input);

        return container;
    }

    // Helper to create removable tag badge
    function createTagBadge(text, containerId) {
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary me-1 mb-1';
        badge.style.cursor = 'pointer';
        badge.innerHTML = `${text} <i class="fas fa-times ms-1"></i>`;
        badge.onclick = () => badge.remove();
        return badge;
    }

    // Find and replace creators
    const creatorsElements = Array.from(modalDetails.querySelectorAll('h6')).filter(h6 =>
        h6.textContent.includes('Creator(s):')
    );
    if (creatorsElements.length > 0) {
        const editor = createTagEditor('edit-creators', currentProject.creators || [], 'Add creator name');
        creatorsElements[0].replaceWith(editor);
    }

    // Find and replace instructors
    const instructorsElements = Array.from(modalDetails.querySelectorAll('h6')).filter(h6 =>
        h6.textContent.includes('Instructor(s):')
    );
    if (instructorsElements.length > 0) {
        const editor = createTagEditor('edit-instructors', currentProject.instructors || [], 'Add instructor name');
        instructorsElements[0].replaceWith(editor);
    }

    // Find and replace keywords
    const keywordsElements = Array.from(modalDetails.querySelectorAll('p')).filter(p =>
        p.innerHTML.includes('<strong>Keywords:</strong>')
    );
    if (keywordsElements.length > 0) {
        const editor = createTagEditor('edit-keywords', currentProject.keywords || [], 'Add keyword');
        keywordsElements[0].replaceWith(editor);
    }

    // Find and replace genres
    const genreElements = Array.from(modalDetails.querySelectorAll('p.fw-bold')).filter(p =>
        p.textContent === ((currentProject.genres || []).join(', ') || 'Not specified')
    );
    if (genreElements.length > 0) {
        const editor = createTagEditor('edit-genres', currentProject.genres || [], 'Add genre');
        genreElements[0].replaceWith(editor);
    }

    // Find and replace tech used
    const techElements = Array.from(modalDetails.querySelectorAll('p')).filter(p =>
        p.innerHTML.includes('<strong>Tech Used:</strong>')
    );
    if (techElements.length > 0) {
        const editor = createTagEditor('edit-tech', currentProject.techUsed || [], 'Add technology');
        techElements[0].replaceWith(editor);
    }
}

// Helper function to collect tags from a tag editor
function collectTagsFromEditor(editorId) {
    const display = document.getElementById(`${editorId}-display`);
    if (!display) return [];

    const badges = display.querySelectorAll('.badge');
    return Array.from(badges).map(badge => {
        // Extract text without the × icon
        return badge.textContent.replace(/\s*×\s*$/, '').trim();
    });
}

// Add this call at the end of convertToEditMode function:
// convertArrayFieldsToTagEditors();
