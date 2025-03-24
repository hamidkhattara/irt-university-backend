const mongoose = require('mongoose');

const researchSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  title_ar: { type: String, required: true },
  description_ar: { type: String, required: true },
  section: { type: String, required: true },
  imageUrl: { type: String }, // Image URL
  video: { type: String }, // YouTube video link
  pdfUrl: { type: String }, // PDF URL
}, { timestamps: true });

module.exports = mongoose.model('Research', researchSchema);