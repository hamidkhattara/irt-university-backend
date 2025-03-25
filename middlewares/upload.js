const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Define storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9-_\.]/g, '')}`;
    cb(null, uniqueName);
  },
});

// File filter function for images and PDFs
const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const isImage = file.mimetype.startsWith('image/');
  const isPDF = file.mimetype.startsWith('application/pdf');

  if ((isImage && ['.jpeg', '.jpg', '.png', '.webp'].includes(extname)) || (isPDF && extname === '.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only one image (jpeg, jpg, png, webp) and one PDF file are allowed!'), false);
  }
};

// Create and export the multer instance (DO NOT CALL .fields() HERE)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

module.exports = upload;
