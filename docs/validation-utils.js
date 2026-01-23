// Validation Utilities - Shared input validation helpers
// Used by both upload.js and archive.js

// ===== TAG VALIDATION =====

/**
 * Normalize a keyword to lowercase
 * @param {string} value - The keyword to normalize
 * @returns {string} - Lowercase keyword
 */
function normalizeKeyword(value) {
    return value.toLowerCase();
}

/**
 * Check if genre count exceeds the maximum allowed
 * @param {number} currentCount - Current number of genres
 * @param {number} max - Maximum allowed genres (default: 3)
 * @returns {boolean} - True if limit exceeded, false otherwise
 */
function isGenreLimitExceeded(currentCount, max = 3) {
    return currentCount >= max;
}

/**
 * Check if a value already exists in an array (case-sensitive)
 * @param {string} value - The value to check
 * @param {Array} array - The array to search
 * @returns {boolean} - True if duplicate found, false otherwise
 */
function isDuplicate(value, array) {
    return array.includes(value);
}

/**
 * Extract text content from tag badges, removing the × icon
 * @param {HTMLElement} badge - The badge element
 * @returns {string} - Clean text content
 */
function extractTagText(badge) {
    return badge.textContent.replace(/\s*×\s*$/, '').trim();
}

/**
 * Get all tag values from a container element
 * @param {HTMLElement} container - The container with tag badges
 * @param {string} badgeSelector - CSS selector for badges (default: '.badge')
 * @returns {Array<string>} - Array of tag values
 */
function getExistingTags(container, badgeSelector = '.badge') {
    const badges = container.querySelectorAll(badgeSelector);
    return Array.from(badges).map(badge => extractTagText(badge));
}
