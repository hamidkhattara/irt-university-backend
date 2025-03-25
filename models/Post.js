const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  title_ar: String,
  content_ar: String,
  page: String,
  section: String,
  imageId: mongoose.Schema.Types.ObjectId, // Store GridFS file ID
  video: String,
  pdfId: mongoose.Schema.Types.ObjectId, // Store GridFS file ID
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);