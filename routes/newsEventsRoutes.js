const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const { 
  createNewsEvent, 
  getNewsEventsBySection,
  updateNewsEvent, 
  deleteNewsEvent 
} = require('../controllers/newsEventsController');

router.post('/', 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  handleUploadErrors,
  createNewsEvent
);

router.get('/:section', getNewsEventsBySection);



// Keep existing routes
router.put('/:id', 
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  handleUploadErrors,
  updateNewsEvent
);
router.delete('/:id',deleteNewsEvent);

module.exports = router;