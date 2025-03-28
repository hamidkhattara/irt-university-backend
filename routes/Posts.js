const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const Post = require('../models/Post');

const deleteFileFromGridFS = async (fileId) => {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return;
  
  try {
    const conn = mongoose.connection;
    if (conn.readyState !== 1) {
      console.error('MongoDB connection not ready');
      return;
    }

    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (err) {
    console.error(`Error deleting file ${fileId}:`, err);
  }
};

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), handleUploadErrors, async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    
    if (!title || !content) {
      // Clean up uploaded files if validation fails
      if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
      if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const imageId = req.files['image']?.[0]?.id || null;
    const pdfId = req.files['pdf']?.[0]?.id || null;

    if (!imageId && !video) {
      if (imageId) await deleteFileFromGridFS(imageId);
      if (pdfId) await deleteFileFromGridFS(pdfId);
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    const newPost = new Post({ 
      title, 
      content, 
      title_ar, 
      content_ar, 
      page, 
      section, 
      imageId, 
      video, 
      pdfId 
    });

    await newPost.save();
    res.status(201).json({ message: 'Post created successfully', post: newPost });
  } catch (err) {
    console.error('Error creating post:', err);
    // Clean up uploaded files on error
    if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
    if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// [Keep all other routes the same as before]
module.exports = router;