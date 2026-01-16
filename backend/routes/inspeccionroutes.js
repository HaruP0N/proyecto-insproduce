const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Ruta para obtener tareas asignadas (solo ejemplo, puedes agregar tu lógica)
router.get('/mis-tareas', async (req, res) => {
    try {
        res.json([]);  // Solo para evitar un error 404
    } catch (error) {
        res.status(500).json({ msg: "Error en servidor" });
    }
});

// Ruta para obtener el historial de inspecciones
router.get('/historial', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM inspecciones ORDER BY created_at DESC');
        res.json(resultado.rows);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener historial" });
    }
});

module.exports = router;
