const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const inspeccioncontroller = require('../controllers/inspeccionController');

// --- 1. configuración de almacenamiento de imágenes ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // las fotos se guardan en la carpeta uploads del backend
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // generamos un nombre único: lote-timestamp-aleatorio.extension
        const lote = req.body.lote || 'sin-lote';
        const prefijo_unico = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${lote}-${prefijo_unico}${path.extname(file.originalname)}`);
    }
});

// --- 2. filtro de seguridad para archivos ---
const filefilter = (req, file, cb) => {
    // aceptamos solo tipos de imagen estándar
    const tipos_permitidos = /jpeg|jpg|png|webp/;
    const mimetype = tipos_permitidos.test(file.mimetype);
    const extname = tipos_permitidos.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error("error: el archivo debe ser una imagen válida (jpeg, jpg, png o webp)"));
};

// --- 3. inicialización de multer ---
const upload = multer({
    storage: storage,
    fileFilter: filefilter,
    limits: {
        fileSize: 1024 * 1024 * 5, // límite de 5mb por imagen
        files: 10 // máximo 10 imágenes por inspección
    }
});

// --- 4. definición de rutas ---

/**
 * @route   POST /api/inspecciones/inspeccion
 * @desc    crea una nueva inspección, sube fotos y genera el reporte pdf
 * @access  público (o protegido si usas middleware de auth)
 */
router.post(
    '/inspeccion', 
    upload.array('imagenes', 10), // 'imagenes' debe coincidir con el formdata del frontend
    inspeccioncontroller.crearinspeccion
);

// ruta para verificar el estado de la api
router.get('/estado', (req, res) => {
    res.json({ msg: "api de inspecciones operativa", fecha: new Date() });
});

module.exports = router;