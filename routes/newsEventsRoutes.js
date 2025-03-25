const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/upload');  // ✅ Correct Import
const { createNewsEvent, getNewsEventsBySection } = require('../controllers/newsEventsController');

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createNewsEvent);
router.get('/:section', getNewsEventsBySection);

module.exports = router;