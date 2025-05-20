const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const {
  getWebinarsWorkshops,
  getEvents,
  getPressReleases,
  getAnnouncements,
  createNewsEvent,
  updateNewsEvent,
  deleteNewsEvent,
  getFeaturedNewsEvents
} = require('../controllers/newsEventsController');

// Get all webinars and workshops
router.get('/webinars-workshops', getWebinarsWorkshops);

// Get all events
router.get('/events', getEvents);

// Get all press releases
router.get('/press-releases', getPressReleases);

// Get all announcements
router.get('/announcements', getAnnouncements);

// Get featured news and events
router.get('/featured', getFeaturedNewsEvents);

// Create new news/event
router.post(
  '/', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  createNewsEvent
);

// Update news/event
router.put(
  '/:id', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  updateNewsEvent
);

// Delete news/event
router.delete('/:id', deleteNewsEvent);

module.exports = router;