const Post = require('../models/Post');

exports.getPostsByPageAndSection = async (req, res) => {
  try {
    const { page, section } = req.query;
    const query = {};
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    if (page) query.page = page;
    if (section) query.section = section;

    const posts = await Post.find(query).sort({ createdAt: -1 });
    
    const postsWithUrls = posts.map(post => ({
      ...post.toObject(),
      imageUrl: post.imageId ? `${baseUrl}${post.imageId}` : null,
      pdfUrl: post.pdfId ? `${baseUrl}${post.pdfId}` : null
    }));

    res.status(200).json(postsWithUrls);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    if (!imageId && !video) {
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
    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, title_ar, content_ar, page, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Validate that either image or video is provided
    if (!imageId && !video && !post.imageId) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    // Update fields
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
    res.status(200).json(post);
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByIdAndDelete(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // TODO: Add logic to delete associated files from GridFS
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};