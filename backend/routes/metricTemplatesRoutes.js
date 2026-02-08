// backend/routes/metricTemplatesRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const { getActiveTemplateByCommodity } = require('../controllers/metricTemplatesController');

// Solo ADMIN (para editar métricas desde dashboard)
router.get('/:commodity', auth.verificarToken, auth.esAdmin, getActiveTemplateByCommodity);

module.exports = router;
