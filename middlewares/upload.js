const multer = require('multer');
const path = require('path');

// Define storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder to save uploaded files
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

// Filter file types (images and PDFs)
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedPdfTypes = /pdf/;

  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  // Check if the file is an image
  if (allowedImageTypes.test(extname)) {
    if (allowedImageTypes.test(mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid image file type!'), false);
    }
  }
  // Check if the file is a PDF
  else if (allowedPdfTypes.test(extname)) {
    if (allowedPdfTypes.test(mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid PDF file type!'), false);
    }
  }
  // Reject all other file types
  else {
    cb(new Error('Only image (jpeg, jpg, png, webp) and PDF files are allowed!'), false);
  }
};

// Export multer middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

module.exports = upload;