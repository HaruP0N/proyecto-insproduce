const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db'); // Conectamos con tu base de datos fruticola-2

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscamos al usuario real en PostgreSQL
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        // 2. Si no existe el email
        if (!user) {
            return res.status(400).json({ msg: 'Usuario no encontrado' });
        }

        // 3. Verificación de contraseña
        // IMPORTANTE: Como en tu script anterior usabas texto plano, 
        // aquí comparamos directamente. (Luego implementaremos bcrypt.compare)
        if (password !== user.password) {
            return res.status(400).json({ msg: 'Contraseña incorrecta' });
        }

        // 4. Generar el Token usando tu variable de entorno
        // Si process.env.JWT_SECRET no existe, usará 'contrasena123' por seguridad
        const secret = process.env.JWT_SECRET || 'contrasena123';
        
        const token = jwt.sign(
            { id: user.id, role: user.rol }, 
            secret, 
            { expiresIn: '8h' }
        );

        // 5. Respuesta exitosa para el Frontend
        console.log(`[AUTH] Login exitoso: ${email}`);
        res.json({
            token,
            role: user.rol,
            user: { 
                email: user.email,
                nombre: user.nombre 
            }
        });

    } catch (error) {
        console.error('Error en el login:', error.message);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
});

module.exports = router;