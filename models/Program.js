const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  title: String,
  description: String,
  title_ar: String,
  description_ar: String,
  section: String,
  imageId: mongoose.Schema.Types.ObjectId,
  video: String,
  pdfId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('Program', programSchema);