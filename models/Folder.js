const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameHindi: { type: String, default: '' }
}, { _id: true });

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nameHindi: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '📁'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  subcategories: [subcategorySchema]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Folder', folderSchema);