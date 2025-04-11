// Add to all models (same structure as Post.js)
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  // ... other fields with same validation as Post.js ...
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtuals
schema.virtual('imageUrl').get(function() {
  return this.imageId ? `/api/files/${this.imageId}` : null;
});

schema.virtual('pdfUrl').get(function() {
  return this.pdfId ? `/api/files/${this.pdfId}` : null;
});

// Add indexes
schema.index({ section: 1 });
schema.index({ createdAt: -1 });

module.exports = mongoose.model('Program', schema);