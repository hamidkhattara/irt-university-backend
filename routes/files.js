const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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
    res.set({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'Accept-Ranges': 'bytes'
    });

    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ error: 'File not found' });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;