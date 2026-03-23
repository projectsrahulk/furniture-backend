const express = require('express');
const router = express.Router();
const { upload, cloudinary } = require('../config/cloudinary');
const File = require('../models/File');
const auth = require('../middleware/auth');
const { cacheMiddleware, clearUserCache } = require('../config/cache');

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = new File({
      name: req.body.name || req.file.originalname,
      description: req.body.description || '',
      cloudinaryId: req.file.filename,
      url: req.file.path,
      thumbnailUrl: req.file.path.replace('/upload/', '/upload/c_thumb,w_200,h_200/'),
      size: req.file.size,
      format: req.file.format,
      categoryId: req.body.categoryId || null,
      subcategoryId: req.body.subcategoryId || null,
      user: req.userId
    });

    await file.save();
    await clearUserCache(req.userId);

    res.status(201).json({ success: true, data: file });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 4️⃣ SEARCH FILES
router.get('/', auth, cacheMiddleware(30), async (req, res) => {
  try {
    const { categoryId, subcategoryId, search } = req.query;
    
    let query = { 
      user: req.userId, 
      isDeleted: false 
    };

    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;
    
    // ✅ Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const files = await File.find(query).sort({ createdAt: -1 });

    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single file
router.get('/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    res.json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 3️⃣ EDIT FILE METADATA
router.put('/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    if (req.body.name) file.name = req.body.name;
    if (req.body.description !== undefined) file.description = req.body.description;
    if (req.body.categoryId) file.categoryId = req.body.categoryId;
    if (req.body.subcategoryId) file.subcategoryId = req.body.subcategoryId;

    await file.save();
    await clearUserCache(req.userId);

    res.json({ success: true, message: 'File updated!', data: file });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trash
router.get('/trash/list', auth, cacheMiddleware(30), async (req, res) => {
  try {
    const files = await File.find({
      user: req.userId,
      isDeleted: true
    }).sort({ deletedAt: -1 });

    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Move to trash
router.patch('/:id/trash', auth, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();
    await clearUserCache(req.userId);

    res.json({ success: true, message: 'File moved to trash', data: file });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restore from trash
router.patch('/:id/restore', auth, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    file.isDeleted = false;
    file.deletedAt = null;
    await file.save();
    await clearUserCache(req.userId);

    res.json({ success: true, message: 'File restored', data: file });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Permanent delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(file.cloudinaryId);

    // Delete from database
    await file.deleteOne();
    await clearUserCache(req.userId);

    res.json({ success: true, message: 'File permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;