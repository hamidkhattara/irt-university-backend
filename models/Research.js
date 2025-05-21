const mongoose = require('mongoose');

const researchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  title_ar: {
    type: String,
    required: [true, 'Arabic title is required'],
    trim: true,
    maxlength: [200, 'Arabic title cannot exceed 200 characters']
  },
  description_ar: {
    type: String,
    required: [true, 'Arabic description is required'],
    trim: true
  },
  section: {
    type: String,
    enum: {
      values: ['latest-publications', 'ongoing-projects', 'collaborations-partnerships'],
      message: 'Invalid section'
    },
    required: [true, 'Section is required']
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
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Virtuals for file URLs
researchSchema.virtual('imageUrl').get(function() {
  return this.imageId ? `/api/files/${this.imageId}` : null;
});

researchSchema.virtual('pdfUrl').get(function() {
  return this.pdfId ? `/api/files/${this.pdfId}` : null;
});

// Indexes for better query performance
researchSchema.index({ section: 1 });
researchSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Research', researchSchema);