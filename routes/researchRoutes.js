const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/upload');  // ✅ Correct Import
const { createResearch, getAllResearch } = require('../controllers/researchController');

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createResearch);
router.get('/', getAllResearch);

module.exports = router;