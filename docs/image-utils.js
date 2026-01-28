// Image Utilities - Shared image compression and storage operations
// Used by both upload.js and archive.js

// Supabase client and STORAGE_BUCKET should be available globally

// ===== COMPRESSION CONFIGURATION =====

/**
 * Standard image compression options
 * Used consistently across upload and edit features
 */
const IMAGE_COMPRESSION_OPTIONS = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg'
};

// ===== COMPRESSION FUNCTIONS =====

/**
 * Compress a single image file
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options (defaults to IMAGE_COMPRESSION_OPTIONS)
 * @returns {Promise<Object>} - Object with compressed file and metadata
 */
async function compressImage(file, options = IMAGE_COMPRESSION_OPTIONS) {
    const originalSize = (file.size / 1024 / 1024).toFixed(2);

    const compressedFile = await imageCompression(file, options);
    const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);

    return {
        file: compressedFile,
        originalSize: originalSize,
        compressedSize: compressedSize,
        name: file.name
    };
}

/**
 * Compress multiple image files
 * @param {FileList|Array} files - Array of image files to compress
 * @param {Object} options - Compression options (defaults to IMAGE_COMPRESSION_OPTIONS)
 * @returns {Promise<Array>} - Array of compressed image objects
 */
async function compressImages(files, options = IMAGE_COMPRESSION_OPTIONS) {
    const compressed = [];

    for (let i = 0; i < files.length; i++) {
        const result = await compressImage(files[i], options);
        compressed.push(result);
    }

    return compressed;
}

// ===== STORAGE OPERATIONS =====

/**
 * Upload an image to Supabase Storage
 * @param {File} file - The compressed image file to upload
 * @param {string} fileName - The filename to use in storage
 * @param {string} bucketName - The storage bucket name (defaults to STORAGE_BUCKET)
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
async function uploadImageToStorage(file, fileName, bucketName = STORAGE_BUCKET) {
    const { data, error } = await supabaseClient.storage
        .from(bucketName)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(fileName);

    return urlData.publicUrl;
}

/**
 * Delete an image from Supabase Storage
 * @param {string} imageUrl - The full URL of the image to delete
 * @param {string} bucketName - The storage bucket name (defaults to STORAGE_BUCKET)
 * @returns {Promise<void>}
 */
async function deleteImageFromStorage(imageUrl, bucketName = STORAGE_BUCKET) {
    try {
        // Extract filename from URL
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];

        const { error } = await supabaseClient.storage
            .from(bucketName)
            .remove([fileName]);

        if (error) {
            console.error('Error deleting image from storage:', error);
        }
    } catch (error) {
        console.error('Error processing image deletion:', error);
    }
}

// ===== UI HELPER FUNCTIONS =====

/**
 * Update compression status display
 * @param {string} statusElementId - ID of the element to update with status
 * @param {Array} compressedImages - Array of compressed image objects
 * @returns {void}
 */
function updateCompressionStatus(statusElementId, compressedImages) {
    const statusDiv = document.getElementById(statusElementId);

    if (!statusDiv) return;

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

/**
 * Generate a unique filename for image upload
 * @param {string} originalName - The original filename
 * @param {number} index - Optional index for multiple files
 * @returns {string} - Timestamped unique filename
 */
function generateImageFileName(originalName, index = 0) {
    const timestamp = Date.now();
    return `${timestamp}_${index}_${originalName}`;
}
