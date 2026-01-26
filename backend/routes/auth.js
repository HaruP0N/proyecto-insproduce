// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  if (!email || !password) {
    return res.status(400).json({ msg: 'Email y contraseña son obligatorios' });
  }

  try {
    // activo = true (hardening)
    const result = await pool.query(
      'SELECT id, nombre, email, password, rol, activo FROM usuarios WHERE LOWER(email)=LOWER($1) LIMIT 1',
      [email]
    );

    const user = result.rows[0];

    // Mensaje genérico (no revelar si existe o no)
    if (!user || user.activo === false) {
      return res.status(401).json({ msg: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ msg: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[AUTH] Falta JWT_SECRET en .env');
      return res.status(500).json({ msg: 'Error interno del servidor' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.rol },
      secret,
      { expiresIn: '8h' }
    );

    console.log(`[AUTH] Login exitoso: ${user.email} (${user.rol})`);

    return res.json({
      token,
      role: user.rol,
      user: { id: user.id, email: user.email, nombre: user.nombre }
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
});

module.exports = router;
