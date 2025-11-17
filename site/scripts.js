// 1. Initialize Supabase
const PROJECT_URL = 'https://xylhehjbonypyjiyhkkt.supabase.co/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bGhlaGpib255cHlqaXloa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjkxNjEsImV4cCI6MjA3ODY0NTE2MX0.rWKrKSOCJBLVMPgSt5TAjjIYdFr6tO2Y7V0lQPDz9As';
    
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
            .from('games') 
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
        // Note: Ensure your Database column names match these variables
        // or update these variables to match your database columns.
       // Create card container
        const col = document.createElement('div');
        col.className = 'col';
        
        const card = document.createElement('div');
        card.className = 'card game-card shadow-sm';
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body d-flex flex-column';
        
        // Title (safe)
        const title = document.createElement('h5');
        title.className = 'card-title text-primary';
        title.textContent = game.gameTitle;
        
        // Subtitle (safe)
        const subtitle = document.createElement('h6');
        subtitle.className = 'card-subtitle mb-2 text-muted';
        subtitle.textContent = `${game.gameGenre} (${game.year})`;
        
        // Institution
        const institution = document.createElement('p');
        institution.className = 'card-text mb-1';
        institution.innerHTML = '<strong>Institution:</strong> ';
        institution.appendChild(document.createTextNode(game.institution));
        
        // Creators
        const creators = document.createElement('p');
        creators.className = 'card-text';
        creators.innerHTML = '<strong>Creators:</strong> ';
        creators.appendChild(document.createTextNode((game.creators || []).join(', ')));
        
        // Keywords (badges)
        const keywordDiv = document.createElement('div');
        keywordDiv.className = 'mt-2 mb-3';
        (game.keywords || []).forEach(kw => {
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary badge-tag';
            badge.textContent = kw; // Safe!
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
        cardBody.append(title, subtitle, institution, creators, keywordDiv, btnContainer);
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

    document.getElementById('gameDetailModalLabel').textContent = game.gameTitle;
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
            img.style.maxHeight = '480px';
            img.style.objectFit = 'contain';
            
            imgContainer.appendChild(img);
            modalDetails.appendChild(imgContainer);
        } else {
            // Multiple images - carousel
            const carouselId = `carousel-${game.id}`;
            const carousel = document.createElement('div');
            carousel.id = carouselId;
            carousel.className = 'carousel slide mb-4';
            carousel.setAttribute('data-bs-ride', 'carousel');
            
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
                img.style.maxHeight = '480px';
                img.style.objectFit = 'contain';
                
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
    
    // === GENRE AND YEAR ===
    const genreText = document.createElement('p');
    genreText.className = 'lead text-primary mb-3';
    genreText.textContent = `${game.gameGenre} (${game.year})`;
    modalDetails.appendChild(genreText);
    
    // === INFO ROW ===
    const row = document.createElement('div');
    row.className = 'row';
    
    // Left column
    const colLeft = document.createElement('div');
    colLeft.className = 'col-md-6 mb-3';
    
    const institutionP = document.createElement('p');
    institutionP.innerHTML = '<strong>Institution:</strong> ';
    institutionP.appendChild(document.createTextNode(game.institution));
    
    const creatorsP = document.createElement('p');
    creatorsP.innerHTML = '<strong>Creators:</strong> ';
    creatorsP.appendChild(document.createTextNode((game.creators || []).join(', ')));
    
    colLeft.appendChild(institutionP);
    colLeft.appendChild(creatorsP);
    
    // Right column
    const colRight = document.createElement('div');
    colRight.className = 'col-md-6 mb-3';
    
    const keywordsP = document.createElement('p');
    keywordsP.innerHTML = '<strong>Keywords:</strong> ';
    (game.keywords || []).forEach(kw => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-info badge-tag';
        badge.textContent = kw;
        keywordsP.appendChild(badge);
    });
    
    colRight.appendChild(keywordsP);
    
    row.appendChild(colLeft);
    row.appendChild(colRight);
    modalDetails.appendChild(row);
    
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
                .from('games')
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

// 6. Start the App
document.addEventListener('DOMContentLoaded', () => {
    fetchGames(); // Fetch real data instead of using the array
});