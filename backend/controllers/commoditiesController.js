const { pool } = require('../config/db');

exports.listCommodities = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, code, name
       FROM commodities
       WHERE active = TRUE
       ORDER BY id ASC`
    );
    res.json(r.rows);
  } catch (e) {
    console.error('listCommodities error:', e.message);
    res.status(500).json({ msg: 'Error al listar commodities' });
  }
};

exports.getActiveTemplateByCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ msg: 'Código inválido' });

    // 1) commodity
    const c = await pool.query(
      `SELECT id, code, name
       FROM commodities
       WHERE code = $1 AND active = TRUE
       LIMIT 1`,
      [code]
    );
    if (c.rows.length === 0) return res.status(404).json({ msg: 'Commodity no encontrado' });

    // 2) template activo
    const t = await pool.query(
      `SELECT id, name, version
       FROM metric_templates
       WHERE commodity_id = $1 AND active = TRUE
       ORDER BY version DESC
       LIMIT 1`,
      [c.rows[0].id]
    );
    if (t.rows.length === 0) {
      return res.status(404).json({ msg: `No hay template activo para ${code}` });
    }

    // 3) fields
    const f = await pool.query(
      `SELECT key, label, field_type, required, unit, min_value, max_value, options, order_index
       FROM metric_fields
       WHERE template_id = $1
       ORDER BY order_index ASC, id ASC`,
      [t.rows[0].id]
    );

    res.json({
      commodity: c.rows[0],
      template: t.rows[0],
      fields: f.rows
    });
  } catch (e) {
    console.error('getActiveTemplateByCode error:', e.message);
    res.status(500).json({ msg: 'Error al obtener template' });
  }
};
