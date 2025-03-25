const multer = require('multer');
const path = require('path');

// Define storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder to save uploaded files
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + path.parse(file.originalname).name + path.extname(file.originalname).toLowerCase();
    cb(null, uniqueName);
  },
});

// Filter file types (images and PDFs)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/i;
  const extname = path.extname(file.originalname).toLowerCase();
  
  // Check extension first
  if (!allowedTypes.test(extname)) {
    return cb(new Error('Only image (jpeg, jpg, png, webp) and PDF files are allowed!'), false);
  }

  // Then check MIME type more flexibly
  if (extname === '.pdf') {
    if (!file.mimetype.startsWith('application/pdf') && !file.mimetype.startsWith('application/x-pdf')) {
      return cb(new Error('Invalid PDF file type!'), false);
    }
  } else { // It's an image
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Invalid image file type!'), false);
    }
  }

  cb(null, true);
};

// Export multer middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 1 // If you want to limit number of files
  },
});

module.exports = upload;