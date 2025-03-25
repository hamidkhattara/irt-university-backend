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

// Multer configuration for exactly one image and one PDF
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
}).fields([
  { name: 'image', maxCount: 1 },  // Only 1 image
  { name: 'pdf', maxCount: 1 }     // Only 1 PDF
]);

// Middleware to handle errors properly
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = uploadMiddleware;
