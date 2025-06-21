const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();

// Enhanced ObjectID validation
const isValidObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  try {
    return new mongoose.Types.ObjectId(id).toString() === id;
  } catch {
    return false;
  }
};

// Middleware to check DB connection
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('Database connection not ready');
    return res.status(503).json({ error: 'Database service unavailable' });
  }
  next();
});

// Get file metadata
router.get('/meta/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Metadata request for file: ${id}`);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const fileId = new mongoose.Types.ObjectId(id);

    const cursor = bucket.find({ _id: fileId });
    const files = await cursor.toArray();

    if (!files.length) {
      console.log(`File not found: ${id}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const { _id, filename, contentType, length, uploadDate, metadata } = files[0];
    res.json({
      id: _id,
      filename,
      contentType,
      size: length,
      uploadDate,
      metadata
    });

  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get file content
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`File request for: ${id}`);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const bucket = new GridFSBucket(mongoose.connection.db, { 
      bucketName: 'uploads',
      chunkSizeBytes: 255 * 1024
    });

    const fileId = new mongoose.Types.ObjectId(id);
    const files = await bucket.find({ _id: fileId }).toArray();

    if (!files.length) {
      console.log(`File not found: ${id}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    console.log(`Serving file: ${file.filename} (${file.contentType})`);

    // Base headers for all files
    const headers = {
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000',
      'Accept-Ranges': 'bytes'
    };

    // Custom for PDFs
    if (file.contentType === 'application/pdf') {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(file.filename)}"`;
      // REMOVED: The problematic Content-Security-Policy header explicitly set here.
      // Helmet in server.js will now handle the CSP correctly for all files.
      headers['X-Content-Type-Options'] = 'nosniff';
      headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
      headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none'; // Required for PDF.js in some cases
    }

    // Images
    else if (file.contentType.startsWith('image/')) {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(file.filename)}"`;
    }

    // Default for other files
    else {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(file.filename)}"`;
    }

    res.set(headers);

    // Stream the file
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'File streaming failed' });
      }
    });

    downloadStream.pipe(res);


  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Delete request for file: ${id}`);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const fileId = new mongoose.Types.ObjectId(id);

    await bucket.delete(fileId);
    console.log(`File deleted: ${id}`);
    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;