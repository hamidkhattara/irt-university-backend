const NewsEvent = require('../models/NewsEvent');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

// Helper function to delete files from GridFS
const deleteFileFromGridFS = async (fileId) => {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return;
  
  try {
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (err) {
    console.error(`Error deleting file ${fileId}:`, err);
  }
};

exports.getWebinarsWorkshops = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    
    const webinars = await NewsEvent.find({ type: 'webinar-workshop' })
      .sort({ startDate: -1 })
      .lean();

    const webinarsWithUrls = webinars.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(webinarsWithUrls);
  } catch (err) {
    console.error('Error fetching webinars:', err);
    res.status(500).json({ 
      error: 'Failed to fetch webinars',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    
    const events = await NewsEvent.find({ type: 'event' })
      .sort({ startDate: -1 })
      .lean();

    const eventsWithUrls = events.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(eventsWithUrls);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ 
      error: 'Failed to fetch events',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getPressReleases = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    
    const pressReleases = await NewsEvent.find({ type: 'press-release' })
      .sort({ createdAt: -1 })
      .lean();

    const pressWithUrls = pressReleases.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(pressWithUrls);
  } catch (err) {
    console.error('Error fetching press releases:', err);
    res.status(500).json({ 
      error: 'Failed to fetch press releases',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    
    const announcements = await NewsEvent.find({ type: 'announcement' })
      .sort({ createdAt: -1 })
      .lean();

    const announcementsWithUrls = announcements.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(announcementsWithUrls);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ 
      error: 'Failed to fetch announcements',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.createNewsEvent = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      title_ar, 
      description_ar, 
      type, 
      startDate, 
      endDate, 
      location, 
      video,
      isFeatured 
    } = req.body;

    const imageId = req.files?.image?.[0]?.id || null;
    const pdfId = req.files?.pdf?.[0]?.id || null;

    // Validate required fields
    if (!title || !description || !title_ar || !description_ar || !type) {
      // Clean up uploaded files if validation fails
      if (imageId) await deleteFileFromGridFS(imageId);
      if (pdfId) await deleteFileFromGridFS(pdfId);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate that either image or video is provided
    if (!imageId && !video) {
      if (imageId) await deleteFileFromGridFS(imageId);
      if (pdfId) await deleteFileFromGridFS(pdfId);
      return res.status(400).json({ error: 'Please provide either an image or a video' });
    }

    const newNewsEvent = new NewsEvent({ 
      title, 
      description, 
      title_ar, 
      description_ar, 
      type,
      startDate: type === 'event' || type === 'webinar-workshop' ? startDate : null,
      endDate: type === 'event' ? endDate : null,
      location: type === 'event' ? location : null,
      imageId, 
      video, 
      pdfId,
      isFeatured: isFeatured || false
    });

    const savedEvent = await newNewsEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    console.error('Error creating news/event:', err);
    // Clean up uploaded files on error
    if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
    if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
    res.status(500).json({ 
      error: 'Failed to create news/event',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updateNewsEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      title_ar, 
      description_ar, 
      type, 
      startDate, 
      endDate, 
      location, 
      video,
      isFeatured 
    } = req.body;

    const imageId = req.files?.image?.[0]?.id || null;
    const pdfId = req.files?.pdf?.[0]?.id || null;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const newsEvent = await NewsEvent.findById(id);
    if (!newsEvent) {
      return res.status(404).json({ error: 'News/Event not found' });
    }

    // Validate that either image or video exists after update
    if (!imageId && !video && !newsEvent.imageId && !newsEvent.video) {
      return res.status(400).json({ error: 'Please provide either an image or a video' });
    }

    // Store old file IDs for cleanup
    const oldImageId = newsEvent.imageId;
    const oldPdfId = newsEvent.pdfId;

    // Update fields
    newsEvent.title = title || newsEvent.title;
    newsEvent.description = description || newsEvent.description;
    newsEvent.title_ar = title_ar || newsEvent.title_ar;
    newsEvent.description_ar = description_ar || newsEvent.description_ar;
    newsEvent.type = type || newsEvent.type;
    newsEvent.startDate = type === 'event' || type === 'webinar-workshop' ? (startDate || newsEvent.startDate) : null;
    newsEvent.endDate = type === 'event' ? (endDate || newsEvent.endDate) : null;
    newsEvent.location = type === 'event' ? (location || newsEvent.location) : null;
    newsEvent.video = video !== undefined ? video : newsEvent.video;
    newsEvent.imageId = imageId || newsEvent.imageId;
    newsEvent.pdfId = pdfId || newsEvent.pdfId;
    newsEvent.isFeatured = isFeatured !== undefined ? isFeatured : newsEvent.isFeatured;

    await newsEvent.save();

    // Clean up old files if they were replaced
    if (imageId && oldImageId) await deleteFileFromGridFS(oldImageId);
    if (pdfId && oldPdfId) await deleteFileFromGridFS(oldPdfId);

    res.status(200).json(newsEvent);
  } catch (err) {
    console.error('Error updating news/event:', err);
    res.status(500).json({ 
      error: 'Failed to update news/event',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.deleteNewsEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const newsEvent = await NewsEvent.findByIdAndDelete(id);
    if (!newsEvent) {
      return res.status(404).json({ error: 'News/Event not found' });
    }

    // Delete associated files from GridFS
    const deletePromises = [];
    if (newsEvent.imageId) deletePromises.push(deleteFileFromGridFS(newsEvent.imageId));
    if (newsEvent.pdfId) deletePromises.push(deleteFileFromGridFS(newsEvent.pdfId));

    await Promise.all(deletePromises);

    res.status(200).json({ message: 'News/Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting news/event:', err);
    res.status(500).json({ 
      error: 'Failed to delete news/event',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getFeaturedNewsEvents = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    
    const featured = await NewsEvent.find({ isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const featuredWithUrls = featured.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(featuredWithUrls);
  } catch (err) {
    console.error('Error fetching featured news/events:', err);
    res.status(500).json({ 
      error: 'Failed to fetch featured items',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};