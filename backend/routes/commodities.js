// backend/routes/commodities.js
const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { pool } = require('../config/db');

// GET /api/commodities
router.get('/', verificarToken, async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT id, code, name
      FROM commodities
      WHERE active = TRUE
        AND code <> 'CHERRY'
      ORDER BY name ASC
      `
    );
    return res.json(r.rows);
  } catch (e) {
    console.error('commodities:', e);
    return res.status(500).json({ msg: 'Error al cargar commodities' });
  }
});

// GET /api/commodities/:code/template
router.get('/:code/template', verificarToken, async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();

    if (code === 'CHERRY') {
      return res.status(400).json({ msg: 'CHERRY deshabilitado' });
    }

    const c = await pool.query(
      `SELECT id, code, name FROM commodities WHERE code=$1 AND active=TRUE LIMIT 1`,
      [code]
    );
    const commodity = c.rows[0];
    if (!commodity) return res.status(404).json({ msg: 'Commodity no existe o está inactivo' });

    const t = await pool.query(
      `
      SELECT id, name, version
      FROM metric_templates
      WHERE commodity_id = $1 AND active = TRUE
      ORDER BY version DESC
      LIMIT 1
      `,
      [commodity.id]
    );
    const template = t.rows[0];
    if (!template) return res.status(404).json({ msg: `No existe template activo para ${code}` });

    const f = await pool.query(
      `
      SELECT key, label, field_type, required, unit, min_value, max_value, options, order_index
      FROM metric_fields
      WHERE template_id = $1
      ORDER BY order_index ASC
      `,
      [template.id]
    );

    return res.json({
      commodity,
      template,
      fields: f.rows.map(row => ({
        ...row,
        options: Array.isArray(row.options) ? row.options : (row.options || [])
      }))
    });
  } catch (e) {
    console.error('commodities template:', e);
    return res.status(500).json({ msg: 'Error al cargar template' });
  }
});

module.exports = router;
