exports.createNewsEvent = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    if (!ALLOWED_SECTIONS.NEWS_EVENTS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    if (!imageId && !video) {
      return res.status(400).json({ error: 'Please provide either an image or a video.' });
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
    console.error('Error creating news/event:', err);
    res.status(500).json({ error: 'Failed to create news/event post' });
  }
};

exports.getNewsEventsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    if (!ALLOWED_SECTIONS.NEWS_EVENTS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const newsEvents = await NewsEvent.find({ section }).sort({ createdAt: -1 });
    
    const newsEventsWithUrls = newsEvents.map(event => ({
      ...event.toObject(),
      imageUrl: event.imageId ? `${baseUrl}${event.imageId}` : null,
      pdfUrl: event.pdfId ? `${baseUrl}${event.pdfId}` : null,
    }));

    res.status(200).json(newsEventsWithUrls);
  } catch (err) {
    console.error('Error fetching news/events:', err);
    res.status(500).json({ error: 'Failed to fetch news/events' });
  }
};


exports.getNewsEventsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    const allowedSections = ['webinars-workshops', 'press-releases', 'announcements', 'events'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const newsEvents = await NewsEvent.find({ section }).sort({ createdAt: -1 });
    
    const newsEventsWithUrls = newsEvents.map(event => ({
      ...event.toObject(),
      imageUrl: event.imageId ? `${baseUrl}${event.imageId}` : null,
      pdfUrl: event.pdfId ? `${baseUrl}${event.pdfId}` : null,
    }));

    res.status(200).json(newsEventsWithUrls);
  } catch (err) {
    console.error('Error fetching news/events:', err);
    res.status(500).json({ error: 'Failed to fetch news/events' });
  }
};

exports.updateNewsEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    const allowedSections = ['webinars-workshops', 'press-releases', 'announcements', 'events'];
    if (section && !allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const event = await NewsEvent.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'News/Event not found' });
    }

    // Update fields
    event.title = title || event.title;
    event.description = description || event.description;
    event.title_ar = title_ar || event.title_ar;
    event.description_ar = description_ar || event.description_ar;
    if (section) event.section = section;
    event.video = video || event.video;
    if (imageId) event.imageId = imageId;
    if (pdfId) event.pdfId = pdfId;

    await event.save();
    res.status(200).json(event);
  } catch (err) {
    console.error('Error updating news/event:', err);
    res.status(500).json({ error: 'Failed to update news/event' });
  }
};

exports.deleteNewsEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await NewsEvent.findByIdAndDelete(id);
    
    if (!event) {
      return res.status(404).json({ error: 'News/Event not found' });
    }

    // TODO: Add logic to delete associated files from GridFS
    res.status(200).json({ message: 'News/Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting news/event:', err);
    res.status(500).json({ error: 'Failed to delete news/event' });
  }
};