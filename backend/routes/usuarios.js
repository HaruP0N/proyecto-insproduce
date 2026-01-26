// backend/routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { verificarToken, esAdmin } = require('../middleware/auth');

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

function generarPasswordTemporal() {
  // 10 caracteres base64url aprox (sin símbolos raros)
  return crypto.randomBytes(8).toString('base64url'); // Node 16+ normalmente ok
}

/**
 * GET /api/usuarios
 * Admin: lista usuarios
 * opcional: ?activo=true|false
 */
router.get('/', verificarToken, esAdmin, async (req, res) => {
  try {
    const { activo } = req.query;

    if (activo === 'true' || activo === 'false') {
      const r = await pool.query(
        'SELECT id, nombre, email, rol, activo FROM usuarios WHERE activo=$1 ORDER BY id DESC',
        [activo === 'true']
      );
      return res.json(r.rows);
    }

    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo FROM usuarios ORDER BY id DESC'
    );
    return res.json(result.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error al listar usuarios' });
  }
});

/**
 * POST /api/usuarios
 * Admin: crea usuario (password obligatorio)
 */
router.post('/', verificarToken, esAdmin, async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const rol = String(req.body.rol || 'inspector').trim().toLowerCase();
    const password = String(req.body.password || '').trim();
    const activo = req.body.activo === undefined ? true : !!req.body.activo;

    if (!nombre || !email || !password) {
      return res.status(400).json({ msg: 'nombre, email y password son obligatorios' });
    }
    if (!isEmail(email)) return res.status(400).json({ msg: 'Email inválido' });
    if (!['admin', 'inspector'].includes(rol)) return res.status(400).json({ msg: 'Rol inválido' });
    if (password.length < 6) return res.status(400).json({ msg: 'Password mínimo 6 caracteres' });

    const exists = await pool.query('SELECT 1 FROM usuarios WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ msg: 'Ya existe un usuario con ese email' });

    const hashed = await bcrypt.hash(password, 10);

    const r = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol, activo`,
      [nombre, email, hashed, rol, activo]
    );

    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error al crear usuario' });
  }
});

/**
 * PUT /api/usuarios/:id
 * Admin: edita nombre/email/rol/activo. Password opcional.
 *
 * Hardening:
 * - No desactivar tu propio usuario
 * - No dejar el sistema sin admins activos
 */
router.put('/:id', verificarToken, esAdmin, async (req, res) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) return res.status(400).json({ msg: 'ID inválido' });

  try {
    const nombre = req.body.nombre !== undefined ? String(req.body.nombre).trim() : undefined;
    const email = req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : undefined;
    const rol = req.body.rol !== undefined ? String(req.body.rol).trim().toLowerCase() : undefined;
    const activo = req.body.activo !== undefined ? !!req.body.activo : undefined;
    const password = req.body.password !== undefined ? String(req.body.password).trim() : undefined;

    const current = await pool.query('SELECT id, email, rol, activo FROM usuarios WHERE id=$1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });
    const currentUser = current.rows[0];

    // Evitar lock-out: no puedes desactivar tu propio usuario
    if (String(req.user?.id) === String(id) && activo === false) {
      return res.status(400).json({ msg: 'No puedes desactivar tu propio usuario' });
    }

    if (email !== undefined && !isEmail(email)) return res.status(400).json({ msg: 'Email inválido' });
    if (rol !== undefined && !['admin', 'inspector'].includes(rol)) return res.status(400).json({ msg: 'Rol inválido' });
    if (password !== undefined && password.length > 0 && password.length < 6) {
      return res.status(400).json({ msg: 'Password mínimo 6 caracteres' });
    }

    // Si cambia email, verificar duplicado
    if (email !== undefined && email !== String(currentUser.email).toLowerCase()) {
      const exists = await pool.query('SELECT 1 FROM usuarios WHERE LOWER(email)=LOWER($1) AND id<>$2', [email, id]);
      if (exists.rows.length > 0) return res.status(409).json({ msg: 'Ya existe un usuario con ese email' });
    }

    // Hardening: no dejar 0 admins activos
    const nextRol = rol !== undefined ? rol : currentUser.rol;
    const nextActivo = activo !== undefined ? activo : currentUser.activo;

    if (currentUser.rol === 'admin' && (nextRol !== 'admin' || nextActivo === false)) {
      const admins = await pool.query("SELECT COUNT(*)::int AS c FROM usuarios WHERE rol='admin' AND activo=true");
      if ((admins.rows[0]?.c || 0) <= 1) {
        return res.status(400).json({ msg: 'Debe existir al menos 1 admin activo' });
      }
    }

    // Construir UPDATE dinámico
    const fields = [];
    const values = [];
    let idx = 1;

    if (nombre !== undefined) { fields.push(`nombre=$${idx++}`); values.push(nombre); }
    if (email !== undefined) { fields.push(`email=$${idx++}`); values.push(email); }
    if (rol !== undefined) { fields.push(`rol=$${idx++}`); values.push(rol); }
    if (activo !== undefined) { fields.push(`activo=$${idx++}`); values.push(activo); }

    if (password !== undefined && password.length > 0) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password=$${idx++}`);
      values.push(hashed);
    }

    if (fields.length === 0) return res.status(400).json({ msg: 'Nada para actualizar' });

    values.push(id);
    const q = `UPDATE usuarios SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id, nombre, email, rol, activo`;
    const r = await pool.query(q, values);

    return res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error al actualizar usuario' });
  }
});

/**
 * POST /api/usuarios/:id/reset-password
 * Admin: genera password temporal, la hashea y la devuelve UNA SOLA VEZ.
 *
 * Hardening:
 * - No resetear password de un usuario inexistente
 * - Si reseteas un admin, igual se mantiene el rol/activo
 */
router.post('/:id/reset-password', verificarToken, esAdmin, async (req, res) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) return res.status(400).json({ msg: 'ID inválido' });

  try {
    const current = await pool.query('SELECT id, email, rol, activo FROM usuarios WHERE id=$1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });

    const u = current.rows[0];
    if (u.activo === false) {
      // opcional: permitir igual, pero mejor advertir
      // Puedes permitirlo si quieres: solo comenta este bloque.
      return res.status(400).json({ msg: 'No puedes resetear password de un usuario inactivo (reactívalo primero)' });
    }

    const tempPassword = generarPasswordTemporal();
    const hashed = await bcrypt.hash(tempPassword, 10);

    await pool.query('UPDATE usuarios SET password=$1 WHERE id=$2', [hashed, id]);

    return res.json({
      ok: true,
      tempPassword
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error reseteando password' });
  }
});

module.exports = router;
