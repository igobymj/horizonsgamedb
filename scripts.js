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
    
    // Select all columns from the 'games' table
    const { data, error } = await supabaseClient
        .from('games') 
        .select('*');

    if (error) {
        console.error('Error fetching games:', error);
        resultsContainer.innerHTML = '<p class="text-danger text-center">Failed to load games database.</p>';
    } else {
        allGames = data; // Store data in our global variable
        renderGames(allGames); // Draw the screen
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
        const cardHtml = `
            <div class="col">
                <div class="card game-card shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-primary">${game.gameTitle}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${game.gameGenre} (${game.year})</h6>
                        <p class="card-text mb-1"><strong>Institution:</strong> ${game.institution}</p>
                        
                        <p class="card-text"><strong>Creators:</strong> ${(game.creators || []).join(', ')}</p>
                        
                        <div class="mt-2 mb-3">
                            ${(game.keywords || []).map(kw => `<span class="badge bg-secondary badge-tag">${kw}</span>`).join('')}
                        </div>
                        <div class="mt-auto">
                             <button class="btn btn-sm btn-outline-info w-100" onclick="showGameDetails(${game.id})">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        resultsContainer.innerHTML += cardHtml;
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
    
    // Image Carousel Logic 
    // (Assumes game.image_urls is an array in Supabase)
    let imageHtml = '';
    const images = game.image_urls || []; // Safe fallback
    
    if (images.length > 0) {
        if (images.length === 1) {
            imageHtml = `
                <div class="text-center mb-4">
                    <img src="${images[0]}" class="img-fluid rounded shadow" style="max-height: 200px; object-fit: contain;">
                </div>`;
        } else {
            // ... (Your existing carousel logic fits here, just use 'images' variable) ...
             const carouselId = `carousel-${game.id}`;
            const carouselIndicators = images.map((_, index) => `
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${index}" ${index === 0 ? 'class="active" aria-current="true"' : ''}></button>
            `).join('');
            const carouselItems = images.map((imgSrc, index) => `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${imgSrc}" class="d-block w-100 rounded">
                </div>
            `).join('');

            imageHtml = `
                <div id="${carouselId}" class="carousel slide mb-4" data-bs-ride="carousel">
                    <div class="carousel-indicators">${carouselIndicators}</div>
                    <div class="carousel-inner rounded shadow-sm">${carouselItems}</div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    </button>
                </div>
            `;
        }
    }

    modalDetails.innerHTML = `
        ${imageHtml}
        <p class="lead text-primary mb-3">${game.gameGenre} (${game.year})</p>
        <div class="row">
            <div class="col-md-6 mb-3">
                <p><strong>Institution:</strong> ${game.institution}</p>
                <p><strong>Creators:</strong> ${(game.creators || []).join(', ')}</p>
            </div>
            <div class="col-md-6 mb-3">
                <p><strong>Keywords:</strong> ${(game.keywords || []).map(kw => `<span class="badge bg-info badge-tag">${kw}</span>`).join('')}</p>
            </div>
        </div>
        <h6 class="mt-3 text-success"><i class="fas fa-paint-brush"></i> Artists' Statement</h6>
        <p class="border-start border-3 border-success ps-3">${game.description || 'No statement provided.'}</p>
    `;

    // Update Links
    const vidLink = document.getElementById('modal-video-link');
    vidLink.href = game.videoLink || '#';
    vidLink.classList.toggle('disabled', !game.videoLink);

    // Update Source Link (Dynamic creation)
    const footer = document.querySelector('#gameDetailModal .modal-footer');
    let sourceBtn = document.getElementById('modal-source-link-temp');
    if (!sourceBtn) {
        sourceBtn = document.createElement('a');
        sourceBtn.id = 'modal-source-link-temp';
        sourceBtn.className = 'btn btn-outline-dark me-2';
        sourceBtn.innerHTML = '<i class="fas fa-code"></i> Source';
        footer.insertBefore(sourceBtn, document.getElementById('modal-download-link'));
    }
    sourceBtn.href = game.repoLink || '#';
    sourceBtn.classList.toggle('disabled', !game.repoLink);

    gameDetailModal.show();
}

// 6. Start the App
document.addEventListener('DOMContentLoaded', () => {
    fetchGames(); // Fetch real data instead of using the array
});