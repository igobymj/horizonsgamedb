// Tag Utilities - Shared validation and database operations for keywords and genres
// Used by both upload.js and archive.js

// Supabase client should be available globally
// TABLES should be available from config.js

// ===== KEYWORD OPERATIONS =====

/**
 * Check if a keyword already exists in the database
 * @param {string} keyword - The keyword to check
 * @returns {Promise<boolean>} - True if keyword is new (doesn't exist), false if it exists
 */
async function isNewKeyword(keyword) {
    try {
        const { data, error } = await supabaseClient
            .from(TABLES.keywords)
            .select('keyword')
            .eq('keyword', keyword)
            .maybeSingle();

        if (error) {
            console.error('Error checking keyword:', error);
            return false; // Assume it exists on error to be safe
        }

        return !data; // Returns true if keyword doesn't exist
    } catch (error) {
        console.error('Error checking keyword:', error);
        return false;
    }
}

/**
 * Insert a new keyword into the database if it doesn't already exist
 * @param {string} keyword - The keyword to insert
 * @returns {Promise<void>}
 */
async function insertKeywordIfNew(keyword) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        const { error } = await supabaseClient
            .from(TABLES.keywords)
            .insert([{
                keyword: keyword,
                created_by: session.user.id
            }]);

        if (error && !error.message.includes('duplicate') && error.code !== '23505') {
            console.error('Error inserting keyword:', error);
        }
    } catch (error) {
        console.error('Error inserting keyword:', error);
    }
}

// ===== GENRE OPERATIONS =====

/**
 * Check if a genre exists in the database
 * @param {string} genre - The genre to validate
 * @returns {Promise<boolean>} - True if genre exists, false otherwise
 */
async function isValidGenre(genre) {
    try {
        const { data, error } = await supabaseClient
            .from(TABLES.genres)
            .select('genre')
            .eq('genre', genre)
            .maybeSingle();

        if (error) {
            console.error('Error checking genre:', error);
            return false;
        }

        return !!data; // Returns true if genre exists
    } catch (error) {
        console.error('Error checking genre:', error);
        return false;
    }
}

/**
 * Load genres from database and populate a datalist element
 * @param {string} datalistId - The ID of the datalist element to populate
 * @returns {Promise<void>}
 */
async function loadGenres(datalistId) {
    try {
        const { data: genres, error } = await supabaseClient
            .from(TABLES.genres)
            .select('genre')
            .order('genre');

        if (error) {
            console.error('Error loading genres:', error);
            return;
        }

        const datalist = document.getElementById(datalistId);
        if (datalist) {
            datalist.innerHTML = ''; // Clear existing options
            genres.forEach(g => {
                const option = document.createElement('option');
                option.value = g.genre;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// ===== PEOPLE OPERATIONS =====

/**
 * Load people from database and populate a datalist element
 * @param {string} datalistId - The ID of the datalist element to populate
 * @returns {Promise<void>}
 */
async function loadPeople(datalistId) {
    try {
        const { data: people, error } = await supabaseClient
            .from(TABLES.people)
            .select('name')
            .order('name');

        if (error) {
            console.error('Error loading people:', error);
            return;
        }

        const datalist = document.getElementById(datalistId);
        if (datalist) {
            datalist.innerHTML = ''; // Clear existing options
            people.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading people:', error);
    }
}
