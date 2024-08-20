const express = require('express');
const router = express.Router();
const multer = require('multer');

require('dotenv').config();

const uploadFileToMinio = require('../../utils/upload_file');

// Set up Multer for file handling
const storage = multer.memoryStorage()
const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  try{
    const upload_result = await uploadFileToMinio(req.file, req.user.id, req.get("host"));

    // Respond with the file URL
    res.status(201).json({ "fileUrl": upload_result.fileUrl, "uploadDate": upload_result.uploadDate });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;