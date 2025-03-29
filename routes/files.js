const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();

// Helper function to validate file IDs
const isValidObjectId = (id) => {
  try {
    return mongoose.Types.ObjectId.isValid(id) && 
           new mongoose.Types.ObjectId(id).toString() === id;
  } catch (err) {
    return false;
  }
};

// Get file metadata
router.get('/meta/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    const conn = mongoose.connection;
    if (conn.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    const fileId = new mongoose.Types.ObjectId(id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    
    // Return metadata without the file content
    res.json({
      id: file._id,
      filename: file.filename,
      contentType: file.contentType,
      length: file.length,
      uploadDate: file.uploadDate,
      metadata: file.metadata
    });
  } catch (error) {
    console.error('File metadata error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get file content
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    const conn = mongoose.connection;
    if (conn.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    const fileId = new mongoose.Types.ObjectId(id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    
    // Set proper headers based on file type
    const headers = {
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000', // 1 year
      'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length'
    };

    // Special handling for PDFs
    if (file.contentType === 'application/pdf') {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(file.filename)}"`;
    }

    res.set(headers);

    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(404).json({ error: 'File not found' });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    const conn = mongoose.connection;
    if (conn.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    const fileId = new mongoose.Types.ObjectId(id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    await bucket.delete(fileId);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;