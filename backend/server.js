// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { conectarDB } = require('./config/db');

const app = express();

// Conectar DB
conectarDB();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/informes', express.static(path.join(__dirname, 'informes')));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/commodities', require('./routes/commodities'));
app.use('/api/metric-templates', require('./routes/metricTemplatesRoutes'));

// ⚠️ Si asignaciones es otra cosa, sepáralo después.
// Por ahora dejo SOLO inspecciones acá para evitar duplicidad rara.
app.use('/api/inspecciones', require('./routes/inspeccionroutes'));

app.get('/', (req, res) => {
  res.send('servidor de control de calidad insproduce activo');
});

console.log('STATIC informes:', path.join(__dirname, 'informes'));
console.log('STATIC uploads :', path.join(__dirname, 'uploads'));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    msg: 'La ruta solicitada no existe en el servidor',
    ruta: req.url
  });
});

const puerto = process.env.PORT || 4000;
app.listen(puerto, () => {
  console.log(`Servidor iniciado en el puerto: ${puerto}`);
});