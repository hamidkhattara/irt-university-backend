const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { GridFSBucket } = require('mongodb');

// Get file by ID
router.get('/:id', async (req, res) => {
  try {
    const conn = mongoose.connection;
    const bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', () => {
      return res.status(404).send('File not found');
    });
    
    downloadStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

module.exports = router;