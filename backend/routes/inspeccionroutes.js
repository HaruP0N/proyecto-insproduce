const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { verificarToken, esAdmin } = require('../middleware/auth');
const {
  actualizarInspeccionAdmin,
  generarPdfInspeccionAdmin
} = require('../controllers/inspeccionController');

// Historial: SOLO ADMIN
router.get('/historial', verificarToken, esAdmin, async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM inspecciones ORDER BY fecha_registro DESC');
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener historial' });
  }
});

// Detalle por ID: SOLO ADMIN
router.get('/:id', verificarToken, esAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ msg: 'ID inválido' });

  try {
    const result = await pool.query('SELECT * FROM inspecciones WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: 'Inspección no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener inspección' });
  }
});

// Editar: SOLO ADMIN (marca pdf_actualizado=false)
router.put('/:id', verificarToken, esAdmin, actualizarInspeccionAdmin);

// Generar PDF: SOLO ADMIN
router.post('/:id/generar-pdf', verificarToken, esAdmin, generarPdfInspeccionAdmin);

module.exports = router;
