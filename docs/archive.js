
const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

// Global variable to store games so search works instantly
let allProjects = [];
let currentProject = null; // Store current project for editing
let isEditMode = false; // Track if modal is in edit mode

// Check if user can edit a project
async function canEditProject(projectId) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return false;

    // Check if user is in people table
    const { data: person, error: personError } = await supabaseClient
        .from(TABLES.people)
        .select('id, user_type')
        .eq('email', session.user.email)
        .maybeSingle();

    if (personError) {
        console.error('Error fetching person for edit check:', personError);
        return false;
    }

    if (!person) {
        console.log('No person found with email:', session.user.email);
        return false;
    }

    // Admins can edit any project
    if (person.user_type === 'admin') return true;

    // Check if user is creator/instructor for this project (any role)
    const { data: relations, error: relationError } = await supabaseClient
        .from(TABLES.people_projects)
        .select('role')
        .eq('project_id', projectId)
        .eq('person_id', person.id);

    if (relationError) {
        console.error('Error checking project relation:', relationError);
        return false;
    }

    // User can edit if they have any relation to the project
    return relations && relations.length > 0;
}

const resultsContainer = document.getElementById('project-results');
const resultCountSpan = document.getElementById('result-count');
const noResultsAlert = document.getElementById('no-results');
const projectModal = new bootstrap.Modal(document.getElementById('projectDetailModal'));

// 2. Fetch Data Function (Replaces the hardcoded array)
async function fetchProjects() {
    resultsContainer.innerHTML = '<p class="text-center">Loading archive...</p>';

    try {
        const { data, error } = await supabaseClient
            .from(TABLES.projects)
            .select('*');

        if (error) throw error;

        // Fetch creators and instructors for each project
        for (const project of data) {
            // Fetch creators
            const { data: creatorsData } = await supabaseClient
                .from(TABLES.people_projects)
                .select(`
                    person_id,
                    ${TABLES.people}!person_id(name)
                `)
                .eq('project_id', project.id)
                .eq('role', 'creator');

            project.creators = creatorsData ? creatorsData.map(c => c[TABLES.people].name) : [];

            // Fetch instructors
            const { data: instructorsData } = await supabaseClient
                .from(TABLES.people_projects)
                .select(`
                    person_id,
                    ${TABLES.people}!person_id(name)
                `)
                .eq('project_id', project.id)
                .eq('role', 'instructor');

            project.instructors = instructorsData ? instructorsData.map(i => i[TABLES.people].name) : [];

            // Fetch institution name
            if (project.institution_id) {
                const { data: institutionData } = await supabaseClient
                    .from(TABLES.institutions)
                    .select('institutionname')
                    .eq('id', project.institution_id)
                    .single();

                project.institution = institutionData ? institutionData.institutionname : null;
            }
        }

        allProjects = data;
        renderProjects(allProjects);

    } catch (error) {
        console.error('Error fetching projects:', error);

        // Create error message container
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger text-center';
        errorDiv.setAttribute('role', 'alert');

        const heading = document.createElement('h5');
        heading.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Unable to load projects';

        const message = document.createElement('p');
        message.className = 'mb-2';
        message.textContent = error.message || 'Database connection failed';

        const retryBtn = document.createElement('button');
        retryBtn.className = 'btn btn-sm btn-outline-danger';
        retryBtn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
        retryBtn.onclick = fetchProjects;

        errorDiv.appendChild(heading);
        errorDiv.appendChild(message);
        errorDiv.appendChild(retryBtn);

        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(errorDiv);
    }
}

// 3. Render Function (Mostly unchanged, just maps database fields)
function renderProjects(projects) {
    resultsContainer.innerHTML = '';
    resultCountSpan.textContent = projects.length;

    if (projects.length === 0) {
        noResultsAlert.classList.remove('d-none');
        return;
    } else {
        noResultsAlert.classList.add('d-none');
    }

    projects.forEach(project => {
        // Create card container
        const col = document.createElement('div');
        col.className = 'col';

        const card = document.createElement('div');
        card.className = 'card game-card shadow-sm';

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body d-flex flex-column';

        // Create a flex container for title/creators + image
        const headerRow = document.createElement('div');
        headerRow.className = 'd-flex justify-content-between align-items-start mb-3';

        // Left side: title and creators
        const leftContent = document.createElement('div');
        leftContent.className = 'flex-grow-1 me-3';

        // Title
        const title = document.createElement('h5');
        title.className = 'card-title text-primary mb-2';
        title.textContent = project.title;
        leftContent.appendChild(title);

        // Brief Description (if available)
        if (project.briefdescription) {
            const brief = document.createElement('p');
            brief.className = 'card-text text-muted fst-italic mb-2';
            brief.textContent = project.briefdescription;
            leftContent.appendChild(brief);
        }

        // Creators
        const creators = document.createElement('p');
        creators.className = 'card-text mb-3';  // mb-3 for extra space
        creators.innerHTML = '<strong>Creators:</strong> ';
        creators.appendChild(document.createTextNode((project.creators || []).join(', ')));
        leftContent.appendChild(creators);

        // Right side: thumbnail image (if available)
        if (project.image_urls && project.image_urls.length > 0) {
            const thumbnailBtn = document.createElement('button');
            thumbnailBtn.className = 'border-0 bg-transparent p-0';
            thumbnailBtn.style.cursor = 'pointer';
            thumbnailBtn.onclick = () => showProjectDetails(project.id);

            const thumbnail = document.createElement('img');
            thumbnail.src = project.image_urls[0];
            thumbnail.alt = project.title;
            thumbnail.className = 'rounded';
            thumbnail.style.cssText = 'width: 120px; height: 120px; object-fit: cover; transition: opacity 0.2s;';

            // Hover effect
            thumbnailBtn.onmouseenter = () => thumbnail.style.opacity = '0.8';
            thumbnailBtn.onmouseleave = () => thumbnail.style.opacity = '1';

            thumbnailBtn.appendChild(thumbnail);
            headerRow.appendChild(leftContent);
            headerRow.appendChild(thumbnailBtn);
        } else {
            headerRow.appendChild(leftContent);
        }

        // Institution (no label)
        const institution = document.createElement('h6');
        institution.className = 'card-subtitle mb-2 text-muted';
        institution.textContent = project.institution;

        // Instructors
        const instructors = document.createElement('h6');
        instructors.className = 'card-subtitle mb-2 text-muted';
        instructors.innerHTML = '<strong>Instructor(s):</strong> ';
        instructors.appendChild(document.createTextNode((project.instructors || []).join(', ') || 'N/A'));

        // Course Name (italicized)
        const courseName = document.createElement('p');
        courseName.className = 'card-text mb-1 text-muted fst-italic';
        courseName.textContent = project.coursename || 'Course not specified';

        // Term and Year
        const termYear = document.createElement('p');
        termYear.className = 'card-text mb-1 text-muted';
        termYear.textContent = `${project.term} ${project.year}`;

        // Keywords (badges)
        const keywordDiv = document.createElement('div');
        keywordDiv.className = 'mt-2 mb-3';
        (project.keywords || []).forEach(kw => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary badge-tag';
            badge.textContent = kw;
            keywordDiv.appendChild(badge);
        });

        // Button
        const btnContainer = document.createElement('div');
        btnContainer.className = 'mt-auto';
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-info w-100';
        btn.innerHTML = '<i class="fas fa-info-circle"></i> Details';
        btn.onclick = () => showProjectDetails(project.id);
        btnContainer.appendChild(btn);

        // Assemble everything
        cardBody.append(headerRow, institution, instructors, courseName, termYear, keywordDiv, btnContainer);
        card.appendChild(cardBody);
        col.appendChild(card);
        resultsContainer.appendChild(col);
    });

}

// 4. Search Logic (Updates to search the 'allProjects' variable)
document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const titleQuery = document.getElementById('search-title').value.toLowerCase();
    const creatorQuery = document.getElementById('search-creator').value.toLowerCase();
    const institutionFilter = document.getElementById('filter-institution').value;
    const keywordSelect = document.getElementById('filter-keyword');
    const selectedKeywords = Array.from(keywordSelect.selectedOptions).map(opt => opt.value);
    const genreFilter = document.getElementById('filter-genre').value;

    const filteredProjects = allProjects.filter(project => {
        // Title search - only in title field
        const titleMatch = !titleQuery || project.title?.toLowerCase().includes(titleQuery);

        // Creator search
        const creatorMatch = !creatorQuery ||
            (project.creators || []).some(creator => creator.toLowerCase().includes(creatorQuery));

        // Institution filter - exact match
        const institutionMatch = !institutionFilter || project.institution === institutionFilter;

        // Keyword filter - project must have at least one of the selected keywords
        const keywordMatch = selectedKeywords.length === 0 ||
            selectedKeywords.some(kw => (project.keywords || []).includes(kw));

        // Genre filter - project must have the selected genre in its genres array
        const genreMatch = !genreFilter || (project.genres || []).includes(genreFilter);

        return titleMatch && creatorMatch && institutionMatch && keywordMatch && genreMatch;
    });

    renderProjects(filteredProjects);
});

// Clear filters button
document.getElementById('clear-filters').addEventListener('click', function () {
    document.getElementById('search-title').value = '';
    document.getElementById('search-creator').value = '';
    document.getElementById('filter-institution').value = '';
    document.getElementById('filter-genre').value = '';
    // Clear multi-select keyword filter
    const keywordSelect = document.getElementById('filter-keyword');
    Array.from(keywordSelect.options).forEach(opt => opt.selected = false);
    renderProjects(allProjects);
});

// 5. Modal Logic (Updated for Database fields)
window.showProjectDetails = function (projectID) {
    const project = allProjects.find(g => g.id === projectID);
    if (!project) return;

    const modalTitleElement = document.getElementById('projectDetailModalLabel');
    modalTitleElement.textContent = project.title;
    modalTitleElement.className = 'modal-title fs-3 fw-bold';  // ADD THIS LINE

    const modalDetails = document.getElementById('modal-details');

    // Clear previous content
    modalDetails.innerHTML = '';

    // === IMAGE CAROUSEL SECTION ===
    const images = project.image_urls || [];

    if (images.length > 0) {
        if (images.length === 1) {
            // Single image
            const imgContainer = document.createElement('div');
            imgContainer.className = 'text-center mb-4';

            const img = document.createElement('img');
            img.src = images[0];
            img.className = 'img-fluid rounded shadow';
            img.style.maxHeight = '240px';  // Half of 480px
            img.style.objectFit = 'contain';
            img.style.cursor = 'pointer';
            img.title = 'Click to view full size';
            img.onclick = (e) => {
                e.stopPropagation();  // Prevent carousel from triggering
                showImageOverlay(images[0]);
            };
            imgContainer.appendChild(img);
            modalDetails.appendChild(imgContainer);
        } else {
            // Multiple images - carousel
            const carouselId = `carousel-${project.id}`;
            const carousel = document.createElement('div');
            carousel.id = carouselId;
            carousel.className = 'carousel slide mb-4';
            carousel.setAttribute('data-bs-ride', 'carousel');
            carousel.style.maxWidth = '600px';  // Constrain carousel width
            carousel.style.margin = '0 auto';    // Center it

            // Indicators
            const indicators = document.createElement('div');
            indicators.className = 'carousel-indicators';
            images.forEach((_, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.setAttribute('data-bs-target', `#${carouselId}`);
                button.setAttribute('data-bs-slide-to', index);
                if (index === 0) {
                    button.className = 'active';
                    button.setAttribute('aria-current', 'true');
                }
                indicators.appendChild(button);
            });

            // Carousel items
            const carouselInner = document.createElement('div');
            carouselInner.className = 'carousel-inner rounded shadow-sm';
            images.forEach((imgSrc, index) => {
                const item = document.createElement('div');
                item.className = index === 0 ? 'carousel-item active' : 'carousel-item';

                const img = document.createElement('img');
                img.src = imgSrc;
                img.className = 'd-block w-100 rounded';
                img.style.maxHeight = '240px';  // Half of 480px
                img.style.objectFit = 'contain';
                img.style.cursor = 'pointer';
                img.title = 'Click to view full size';
                img.onclick = (e) => {
                    e.stopPropagation();  // Prevent carousel from triggering
                    showImageOverlay(imgSrc);
                };
                item.appendChild(img);
                carouselInner.appendChild(item);
            });

            // Carousel controls
            const prevBtn = document.createElement('button');
            prevBtn.className = 'carousel-control-prev';
            prevBtn.type = 'button';
            prevBtn.setAttribute('data-bs-target', `#${carouselId}`);
            prevBtn.setAttribute('data-bs-slide', 'prev');
            prevBtn.innerHTML = '<span class="carousel-control-prev-icon" aria-hidden="true"></span>';

            const nextBtn = document.createElement('button');
            nextBtn.className = 'carousel-control-next';
            nextBtn.type = 'button';
            nextBtn.setAttribute('data-bs-target', `#${carouselId}`);
            nextBtn.setAttribute('data-bs-slide', 'next');
            nextBtn.innerHTML = '<span class="carousel-control-next-icon" aria-hidden="true"></span>';

            // Assemble carousel
            carousel.appendChild(indicators);
            carousel.appendChild(carouselInner);
            carousel.appendChild(prevBtn);
            carousel.appendChild(nextBtn);
            modalDetails.appendChild(carousel);
        }
    }

    // === GAME INFO SECTION ===

    // Create two-column layout
    const infoRow = document.createElement('div');
    infoRow.className = 'row';

    // LEFT COLUMN - Game metadata
    const leftCol = document.createElement('div');
    leftCol.className = 'col-md-6';

    // Creators
    const creatorsP = document.createElement('p');
    creatorsP.className = 'mb-1';
    creatorsP.innerHTML = '<strong>Creators:</strong> ';

    if (project.creators && project.creators.length > 0) {
        project.creators.forEach((creator, index) => {
            const creatorSpan = document.createElement('span');
            creatorSpan.textContent = creator;
            creatorSpan.style.cursor = 'pointer';
            creatorSpan.style.textDecoration = 'underline';
            creatorSpan.className = 'text-primary';
            creatorSpan.onclick = () => showUserProfile(creator);

            creatorsP.appendChild(creatorSpan);
            if (index < project.creators.length - 1) {
                creatorsP.appendChild(document.createTextNode(', '));
            }
        });
    }
    leftCol.appendChild(creatorsP);

    // Add whitespace
    const spacer1 = document.createElement('div');
    spacer1.className = 'mb-3';
    leftCol.appendChild(spacer1);

    // Institution
    const institutionH6 = document.createElement('h6');
    institutionH6.className = 'text-muted mb-2';
    institutionH6.textContent = project.institution;
    leftCol.appendChild(institutionH6);

    // Class Number • Class Name
    const classInfoP = document.createElement('p');
    classInfoP.className = 'text-muted mb-1';
    const classNumberText = project.classnumber ? `${project.classnumber} - ` : '';
    const courseNameText = project.coursename ? `<em>${project.coursename}</em>` : '';
    classInfoP.innerHTML = `${classNumberText} ${courseNameText}`;
    leftCol.appendChild(classInfoP);

    // Term and Year
    const termYearP = document.createElement('p');
    termYearP.className = 'text-muted mb-3';
    termYearP.textContent = `${project.term} • ${project.year}`;
    leftCol.appendChild(termYearP);

    // Instructors
    const instructorsH6 = document.createElement('h6');
    instructorsH6.className = 'text-muted mb-3';
    instructorsH6.innerHTML = 'Instructor(s): ';

    if (project.instructors && project.instructors.length > 0) {
        project.instructors.forEach((instructor, index) => {
            const instructorSpan = document.createElement('span');
            instructorSpan.textContent = instructor;
            instructorSpan.style.cursor = 'pointer';
            instructorSpan.style.textDecoration = 'underline';
            instructorSpan.className = 'text-primary';
            instructorSpan.onclick = () => showUserProfile(instructor);

            instructorsH6.appendChild(instructorSpan);
            if (index < project.instructors.length - 1) {
                instructorsH6.appendChild(document.createTextNode(', '));
            }
        });
    } else {
        instructorsH6.appendChild(document.createTextNode('N/A'));
    }
    leftCol.appendChild(instructorsH6);

    // Assignment
    if (project.assignment) {
        const assignmentP = document.createElement('p');
        assignmentP.className = 'mb-2';
        assignmentP.innerHTML = '<strong>Assignment:</strong> ';
        assignmentP.appendChild(document.createTextNode(project.assignment));
        leftCol.appendChild(assignmentP);
    }

    // Keywords
    const keywordsP = document.createElement('p');
    keywordsP.className = 'mb-3';
    keywordsP.innerHTML = '<strong>Keywords:</strong> ';
    (project.keywords || []).forEach(kw => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-info badge-tag me-1';
        badge.textContent = kw;
        keywordsP.appendChild(badge);
    });
    leftCol.appendChild(keywordsP);

    // Tech Used
    if (project.techUsed && project.techUsed.length > 0) {
        const techP = document.createElement('p');
        techP.className = 'mb-3';
        techP.innerHTML = '<strong>Tech Used:</strong> ';
        project.techUsed.forEach(tech => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-success badge-tag me-1';
            badge.textContent = tech;
            techP.appendChild(badge);
        });
        leftCol.appendChild(techP);
    }

    // RIGHT COLUMN - Artist's Statement
    const rightCol = document.createElement('div');
    rightCol.className = 'col-md-6';

    // Genre
    const genreHeading = document.createElement('h6');
    genreHeading.className = 'text-success mb-2';
    genreHeading.innerHTML = '<i class="fas fa-layer-group"></i> Genre(s)';

    const genreText = document.createElement('p');
    genreText.className = 'fw-bold';
    genreText.textContent = (project.genres || []).join(', ') || 'Not specified';

    rightCol.appendChild(genreHeading);
    rightCol.appendChild(genreText);

    // Brief Description 
    if (project.briefdescription) {
        const briefHeading = document.createElement('h6');
        briefHeading.className = 'text-info mb-2';
        briefHeading.innerHTML = '<i class="fas fa-comment-dots"></i> Quick Summary';

        const briefText = document.createElement('p');
        briefText.className = 'fw-bold mb-3';
        briefText.textContent = project.briefdescription;

        rightCol.appendChild(briefHeading);
        rightCol.appendChild(briefText);
    }

    const statementHeading = document.createElement('h6');
    statementHeading.className = 'text-success mb-2';
    statementHeading.innerHTML = '<i class="fas fa-paint-brush"></i> Artists\' Statement';

    const statementText = document.createElement('p');
    statementText.className = 'border-start border-3 border-success ps-3';
    statementText.textContent = project.fulldescription || 'No statement provided.';

    rightCol.appendChild(statementHeading);
    rightCol.appendChild(statementText);

    // Assemble columns
    infoRow.appendChild(leftCol);
    infoRow.appendChild(rightCol);
    modalDetails.appendChild(infoRow);

    // === UPDATE FOOTER LINKS ===
    const vidLink = document.getElementById('modal-video-link');
    if (project.videolink) {
        vidLink.onclick = (e) => {
            e.preventDefault();
            showVideoOverlay(project.videolink);
        };
        vidLink.classList.remove('disabled');
    } else {
        vidLink.onclick = null;
        vidLink.classList.add('disabled');
    }

    const downloadLink = document.getElementById('modal-download-link');
    downloadLink.href = project.downloadlink || '#';
    downloadLink.classList.toggle('disabled', !project.downloadlink);

    // Source link (dynamic creation)
    const footer = document.querySelector('#projectDetailModal .modal-footer');
    let sourceBtn = document.getElementById('modal-source-link-temp');
    if (!sourceBtn) {
        sourceBtn = document.createElement('a');
        sourceBtn.id = 'modal-source-link-temp';
        sourceBtn.className = 'btn btn-outline-dark me-2';
        sourceBtn.innerHTML = '<i class="fas fa-code"></i> Source';
        sourceBtn.target = '_blank';
        footer.insertBefore(sourceBtn, document.getElementById('modal-download-link'));
    }
    sourceBtn.href = project.repolink || '#';
    sourceBtn.classList.toggle('disabled', !project.repolink);

    // Add delete button for authenticated users (at the end of showProjectDetails function)
    async function addDeleteButton(projectID) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const footer = document.querySelector('#projectDetailModal .modal-footer');

        // Remove existing delete button if any
        const existingDeleteBtn = document.getElementById('modal-delete-btn');
        if (existingDeleteBtn) {
            existingDeleteBtn.remove();
        }

        if (session) {
            // User is authenticated, show delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.id = 'modal-delete-btn';
            deleteBtn.className = 'btn btn-danger me-auto';
            deleteBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Delete Project';
            deleteBtn.onclick = () => confirmDelete(projectID);

            // Insert at the beginning of footer
            footer.insertBefore(deleteBtn, footer.firstChild);
        }
    }

    async function confirmDelete(projectID) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        const project = allProjects.find(g => g.id === projectID);
        if (!project) return;

        try {
            // Step 1: Delete images from storage
            if (project.image_urls && project.image_urls.length > 0) {
                for (const imageUrl of project.image_urls) {
                    // Extract filename from URL
                    const urlParts = imageUrl.split('/');
                    const filename = urlParts[urlParts.length - 1];

                    const { error: storageError } = await supabaseClient.storage
                        .from('project-images')
                        .remove([filename]);

                    if (storageError) {
                        console.error('Error deleting image:', storageError);
                    }
                }
            }

            // Step 2: Delete project record from database
            const { error: dbError } = await supabaseClient
                .from(TABLES.projects)
                .delete()
                .eq('id', projectID);

            if (dbError) throw dbError;

            // Step 3: Update UI
            allProjects = allProjects.filter(g => g.id !== projectID);
            renderProjects(allProjects);

            // Close modal and show success
            projectModal.hide();
            alert('Project deleted successfully!');

        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete project: ' + error.message);
        }
    }

    addDeleteButton(project.id);

    projectModal.show();

    // Store current project for editing
    currentProject = project;

    // Check if user can edit and show edit button
    canEditProject(projectID).then(canEdit => {
        const editBtn = document.getElementById('edit-project-btn');
        if (canEdit) {
            editBtn.style.display = 'inline-block';
        } else {
            editBtn.style.display = 'none';
        }
    });
}

// Toggle edit mode for project modal
function toggleEditMode(enable) {
    isEditMode = enable;

    const editBtn = document.getElementById('edit-project-btn');
    const saveBtn = document.getElementById('save-project-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const modalVideoLink = document.getElementById('modal-video-link');
    const modalDownloadLink = document.getElementById('modal-download-link');

    // Check if all elements exist
    if (!editBtn || !saveBtn || !cancelBtn || !closeBtn) {
        console.error('Edit mode buttons not found in DOM');
        return;
    }

    if (enable) {
        // Switch to edit mode
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        closeBtn.style.display = 'none';
        if (modalVideoLink) modalVideoLink.style.display = 'none';
        if (modalDownloadLink) modalDownloadLink.style.display = 'none';

        // Convert modal content to editable
        convertToEditMode();
    } else {
        // Switch to view mode
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        closeBtn.style.display = 'inline-block';
        if (modalVideoLink) modalVideoLink.style.display = 'inline-block';
        if (modalDownloadLink) modalDownloadLink.style.display = 'inline-block';
    }
}

// Convert modal content to editable fields
function convertToEditMode() {
    if (!currentProject) return;

    // Make modal title editable
    const modalTitle = document.getElementById('projectDetailModalLabel');
    if (modalTitle && !modalTitle.querySelector('input')) {
        const currentTitle = modalTitle.textContent;
        modalTitle.innerHTML = '';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'form-control form-control-lg';
        titleInput.value = currentTitle;
        titleInput.id = 'edit-title';
        titleInput.style.fontSize = 'inherit';
        titleInput.style.fontWeight = 'inherit';

        modalTitle.appendChild(titleInput);
    }

    // Make text fields editable by finding them and converting to inputs/textareas
    const modalDetails = document.getElementById('modal-details');

    // Find and convert brief description
    const briefElements = Array.from(modalDetails.querySelectorAll('p')).filter(p =>
        p.textContent === currentProject.briefdescription
    );
    if (briefElements.length > 0) {
        const briefP = briefElements[0];
        const textarea = document.createElement('textarea');
        textarea.className = 'form-control';
        textarea.value = currentProject.briefdescription || '';
        textarea.rows = 2;
        textarea.id = 'edit-brief';
        briefP.replaceWith(textarea);
    }

    // Find and convert full description (artist's statement)
    const descElements = Array.from(modalDetails.querySelectorAll('p')).filter(p =>
        p.textContent === (currentProject.fulldescription || 'No statement provided.')
    );
    if (descElements.length > 0) {
        const descP = descElements[0];
        const textarea = document.createElement('textarea');
        textarea.className = 'form-control border-start border-3 border-success ps-3';
        textarea.value = currentProject.fulldescription || '';
        textarea.rows = 6;
        textarea.id = 'edit-description';
        descP.replaceWith(textarea);
    }

    // Find and convert assignment, class info, term, year
    const textElements = modalDetails.querySelectorAll('p.fw-bold');
    textElements.forEach(p => {
        const text = p.textContent.trim();

        // Assignment
        if (text === (currentProject.assignment || 'Not specified')) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.value = currentProject.assignment || '';
            input.id = 'edit-assignment';
            input.placeholder = 'Assignment name';
            p.replaceWith(input);
        }
        // Class info
        else if (text === (currentProject.classinfo || 'Not specified')) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.value = currentProject.classinfo || '';
            input.id = 'edit-classinfo';
            input.placeholder = 'Class name';
            p.replaceWith(input);
        }
        // Term
        else if (text === (currentProject.term || 'Not specified')) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.value = currentProject.term || '';
            input.id = 'edit-term';
            input.placeholder = 'Term (e.g., Fall 2024)';
            p.replaceWith(input);
        }
        // Year
        else if (text === String(currentProject.year || 'Not specified')) {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'form-control';
            input.value = currentProject.year || '';
            input.id = 'edit-year';
            input.placeholder = 'Year';
            input.min = '1900';
            input.max = '2100';
            p.replaceWith(input);
        }
    });

    // Find and convert game URL
    const gameUrlElements = Array.from(modalDetails.querySelectorAll('a')).filter(a =>
        a.href === (currentProject.gameurl || '#')
    );
    if (gameUrlElements.length > 0) {
        const link = gameUrlElements[0];
        const input = document.createElement('input');
        input.type = 'url';
        input.className = 'form-control';
        input.value = currentProject.gameurl || '';
        input.id = 'edit-gameurl';
        input.placeholder = 'https://...';
        link.replaceWith(input);
    }

    console.log('Edit mode enabled - all text fields are now editable');
}

// Save project changes
async function saveProjectChanges() {
    if (!currentProject) return;

    try {
        // Collect edited values
        const titleInput = document.getElementById('edit-title');
        const briefInput = document.getElementById('edit-brief');
        const descInput = document.getElementById('edit-description');
        const assignmentInput = document.getElementById('edit-assignment');
        const classinfoInput = document.getElementById('edit-classinfo');
        const termInput = document.getElementById('edit-term');
        const yearInput = document.getElementById('edit-year');
        const gameurlInput = document.getElementById('edit-gameurl');

        if (!titleInput) {
            alert('Title field not found');
            return;
        }

        const newTitle = titleInput.value.trim();

        if (!newTitle) {
            alert('Title cannot be empty');
            return;
        }

        // Build update object with all edited fields
        const updateData = {
            title: newTitle,
            briefdescription: briefInput ? briefInput.value.trim() || null : currentProject.briefdescription,
            fulldescription: descInput ? descInput.value.trim() || null : currentProject.fulldescription,
            assignment: assignmentInput ? assignmentInput.value.trim() || null : currentProject.assignment,
            classinfo: classinfoInput ? classinfoInput.value.trim() || null : currentProject.classinfo,
            term: termInput ? termInput.value.trim() || null : currentProject.term,
            year: yearInput ? (yearInput.value ? parseInt(yearInput.value) : null) : currentProject.year,
            gameurl: gameurlInput ? gameurlInput.value.trim() || null : currentProject.gameurl
        };

        // Update project in database
        const { error } = await supabaseClient
            .from(TABLES.projects)
            .update(updateData)
            .eq('id', currentProject.id);

        if (error) {
            console.error('Error saving project:', error);
            alert('Error saving changes: ' + error.message);
            return;
        }

        // Update local project data
        Object.assign(currentProject, updateData);
        const projectIndex = allProjects.findIndex(p => p.id === currentProject.id);
        if (projectIndex !== -1) {
            Object.assign(allProjects[projectIndex], updateData);
        }

        // Exit edit mode and reload project details
        toggleEditMode(false);
        window.showProjectDetails(currentProject.id);

        alert('Changes saved successfully!');

    } catch (error) {
        console.error('Error saving project:', error);
        alert('Error saving changes');
    }
}

// Image overlay functionality
function showImageOverlay(imageSrc) {
    const overlay = document.getElementById('image-overlay');
    const overlayImg = document.getElementById('overlay-image');

    overlayImg.src = imageSrc;
    overlay.style.display = 'block';

    // Remove focus from modal to prevent aria-hidden warning
    document.activeElement.blur();

    // Close on click anywhere
    overlay.onclick = () => {
        overlay.style.display = 'none';
    };
}

// Also handle ESC key to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('image-overlay').style.display = 'none';
    }
});

// Video overlay functionality
function showVideoOverlay(videoUrl) {
    const overlay = document.getElementById('video-overlay');
    const videoFrame = document.getElementById('overlay-video');

    // Convert YouTube URL to embed format if needed
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch')) {
        const videoId = new URL(videoUrl).searchParams.get('v');
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (videoUrl.includes('youtu.be/')) {
        const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (videoUrl.includes('vimeo.com/')) {
        const videoId = videoUrl.split('vimeo.com/')[1].split('?')[0];
        embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }

    videoFrame.src = embedUrl;
    overlay.style.display = 'block';

    // Close on click (but not on the video itself)
    overlay.onclick = (e) => {
        if (e.target === overlay || e.target.classList.contains('video-overlay-close')) {
            overlay.style.display = 'none';
            videoFrame.src = ''; // Stop video when closing
        }
    };
}

// Also handle ESC key to close video overlay
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const videoOverlay = document.getElementById('video-overlay');
        if (videoOverlay.style.display === 'block') {
            videoOverlay.style.display = 'none';
            document.getElementById('overlay-video').src = '';
        }
    }
});

// Load genres for filter dropdown
async function loadGenres() {
    try {
        const { data: genres, error } = await supabaseClient
            .from(TABLES.genres)
            .select('genre')
            .order('genre');

        if (error) {
            console.error('Error loading genres:', error);
            return;
        }

        const select = document.getElementById('filter-genre');
        genres.forEach(g => {
            const option = document.createElement('option');
            option.value = g.genre;
            option.textContent = g.genre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Load keywords for filter dropdown
async function loadKeywordsFilter() {
    try {
        const { data: keywords, error } = await supabaseClient
            .from(TABLES.keywords)
            .select('keyword')
            .order('keyword');

        if (error) {
            console.error('Error loading keywords:', error);
            return;
        }

        const select = document.getElementById('filter-keyword');
        // No default option is added here, only options from the database
        keywords.forEach(kw => {
            const option = document.createElement('option');
            option.value = kw.keyword;
            option.textContent = kw.keyword;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading keywords:', error);
    }
}

// Load institutions for filter dropdown
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

        const select = document.getElementById('filter-institution');
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

// Show user profile modal
window.showUserProfile = async function (personName) {
    try {
        // Fetch person data
        const { data: person, error: personError } = await supabaseClient
            .from(TABLES.people)
            .select('*, institution:institution_id(institutionname)')
            .ilike('name', personName)
            .maybeSingle();

        if (personError) throw personError;
        if (!person) {
            alert('Profile not found');
            return;
        }

        // Fetch person's projects
        const { data: projectRelations, error: projectsError } = await supabaseClient
            .from(TABLES.people_projects)
            .select('project_id, role, projects:project_id(*)')
            .eq('person_id', person.id);

        if (projectsError) throw projectsError;

        // Set modal title
        document.getElementById('userProfileModalLabel').textContent = person.name;

        // Build profile content
        const profileDetails = document.getElementById('user-profile-details');
        profileDetails.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'row';

        // Left column - Basic info (only if public)
        const leftCol = document.createElement('div');
        leftCol.className = 'col-md-6';

        if (!person.is_public) {
            // Show privacy message
            const privateMsg = document.createElement('p');
            privateMsg.className = 'text-muted fst-italic';
            privateMsg.textContent = 'Profile details not public';
            leftCol.appendChild(privateMsg);
        } else {
            // Show full profile details
            if (person.bio) {
                const bioHeading = document.createElement('h6');
                bioHeading.className = 'text-primary mb-2';
                bioHeading.innerHTML = '<i class="fas fa-user"></i> About';

                const bioText = document.createElement('p');
                bioText.textContent = person.bio;

                leftCol.appendChild(bioHeading);
                leftCol.appendChild(bioText);
            }

            // Education info
            if (person.degree || person.graduation_year || person.institution) {
                const eduHeading = document.createElement('h6');
                eduHeading.className = 'text-primary mb-2 mt-3';
                eduHeading.innerHTML = '<i class="fas fa-graduation-cap"></i> Education';

                const eduText = document.createElement('p');
                const eduParts = [];
                if (person.degree) eduParts.push(person.degree);
                if (person.institution?.institutionname) eduParts.push(person.institution.institutionname);
                if (person.graduation_year) eduParts.push(`Class of ${person.graduation_year}`);
                eduText.textContent = eduParts.join(' • ');

                leftCol.appendChild(eduHeading);
                leftCol.appendChild(eduText);
            }

            // Links
            const hasLinks = person.website || person.linkedin_url || person.social_media_url;
            if (hasLinks) {
                const linksHeading = document.createElement('h6');
                linksHeading.className = 'text-primary mb-2 mt-3';
                linksHeading.innerHTML = '<i class="fas fa-link"></i> Links';

                const linksDiv = document.createElement('div');

                if (person.website) {
                    const link = document.createElement('a');
                    link.href = person.website;
                    link.target = '_blank';
                    link.className = 'btn btn-sm btn-outline-primary me-2 mb-2';
                    link.innerHTML = '<i class="fas fa-globe"></i> Website';
                    linksDiv.appendChild(link);
                }

                if (person.linkedin_url) {
                    const link = document.createElement('a');
                    link.href = person.linkedin_url;
                    link.target = '_blank';
                    link.className = 'btn btn-sm btn-outline-primary me-2 mb-2';
                    link.innerHTML = '<i class="fab fa-linkedin"></i> LinkedIn';
                    linksDiv.appendChild(link);
                }

                if (person.social_media_url) {
                    const link = document.createElement('a');
                    link.href = person.social_media_url;
                    link.target = '_blank';
                    link.className = 'btn btn-sm btn-outline-primary me-2 mb-2';
                    link.innerHTML = '<i class="fas fa-share-alt"></i> Social';
                    linksDiv.appendChild(link);
                }

                leftCol.appendChild(linksHeading);
                leftCol.appendChild(linksDiv);
            }
        }

        // Right column - Projects (always shown)
        const rightCol = document.createElement('div');
        rightCol.className = 'col-md-6';

        if (projectRelations && projectRelations.length > 0) {
            const projectsHeading = document.createElement('h6');
            projectsHeading.className = 'text-success mb-2';
            projectsHeading.innerHTML = '<i class="fas fa-gamepad"></i> Projects';

            rightCol.appendChild(projectsHeading);

            projectRelations.forEach(rel => {
                const project = rel.projects;
                if (!project) return;

                const projectCard = document.createElement('div');
                projectCard.className = 'card mb-2';
                projectCard.style.cursor = 'pointer';
                projectCard.onclick = () => {
                    // Close profile modal
                    bootstrap.Modal.getInstance(document.getElementById('userProfileModal')).hide();
                    // Open project modal
                    showProjectDetails(project.id);
                };

                const cardBody = document.createElement('div');
                cardBody.className = 'card-body p-2';

                const title = document.createElement('h6');
                title.className = 'mb-1';
                title.textContent = project.title;

                const role = document.createElement('small');
                role.className = 'text-muted';
                role.textContent = `Role: ${rel.role.charAt(0).toUpperCase() + rel.role.slice(1)}`;

                cardBody.appendChild(title);
                cardBody.appendChild(role);
                projectCard.appendChild(cardBody);
                rightCol.appendChild(projectCard);
            });
        } else {
            const noProjects = document.createElement('p');
            noProjects.className = 'text-muted';
            noProjects.textContent = 'No projects yet';
            rightCol.appendChild(noProjects);
        }

        container.appendChild(leftCol);
        container.appendChild(rightCol);
        profileDetails.appendChild(container);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile');
    }
};

// 6. Start the App
document.addEventListener('DOMContentLoaded', async () => {
    fetchProjects(); // Fetch real data instead of using the array
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        document.getElementById('login-link').style.display = 'none';
        document.getElementById('upload-link').style.display = 'inline-block';
        document.getElementById('profile-link').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'inline-block';

        // Fetch and display user's name
        const { data: person, error: personError } = await supabaseClient
            .from(TABLES.people)
            .select('name')
            .eq('email', session.user.email)
            .maybeSingle();

        if (personError) {
            console.error('Error fetching user name:', personError);
        }

        if (person && person.name) {
            document.getElementById('user-name').textContent = person.name;
            document.getElementById('user-greeting').style.display = 'inline-block';
        }
    }
    loadInstitutions(); // Load institutions for filter
    loadGenres(); // Load genres for filter
    loadKeywordsFilter(); // Load keywords for filter

    // Update search toggle button text
    const searchCollapse = document.getElementById('searchCollapse');
    const toggleBtn = document.querySelector('[data-bs-target="#searchCollapse"]');
    searchCollapse.addEventListener('show.bs.collapse', () => {
        toggleBtn.innerHTML = '<i class="fas fa-search"></i> Hide Search & Filters';
    });
    searchCollapse.addEventListener('hide.bs.collapse', () => {
        toggleBtn.innerHTML = '<i class="fas fa-search"></i> Show Search & Filters';
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // Edit mode buttons
    document.getElementById('edit-project-btn').addEventListener('click', () => {
        toggleEditMode(true);
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        if (confirm('Discard all changes?')) {
            toggleEditMode(false);
            // Reload project details
            if (currentProject) {
                window.showProjectDetails(currentProject.id);
            }
        }
    });

    document.getElementById('save-project-btn').addEventListener('click', () => {
        saveProjectChanges();
    });
});