const router   = require('express').Router();
const axios    = require('axios');
const multer   = require('multer');
const FormData = require('form-data');
const Anthropic = require('@anthropic-ai/sdk');

const OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:5001';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

// ── Claude AI extraction prompt ───────────────────────────────────────────────
const EXTRACT_PROMPT = `You are an expert at reading Indian identity cards (Aadhaar, PAN, Voter ID, Driving Licence).
Extract the following fields from this card image and return ONLY a valid JSON object — no extra text, no markdown, no explanation.

Required JSON format:
{
  "name": "Full name exactly as printed on card",
  "age": "Numeric age as a string (calculate from DOB if age not printed directly)",
  "gender": "Male or Female or Other",
  "id_number": "The identity number (Aadhaar: format as XXXX XXXX XXXX, PAN: 10-char alphanumeric, Voter EPIC: 3 letters + 7 digits, DL: state code + digits)",
  "id_type": "aadhaar or pan or voter or dl",
  "address": "Full address as a single comma-separated string including PIN code"
}

Rules:
- If a field is not present or not readable, use null (not empty string).
- For Aadhaar: id_number must be formatted as "XXXX XXXX XXXX" (12 digits with spaces).
- For age: If only DOB is printed, calculate the current age. Today is ${new Date().toISOString().split('T')[0]}.
- For gender: return exactly "Male" or "Female" or "Other" — nothing else.
- name: use the person's name only, not father/husband name.
- address: combine all address lines into one string separated by commas, include PIN code.
- Return ONLY the raw JSON object, starting with { and ending with }.`;

// POST /api/ocr/extract-ai  — Claude Vision extraction
router.post('/extract-ai', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No image file provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(503).json({ success: false, error: 'ANTHROPIC_API_KEY not configured in .env' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const base64 = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        },
      ],
    });

    const raw = message.content[0]?.text?.trim() || '';

    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(422).json({ success: false, error: 'Claude returned non-JSON response', raw });
    }

    // Normalise nulls and types
    const data = {
      name:      parsed.name      || '',
      age:       parsed.age       ? String(parsed.age) : '',
      gender:    parsed.gender    || '',
      address:   parsed.address   || '',
      id_number: parsed.id_number || '',
      id_type:   parsed.id_type   || 'aadhaar',
    };

    res.json({ success: true, data });
  } catch (err) {
    const msg = err.message || 'Claude extraction failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/ocr/extract  — proxy to Python OCR service
router.post('/extract', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No image file provided' });

  try {
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename:    req.file.originalname || 'upload.jpg',
      contentType: req.file.mimetype,
    });

    const { data } = await axios.post(`${OCR_URL}/extract`, form, {
      headers: form.getHeaders(),
      timeout: 60_000,
    });

    res.json(data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'OCR service is not running.',
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
