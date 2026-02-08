const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { query } = require('../config/db');

function safeJsonParse(s, fallback) {
  try {
    if (s === null || s === undefined) return fallback;
    if (typeof s === 'object') return s;
    return JSON.parse(String(s));
  } catch {
    return fallback;
  }
}

// GET /api/commodities
router.get('/', verificarToken, async (req, res) => {
  try {
    const r = await query(
      `SELECT id, code, name
       FROM commodities
       WHERE active=1 AND code<>'CHERRY'
       ORDER BY name ASC`
    );
    return res.json(r.recordset);
  } catch (e) {
    console.error('commodities:', e);
    return res.status(500).json({ msg: 'Error al cargar commodities' });
  }
});

// GET /api/commodities/:code/template
router.get('/:code/template', verificarToken, async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();

    if (code === 'CHERRY') {
      return res.status(400).json({ msg: 'CHERRY deshabilitado' });
    }

    const c = await query(
      `SELECT TOP 1 id, code, name, active
       FROM commodities
       WHERE code=@code AND active=1`,
      { code }
    );
    const commodity = c.recordset[0];
    if (!commodity) return res.status(404).json({ msg: 'Commodity no existe o está inactivo' });

    const t = await query(
      `SELECT TOP 1 id, name, version
       FROM metric_templates
       WHERE commodity_id=@commodity_id AND active=1
       ORDER BY version DESC, id DESC`,
      { commodity_id: commodity.id }
    );
    const template = t.recordset[0];
    if (!template) return res.status(404).json({ msg: `No existe template activo para ${code}` });

    const f = await query(
      `SELECT [key], label, field_type, required, unit, min_value, max_value, options, order_index
       FROM metric_fields
       WHERE template_id=@template_id
       ORDER BY order_index ASC, id ASC`,
      { template_id: template.id }
    );

    const fields = f.recordset.map(row => ({
      ...row,
      required: !!row.required,
      options: safeJsonParse(row.options, [])
    }));

    return res.json({ commodity, template, fields });
  } catch (e) {
    console.error('commodities template:', e);
    return res.status(500).json({ msg: 'Error al cargar template' });
  }
});

module.exports = router;
