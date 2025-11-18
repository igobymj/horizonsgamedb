    
const supabaseClient = supabase.createClient(PROJECT_URL, ANON_KEY);

// Global variable to store games so search works instantly
let allGames = [];

const resultsContainer = document.getElementById('game-results');
const resultCountSpan = document.getElementById('result-count');
const noResultsAlert = document.getElementById('no-results');
const gameDetailModal = new bootstrap.Modal(document.getElementById('gameDetailModal'));

// 2. Fetch Data Function (Replaces the hardcoded array)
async function fetchGames() {
    resultsContainer.innerHTML = '<p class="text-center">Loading archive...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from(TABLES.games) 
            .select('*');

        if (error) throw error;
        
        allGames = data;
        renderGames(allGames);
        
    } catch (error) {
        console.error('Error fetching games:', error);
        
        // Create error message container
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger text-center';
        errorDiv.setAttribute('role', 'alert');
        
        const heading = document.createElement('h5');
        heading.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Unable to load games';
        
        const message = document.createElement('p');
        message.className = 'mb-2';
        message.textContent = error.message || 'Database connection failed';
        
        const retryBtn = document.createElement('button');
        retryBtn.className = 'btn btn-sm btn-outline-danger';
        retryBtn.innerHTML = '<i class="fas fa-redo"></i> Try Again';
        retryBtn.onclick = fetchGames;
        
        errorDiv.appendChild(heading);
        errorDiv.appendChild(message);
        errorDiv.appendChild(retryBtn);
        
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(errorDiv);
    }
}

// 3. Render Function (Mostly unchanged, just maps database fields)
function renderGames(games) {
    resultsContainer.innerHTML = '';
    resultCountSpan.textContent = games.length;

    if (games.length === 0) {
        noResultsAlert.classList.remove('d-none');
        return;
    } else {
        noResultsAlert.classList.add('d-none');
    }

 games.forEach(game => {
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
    title.textContent = game.gameTitle;
    
    // Creators
    const creators = document.createElement('p');
    creators.className = 'card-text mb-3';  // mb-3 for extra space
    creators.innerHTML = '<strong>Creators:</strong> ';
    creators.appendChild(document.createTextNode((game.creators || []).join(', ')));
    
    leftContent.appendChild(title);
    leftContent.appendChild(creators);
    
    // Right side: thumbnail image (if available)
    if (game.image_urls && game.image_urls.length > 0) {
        const thumbnailBtn = document.createElement('button');
        thumbnailBtn.className = 'border-0 bg-transparent p-0';
        thumbnailBtn.style.cursor = 'pointer';
        thumbnailBtn.onclick = () => showGameDetails(game.id);
        
        const thumbnail = document.createElement('img');
        thumbnail.src = game.image_urls[0];
        thumbnail.alt = game.gameTitle;
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
    institution.textContent = game.institution;
    
    // Class Number • Term Year
    const classTermYear = document.createElement('p');
    classTermYear.className = 'card-text mb-1 text-muted';
    const classText = game.classNumber ? `${game.classNumber} • ` : '';
    classTermYear.textContent = `${classText}${game.term} ${game.year}`;
    
    // Instructors
    const instructors = document.createElement('h6');
    instructors.className = 'card-subtitle mb-2 text-muted';
    instructors.innerHTML = '<strong>Instructor(s):</strong> ';
    instructors.appendChild(document.createTextNode((game.instructors || []).join(', ') || 'N/A'));
    
    // Keywords (badges)
    const keywordDiv = document.createElement('div');
    keywordDiv.className = 'mt-2 mb-3';
    (game.keywords || []).forEach(kw => {
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
    btn.onclick = () => showGameDetails(game.id);
    btnContainer.appendChild(btn);
    
    // Assemble everything
    cardBody.append(headerRow, institution, classTermYear, instructors, keywordDiv, btnContainer);
    card.appendChild(cardBody);
    col.appendChild(card);
    resultsContainer.appendChild(col);
});
 
}

// 4. Search Logic (Updates to search the 'allGames' variable)
document.getElementById('search-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const titleQuery = document.getElementById('search-title').value.toLowerCase();
    const creatorQuery = document.getElementById('search-creator').value.toLowerCase();
    const institutionFilter = document.getElementById('filter-institution').value;
    const genreFilter = document.getElementById('filter-genre').value;

    const filteredGames = allGames.filter(game => {
        // Safety checks (?.) added in case fields are missing in DB
        const titleMatch = game.gameTitle?.toLowerCase().includes(titleQuery) ||
                           (game.keywords || []).some(kw => kw.toLowerCase().includes(titleQuery));
        
        const creatorMatch = !creatorQuery || 
                             (game.creators || []).some(creator => creator.toLowerCase().includes(creatorQuery));
                             
        const institutionMatch = !institutionFilter || game.institution === institutionFilter;
        const genreMatch = !genreFilter || game.gameGenre === genreFilter;

        return titleMatch && creatorMatch && institutionMatch && genreMatch;
    });

    renderGames(filteredGames);
});

// 5. Modal Logic (Updated for Database fields)
window.showGameDetails = function(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;

const modalTitleElement = document.getElementById('gameDetailModalLabel');
modalTitleElement.textContent = game.gameTitle;
modalTitleElement.className = 'modal-title fs-3 fw-bold';  // ADD THIS LINE

const modalDetails = document.getElementById('modal-details');
    
    // Clear previous content
    modalDetails.innerHTML = '';
    
    // === IMAGE CAROUSEL SECTION ===
    const images = game.image_urls || [];

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
            const carouselId = `carousel-${game.id}`;
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
    
    // Creators
    const creatorsP = document.createElement('p');
    creatorsP.className = 'mb-1';
    creatorsP.innerHTML = '<strong>Creators:</strong> ';
    creatorsP.appendChild(document.createTextNode((game.creators || []).join(', ')));
    modalDetails.appendChild(creatorsP);

    // Add whitespace
    const spacer1 = document.createElement('div');
    spacer1.className = 'mb-3';
    modalDetails.appendChild(spacer1);

    // Institution
    const institutionH6 = document.createElement('h6');
    institutionH6.className = 'text-muted mb-2';
    institutionH6.textContent = game.institution;
    modalDetails.appendChild(institutionH6);

    // Class Number • Term Year
    const classTermP = document.createElement('p');
    classTermP.className = 'text-muted mb-1';
    const classText = game.classNumber ? `${game.classNumber} • ` : '';
    classTermP.textContent = `${classText}${game.term} ${game.year}`;
    modalDetails.appendChild(classTermP);

    // Instructors
    const instructorsH6 = document.createElement('h6');
    instructorsH6.className = 'text-muted mb-3';
    instructorsH6.innerHTML = '<strong>Instructor(s):</strong> ';
    instructorsH6.appendChild(document.createTextNode((game.instructors || []).join(', ') || 'N/A'));
    modalDetails.appendChild(instructorsH6);

    // Genre (if you want to keep it somewhere)
    const genreP = document.createElement('p');
    genreP.className = 'mb-2';
    genreP.innerHTML = '<strong>Genre:</strong> ';
    genreP.appendChild(document.createTextNode(game.gameGenre));
    modalDetails.appendChild(genreP);

    // Keywords
    const keywordsP = document.createElement('p');
    keywordsP.className = 'mb-3';
    keywordsP.innerHTML = '<strong>Keywords:</strong> ';
    (game.keywords || []).forEach(kw => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-info badge-tag me-1';
        badge.textContent = kw;
        keywordsP.appendChild(badge);
    });
    modalDetails.appendChild(keywordsP);

    // === ARTIST STATEMENT ===
    const statementHeading = document.createElement('h6');
    statementHeading.className = 'mt-3 text-success';
    statementHeading.innerHTML = '<i class="fas fa-paint-brush"></i> Artists\' Statement';

    const statementText = document.createElement('p');
    statementText.className = 'border-start border-3 border-success ps-3';
    statementText.textContent = game.description || 'No statement provided.';

    modalDetails.appendChild(statementHeading);
    modalDetails.appendChild(statementText);
    
    
    // === UPDATE FOOTER LINKS ===
    const vidLink = document.getElementById('modal-video-link');
    vidLink.href = game.videoLink || '#';
    vidLink.classList.toggle('disabled', !game.videoLink);

    const downloadLink = document.getElementById('modal-download-link');
    downloadLink.href = game.downloadLink || '#';
    downloadLink.classList.toggle('disabled', !game.downloadLink);

    // Source link (dynamic creation)
    const footer = document.querySelector('#gameDetailModal .modal-footer');
    let sourceBtn = document.getElementById('modal-source-link-temp');
    if (!sourceBtn) {
        sourceBtn = document.createElement('a');
        sourceBtn.id = 'modal-source-link-temp';
        sourceBtn.className = 'btn btn-outline-dark me-2';
        sourceBtn.innerHTML = '<i class="fas fa-code"></i> Source';
        sourceBtn.target = '_blank';
        footer.insertBefore(sourceBtn, document.getElementById('modal-download-link'));
    }
    sourceBtn.href = game.repoLink || '#';
    sourceBtn.classList.toggle('disabled', !game.repoLink);

    // Add delete button for authenticated users (at the end of showGameDetails function)
    async function addDeleteButton(gameId) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const footer = document.querySelector('#gameDetailModal .modal-footer');
        
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
            deleteBtn.innerHTML = '<i class="fas fa-trash me-2"></i>Delete Game';
            deleteBtn.onclick = () => confirmDelete(gameId);
            
            // Insert at the beginning of footer
            footer.insertBefore(deleteBtn, footer.firstChild);
        }
    }

    async function confirmDelete(gameId) {
        if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
            return;
        }
        
        const game = allGames.find(g => g.id === gameId);
        if (!game) return;
        
        try {
            // Step 1: Delete images from storage
            if (game.image_urls && game.image_urls.length > 0) {
                for (const imageUrl of game.image_urls) {
                    // Extract filename from URL
                    const urlParts = imageUrl.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    
                    const { error: storageError } = await supabaseClient.storage
                        .from('game-images')
                        .remove([filename]);
                    
                    if (storageError) {
                        console.error('Error deleting image:', storageError);
                    }
                }
            }
            
            // Step 2: Delete game record from database
            const { error: dbError } = await supabaseClient
                .from(TABLES.games)
                .delete()
                .eq('id', gameId);
            
            if (dbError) throw dbError;
            
            // Step 3: Update UI
            allGames = allGames.filter(g => g.id !== gameId);
            renderGames(allGames);
            
            // Close modal and show success
            gameDetailModal.hide();
            alert('Game deleted successfully!');
            
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete game: ' + error.message);
        }
    }

    addDeleteButton(game.id);

    gameDetailModal.show();
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

// 6. Start the App
document.addEventListener('DOMContentLoaded', () => {
    fetchGames(); // Fetch real data instead of using the array
});