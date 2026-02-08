// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../config/db');

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  if (!email || !password) {
    return res.status(400).json({ msg: 'Email y contraseña son obligatorios' });
  }

  try {
    const r = await query(
      `SELECT TOP 1 id, name, email, password_hash, role, active
       FROM users
       WHERE LOWER(email) = LOWER(@email)`,
      { email }
    );

    const user = r.recordset?.[0];

    if (!user || user.active === 0) {
      return res.status(401).json({ msg: 'Credenciales inválidas' });
    }

    // OJO: en tu script de Azure insertaste password_hash como texto plano (insproduce123)
    // bcrypt.compare fallará si NO es hash real.
    const ok = await bcrypt.compare(password, String(user.password_hash));
    if (!ok) {
      return res.status(401).json({ msg: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[AUTH] Falta JWT_SECRET en .env');
      return res.status(500).json({ msg: 'Error interno del servidor' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    console.log(`[AUTH] Login exitoso: ${user.email} (${user.role})`);

    return res.json({
      token,
      role: user.role,
      user: { id: user.id, email: user.email, nombre: user.name }
    });
  } catch (error) {
    console.error('[AUTH] Error en login:', error.message);
    return res.status(500).json({ msg: 'Error interno del servidor' });
  }
});

module.exports = router;
