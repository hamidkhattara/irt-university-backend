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

router.post('/', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), 
  handleUploadErrors, 
  async (req, res) => {
    try {
      const { title, content, title_ar, content_ar, page, section, video } = req.body;
      
      if (!title || !content) {
        if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
        if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
        return res.status(400).json({ error: 'Title and content are required.' });
      }

      const imageId = req.files?.image?.[0]?.id || null;
      const pdfId = req.files?.pdf?.[0]?.id || null;

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
      res.status(201).json({ 
        message: 'Post created successfully', 
        post: savedPost 
      });
    } catch (err) {
      console.error('Error creating post:', err);
      if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
      if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
      res.status(500).json({ error: 'Failed to create post' });
    }
  }
);

router.get('/', async (req, res) => {
  try {
    const { page, section } = req.query;
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    const query = {};
    if (page) query.page = page;
    if (section) query.section = section;

    const posts = await Post.find(query).sort({ createdAt: -1 }).lean();

    const postsWithUrls = posts.map(post => ({
      ...post,
      imageUrl: post.imageId ? `${baseUrl}${post.imageId}` : null,
      pdfUrl: post.pdfId ? `${baseUrl}${post.pdfId}` : null
    }));

    res.status(200).json(postsWithUrls);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.put('/:id', 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]),
  handleUploadErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, title_ar, content_ar, page, section, video } = req.body;
      const imageId = req.files?.image?.[0]?.id || null;
      const pdfId = req.files?.pdf?.[0]?.id || null;

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!imageId && !video && !post.imageId && !post.video) {
        return res.status(400).json({ error: 'Please provide either an image or a video.' });
      }

      const oldImageId = post.imageId;
      const oldPdfId = post.pdfId;

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

      if (imageId && oldImageId) await deleteFileFromGridFS(oldImageId);
      if (pdfId && oldPdfId) await deleteFileFromGridFS(oldPdfId);

      res.status(200).json(post);
    } catch (err) {
      console.error('Error updating post:', err);
      res.status(500).json({ error: 'Failed to update post' });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = mongoose.connection;
    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });

    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const deleteFile = async (fileId) => {
      if (fileId) {
        try {
          await bucket.delete(new mongoose.Types.ObjectId(fileId));
        } catch (error) {
          console.error(`Failed to delete file ${fileId}:`, error);
        }
      }
    };

    await deleteFile(post.imageId);
    await deleteFile(post.pdfId);

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;