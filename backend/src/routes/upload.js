const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage configuration with unique timestamped filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// Abuse protection: file type validation & size limit (25MB)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, MP4, and WEBM files are accepted.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max
  },
  fileFilter
});

/**
 * @route   POST /api/upload
 * @desc    Upload photo or video attachment (single or multiple)
 */
router.post('/', (req, res) => {
  upload.array('media', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File too large. Maximum size is 25MB.' });
      }
      return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No media files uploaded.' });
    }

    const host = req.get('host');
    const protocol = req.protocol;

    const urls = req.files.map(file => {
      return `${protocol}://${host}/uploads/${file.filename}`;
    });

    return res.status(200).json({
      success: true,
      message: `${req.files.length} file(s) uploaded successfully.`,
      media_urls: urls
    });
  });
});

module.exports = router;
