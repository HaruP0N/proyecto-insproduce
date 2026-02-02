// backend/controllers/metricTemplatesController.js
const { pool } = require('../config/db');

exports.getActiveTemplateByCommodity = async (req, res) => {
  try {
    const commodityCode = String(req.params.commodity || '').trim().toUpperCase();
    if (!commodityCode) return res.status(400).json({ msg: 'Commodity requerido' });

    // commodity
    const c = await pool.query(
      `SELECT id, code, name, active
       FROM commodities
       WHERE code = $1
       LIMIT 1`,
      [commodityCode]
    );
    const commodity = c.rows[0];
    if (!commodity || commodity.active !== true) {
      return res.status(404).json({ msg: 'Commodity inválido o inactivo' });
    }

    // template activo (último por updated/created)
    const t = await pool.query(
      `SELECT id, commodity_id, template_version, name, active, created_at
       FROM metric_templates
       WHERE commodity_id = $1 AND active = true
       ORDER BY template_version DESC, created_at DESC
       LIMIT 1`,
      [commodity.id]
    );
    const template = t.rows[0];
    if (!template) {
      return res.status(404).json({ msg: `No hay template activo para ${commodityCode}` });
    }

    // fields
    const f = await pool.query(
      `SELECT id, template_id, key, label, field_type, required, unit,
              min_value, max_value, options, order_index
       FROM metric_fields
       WHERE template_id = $1
       ORDER BY order_index ASC, id ASC`,
      [template.id]
    );

    // options viene como string JSON en tu tabla, lo parseamos si se puede
    const fields = (f.rows || []).map(row => {
      let options = [];
      try {
        if (row.options) options = JSON.parse(row.options);
      } catch {}
      return { ...row, options };
    });

    return res.json({
      commodity,
      template,
      fields
    });
  } catch (err) {
    console.error('getActiveTemplateByCommodity:', err);
    return res.status(500).json({ msg: 'Error al cargar template', detalle: err.message });
  }
};
