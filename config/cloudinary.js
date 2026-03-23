const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Optimized storage with multiple transformations
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'furniture-catalog',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      
      // Generate multiple sizes for lazy loading
      eager: [
        { width: 100, height: 100, crop: 'thumb', quality: 'auto:low' },  // Thumbnail
        { width: 400, height: 400, crop: 'limit', quality: 'auto:good' }, // Preview
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:best' } // Full size
      ],
      
      // Format optimization
      format: 'webp', // Better compression
      
      // Auto quality
      quality: 'auto',
      
      // Fetch format (AVIF if supported, else WebP)
      fetch_format: 'auto'
    };
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

module.exports = { cloudinary, upload };