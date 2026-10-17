const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadToStorage, isConfigured } = require('../services/supabaseService');

const isVercel = Boolean(process.env.VERCEL);
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', '..', 'uploads');

// Ensure local directory exists for fallback mode
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Notice: Uploads directory setup:', err.message);
}

// In-memory storage for high performance & direct cloud streaming
const memoryStorage = multer.memoryStorage();

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
  storage: memoryStorage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max per file
  },
  fileFilter
});

/**
 * @route   POST /api/upload
 * @desc    Upload photo or video attachment (single or multiple)
 *          Stores permanently in Supabase Storage with local fallback
 */
router.post('/', (req, res) => {
  upload.array('media', 5)(req, res, async (err) => {
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

    try {
      let urls = [];

      if (isConfigured) {
        // Upload each file directly to Supabase Storage
        urls = await Promise.all(
          req.files.map(file => uploadToStorage(file.buffer, file.originalname, file.mimetype))
        );
      } else {
        // Fallback: save to local filesystem
        const host = req.get('host');
        const protocol = req.protocol;

        urls = req.files.map(file => {
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const filePath = path.join(UPLOADS_DIR, uniqueName);
          fs.writeFileSync(filePath, file.buffer);
          return `${protocol}://${host}/uploads/${uniqueName}`;
        });
      }

      return res.status(200).json({
        success: true,
        message: `${req.files.length} file(s) uploaded successfully.`,
        media_urls: urls
      });
    } catch (uploadError) {
      console.error('Error uploading media:', uploadError);
      return res.status(500).json({
        success: false,
        error: `Failed to upload media: ${uploadError.message}`
      });
    }
  });
});

module.exports = router;
