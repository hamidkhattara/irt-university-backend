// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/contactController');

router.post('/', sendMessage); // This means POST to /api/contact will work

module.exports = router;
