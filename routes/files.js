const express = require('express');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const conn = mongoose.connection;
    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const file = await bucket.find({ _id: fileId }).toArray();

    if (!file || file.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.set("Content-Type", file[0].contentType); // Set correct MIME type
    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      return res.status(500).json({ error: 'File streaming failed' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
