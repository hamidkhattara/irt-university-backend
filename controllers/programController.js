const Program = require('../models/Program');

exports.createProgram = async (req, res) => {
  try {
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    if (!title || !description || !title_ar || !description_ar || !section || (!imageId && !video)) {
      return res.status(400).json({ error: 'All fields including Arabic fields and either image or video are required' });
    }

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
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    const programs = await Program.find({ section }).sort({ createdAt: -1 });
    
    const programsWithUrls = programs.map(program => ({
      ...program.toObject(),
      imageUrl: program.imageId ? `${baseUrl}${program.imageId}` : null,
      pdfUrl: program.pdfId ? `${baseUrl}${program.pdfId}` : null,
    }));

    res.status(200).json(programsWithUrls);
  } catch (err) {
    console.error('Error fetching programs:', err);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, title_ar, description_ar, section, video } = req.body;
    const imageId = req.files['image'] ? req.files['image'][0].id : null;
    const pdfId = req.files['pdf'] ? req.files['pdf'][0].id : null;

    const program = await Program.findById(id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Update fields
    program.title = title || program.title;
    program.description = description || program.description;
    program.title_ar = title_ar || program.title_ar;
    program.description_ar = description_ar || program.description_ar;
    program.section = section || program.section;
    program.video = video || program.video;
    if (imageId) program.imageId = imageId;
    if (pdfId) program.pdfId = pdfId;

    await program.save();
    res.status(200).json(program);
  } catch (err) {
    console.error('Error updating program:', err);
    res.status(500).json({ error: 'Failed to update program' });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const program = await Program.findByIdAndDelete(id);
    
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // TODO: Add logic to delete associated files from GridFS
    res.status(200).json({ message: 'Program deleted successfully' });
  } catch (err) {
    console.error('Error deleting program:', err);
    res.status(500).json({ error: 'Failed to delete program' });
  }
};
exports.getProgramsBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}/api/files/`;

    const allowedSections = ['innovation-labs', 'incubation-programs', 'funding-opportunities'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section provided' });
    }

    const programs = await Program.find({ section }).sort({ createdAt: -1 });
    
    const programsWithUrls = programs.map(program => ({
      ...program.toObject(),
      imageUrl: program.imageId ? `${baseUrl}${program.imageId}` : null,
      pdfUrl: program.pdfId ? `${baseUrl}${program.pdfId}` : null,
    }));

    res.status(200).json(programsWithUrls);
  } catch (err) {
    console.error('Error fetching programs:', err);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};