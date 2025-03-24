const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  title_ar: { type: String, required: true },
  description_ar: { type: String, required: true },
  section: { type: String, required: true },
  image: { type: String }, // Image file name
  video: { type: String }, // YouTube video link
  pdf: { type: String }, // PDF file name
}, { timestamps: true });

module.exports = mongoose.model('Program', programSchema);