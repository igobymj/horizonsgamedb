// Initialize Supabase (use same credentials as main page)
const PROJECT_URL = 'https://xylhehjbonypyjiyhkkt.supabase.co/';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bGhlaGpib255cHlqaXloa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjkxNjEsImV4cCI6MjA3ODY0NTE2MX0.rWKrKSOCJBLVMPgSt5TAjjIYdFr6tO2Y7V0lQPDz9As';

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
let compressedImages = [];

// ===== TAG INPUT FUNCTIONALITY =====

function setupTagInput(inputId, containerId, storageArray) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = input.value.trim();
            
            if (value && !storageArray.includes(value)) {
                storageArray.push(value);
                addTag(value, container, input, storageArray);
                input.value = '';
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
                .from('game-images')
                .upload(fileName, imgData.file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from('game-images')
                .getPublicUrl(fileName);
            
            imageUrls.push(urlData.publicUrl);
        }
        
        // Step 2: Insert game data into database
        progressText.textContent = 'Saving game data...';
        progressBar.style.width = '70%';
        
        const gameData = {
            gameTitle: document.getElementById('gameTitle').value.trim(),
            gameGenre: document.getElementById('gameGenre').value,
            year: parseInt(document.getElementById('year').value),
            institution: document.getElementById('institution').value,
            creators: creators,
            keywords: keywords,
            description: document.getElementById('description').value.trim() || null,
            videoLink: document.getElementById('videoLink').value.trim() || null,
            downloadLink: document.getElementById('downloadLink').value.trim() || null,
            repoLink: document.getElementById('repoLink').value.trim() || null,
            image_urls: imageUrls
        };
        
        const { error: dbError } = await supabaseClient
            .from('games')
            .insert([gameData]);
        
        if (dbError) throw dbError;
        
        // Success!
        progressBar.style.width = '100%';
        progressText.textContent = 'Upload complete!';
        
        setTimeout(() => {
            progressDiv.classList.add('d-none');
            successDiv.classList.remove('d-none');
            document.getElementById('upload-form').reset();
            creators = [];
            keywords = [];
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
    
    // Setup tag inputs
    setupTagInput('creators-input', 'creators-container', creators);
    setupTagInput('keywords-input', 'keywords-container', keywords);
});