const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');

const storage = new GridFsStorage({
  db: mongoose.connection,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: async (req, file) => {
    const allowedTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf'
    };
    
    if (!allowedTypes[file.mimetype]) {
      throw new Error('Only JPEG, PNG, and PDF files are allowed');
    }

    return {
      filename: `${Date.now()}-${Math.round(Math.random() * 1E9)}.${allowedTypes[file.mimetype]}`,
      bucketName: 'uploads',
      metadata: {
        originalName: file.originalname,
        uploadDate: new Date(),
        contentType: file.mimetype
      }
    };
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 2
  },
  fileFilter
});

const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 10MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Maximum 2 files allowed' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.includes('Database not connected')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    next(err);
  } else {
    next();
  }
};

module.exports = { upload, handleUploadErrors };