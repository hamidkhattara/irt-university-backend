const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');

// Create storage engine
const storage = new GridFsStorage({
  db: mongoose.connection, // Use existing mongoose connection
  file: (req, file) => {
    return new Promise((resolve) => {
      const fileInfo = {
        filename: `${Date.now()}-${file.originalname}`,
        bucketName: 'uploads' // This will be your GridFS collection name
      };
      resolve(fileInfo);
    });
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;