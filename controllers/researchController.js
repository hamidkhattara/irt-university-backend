const Research = require('../models/Research');
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

exports.createResearch = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      title_ar, 
      description_ar, 
      section, 
      video 
    } = req.body;

    const imageId = req.files?.image?.[0]?.id || null;
    const pdfId = req.files?.pdf?.[0]?.id || null;

    // Validate required fields
    if (!title || !description || !title_ar || !description_ar || !section) {
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

    const newResearch = new Research({ 
      title, 
      description, 
      title_ar, 
      description_ar, 
      section,
      imageId, 
      video, 
      pdfId
    });

    const savedResearch = await newResearch.save();
    res.status(201).json(savedResearch);
  } catch (err) {
    console.error('Error creating research:', err);
    // Clean up uploaded files on error
    if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
    if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
    res.status(500).json({ 
      error: 'Failed to create research',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getAllResearch = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    
    const research = await Research.find()
      .sort({ createdAt: -1 })
      .lean();

    const researchWithUrls = research.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(researchWithUrls);
  } catch (err) {
    console.error('Error fetching all research:', err);
    res.status(500).json({ 
      error: 'Failed to fetch research',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getResearchBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    const allowedSections = ['latest-publications', 'ongoing-projects', 'collaborations-partnerships'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const research = await Research.find({ section })
      .sort({ createdAt: -1 })
      .lean();

    const researchWithUrls = research.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(researchWithUrls);
  } catch (err) {
    console.error('Error fetching research by section:', err);
    res.status(500).json({ 
      error: 'Failed to fetch research by section',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updateResearch = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      title_ar, 
      description_ar, 
      section, 
      video 
    } = req.body;

    const imageId = req.files?.image?.[0]?.id || null;
    const pdfId = req.files?.pdf?.[0]?.id || null;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const research = await Research.findById(id);
    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    // Validate that either image or video exists after update
    if (!imageId && !video && !research.imageId && !research.video) {
      return res.status(400).json({ error: 'Please provide either an image or a video' });
    }

    // Store old file IDs for cleanup
    const oldImageId = research.imageId;
    const oldPdfId = research.pdfId;

    // Update fields
    research.title = title || research.title;
    research.description = description || research.description;
    research.title_ar = title_ar || research.title_ar;
    research.description_ar = description_ar || research.description_ar;
    research.section = section || research.section;
    research.video = video !== undefined ? video : research.video;
    research.imageId = imageId || research.imageId;
    research.pdfId = pdfId || research.pdfId;

    await research.save();

    // Clean up old files if they were replaced
    if (imageId && oldImageId) await deleteFileFromGridFS(oldImageId);
    if (pdfId && oldPdfId) await deleteFileFromGridFS(oldPdfId);

    res.status(200).json(research);
  } catch (err) {
    console.error('Error updating research:', err);
    res.status(500).json({ 
      error: 'Failed to update research',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.deleteResearch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const research = await Research.findByIdAndDelete(id);
    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    // Delete associated files from GridFS
    const deletePromises = [];
    if (research.imageId) deletePromises.push(deleteFileFromGridFS(research.imageId));
    if (research.pdfId) deletePromises.push(deleteFileFromGridFS(research.pdfId));

    await Promise.all(deletePromises);

    res.status(200).json({ message: 'Research deleted successfully' });
  } catch (err) {
    console.error('Error deleting research:', err);
    res.status(500).json({ 
      error: 'Failed to delete research',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};