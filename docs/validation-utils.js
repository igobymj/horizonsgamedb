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

// ===== CONTENT MODERATION =====

let profanityList = [];
const FALLBACK_BAD_WORDS = ['badword', 'offensive', 'spam']; // Very minimal fallback

/**
 * Load profanity list from external source
 * @returns {Promise<void>}
 */
async function loadProfanityList() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/web-mech/badwords/master/lib/lang.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        // The source is an object with "words": [list]
        profanityList = data.words || [];
        console.log(`Loaded ${profanityList.length} blocked terms`);
    } catch (error) {
        console.warn('Failed to load external profanity list, using fallback:', error);
        profanityList = FALLBACK_BAD_WORDS;
    }
}

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {boolean} - True if profanity found
 */
function containsProfanity(text) {
    if (!text || !profanityList.length) return false;
    const lower = text.toLowerCase();

    return profanityList.some(word => {
        // fast check
        if (lower === word) return true;

        // Check word boundaries (regex) for multi-word keywords
        // Escape special regex chars in the bad word
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
        return regex.test(lower);
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
