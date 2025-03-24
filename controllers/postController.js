const Post = require('../models/Post');

exports.getPostsByPageAndSection = async (req, res) => {
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
};
