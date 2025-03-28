const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();
const { upload, handleUploadErrors } = require('../middlewares/upload');
const Post = require('../models/Post');

// Helper function to delete files from GridFS
const deleteFileFromGridFS = async (fileId) => {
  if (!fileId) return;
  try {
    const conn = mongoose.connection;
    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (err) {
    console.error(`Error deleting file ${fileId}:`, err);
  }
};

// Create a new post
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), handleUploadErrors, async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });

    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    if (!imageId && !video) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    const newPost = new Post({ title, content, title_ar, content_ar, page, section, imageId, video, pdfId });
    await newPost.save();

    res.status(201).json({ message: 'Post created successfully', post: newPost });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Something went wrong while creating the post' });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const { page, section } = req.query;
    const query = {};
    if (page) query.page = page;
    if (section) query.section = section;

    const posts = await Post.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get a single post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.status(200).json(post);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Edit a post
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), handleUploadErrors, async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    if (!imageId && !video && !post.imageId) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    // Delete old files if new ones are uploaded
    if (imageId && post.imageId) await deleteFileFromGridFS(post.imageId);
    if (pdfId && post.pdfId) await deleteFileFromGridFS(post.pdfId);

    post.title = title || post.title;
    post.content = content || post.content;
    post.title_ar = title_ar || post.title_ar;
    post.content_ar = content_ar || post.content_ar;
    post.page = page || post.page;
    post.section = section || post.section;
    post.video = video || post.video;
    if (imageId) post.imageId = imageId;
    if (pdfId) post.pdfId = pdfId;

    await post.save();
    res.status(200).json({ message: 'Post updated successfully', post });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Something went wrong while updating the post' });
  }
});

// Delete a post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Delete associated image and pdf
    await deleteFileFromGridFS(post.imageId);
    await deleteFileFromGridFS(post.pdfId);

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
