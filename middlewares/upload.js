const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure upload directory
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Only images (JPEG, JPG, PNG, WEBP) and PDF files are allowed!"));
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Middleware to format file URLs
const formatFileUrl = (req, res, next) => {
  if (req.file) {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    req.file.url = `${protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  }
  next();
};

module.exports = { upload, formatFileUrl };
