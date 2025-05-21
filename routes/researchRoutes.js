const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const {
  createResearch,
  getAllResearch,
  getResearchBySection,
  updateResearch,
  deleteResearch
} = require('../controllers/researchController');

// Create new research
router.post(
  '/', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  createResearch
);

// Get all research
router.get('/', getAllResearch);

// Get research by section
router.get('/:section', getResearchBySection);

// Update research
router.put(
  '/:id', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  updateResearch
);

// Delete research
router.delete('/:id', deleteResearch);

module.exports = router;