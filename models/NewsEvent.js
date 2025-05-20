// Add to all models (same structure as Post.js)
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  title_ar: {
    type: String,
    required: [true, 'Arabic title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description_ar: {
    type: String,
    required: [true, 'Arabic description is required']
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    enum: ['webinars-workshops', 'press-releases', 'announcements', 'events']
  },
  imageId: {
    type: String
  },
  pdfId: {
    type: String
  },
  video: {
    type: String
  }
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

module.exports = mongoose.model('NewsEvent', schema);