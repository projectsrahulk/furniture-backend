/**
 * Optimization utilities for Furniture Catalog
 * Includes image optimization, caching, compression, and performance enhancements
 */

// ========== IMAGE OPTIMIZATION HELPERS ==========

/**
 * Generate optimized image URLs with different sizes
 * @param {string} cloudinaryUrl - Base Cloudinary URL
 * @returns {Object} URLs for different image sizes
 */
const getOptimizedImageUrls = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return null;

  const baseUrl = cloudinaryUrl.split('/upload/')[0] + '/upload/';
  const imagePath = cloudinaryUrl.split('/upload/')[1];

  return {
    thumbnail: `${baseUrl}w_100,h_100,c_thumb,q_auto:low/${imagePath}`,
    preview: `${baseUrl}w_400,h_400,c_limit,q_auto:good/${imagePath}`,
    fullsize: `${baseUrl}w_1200,h_1200,c_limit,q_auto:best/${imagePath}`,
    webp: `${baseUrl}f_webp,q_auto/${imagePath}`
  };
};

/**
 * Calculate image dimensions maintaining aspect ratio
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @returns {Object} Optimized dimensions
 */
const calculateOptimalDimensions = (maxWidth, maxHeight, originalWidth, originalHeight) => {
  const aspectRatio = originalWidth / originalHeight;
  let width = maxWidth;
  let height = maxWidth / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

// ========== CACHING HELPERS ==========

/**
 * Generate cache key from object properties
 * @param {string} prefix - Cache key prefix
 * @param {Object} params - Parameters to include in key
 * @returns {string} Cache key
 */
const generateCacheKey = (prefix, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
};

/**
 * Cache TTL (Time To Live) constants in seconds
 */
const CACHE_TTL = {
  SHORT: 5 * 60,        // 5 minutes
  MEDIUM: 30 * 60,      // 30 minutes
  LONG: 2 * 60 * 60,    // 2 hours
  VERY_LONG: 24 * 60 * 60 // 24 hours
};

// ========== QUERY OPTIMIZATION ==========

/**
 * Build optimized MongoDB query projection
 * Includes only necessary fields to reduce payload
 * @param {string} type - Document type (file, folder, category, user)
 * @returns {Object} MongoDB projection object
 */
const getOptimalProjection = (type) => {
  const projections = {
    file: {
      _id: 1,
      name: 1,
      url: 1,
      fileType: 1,
      size: 1,
      folderId: 1,
      categoryId: 1,
      subcategoryId: 1,
      createdAt: 1,
      updatedAt: 1
    },
    folder: {
      _id: 1,
      name: 1,
      description: 1,
      parentId: 1,
      createdAt: 1,
      updatedAt: 1
    },
    category: {
      _id: 1,
      name: 1,
      description: 1,
      image: 1,
      subcategories: 1,
      createdAt: 1
    },
    user: {
      _id: 1,
      name: 1,
      email: 1,
      role: 1,
      createdAt: 1
    }
  };
  
  return projections[type] || {};
};

/**
 * Paginate query results
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} Skip and limit values for MongoDB
 */
const getPaginationParams = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  
  return {
    skip: (pageNum - 1) * limitNum,
    limit: limitNum,
    page: pageNum
  };
};

// ========== RESPONSE COMPRESSION ==========

/**
 * Compress response data by removing unnecessary fields
 * @param {Array|Object} data - Data to compress
 * @param {string} type - Data type
 * @returns {Array|Object} Compressed data
 */
const compressResponseData = (data, type = 'file') => {
  if (Array.isArray(data)) {
    return data.map(item => compressResponseData(item, type));
  }

  if (!data || typeof data !== 'object') return data;

  const fieldsToKeep = getOptimalProjection(type);
  if (Object.keys(fieldsToKeep).length === 0) return data;

  const compressed = {};
  Object.keys(fieldsToKeep).forEach(field => {
    if (field in data) {
      compressed[field] = data[field];
    }
  });

  return compressed;
};

// ========== PERFORMANCE METRICS ==========

/**
 * Track operation performance
 * @param {string} operationName - Name of operation
 * @returns {Object} Helper object with timing methods
 */
const createPerformanceTracker = (operationName) => {
  const startTime = Date.now();

  return {
    end: (metadata = {}) => {
      const duration = Date.now() - startTime;
      return {
        operation: operationName,
        duration,
        timestamp: new Date().toISOString(),
        ...metadata
      };
    },
    getDuration: () => Date.now() - startTime
  };
};

// ========== BATCH OPERATIONS OPTIMIZATION ==========

/**
 * Batch array into chunks for processing
 * @param {Array} array - Array to batch
 * @param {number} chunkSize - Size of each batch
 * @returns {Array} Array of chunks
 */
const batchArray = (array, chunkSize = 100) => {
  const batches = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    batches.push(array.slice(i, i + chunkSize));
  }
  return batches;
};

/**
 * Process large arrays with concurrency control
 * @param {Array} items - Items to process
 * @param {Function} processor - Async processor function
 * @param {number} concurrency - Number of concurrent operations
 * @returns {Promise} Resolved when all items processed
 */
const processWithConcurrency = async (items, processor, concurrency = 5) => {
  const results = [];
  const batches = batchArray(items, concurrency);

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
  }

  return results;
};

// ========== EXPORTS ==========

module.exports = {
  // Image optimization
  getOptimizedImageUrls,
  calculateOptimalDimensions,

  // Caching
  generateCacheKey,
  CACHE_TTL,

  // Query optimization
  getOptimalProjection,
  getPaginationParams,

  // Response compression
  compressResponseData,

  // Performance
  createPerformanceTracker,

  // Batch operations
  batchArray,
  processWithConcurrency
};
