const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/upload');
const Post = require('../models/Post');

// Create a new post
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    const imageFile = req.files['image'] ? req.files['image'][0] : null;
    const pdfFile = req.files['pdf'] ? req.files['pdf'][0] : null;

    // Validate that either image or video is provided
    if (!imageFile && !video) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    const protocol = req.secure ? 'https' : 'http';
    const imageUrl = imageFile ? `${protocol}://${req.get('host')}/uploads/${imageFile.filename}` : '';
    const pdfUrl = pdfFile ? `${protocol}://${req.get('host')}/uploads/${pdfFile.filename}` : '';
    

    const newPost = new Post({
      title,
      content,
      title_ar,
      content_ar,
      page,
      section,
      imageUrl,
      video,
      pdfUrl,
    });

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

    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get a single post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(200).json(post);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Edit a post
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    const postId = req.params.id;
    const imageFile = req.files['image'] ? req.files['image'][0] : null;
    const pdfFile = req.files['pdf'] ? req.files['pdf'][0] : null;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Validate that either image or video is provided
    if (!imageFile && !video && !post.imageUrl) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.title_ar = title_ar || post.title_ar;
    post.content_ar = content_ar || post.content_ar;
    post.page = page || post.page;
    post.section = section || post.section;
    post.video = video || post.video;

    if (imageFile) {
      post.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${imageFile.filename}`;
    }

    if (pdfFile) {
      post.pdfUrl = `${req.protocol}://${req.get('host')}/uploads/${pdfFile.filename}`;
    }

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

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;