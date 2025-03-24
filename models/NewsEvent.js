const mongoose = require('mongoose');

const newsEventSchema = new mongoose.Schema({
  title: String,
  description: String,
  title_ar: String,
  description_ar: String,
  section: String,
  image: String, // Image file name
  video: String, // YouTube video link
  pdf: String, // PDF file name
}, { timestamps: true });

module.exports = mongoose.model('NewsEvent', newsEventSchema);