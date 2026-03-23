const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const File = require('../models/File');
const auth = require('../middleware/auth');

// Create new Category
router.post('/', auth, async function(req, res) {
  try {
    const folder = new Folder({
      name: req.body.name,
      nameHindi: req.body.nameHindi || '',
      icon: req.body.icon || '📁',
      user: req.userId,
      subcategories: req.body.subcategories || []
    });

    const savedFolder = await folder.save();
    return res.status(201).json({ success: true, data: savedFolder });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get all categories
router.get('/', auth, async function(req, res) {
  try {
    const folders = await Folder.find({
      user: req.userId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: folders });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get single category
router.get('/:id', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    return res.json({ success: true, data: folder });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET DELETE INFO (What will be affected)
router.get('/:id/delete-info', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Count files in this category
    const fileCount = await File.countDocuments({
      categoryId: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    // Count files in each subcategory
    const subcategoryInfo = [];
    for (const sub of folder.subcategories) {
      const subFileCount = await File.countDocuments({
        subcategoryId: sub._id.toString(),
        user: req.userId,
        isDeleted: false
      });
      subcategoryInfo.push({
        _id: sub._id,
        name: sub.name,
        fileCount: subFileCount
      });
    }

    return res.json({
      success: true,
      data: {
        category: {
          _id: folder._id,
          name: folder.name,
          icon: folder.icon
        },
        subcategoryCount: folder.subcategories.length,
        totalFileCount: fileCount,
        subcategories: subcategoryInfo
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ GET SUBCATEGORY DELETE INFO
router.get('/:id/subcategory/:subId/delete-info', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const subcategory = folder.subcategories.find(
      sub => sub._id.toString() === req.params.subId
    );

    if (!subcategory) {
      return res.status(404).json({ success: false, error: 'Subcategory not found' });
    }

    // Count files in this subcategory
    const fileCount = await File.countDocuments({
      subcategoryId: req.params.subId,
      user: req.userId,
      isDeleted: false
    });

    return res.json({
      success: true,
      data: {
        subcategory: {
          _id: subcategory._id,
          name: subcategory.name,
          nameHindi: subcategory.nameHindi
        },
        fileCount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Add subcategory
router.post('/:id/subcategory', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    folder.subcategories.push({
      name: req.body.name,
      nameHindi: req.body.nameHindi || ''
    });
    
    await folder.save();

    return res.status(201).json({ 
      success: true, 
      message: 'Subcategory added!',
      data: folder 
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Update category
router.put('/:id', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    if (req.body.name) folder.name = req.body.name;
    if (req.body.nameHindi !== undefined) folder.nameHindi = req.body.nameHindi;
    if (req.body.icon) folder.icon = req.body.icon;

    await folder.save();

    return res.json({ success: true, message: 'Category updated!', data: folder });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ DELETE CATEGORY (Cascade - moves all files to trash)
router.delete('/:id', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Move all files in this category to trash
    const trashedFiles = await File.updateMany(
      { 
        categoryId: req.params.id, 
        user: req.userId,
        isDeleted: false 
      },
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    );

    // Soft delete the category
    folder.isDeleted = true;
    await folder.save();

    return res.json({ 
      success: true, 
      message: 'Category deleted!',
      filesMovedToTrash: trashedFiles.modifiedCount
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ DELETE SUBCATEGORY (Cascade - moves files to trash)
router.delete('/:id/subcategory/:subId', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Move all files in this subcategory to trash
    const trashedFiles = await File.updateMany(
      { 
        subcategoryId: req.params.subId, 
        user: req.userId,
        isDeleted: false 
      },
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    );

    // Remove subcategory from array
    folder.subcategories = folder.subcategories.filter(
      sub => sub._id.toString() !== req.params.subId
    );
    
    await folder.save();

    return res.json({ 
      success: true, 
      message: 'Subcategory deleted!',
      filesMovedToTrash: trashedFiles.modifiedCount,
      data: folder 
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Update subcategory
router.put('/:id/subcategory/:subId', auth, async function(req, res) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.userId,
      isDeleted: false
    });

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const subIndex = folder.subcategories.findIndex(
      sub => sub._id.toString() === req.params.subId
    );

    if (subIndex === -1) {
      return res.status(404).json({ success: false, error: 'Subcategory not found' });
    }

    if (req.body.name) folder.subcategories[subIndex].name = req.body.name;
    if (req.body.nameHindi !== undefined) folder.subcategories[subIndex].nameHindi = req.body.nameHindi;
    
    await folder.save();

    return res.json({ success: true, message: 'Subcategory updated!', data: folder });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;