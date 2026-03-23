const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  cloudinaryId: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  size: Number,
  format: String,
  categoryId: {
    type: String,
    default: null
  },
  subcategoryId: {
    type: String,
    default: null
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
  deletedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);