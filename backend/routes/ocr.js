/**
 * routes/ocr.js
 * Proxies image uploads from the frontend to the Python OCR service.
 * This keeps the Python service internal (not directly exposed to browser).
 */
const router  = require('express').Router();
const axios   = require('axios');
const multer  = require('multer');
const FormData = require('form-data');

const OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:5001';

// Multer: memory storage, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// POST /api/ocr/extract  — accepts multipart image, proxies to Python
router.post('/extract', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file provided' });
  }

  try {
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename:    req.file.originalname || 'upload.jpg',
      contentType: req.file.mimetype,
    });

    const { data } = await axios.post(`${OCR_URL}/extract`, form, {
      headers: form.getHeaders(),
      timeout: 60_000,   // 60 s — first run model load is slow
    });

    res.json(data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'OCR service is not running. Start the Python service: cd ocr-service && python main.py',
        data: { name: '', dob: '', age: '', gender: '', aadhaar: '', address: '' },
      });
    }
    const status  = err.response?.status || 500;
    const message = err.response?.data?.detail || err.message || 'OCR extraction failed';
    res.status(status).json({ success: false, error: message });
  }
});

// GET /api/ocr/health
router.get('/health', async (req, res) => {
  try {
    const { data } = await axios.get(`${OCR_URL}/health`, { timeout: 5000 });
    res.json({ available: true, ...data });
  } catch {
    res.json({ available: false, error: 'OCR service offline' });
  }
});

module.exports = router;
