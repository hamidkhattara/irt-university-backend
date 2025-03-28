const Post = require('../models/Post');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

// Fetch posts with optional filters
exports.getPostsByPageAndSection = async (req, res) => {
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
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    const imageId = req.files?.image?.[0]?.id || null;
    const pdfId = req.files?.pdf?.[0]?.id || null;

    if (!imageId && !video) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    const newPost = new Post({
      title, content, title_ar, content_ar, page, section, imageId, video, pdfId
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Update an existing post
exports.updatePost = async (req, res) => {
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
    res.status(200).json(post);
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

// Delete a post and remove associated files from GridFS
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const conn = mongoose.connection;
    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });

    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete associated files from GridFS if they exist
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
};
