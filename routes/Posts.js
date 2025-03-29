const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const Post = require('../models/Post');

// Helper function to delete files from GridFS
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

// Validation schemas
const validPages = ['research', 'programs', 'news'];
const validSections = {
  research: ['latest-publications', 'ongoing-projects', 'collaborations-partnerships'],
  programs: ['innovation-labs', 'incubation-programs', 'funding-opportunities'],
  news: ['webinars-workshops', 'announcements', 'press-releases', 'events']
};

// Get posts with filtering
router.get('/', async (req, res) => {
  try {
    const { page, section } = req.query;
    
    // Validate page parameter if provided
    if (page && !validPages.includes(page)) {
      return res.status(400).json({ error: 'Invalid page parameter' });
    }

    // Validate section if page is provided
    if (section && page && validSections[page] && !validSections[page].includes(section)) {
      return res.status(400).json({ error: 'Invalid section for this page' });
    }

    const query = {};
    if (page) query.page = page;
    if (section) query.section = section;

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(5000); // Add query timeout

    // Generate proper URLs
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    const postsWithUrls = posts.map(post => ({
      ...post,
      imageUrl: post.imageId ? `${baseUrl}${post.imageId}` : null,
      pdfUrl: post.pdfId ? `${baseUrl}${post.pdfId}` : null
    }));

    res.json(postsWithUrls);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ 
      error: 'Failed to fetch posts',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Create new post
router.post('/', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), 
  handleUploadErrors, 
  async (req, res) => {
    try {
      const { title, content, title_ar, content_ar, page, section, video } = req.body;
      
      // Validate required fields
      if (!title || !content) {
        // Clean up uploaded files if validation fails
        if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
        if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
        return res.status(400).json({ error: 'Title and content are required.' });
      }

      // Validate page and section if provided
      if (page && !validPages.includes(page)) {
        return res.status(400).json({ error: 'Invalid page parameter' });
      }
      if (section && page && validSections[page] && !validSections[page].includes(section)) {
        return res.status(400).json({ error: 'Invalid section for this page' });
      }

      const imageId = req.files?.image?.[0]?.id || null;
      const pdfId = req.files?.pdf?.[0]?.id || null;

      // Validate that either image or video is provided
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

      const savedPost = await newPost.save();
      res.status(201).json(savedPost);
    } catch (err) {
      console.error('Error creating post:', err);
      // Clean up uploaded files on error
      if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
      if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
      res.status(500).json({ 
        error: 'Failed to create post',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

// Update post
router.put('/:id', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, title_ar, content_ar, page, section, video } = req.body;
      const imageId = req.files?.image?.[0]?.id || null;
      const pdfId = req.files?.pdf?.[0]?.id || null;

      // Validate post ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Validate that either image or video exists after update
      if (!imageId && !video && !post.imageId && !post.video) {
        return res.status(400).json({ error: 'Please provide either an image or a video.' });
      }

      // Store old file IDs for cleanup
      const oldImageId = post.imageId;
      const oldPdfId = post.pdfId;

      // Update post fields
      Object.assign(post, {
        title: title || post.title,
        content: content || post.content,
        title_ar: title_ar || post.title_ar,
        content_ar: content_ar || post.content_ar,
        page: page || post.page,
        section: section || post.section,
        video: video !== undefined ? video : post.video,
        imageId: imageId || post.imageId,
        pdfId: pdfId || post.pdfId
      });

      await post.save();

      // Clean up old files if they were replaced
      if (imageId && oldImageId) await deleteFileFromGridFS(oldImageId);
      if (pdfId && oldPdfId) await deleteFileFromGridFS(oldPdfId);

      res.json(post);
    } catch (err) {
      console.error('Error updating post:', err);
      res.status(500).json({ 
        error: 'Failed to update post',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const conn = mongoose.connection;
    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });

    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete associated files from GridFS
    const deletePromises = [];
    if (post.imageId) deletePromises.push(deleteFileFromGridFS(post.imageId));
    if (post.pdfId) deletePromises.push(deleteFileFromGridFS(post.pdfId));

    await Promise.all(deletePromises);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ 
      error: 'Failed to delete post',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;