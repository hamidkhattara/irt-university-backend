const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  title_ar: String,
  content_ar: String,
  page: String,
  section: String,
  imageUrl: String,
  video: String, // New field for video (YouTube link)
  pdfUrl: String, // New field for PDF file
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);