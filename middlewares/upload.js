const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');

// Configure storage
const storage = new GridFsStorage({
  db: mongoose.connection,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: async (req, file) => {
    // Define allowed file types
    const allowedTypes = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf'
    };
    
    // Validate file type
    if (!allowedTypes[file.mimetype]) {
      throw new Error('Only JPEG, PNG, WebP, and PDF files are allowed');
    }

    return {
      filename: `${Date.now()}-${Math.round(Math.random() * 1E9)}.${allowedTypes[file.mimetype]}`,
      bucketName: 'uploads',
      metadata: {
        originalName: file.originalname,
        uploadDate: new Date(),
        contentType: file.mimetype,
        uploadedBy: req.user?._id || 'system'
      }
    };
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only images and PDFs are allowed'), false);
  }
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  limits: { 
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 2
  },
  fileFilter
});

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large',
        message: 'Maximum file size is 25MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files',
        message: 'Maximum 2 files allowed per upload'
      });
    }
    return res.status(400).json({ 
      error: 'Upload error',
      message: err.message
    });
  } else if (err) {
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        message: err.message
      });
    }
    if (err.message.includes('Database not connected')) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Database connection error'
      });
    }
    next(err);
  } else {
    next();
  }
};

module.exports = { upload, handleUploadErrors };