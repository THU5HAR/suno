import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { authenticateToken } from './auth.js';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure upload directory
const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../../uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow audio files, images, and other common types
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/json', 'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// All upload routes require authentication
router.use(authenticateToken);

// Upload single file
router.post('/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const assetId = uuidv4();

    // Save file metadata to database
    await dbRun(
      'INSERT INTO assets (id, user_id, type, url, filename, size, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        assetId,
        req.user.userId,
        req.file.mimetype.split('/')[0], // 'audio', 'image', etc.
        `/uploads/${req.file.filename}`,
        req.file.originalname,
        req.file.size,
        JSON.stringify({
          mimetype: req.file.mimetype,
          encoding: req.file.encoding
        })
      ]
    );

    res.status(201).json({
      id: assetId,
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });
  } catch (error) {
    next(error);
  }
});

// Upload multiple files
router.post('/files', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const assets = [];

    for (const file of req.files) {
      const assetId = uuidv4();
      
      await dbRun(
        'INSERT INTO assets (id, user_id, type, url, filename, size, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          assetId,
          req.user.userId,
          file.mimetype.split('/')[0],
          `/uploads/${file.filename}`,
          file.originalname,
          file.size,
          JSON.stringify({
            mimetype: file.mimetype,
            encoding: file.encoding
          })
        ]
      );

      assets.push({
        id: assetId,
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        size: file.size,
        type: file.mimetype
      });
    }

    res.status(201).json({ assets });
  } catch (error) {
    next(error);
  }
});

// Get user's assets
router.get('/assets', async (req, res, next) => {
  try {
    const assets = await dbAll(
      'SELECT id, type, url, filename, size, created_at FROM assets WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(assets);
  } catch (error) {
    next(error);
  }
});

// Delete asset
router.delete('/assets/:id', async (req, res, next) => {
  try {
    // Get asset info
    const asset = await dbGet(
      'SELECT * FROM assets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Delete from database
    await dbRun('DELETE FROM assets WHERE id = ?', [req.params.id]);

    // Optionally delete file from filesystem
    // (You might want to keep files for a grace period)
    
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

