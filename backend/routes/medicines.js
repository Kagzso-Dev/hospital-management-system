const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const db = require('../db/database');
const axios = require('axios');

const OPENFDA_URL = 'https://api.fda.gov/drug/label.json';

function normalizeFDA(drug) {
  const openfda = drug.openfda || {};
  return {
    name: (openfda.brand_name && openfda.brand_name[0]) || null,
    generic_name: (openfda.generic_name && openfda.generic_name[0]) || null,
    usage: (drug.indications_and_usage && drug.indications_and_usage[0]) || null,
    side_effects: (drug.adverse_reactions && drug.adverse_reactions[0]) || null,
    warnings: (drug.warnings && drug.warnings[0]) || null,
  };
}

// Medicines are a shared catalog — no tenant filtering on search (shared knowledge)
router.get('/', tenantAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      const [rows] = await db.query('SELECT name, generic_name, category, default_dosage FROM medicines ORDER BY name LIMIT 10');
      return res.json(rows);
    }

    const [localRows] = await db.query(
      'SELECT name, generic_name, category, default_dosage FROM medicines WHERE name LIKE ? ORDER BY name LIMIT 10',
      [`%${q}%`]
    );

    if (localRows.length >= 8) return res.json(localRows);

    try {
      const fdaRes = await axios.get(OPENFDA_URL, {
        params: { search: `openfda.brand_name:"${q}"`, limit: 10 },
        timeout: 2000,
      });
      const fdaResults = (fdaRes.data.results || [])
        .map((d) => ({
          name: d.openfda?.brand_name ? d.openfda.brand_name[0] : null,
          generic_name: d.openfda?.generic_name ? d.openfda.generic_name[0] : null,
          category: 'FDA Result',
          is_external: true,
        }))
        .filter((d) => d.name && !localRows.find((l) => l.name.toLowerCase() === d.name.toLowerCase()));
      return res.json([...localRows, ...fdaResults].slice(0, 10));
    } catch {
      return res.json(localRows);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to search medicines' });
  }
});

router.get('/details', tenantAuth, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const [local] = await db.query('SELECT * FROM medicines WHERE name = ?', [name]);
    if (local.length > 0 && local[0].usage_info) {
      const m = local[0];
      return res.json({ name: m.name, generic_name: m.generic_name, usage: m.usage_info, side_effects: m.side_effects, warnings: m.warnings });
    }

    try {
      const fdaRes = await axios.get(OPENFDA_URL, {
        params: { search: `openfda.brand_name:"${name}"`, limit: 1 },
        timeout: 3000,
      });
      if (fdaRes.data.results && fdaRes.data.results.length > 0) {
        const normalized = normalizeFDA(fdaRes.data.results[0]);
        if (local.length > 0) {
          await db.execute(
            'UPDATE medicines SET generic_name=?, usage_info=?, side_effects=?, warnings=? WHERE name=?',
            [normalized.generic_name, normalized.usage, normalized.side_effects, normalized.warnings, name]
          );
        } else {
          await db.execute(
            'INSERT INTO medicines (tenant_id, name, generic_name, usage_info, side_effects, warnings, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.tenantId, normalized.name || name, normalized.generic_name, normalized.usage, normalized.side_effects, normalized.warnings, 'FDA Cached']
          );
        }
        return res.json(normalized);
      }
    } catch {
      // fall through
    }

    res.json({
      name: local.length > 0 ? local[0].name : name,
      generic_name: local.length > 0 ? local[0].generic_name : null,
      usage: null, side_effects: null, warnings: null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicine details' });
  }
});

module.exports = router;
