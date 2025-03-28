const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const path = require('path');

const storage = new GridFsStorage({
  db: () => {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    return mongoose.connection;
  },
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: async (req, file) => {
    const allowedTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf'
    };
    
    if (!allowedTypes[file.mimetype]) {
      return Promise.reject(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }

    const fileExt = allowedTypes[file.mimetype];
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
    
    return {
      filename,
      bucketName: 'uploads',
      metadata: {
        originalName: file.originalname,
        uploadDate: new Date(),
        uploader: req.user?.id || 'anonymous',
        contentType: file.mimetype
      }
    };
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    next(err); // Pass the error to a global error handler
  } else {
    next();
  }
};

module.exports = { upload, handleUploadErrors };
