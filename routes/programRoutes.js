const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const {
  createProgram,
  getProgramsBySection,
  updateProgram,
  deleteProgram
} = require('../controllers/programController');

// Create new program
router.post(
  '/', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  createProgram
);

// Get programs by section
router.get('/:section', getProgramsBySection);

// Update program
router.put(
  '/:id', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  updateProgram
);

// Delete program
router.delete('/:id', deleteProgram);

module.exports = router;