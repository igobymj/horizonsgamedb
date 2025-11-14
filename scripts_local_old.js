// Mock Database (UPDATED with PUBLIC DOMAIN gameImages)
const gamesData = [
    {
        id: 1,
        institution: "UCLA",
        year: 2024,
        gameTitle: "Echoes of the Void",
        gameCreators: ["Alex Chen", "Maya Singh"],
        gameGenre: "Puzzle",
        keywords: ["2D", "Sound-based", "Narrative", "Atmospheric"],
        gameImages: [
            "echoes.jpg", // Asteroids (PD)
        ],
        linkToVideo: "https://youtube.com/link-to-video-1",
        linkToDownloadableGame: "#", // Placeholder
        linkToSourceRepository: "https://github.com/project-1",
        artistsStatement: "Echoes of the Void explores themes of isolation and communication using only sound cues to guide the player through a monochrome world. We aimed to subvert the visual-first nature of traditional gaming.",
        license: "Creative Commons BY-NC-ND",
    },
    {
        id: 2,
        institution: "NYU",
        year: 2023,
        gameTitle: "Canyon Run",
        gameCreators: ["Jordan Lee"],
        gameGenre: "Platformer",
        keywords: ["3D", "Procedural", "Speedrun", "Low-poly"],
        gameImages: [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Pong.png/640px-Pong.png" // Pong (PD)
        ],
        linkToVideo: "https://youtube.com/link-to-video-2",
        linkToDownloadableGame: "#",
        linkToSourceRepository: "https://github.com/project-2",
        artistsStatement: "This project was an exercise in procedural generation. Every run is unique, challenging the player's muscle memory and forcing quick adaptation in a dynamic, endless canyon.",
        license: "MIT Open Source",
    },
    {
        id: 3,
        institution: "UCLA",
        year: 2024,
        gameTitle: "The Last Scroll",
        gameCreators: ["Sarah K. and Team Alpha"],
        gameGenre: "RPG",
        keywords: ["Fantasy", "Turn-based", "Pixel Art", "Story-rich"],
        gameImages: [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Pac-Man_screenshot.png/640px-Pac-Man_screenshot.png", // Pac-Man (PD)
            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Donkey_Kong_screenshot.png/640px-Donkey_Kong_screenshot.png", // Donkey Kong (PD)
            "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Pitfall%21_Gameplay.jpg/640px-Pitfall%21_Gameplay.jpg", // Pitfall! (PD)
        ],
        linkToVideo: "https://youtube.com/link-to-video-3",
        linkToDownloadableGame: "#",
        linkToSourceRepository: "https://github.com/project-3",
        artistsStatement: "Inspired by classic JRPGs, we focused on deep world-building and moral choices. The pixel art style is a nod to the golden age of 16-bit consoles.",
        license: "Creative Commons BY",
    },
    {
        id: 4,
        institution: "NYU",
        year: 2023,
        gameTitle: "Starship Odyssey",
        gameCreators: ["Team Nebula"],
        gameGenre: "Action",
        keywords: ["Space", "Shooter", "Sci-Fi", "Arcade"],
        gameImages: [], // Example with no images
        linkToVideo: "https://youtube.com/link-to-video-4",
        linkToDownloadableGame: "#",
        linkToSourceRepository: "https://github.com/project-4",
        artistsStatement: "A fast-paced arcade shooter, Starship Odyssey aims to bring back the thrill of classic space combat with modern graphics and responsive controls.",
        license: "MIT Open Source",
    },
    {
        id: 5,
        institution: "UCLA",
        year: 2024,
        gameTitle: "Mystic Maze",
        gameCreators: ["Liam and Chloe"],
        gameGenre: "Adventure",
        keywords: ["Retro", "Text-based", "Exploration", "Fantasy"],
        gameImages: [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Zork_I_-_PDP-11.png/640px-Zork_I_-_PDP-11.png" // Zork (PD)
        ],
        linkToVideo: "https://youtube.com/link-to-video-5",
        linkToDownloadableGame: "#",
        linkToSourceRepository: "https://github.com/project-5",
        artistsStatement: "Mystic Maze is a homage to early text adventures, focusing on intricate descriptions and player imagination to build a rich fantasy world.",
        license: "MIT Open Source",
    }
];

const resultsContainer = document.getElementById('game-results');
const resultCountSpan = document.getElementById('result-count');
const noResultsAlert = document.getElementById('no-results');
const gameDetailModal = new bootstrap.Modal(document.getElementById('gameDetailModal'));

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
        const cardHtml = `
            <div class="col">
                <div class="card game-card shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-primary">${game.gameTitle}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${game.gameGenre} (${game.year})</h6>
                        <p class="card-text mb-1"><strong>Institution:</strong> ${game.institution}</p>
                        <p class="card-text"><strong>Creators:</strong> ${game.gameCreators.join(', ')}</p>
                        <div class="mt-2 mb-3">
                            ${game.keywords.map(kw => `<span class="badge bg-secondary badge-tag">${kw}</span>`).join('')}
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

document.getElementById('search-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const titleQuery = document.getElementById('search-title').value.toLowerCase();
    const creatorQuery = document.getElementById('search-creator').value.toLowerCase();
    const institutionFilter = document.getElementById('filter-institution').value;
    const genreFilter = document.getElementById('filter-genre').value;

    const filteredGames = gamesData.filter(game => {
        const titleMatch = game.gameTitle.toLowerCase().includes(titleQuery) ||
                           game.keywords.some(kw => kw.toLowerCase().includes(titleQuery));
        const creatorMatch = !creatorQuery || game.gameCreators.some(creator => creator.toLowerCase().includes(creatorQuery));
        const institutionMatch = !institutionFilter || game.institution === institutionFilter;
        const genreMatch = !genreFilter || game.gameGenre === genreFilter;

        return titleMatch && creatorMatch && institutionMatch && genreMatch;
    });

    renderGames(filteredGames);
});

window.showGameDetails = function(gameId) {
    const game = gamesData.find(g => g.id === gameId);
    if (!game) return;

    const modalTitle = document.getElementById('gameDetailModalLabel');
    const modalDetails = document.getElementById('modal-details');
    const modalVideoLink = document.getElementById('modal-video-link');
    const modalDownloadLink = document.getElementById('modal-download-link');
    
    modalTitle.textContent = game.gameTitle;

    let imageHtml = '';
    if (game.gameImages && game.gameImages.length > 0) {
        if (game.gameImages.length === 1) {
            imageHtml = `
                <div class="text-center mb-4">
                    <img src="${game.gameImages[0]}" class="img-fluid rounded shadow" alt="${game.gameTitle} Screenshot" style="max-height: 200px; object-fit: contain;">
                </div>
            `;
        } else {
            const carouselId = `carousel-${game.id}`;
            const carouselIndicators = game.gameImages.map((_, index) => `
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${index}" ${index === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Slide ${index + 1}"></button>
            `).join('');
            const carouselItems = game.gameImages.map((imgSrc, index) => `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${imgSrc}" class="d-block w-100 rounded" alt="${game.gameTitle} Screenshot ${index + 1}">
                </div>
            `).join('');

            imageHtml = `
                <div id="${carouselId}" class="carousel slide mb-4" data-bs-ride="carousel">
                    <div class="carousel-indicators">
                        ${carouselIndicators}
                    </div>
                    <div class="carousel-inner rounded shadow-sm">
                        ${carouselItems}
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Previous</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Next</span>
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
                <p><strong>Creators:</strong> ${game.gameCreators.join(', ')}</p>
                <p><strong>License:</strong> <span class="badge bg-warning text-dark">${game.license}</span></p>
            </div>
            <div class="col-md-6 mb-3">
                <p><strong>Keywords:</strong> ${game.keywords.map(kw => `<span class="badge bg-info badge-tag">${kw}</span>`).join('')}</p>
            </div>
        </div>

        <h6 class="mt-3 text-success"><i class="fas fa-paint-brush"></i> Artists' Statement</h6>
        <p class="border-start border-3 border-success ps-3">${game.artistsStatement}</p>
    `;

    modalVideoLink.href = game.linkToVideo || '#';
    modalDownloadLink.href = game.linkToDownloadableGame || '#';
    
    const footer = document.querySelector('#gameDetailModal .modal-footer');
    
    if (document.getElementById('modal-source-link-temp')) {
        document.getElementById('modal-source-link-temp').remove();
    }
    
    const sourceBtn = document.createElement('a');
    sourceBtn.id = 'modal-source-link-temp';
    sourceBtn.href = game.linkToSourceRepository || '#';
    sourceBtn.target = '_blank';
    sourceBtn.className = 'btn btn-outline-dark me-2';
    sourceBtn.innerHTML = '<i class="fas fa-code"></i> Source Repository';

    footer.insertBefore(sourceBtn, modalDownloadLink);
    
    modalVideoLink.classList.toggle('disabled', !game.linkToVideo || game.linkToVideo === '#');
    modalDownloadLink.classList.toggle('disabled', !game.linkToDownloadableGame || game.linkToDownloadableGame === '#');
    sourceBtn.classList.toggle('disabled', !game.linkToSourceRepository || game.linkToSourceRepository === '#');


    gameDetailModal.show();
}

document.addEventListener('DOMContentLoaded', () => {
    renderGames(gamesData);
});