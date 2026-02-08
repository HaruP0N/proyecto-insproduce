const express = require('express');
const router = express.Router();

const { query } = require('../config/db');
const { verificarToken, esAdmin } = require('../middleware/auth');

function safeJsonParse(s, fallback) {
  try {
    if (s === null || s === undefined) return fallback;
    if (typeof s === 'object') return s;
    return JSON.parse(String(s));
  } catch {
    return fallback;
  }
}

/**
 * GET /api/metric-templates/:commodityCode
 * Devuelve template activo (más reciente) y sus fields
 */
router.get('/:commodityCode', verificarToken, async (req, res) => {
  try {
    const commodityCode = String(req.params.commodityCode || '').trim().toUpperCase();
    if (!commodityCode) return res.status(400).json({ msg: 'commodityCode requerido' });

    const c = await query(
      `SELECT TOP 1 id, code, name, active
       FROM commodities
       WHERE code=@code AND active=1`,
      { code: commodityCode }
    );

    const commodity = c.recordset?.[0];
    if (!commodity) return res.status(404).json({ msg: 'Commodity no encontrada o inactiva' });

    const t = await query(
      `SELECT TOP 1 id, commodity_id, version, name, active, created_at
       FROM metric_templates
       WHERE commodity_id=@commodity_id AND active=1
       ORDER BY version DESC, id DESC`,
      { commodity_id: commodity.id }
    );

    const template = t.recordset?.[0];
    if (!template) return res.json({ commodity, template: null, fields: [] });

    const f = await query(
      `SELECT id, template_id, [key], label, field_type, required, unit,
              min_value, max_value, options, order_index
       FROM metric_fields
       WHERE template_id=@template_id
       ORDER BY order_index ASC, id ASC`,
      { template_id: template.id }
    );

    const fields = (f.recordset || []).map(row => ({
      ...row,
      options: safeJsonParse(row.options, []),
      required: !!row.required,
    }));

    return res.json({ commodity, template, fields });
  } catch (e) {
    console.error('[metricTemplatesRoutes] GET error:', e);
    return res.status(500).json({ msg: 'Error al obtener template' });
  }
});

/**
 * PUT /api/metric-templates/:templateId/fields
 * admin: reemplaza fields (borrado + insert)
 * body: { fields: [...] }
 */
router.put('/:templateId/fields', verificarToken, esAdmin, async (req, res) => {
  try {
    const templateId = Number(req.params.templateId);
    if (!templateId) return res.status(400).json({ msg: 'templateId inválido' });

    const fields = Array.isArray(req.body.fields) ? req.body.fields : [];
    if (!Array.isArray(fields)) return res.status(400).json({ msg: 'fields debe ser array' });

    await query(
      `DELETE FROM metric_fields WHERE template_id=@template_id`,
      { template_id: templateId }
    );

    for (const it of fields) {
      const key = String(it.key || it['key'] || '').trim();
      const label = String(it.label || '').trim();
      const field_type = String(it.field_type || '').trim();
      const required = !!it.required;
      const unit = it.unit !== undefined && it.unit !== null ? String(it.unit) : null;
      const min_value = it.min_value !== undefined && it.min_value !== null ? Number(it.min_value) : null;
      const max_value = it.max_value !== undefined && it.max_value !== null ? Number(it.max_value) : null;
      const options = JSON.stringify(Array.isArray(it.options) ? it.options : []);
      const order_index = it.order_index !== undefined ? Number(it.order_index) : 0;

      if (!key || !label || !field_type) continue;

      await query(
        `INSERT INTO metric_fields
          (template_id, [key], label, field_type, required, unit, min_value, max_value, options, order_index)
         VALUES
          (@template_id, @key, @label, @field_type, @required, @unit, @min_value, @max_value, @options, @order_index)`,
        {
          template_id: templateId,
          key,
          label,
          field_type,
          required,
          unit,
          min_value,
          max_value,
          options,
          order_index
        }
      );
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[metricTemplatesRoutes] PUT error:', e);
    return res.status(500).json({ msg: 'Error actualizando fields' });
  }
});

module.exports = router;
