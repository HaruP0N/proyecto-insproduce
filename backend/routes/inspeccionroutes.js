// backend/routes/inspeccionroutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const ctrl = require('../controllers/inspeccionControllerV2');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// -------------------------
// Validación fuerte de imports
// -------------------------
const verificarToken = auth.verificarToken;
const esAdmin = auth.esAdmin;

const crearInspeccionV2 = ctrl.crearInspeccionV2;
const obtenerHistorialV2 = ctrl.obtenerHistorialV2;
const obtenerDetalleV2 = ctrl.obtenerDetalleV2;
const actualizarInspeccionAdminV2 = ctrl.actualizarInspeccionAdminV2;
const actualizarMetricsAdminV2 = ctrl.actualizarMetricsAdminV2; // ✅ NUEVO
const generarPdfInspeccionAdminV2 = ctrl.generarPdfInspeccionAdminV2;

function assertFn(name, fn) {
  if (typeof fn !== 'function') {
    console.error(`[ROUTES] ${name} NO es función. Valor:`, fn);
    throw new Error(`[ROUTES] Import inválido: ${name} debe ser function`);
  }
}

assertFn('verificarToken', verificarToken);
assertFn('esAdmin', esAdmin);
assertFn('crearInspeccionV2', crearInspeccionV2);
assertFn('obtenerHistorialV2', obtenerHistorialV2);
assertFn('obtenerDetalleV2', obtenerDetalleV2);
assertFn('actualizarInspeccionAdminV2', actualizarInspeccionAdminV2);
assertFn('actualizarMetricsAdminV2', actualizarMetricsAdminV2); // ✅ NUEVO
assertFn('generarPdfInspeccionAdminV2', generarPdfInspeccionAdminV2);

// -------------------------
// Multer config
// -------------------------
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = String(file.originalname || 'file').replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({ storage });

const uploadFotosCompat = upload.fields([
  { name: 'fotos', maxCount: 20 },
  { name: 'imagenes', maxCount: 20 }
]);

function allowAdminOrInspector(req, res, next) {
  const role = req.user?.role;
  if (role === 'admin' || role === 'inspector') return next();
  return res.status(403).json({ msg: 'Permiso denegado' });
}

// -------------------------
// Routes
// -------------------------

// Crear inspección (ADMIN o INSPECTOR)
router.post('/', verificarToken, allowAdminOrInspector, uploadFotosCompat, crearInspeccionV2);

// Alias compatible
router.post('/inspeccion', verificarToken, allowAdminOrInspector, uploadFotosCompat, crearInspeccionV2);

// Historial (solo ADMIN)
router.get('/historial', verificarToken, esAdmin, obtenerHistorialV2);

// Detalle por ID (solo ADMIN)
router.get('/:id', verificarToken, esAdmin, obtenerDetalleV2);

// Editar cabecera por ID (solo ADMIN)
router.put('/:id', verificarToken, esAdmin, actualizarInspeccionAdminV2);

// ✅ NUEVO: Editar métricas por ID (solo ADMIN)
router.put('/:id/metrics', verificarToken, esAdmin, actualizarMetricsAdminV2);

// Generar PDF por ID (solo ADMIN)
router.post('/:id/generar-pdf', verificarToken, esAdmin, generarPdfInspeccionAdminV2);

module.exports = router;
