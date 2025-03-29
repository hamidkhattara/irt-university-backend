const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  title_ar: String,
  content_ar: String,
  page: String,
  section: String,
  imageId: mongoose.Schema.Types.ObjectId,
  video: String,
  pdfId: mongoose.Schema.Types.ObjectId,
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

postSchema.virtual('imageUrl').get(function() {
  return this.imageId ? `/api/files/${this.imageId}` : null;
});

postSchema.virtual('pdfUrl').get(function() {
  return this.pdfId ? `/api/files/${this.pdfId}` : null;
});

module.exports = mongoose.model('Post', postSchema);