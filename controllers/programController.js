const Program = require('../models/Program');

exports.createProgram = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    const newProgram = new Program({
      title,
      description,
      title_ar,
      description_ar,
      section,
      imageId,
      video,
      pdfId,
    });

    await newProgram.save();
    res.status(201).json(newProgram);
  } catch (err) {
    console.error('Error creating program:', err);
    res.status(500).json({ error: 'Failed to create program post' });
  }
};

exports.getProgramsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const programs = await Program.find({ section }).sort({ createdAt: -1 });
    res.status(200).json(programs);
  } catch (err) {
    console.error('Error fetching programs:', err);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};