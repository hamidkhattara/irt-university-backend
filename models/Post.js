const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  title_ar: {
    type: String,
    required: [true, 'Arabic title is required'],
    trim: true,
    maxlength: [200, 'Arabic title cannot exceed 200 characters']
  },
  content_ar: {
    type: String,
    required: [true, 'Arabic content is required'],
    trim: true
  },
  page: {
    type: String,
    enum: {
      values: ['research', 'programs', 'news'],
      message: 'Page must be either research, programs, or news'
    }
  },
  section: {
    type: String,
    validate: {
      validator: function(v) {
        if (!this.page) return true;
        const validSections = {
          research: ['latest-publications', 'ongoing-projects', 'collaborations-partnerships'],
          programs: ['innovation-labs', 'incubation-programs', 'funding-opportunities'],
          news: ['webinars-workshops', 'announcements', 'press-releases', 'events']
        };
        return validSections[this.page].includes(v);
      },
      message: 'Invalid section for this page'
    }
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uploads.files'
  },
  video: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(v);
      },
      message: 'Please provide a valid YouTube URL'
    }
  },
  pdfId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'uploads.files'
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Virtuals for file URLs
postSchema.virtual('imageUrl').get(function() {
  return this.imageId ? `/api/files/${this.imageId}` : null;
});

postSchema.virtual('pdfUrl').get(function() {
  return this.pdfId ? `/api/files/${this.pdfId}` : null;
});

// Indexes for better query performance
postSchema.index({ page: 1, section: 1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);