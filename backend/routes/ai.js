const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PROMPTS = {
  consultation: `You are a medical assistant. Extract structured prescription data from the doctor's notes below.
Return ONLY valid JSON — no explanation, no markdown, just raw JSON.

Format:
{
  "diagnosis": "string (main diagnosis)",
  "medicines": [
    {
      "medicine_name": "string",
      "dosage": "string (e.g. 500mg, 5mg)",
      "morning": boolean,
      "afternoon": boolean,
      "night": boolean,
      "duration": number or null
    }
  ],
  "notes": "string (advice / additional instructions)"
}

Rules:
- OD / once daily      = morning:true,  afternoon:false, night:false
- BD / twice daily     = morning:true,  afternoon:false, night:true
- TID / three times    = morning:true,  afternoon:true,  night:true
- HS / at night only   = morning:false, afternoon:false, night:true
- duration is integer days, null if not mentioned
- Use "" for missing strings, false for missing booleans, null for missing duration`,

  patient: `You are a registration assistant. Extract patient details from the text below.
Return ONLY valid JSON — no explanation, no markdown, just raw JSON.

Format:
{
  "name": "string",
  "phone": "string (digits only)",
  "age": "string (just the number)",
  "gender": "Male or Female or Other",
  "address": "string"
}

Use "" for any missing fields. gender must be exactly Male, Female, or Other.`,
};

router.post('/extract', async (req, res) => {
  const { text, mode = 'consultation' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  const prompt = PROMPTS[mode] || PROMPTS.consultation;

  try {
    const completion = await client.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: `${prompt}\n\nNotes:\n${text}` }],
    });

    const raw   = completion.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Could not parse AI response', raw });

    res.json(JSON.parse(match[0]));
  } catch (err) {
    console.error('Groq extract error:', err.message);
    res.status(500).json({ error: err.message || 'AI extraction failed' });
  }
});

// POST /api/ai/read-handwriting  — Groq Vision reads canvas drawing
router.post('/read-handwriting', async (req, res) => {
  const { image } = req.body; // base64 PNG
  if (!image) return res.status(400).json({ error: 'No image provided' });

  try {
    const completion = await client.chat.completions.create({
      model:      'llama-3.2-11b-vision-preview',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${image}` } },
          { type: 'text',      text: 'Read the handwritten text in this image exactly as written. Return only the transcribed text, nothing else.' },
        ],
      }],
    });

    const text = completion.choices[0].message.content.trim();
    res.json({ text });
  } catch (err) {
    console.error('Handwriting read error:', err.message);
    res.status(500).json({ error: err.message || 'Could not read handwriting' });
  }
});

module.exports = router;
