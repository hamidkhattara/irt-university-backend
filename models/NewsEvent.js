const mongoose = require('mongoose');

const newsEventSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: {
      values: ['webinar-workshop', 'event', 'press-release', 'announcement'],
      message: 'Type must be webinar-workshop, event, press-release, or announcement'
    },
    required: [true, 'Type is required']
  },
  startDate: {
    type: Date,
    required: function() {
      return this.type === 'event' || this.type === 'webinar-workshop';
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (this.type === 'event' && !v) return false;
        if (v && this.startDate && v < this.startDate) return false;
        return true;
      },
      message: 'End date must be after start date'
    }
  },
  location: {
    type: String,
    required: function() {
      return this.type === 'event';
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
  },
  isFeatured: {
    type: Boolean,
    default: false
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
newsEventSchema.virtual('imageUrl').get(function() {
  return this.imageId ? `/api/files/${this.imageId}` : null;
});

newsEventSchema.virtual('pdfUrl').get(function() {
  return this.pdfId ? `/api/files/${this.pdfId}` : null;
});

// Indexes for better query performance
newsEventSchema.index({ type: 1 });
newsEventSchema.index({ startDate: -1 });
newsEventSchema.index({ isFeatured: 1 });

module.exports = mongoose.model('NewsEvent', newsEventSchema);