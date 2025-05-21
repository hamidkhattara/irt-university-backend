const Program = require('../models/Program');
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

exports.createProgram = async (req, res) => {
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

    const newProgram = new Program({ 
      title, 
      description, 
      title_ar, 
      description_ar, 
      section,
      imageId, 
      video, 
      pdfId
    });

    const savedProgram = await newProgram.save();
    res.status(201).json(savedProgram);
  } catch (err) {
    console.error('Error creating program:', err);
    // Clean up uploaded files on error
    if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
    if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
    res.status(500).json({ 
      error: 'Failed to create program',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getProgramsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    const allowedSections = ['innovation-labs', 'incubation-programs', 'funding-opportunities'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const programs = await Program.find({ section })
      .sort({ createdAt: -1 })
      .lean();

    const programsWithUrls = programs.map(item => ({
      ...item,
      imageUrl: item.imageId ? `${baseUrl}${item.imageId}` : null,
      pdfUrl: item.pdfId ? `${baseUrl}${item.pdfId}` : null
    }));

    res.status(200).json(programsWithUrls);
  } catch (err) {
    console.error('Error fetching programs:', err);
    res.status(500).json({ 
      error: 'Failed to fetch programs',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updateProgram = async (req, res) => {
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

    const program = await Program.findById(id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Validate that either image or video exists after update
    if (!imageId && !video && !program.imageId && !program.video) {
      return res.status(400).json({ error: 'Please provide either an image or a video' });
    }

    // Store old file IDs for cleanup
    const oldImageId = program.imageId;
    const oldPdfId = program.pdfId;

    // Update fields
    program.title = title || program.title;
    program.description = description || program.description;
    program.title_ar = title_ar || program.title_ar;
    program.description_ar = description_ar || program.description_ar;
    program.section = section || program.section;
    program.video = video !== undefined ? video : program.video;
    program.imageId = imageId || program.imageId;
    program.pdfId = pdfId || program.pdfId;

    await program.save();

    // Clean up old files if they were replaced
    if (imageId && oldImageId) await deleteFileFromGridFS(oldImageId);
    if (pdfId && oldPdfId) await deleteFileFromGridFS(oldPdfId);

    res.status(200).json(program);
  } catch (err) {
    console.error('Error updating program:', err);
    res.status(500).json({ 
      error: 'Failed to update program',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const program = await Program.findByIdAndDelete(id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Delete associated files from GridFS
    const deletePromises = [];
    if (program.imageId) deletePromises.push(deleteFileFromGridFS(program.imageId));
    if (program.pdfId) deletePromises.push(deleteFileFromGridFS(program.pdfId));

    await Promise.all(deletePromises);

    res.status(200).json({ message: 'Program deleted successfully' });
  } catch (err) {
    console.error('Error deleting program:', err);
    res.status(500).json({ 
      error: 'Failed to delete program',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};