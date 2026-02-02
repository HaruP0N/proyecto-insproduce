// backend/routes/templateRoutes.js
const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

// Obtener campos de template por ID
router.get('/:templateId/fields', templateController.obtenerCamposPorTemplate);

module.exports = router;
