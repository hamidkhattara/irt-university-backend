const Research = require('../models/Research');

exports.createResearch = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageUrl = req.files['image'] ? `${req.protocol}://${req.get('host')}/uploads/${req.files['image'][0].filename}` : '';
    const pdfUrl = req.files['pdf'] ? `${req.protocol}://${req.get('host')}/uploads/${req.files['pdf'][0].filename}` : '';

    // Validate that either image or video is provided
    if (!imageUrl && !video) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    const newResearch = new Research({
      title,
      description,
      title_ar,
      description_ar,
      section,
      imageUrl,
      video,
      pdfUrl,
    });

    await newResearch.save();
    res.status(201).json(newResearch);
  } catch (err) {
    console.error('Error creating research:', err);
    res.status(500).json({ error: 'Failed to create research post' });
  }
};

exports.getAllResearch = async (req, res) => {
  try {
    const researchPosts = await Research.find().sort({ createdAt: -1 });
    res.status(200).json(researchPosts);
  } catch (err) {
    console.error('Error fetching research:', err);
    res.status(500).json({ error: 'Failed to fetch research posts' });
  }
};