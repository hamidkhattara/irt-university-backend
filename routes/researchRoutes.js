const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const { 
  createResearch, 
  getAllResearch,
  getResearchBySection, // Add this import
  updateResearch, 
  deleteResearch 
} = require('../controllers/researchController');

router.post('/', 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  handleUploadErrors,
  createResearch
);

// Add this route for section-based fetching
router.get('/:section', getResearchBySection);

// Keep existing routes
router.get('/', getAllResearch);
router.put('/:id', 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  handleUploadErrors,
  updateResearch
);
router.delete('/:id', deleteResearch);

module.exports = router;