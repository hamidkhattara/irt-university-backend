const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { createProgram, getProgramsBySection } = require('../controllers/programController');

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createProgram);
router.get('/:section', getProgramsBySection);

module.exports = router;