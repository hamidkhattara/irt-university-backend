const NewsEvent = require('../models/NewsEvent');

exports.createNewsEvent = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    const allowedSections = ['webinars-workshops', 'press-releases', 'announcements', 'events'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const newEvent = new NewsEvent({
      title,
      description,
      title_ar,
      description_ar,
      section,
      imageId,
      video,
      pdfId,
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create news/event post' });
  }
};

exports.getNewsEventsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const allowedSections = ['webinars-workshops', 'press-releases', 'announcements', 'events'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const newsEvents = await NewsEvent.find({ section }).sort({ createdAt: -1 });
    res.status(200).json(newsEvents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news/events' });
  }
};