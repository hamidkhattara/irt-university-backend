const Program = require('../models/Program');

exports.createProgram = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const image = req.files['image'] ? req.files['image'][0].filename : null;
    const pdf = req.files['pdf'] ? req.files['pdf'][0].filename : null;

    if (!title || !description || !title_ar || !description_ar || !section || (!image && !video)) {
      return res.status(400).json({ error: 'All fields including Arabic fields and either image or video are required' });
    }

    const newProgram = new Program({
      title,
      description,
      title_ar,
      description_ar,
      section,
      image,
      video,
      pdf,
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

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const programsWithUrls = programs.map(program => ({
      ...program.toObject(),
      imageUrl: program.image ? `${baseUrl}${program.image}` : null,
      pdfUrl: program.pdf ? `${baseUrl}${program.pdf}` : null,
    }));

    res.status(200).json(programsWithUrls);
  } catch (err) {
    console.error('Error fetching programs:', err);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};