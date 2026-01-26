const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const inspeccioncontroller = require('../controllers/inspeccionController');

// --- 1. configuración de almacenamiento de imágenes ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const lote = req.body.lote || 'sin-lote';
    const prefijo_unico = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${lote}-${prefijo_unico}${path.extname(file.originalname)}`);
  }
});

// --- 2. filtro ---
const filefilter = (req, file, cb) => {
  const tipos_permitidos = /jpeg|jpg|png|webp/;
  const mimetype = tipos_permitidos.test(file.mimetype);
  const extname = tipos_permitidos.test(path.extname(file.originalname).toLowerCase());
  if (mimetype && extname) return cb(null, true);
  cb(new Error("error: el archivo debe ser una imagen válida (jpeg, jpg, png o webp)"));
};

// --- 3. multer ---
const upload = multer({
  storage,
  fileFilter: filefilter,
  limits: { fileSize: 1024 * 1024 * 5, files: 10 }
});

// --- 4. rutas ---
router.post(
  '/inspeccion',
  upload.array('imagenes', 10),
  inspeccioncontroller.crearinspeccion
);

router.get('/estado', (req, res) => {
  res.json({ msg: "api de inspecciones operativa", fecha: new Date() });
});

module.exports = router;
