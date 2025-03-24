const NewsEvent = require('../models/NewsEvent');

exports.createNewsEvent = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const image = req.files['image'] ? req.files['image'][0].filename : null;
    const pdf = req.files['pdf'] ? req.files['pdf'][0].filename : null;

    const allowedSections = ['webinars-workshops', 'press-releases', 'announcements', 'events'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    // Validate that either image or video is provided
    if (!image && !video) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
    }

    const newEvent = new NewsEvent({
      title,
      description,
      title_ar,
      description_ar,
      section,
      image,
      video,
      pdf,
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
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const newsEventsWithUrls = newsEvents.map(event => ({
      ...event.toObject(),
      imageUrl: event.image ? `${baseUrl}${event.image}` : null,
      pdfUrl: event.pdf ? `${baseUrl}${event.pdf}` : null,
    }));

    res.status(200).json(newsEventsWithUrls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news/events' });
  }
};