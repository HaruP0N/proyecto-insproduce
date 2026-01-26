const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Servir carpetas públicas (si ya lo tienes para informes/uploads, déjalo aquí)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/informes', express.static(path.join(__dirname, 'informes')));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios')); // ✅ NUEVO
app.use('/api/asignaciones', require('./routes/inspeccionroutes'));
app.use('/api/inspecciones', require('./routes/inspeccionroutes'));

// Ruta base
app.get('/', (req, res) => {
  res.send('servidor de control de calidad insproduce activo');
});

console.log('STATIC informes:', path.join(__dirname, 'informes'));
console.log('STATIC uploads :', path.join(__dirname, 'uploads'));

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    msg: 'La ruta solicitada no existe en el servidor',
    ruta: req.url
  });
});

// Encendido
const puerto = process.env.PORT || 4000;
app.listen(puerto, () => {
  console.log(`Servidor iniciado en el puerto: ${puerto}`);
});
