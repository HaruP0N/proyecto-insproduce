// backend/controllers/templateController.js
const { pool } = require('../config/db');

// Obtener campos dinámicos de template por template_id
exports.obtenerCamposPorTemplate = async (req, res) => {
  const { templateId } = req.params;
  try {
    const query = `
      SELECT field_name, field_type, field_min, field_max, field_label
      FROM template_fields
      WHERE template_id = $1
      ORDER BY field_name
    `;
    const result = await pool.query(query, [templateId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Campos no encontrados para el template especificado' });
    }

    return res.json({ success: true, fields: result.rows });
  } catch (error) {
    console.error('Error al obtener campos de template:', error);
    return res.status(500).json({ msg: 'Error interno al obtener campos', detalle: error.message });
  }
};
