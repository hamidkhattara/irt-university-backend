const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const { 
  createProgram, 
  getProgramsBySection, 
  updateProgram, 
  deleteProgram 
} = require('../controllers/programController');

router.post('/', 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  handleUploadErrors,
  createProgram
);

// Add section route
router.get('/:section', getProgramsBySection);

// Keep existing routes
router.put('/:id', 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  handleUploadErrors,
  updateProgram
);
router.delete('/:id', deleteProgram);

module.exports = router;