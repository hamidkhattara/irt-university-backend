const Research = require('../models/Research');

exports.createResearch = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    if (!imageId && !video) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

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
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;
    const researchPosts = await Research.find().sort({ createdAt: -1 });
    
    const researchWithUrls = researchPosts.map(research => ({
      ...research.toObject(),
      imageUrl: research.imageId ? `${baseUrl}${research.imageId}` : null,
      pdfUrl: research.pdfId ? `${baseUrl}${research.pdfId}` : null,
    }));

    res.status(200).json(researchWithUrls);
  } catch (err) {
    console.error('Error fetching research:', err);
    res.status(500).json({ error: 'Failed to fetch research posts' });
  }
};

exports.updateResearch = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    const research = await Research.findById(id);
    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    // Update fields
    research.title = title || research.title;
    research.description = description || research.description;
    research.title_ar = title_ar || research.title_ar;
    research.description_ar = description_ar || research.description_ar;
    research.section = section || research.section;
    research.video = video || research.video;
    if (imageId) research.imageId = imageId;
    if (pdfId) research.pdfId = pdfId;

    await research.save();
    res.status(200).json(research);
  } catch (err) {
    console.error('Error updating research:', err);
    res.status(500).json({ error: 'Failed to update research' });
  }
};

exports.deleteResearch = async (req, res) => {
  try {
    const { id } = req.params;
    const research = await Research.findByIdAndDelete(id);
    
    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    // TODO: Add logic to delete associated files from GridFS
    res.status(200).json({ message: 'Research deleted successfully' });
  } catch (err) {
    console.error('Error deleting research:', err);
    res.status(500).json({ error: 'Failed to delete research' });
  }
};