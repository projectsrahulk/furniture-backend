const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');

// Upload rate limiter (prevent abuse)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per 15 min
  message: 'Too many uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down',
});

module.exports = { uploadLimiter, apiLimiter };