const Post = require('../models/Post');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

exports.getPostsByPageAndSection = async (req, res) => {
  try {
    const { page, section } = req.query;
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    // Validate page and section if provided
    const validPages = ['research', 'programs', 'news'];
    if (page && !validPages.includes(page)) {
      return res.status(400).json({ error: 'Invalid page parameter' });
    }

    const query = {};
    if (page) query.page = page;
    if (section) query.section = section;

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const postsWithUrls = posts.map(post => ({
      ...post,
      imageUrl: post.imageId ? `${baseUrl}${post.imageId}` : null,
      pdfUrl: post.pdfId ? `${baseUrl}${post.pdfId}` : null
    }));

    res.status(200).json(postsWithUrls);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ 
      error: 'Failed to fetch posts',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
exports.createPost = async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    const imageId = req.files?.image?.[0]?.id || null;
    const pdfId = req.files?.pdf?.[0]?.id || null;

    if (!imageId && !video) {
      // Clean up uploaded files if validation fails
      if (req.files?.image?.[0]?.id) await deleteFileFromGridFS(req.files.image[0].id);
      if (req.files?.pdf?.[0]?.id) await deleteFileFromGridFS(req.files.pdf[0].id);
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    const newPost = new Post({
      title, content, title_ar, content_ar, page, section, imageId, video, pdfId
    });

    const savedPost = await newPost.save();
    res.status(201).json({
      message: 'Post created successfully',
      post: savedPost
    });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

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

    // Clean up old files if they were replaced
    if (imageId && oldImageId) {
      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      await bucket.delete(new mongoose.Types.ObjectId(oldImageId));
    }
    if (pdfId && oldPdfId) {
      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      await bucket.delete(new mongoose.Types.ObjectId(oldPdfId));
    }

    res.status(200).json(post);
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

exports.deletePost = async (req, res) => {
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
};