const Research = require('../models/Research');

exports.createResearch = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    const newResearch = new Research({
      title,
      description,
      title_ar,
      description_ar,
      section,
      imageId,
      video,
      pdfId,
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