const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la aplicación
app.use('/api/auth', require('./routes/auth'));  // Ruta de autenticación
app.use('/api/asignaciones', require('./routes/inspeccionroutes'));
app.use('/api/inspecciones', require('./routes/inspeccionroutes'));

// Ruta base
app.get('/', (req, res) => {
    res.send('servidor de control de calidad insproduce activo');
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        msg: "La ruta solicitada no existe en el servidor",
        ruta: req.url
    });
});

// Encendido del servidor
const puerto = process.env.PORT || 4000;

app.listen(puerto, () => {
    console.log(`Servidor iniciado en el puerto: ${puerto}`);
});
