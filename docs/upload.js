
const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

// perform supabase built in authentication check
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html?redirect=upload.html';
        return false;
    }
    return true;
}

// Add logout functionality
function setupLogout() {
    // Create logout button in header
    const header = document.querySelector('header .container');
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-sm btn-outline-light float-end';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Logout';
    logoutBtn.onclick = async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    };
    header.querySelector('h1').appendChild(logoutBtn);
}

// Storage for tags and compressed images
let creators = [];
let keywords = [];
let instructors = [];
let genres = [];
let compressedImages = [];
let techUsed = [];

// ===== TAG INPUT FUNCTIONALITY =====

function setupTagInput(inputId, containerId, storageArray) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    const isKeywordInput = inputId === 'keywords-input';
    const isGenreInput = inputId === 'genres-input';
    const maxGenres = 3;

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            let value = input.value.trim();

            // Normalize keywords (lowercase)
            if (isKeywordInput) {
                value = value.toLowerCase();
            }

            // Check genre limit
            if (isGenreInput && storageArray.length >= maxGenres) {
                alert(`You can only add up to ${maxGenres} genres`);
                input.value = '';
                return;
            }

            if (value && !storageArray.includes(value)) {
                // For keywords, check if it's new and confirm
                if (isKeywordInput) {
                    const isNew = await isNewKeyword(value);
                    if (isNew) {
                        const confirmed = await showKeywordConfirmModal(value);
                        if (!confirmed) {
                            input.value = '';
                            return;
                        }
                    }
                }

                storageArray.push(value);
                addTag(value, container, input, storageArray);
                input.value = '';

                // Auto-insert new keyword to database
                if (isKeywordInput) {
                    await insertKeywordIfNew(value);
                }
            }
        }
    });
}

function addTag(text, container, input, storageArray) {
    const tag = document.createElement('div');
    tag.className = 'tag';

    const span = document.createElement('span');
    span.textContent = text;

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.type = 'button';
    removeBtn.onclick = () => {
        const index = storageArray.indexOf(text);
        if (index > -1) storageArray.splice(index, 1);
        tag.remove();
    };

    tag.appendChild(span);
    tag.appendChild(removeBtn);
    container.insertBefore(tag, input);
}

// ===== IMAGE COMPRESSION & PREVIEW =====

document.getElementById('images').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('image-previews');
    const statusDiv = document.getElementById('compression-status');

    if (files.length > 5) {
        alert('Maximum 5 images allowed');
        e.target.value = '';
        return;
    }

    previewContainer.innerHTML = '';
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Compressing images...';
    compressedImages = [];

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const originalSize = (file.size / 1024 / 1024).toFixed(2);

            // Compress image
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: 'image/jpeg'
            };

            const compressedFile = await imageCompression(file, options);
            const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);

            // Store compressed file with metadata
            compressedImages.push({
                file: compressedFile,
                originalSize: originalSize,
                compressedSize: compressedSize,
                name: file.name
            });

            // Create preview
            const reader = new FileReader();
            reader.onload = (event) => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'image-preview';

                const img = document.createElement('img');
                img.src = event.target.result;
                img.alt = 'Preview';
                img.className = 'border';

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.type = 'button';
                removeBtn.onclick = () => {
                    const index = compressedImages.findIndex(img => img.name === file.name);
                    if (index > -1) compressedImages.splice(index, 1);
                    previewDiv.remove();
                    updateCompressionStatus();
                };

                previewDiv.appendChild(img);
                previewDiv.appendChild(removeBtn);
                previewContainer.appendChild(previewDiv);
            };
            reader.readAsDataURL(compressedFile);
        }

        updateCompressionStatus();

    } catch (error) {
        console.error('Compression error:', error);
        statusDiv.innerHTML = '<span class="text-danger">Error compressing images</span>';
    }
});

function updateCompressionStatus() {
    const statusDiv = document.getElementById('compression-status');

    if (compressedImages.length === 0) {
        statusDiv.innerHTML = '';
        return;
    }

    const totalOriginal = compressedImages.reduce((sum, img) => sum + parseFloat(img.originalSize), 0);
    const totalCompressed = compressedImages.reduce((sum, img) => sum + parseFloat(img.compressedSize), 0);
    const savings = ((1 - totalCompressed / totalOriginal) * 100).toFixed(0);

    statusDiv.innerHTML = `
        <i class="fas fa-check-circle text-success me-2"></i>
        ${compressedImages.length} image(s) compressed: 
        ${totalOriginal.toFixed(2)}MB → ${totalCompressed.toFixed(2)}MB 
        (${savings}% smaller)
    `;
}

// ===== FORM SUBMISSION =====

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate creators
    if (creators.length === 0) {
        showError('Please add at least one creator');
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');

    // Disable form
    submitBtn.disabled = true;
    progressDiv.classList.remove('d-none');
    successDiv.classList.add('d-none');
    errorDiv.classList.add('d-none');

    try {
        // Step 1: Upload images to Supabase Storage
        progressText.textContent = 'Uploading images...';
        progressBar.style.width = '30%';

        const imageUrls = [];

        for (let i = 0; i < compressedImages.length; i++) {
            const imgData = compressedImages[i];
            const timestamp = Date.now();
            const fileName = `${timestamp}_${i}_${imgData.name}`;

            const { data, error } = await supabaseClient.storage
                .from(STORAGE_BUCKETS.images)
                .upload(fileName, imgData.file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from(STORAGE_BUCKETS.images)
                .getPublicUrl(fileName);

            imageUrls.push(urlData.publicUrl);
        }

        // Step 2: Insert project data into database
        progressText.textContent = 'Saving project data...';
        progressBar.style.width = '70%';

        const projectData = {
            title: document.getElementById('gameTitle').value.trim(),
            genres: genres, // Array of genre names
            year: parseInt(document.getElementById('year').value),
            term: document.getElementById('term').value,
            institution_id: null, // Will be set after institution lookup
            classnumber: document.getElementById('classNumber').value.trim() || null,
            coursename: document.getElementById('courseName').value.trim() || null,
            assignment: document.getElementById('assignment').value.trim() || null,
            briefdescription: document.getElementById('briefDescription').value.trim() || null,
            fulldescription: document.getElementById('description').value.trim() || null,
            keywords: keywords,
            techused: techUsed,
            videolink: document.getElementById('videoLink').value.trim() || null,
            downloadlink: document.getElementById('downloadLink').value.trim() || null,
            repolink: document.getElementById('repoLink').value.trim() || null,
            image_urls: imageUrls
        };

        // Lookup institution_id
        const institutionName = document.getElementById('institution').value;
        const { data: institutionData } = await supabaseClient
            .from(TABLES.institutions)
            .select('id')
            .ilike('institutionname', institutionName)
            .single();

        if (institutionData) {
            projectData.institution_id = institutionData.id;
        }


        const { data: insertedProject, error: dbError } = await supabaseClient
            .from(TABLES.projects)
            .insert([projectData])
            .select()
            .single();

        if (dbError) throw dbError;

        const projectId = insertedProject.id;

        // Insert creators into junction table
        for (const creatorName of creators) {
            const { data: personData } = await supabaseClient
                .from(TABLES.people)
                .select('id')
                .ilike('name', creatorName)
                .single();

            if (personData) {
                await supabaseClient
                    .from(TABLES.people_projects)
                    .insert([{
                        project_id: projectId,
                        person_id: personData.id,
                        role: 'creator'
                    }]);
            }
        }

        // Insert instructors into junction table
        for (const instructorName of instructors) {
            const { data: personData } = await supabaseClient
                .from(TABLES.people)
                .select('id')
                .ilike('name', instructorName)
                .single();

            if (personData) {
                await supabaseClient
                    .from(TABLES.people_projects)
                    .insert([{
                        project_id: projectId,
                        person_id: personData.id,
                        role: 'instructor'
                    }]);
            }
        }

        // Success!
        progressBar.style.width = '100%';
        progressText.textContent = 'Upload complete!';

        setTimeout(() => {
            progressDiv.classList.add('d-none');
            successDiv.classList.remove('d-none');
            document.getElementById('upload-form').reset();
            creators = [];
            keywords = [];
            genres = [];
            techUsed = [];
            instructors = [];
            compressedImages = [];
            document.getElementById('image-previews').innerHTML = '';
            document.getElementById('compression-status').innerHTML = '';
        }, 500);

    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message || 'Upload failed. Please try again.');
        submitBtn.disabled = false;
        progressDiv.classList.add('d-none');
    }
});

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    errorText.textContent = message;
    errorDiv.classList.remove('d-none');

    // Scroll to error
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== INITIALIZE =====

document.addEventListener('DOMContentLoaded', async () => {
    // Check auth first
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    // Setup logout button
    setupLogout();   // Set current year as default
    const currentYear = new Date().getFullYear();
    document.getElementById('year').value = currentYear;

    // Load institutions
    loadInstitutions();

    // Load keywords
    loadKeywords();

    // Load people
    loadPeople();

    // Load genres
    loadGenresUpload();

    // Setup tag inputs
    setupTagInput('instructors-input', 'instructors-container', instructors);
    setupTagInput('creators-input', 'creators-container', creators);
    setupTagInput('keywords-input', 'keywords-container', keywords);
    setupTagInput('genres-input', 'genres-container', genres);
    setupTagInput('techUsed-input', 'techUsed-container', techUsed);

});

// Load institutions for upload form dropdown
async function loadInstitutions() {
    try {
        const { data: institutions, error } = await supabaseClient
            .from(TABLES.institutions)
            .select('institutionname')
            .order('institutionname');

        if (error) {
            console.error('Error loading institutions:', error);
            return;
        }

        const select = document.getElementById('institution');
        institutions.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst.institutionname;
            option.textContent = inst.institutionname;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading institutions:', error);
    }
}

// Load keywords for autocomplete
async function loadKeywords() {
    try {
        const { data: keywordsList, error } = await supabaseClient
            .from(TABLES.keywords)
            .select('keyword')
            .order('keyword');

        if (error) {
            console.error('Error loading keywords:', error);
            return;
        }

        const datalist = document.getElementById('keywords-list');
        keywordsList.forEach(kw => {
            const option = document.createElement('option');
            option.value = kw.keyword;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading keywords:', error);
    }
}

// Show keyword confirmation modal
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

// Check if keyword is new (doesn't exist in database)
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

// Load people for autocomplete (creators and instructors)
async function loadPeople() {
    try {
        const { data: peopleList, error } = await supabaseClient
            .from(TABLES.people)
            .select('name')
            .order('name');

        if (error) {
            console.error('Error loading people:', error);
            return;
        }

        const datalist = document.getElementById('people-list');
        peopleList.forEach(person => {
            const option = document.createElement('option');
            option.value = person.name;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading people:', error);
    }
}

// Insert new keyword to database if it doesn't exist
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

        // Ignore duplicate key errors (constraint violation)
        if (error && !error.message.includes('duplicate') && error.code !== '23505') {
            console.error('Error inserting keyword:', error);
        }
    } catch (error) {
        console.error('Error inserting keyword:', error);
    }
}

// Load genres for upload form datalist
async function loadGenresUpload() {
    try {
        const { data: genres, error } = await supabaseClient
            .from(TABLES.genres)
            .select('genre')
            .order('genre');

        if (error) {
            console.error('Error loading genres:', error);
            return;
        }

        const datalist = document.getElementById('genres-list');
        genres.forEach(g => {
            const option = document.createElement('option');
            option.value = g.genre;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}