const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();

// Validate ObjectId before using it
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if ID is a proper MongoDB ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    const conn = mongoose.connection;
    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });

    const fileId = new mongoose.Types.ObjectId(id);
    const files = await bucket.find({ _id: fileId }).toArray();

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    res.set("Content-Type", file.contentType || "application/octet-stream"); // Fallback MIME type

    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      res.status(500).json({ error: 'File streaming failed' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
