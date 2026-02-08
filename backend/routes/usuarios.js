// backend/routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/db');
const { verificarToken, esAdmin } = require('../middleware/auth');

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

function generarPasswordTemporal() {
  return crypto.randomBytes(8).toString('base64url');
}

/**
 * GET /api/usuarios
 * Admin: lista usuarios
 * opcional: ?activo=true|false
 *
 * ✅ Compatibilidad panel antiguo:
 * - devuelve nombre/rol/activo (alias)
 */
router.get('/', verificarToken, esAdmin, async (req, res) => {
  try {
    const { activo } = req.query;

    if (activo === 'true' || activo === 'false') {
      const r = await query(
        `SELECT id,
                name  AS nombre,
                email,
                role  AS rol,
                active AS activo
         FROM users
         WHERE active=@active
         ORDER BY id DESC`,
        { active: (activo === 'true') ? 1 : 0 }
      );
      return res.json(r.recordset);
    }

    const r = await query(
      `SELECT id,
              name  AS nombre,
              email,
              role  AS rol,
              active AS activo
       FROM users
       ORDER BY id DESC`
    );
    return res.json(r.recordset);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error al listar usuarios' });
  }
});

/**
 * POST /api/usuarios
 * Admin: crea usuario
 *
 * ✅ Acepta nombre/rol/activo o name/role/active
 * ✅ Devuelve nombre/rol/activo (compat)
 */
router.post('/', verificarToken, esAdmin, async (req, res) => {
  try {
    const name = String(req.body.nombre || req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.rol || req.body.role || 'inspector').trim().toLowerCase();
    const password = String(req.body.password || '').trim();
    const active = req.body.activo === undefined
      ? (req.body.active === undefined ? true : !!req.body.active)
      : !!req.body.activo;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'nombre, email y password son obligatorios' });
    }
    if (!isEmail(email)) return res.status(400).json({ msg: 'Email inválido' });
    if (!['admin', 'inspector'].includes(role)) return res.status(400).json({ msg: 'Rol inválido' });
    if (password.length < 6) return res.status(400).json({ msg: 'Password mínimo 6 caracteres' });

    const exists = await query(
      `SELECT TOP 1 1 AS ok FROM users WHERE LOWER(email)=LOWER(@email)`,
      { email }
    );
    if (exists.recordset.length > 0) return res.status(409).json({ msg: 'Ya existe un usuario con ese email' });

    const hashed = await bcrypt.hash(password, 10);

    const r = await query(
      `INSERT INTO users (name, email, password_hash, role, active)
       OUTPUT INSERTED.id,
              INSERTED.name  AS nombre,
              INSERTED.email,
              INSERTED.role  AS rol,
              INSERTED.active AS activo
       VALUES (@name, @email, @password_hash, @role, @active)`,
      { name, email, password_hash: hashed, role, active: active ? 1 : 0 }
    );

    return res.json(r.recordset[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error al crear usuario' });
  }
});

/**
 * PUT /api/usuarios/:id
 * Admin: edita name/email/role/active. Password opcional.
 *
 * ✅ Mantiene tu hardening tal cual
 * ✅ Devuelve nombre/rol/activo (compat)
 */
router.put('/:id', verificarToken, esAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ msg: 'ID inválido' });

  try {
    const current = await query(
      `SELECT TOP 1 id, email, role, active FROM users WHERE id=@id`,
      { id }
    );
    const currentUser = current.recordset[0];
    if (!currentUser) return res.status(404).json({ msg: 'Usuario no encontrado' });

    const name = (req.body.nombre !== undefined || req.body.name !== undefined)
      ? String(req.body.nombre ?? req.body.name).trim()
      : undefined;

    const email = req.body.email !== undefined
      ? String(req.body.email).trim().toLowerCase()
      : undefined;

    const role = (req.body.rol !== undefined || req.body.role !== undefined)
      ? String(req.body.rol ?? req.body.role).trim().toLowerCase()
      : undefined;

    const active = (req.body.activo !== undefined || req.body.active !== undefined)
      ? !!(req.body.activo ?? req.body.active)
      : undefined;

    const password = req.body.password !== undefined
      ? String(req.body.password).trim()
      : undefined;

    if (String(req.user?.id) === String(id) && active === false) {
      return res.status(400).json({ msg: 'No puedes desactivar tu propio usuario' });
    }
    if (email !== undefined && !isEmail(email)) return res.status(400).json({ msg: 'Email inválido' });
    if (role !== undefined && !['admin', 'inspector'].includes(role)) return res.status(400).json({ msg: 'Rol inválido' });
    if (password !== undefined && password.length > 0 && password.length < 6) {
      return res.status(400).json({ msg: 'Password mínimo 6 caracteres' });
    }

    if (email !== undefined && email !== String(currentUser.email).toLowerCase()) {
      const exists = await query(
        `SELECT TOP 1 1 AS ok FROM users WHERE LOWER(email)=LOWER(@email) AND id<>@id`,
        { email, id }
      );
      if (exists.recordset.length > 0) return res.status(409).json({ msg: 'Ya existe un usuario con ese email' });
    }

    const nextRole = role !== undefined ? role : currentUser.role;
    const nextActive = active !== undefined ? (active ? 1 : 0) : currentUser.active;

    if (currentUser.role === 'admin' && (nextRole !== 'admin' || nextActive === 0)) {
      const admins = await query(
        `SELECT COUNT(*) AS c FROM users WHERE role='admin' AND active=1`
      );
      const c = Number(admins.recordset[0]?.c || 0);
      if (c <= 1) return res.status(400).json({ msg: 'Debe existir al menos 1 admin activo' });
    }

    let password_hash = null;
    let changePassword = 0;
    if (password !== undefined && password.length > 0) {
      password_hash = await bcrypt.hash(password, 10);
      changePassword = 1;
    }

    const r = await query(
      `UPDATE users
       SET
         name = COALESCE(@name, name),
         email = COALESCE(@email, email),
         role = COALESCE(@role, role),
         active = COALESCE(@active, active),
         password_hash = CASE WHEN @changePassword=1 THEN @password_hash ELSE password_hash END
       OUTPUT INSERTED.id,
              INSERTED.name  AS nombre,
              INSERTED.email,
              INSERTED.role  AS rol,
              INSERTED.active AS activo
       WHERE id=@id`,
      {
        id,
        name: name === undefined ? null : name,
        email: email === undefined ? null : email,
        role: role === undefined ? null : role,
        active: active === undefined ? null : (active ? 1 : 0),
        changePassword,
        password_hash
      }
    );

    return res.json(r.recordset[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error al actualizar usuario' });
  }
});

/**
 * POST /api/usuarios/:id/reset-password
 * Admin: genera password temporal, lo hashea y lo devuelve UNA SOLA VEZ.
 */
router.post('/:id/reset-password', verificarToken, esAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ msg: 'ID inválido' });

  try {
    const current = await query(
      `SELECT TOP 1 id, email, role, active FROM users WHERE id=@id`,
      { id }
    );
    const u = current.recordset[0];
    if (!u) return res.status(404).json({ msg: 'Usuario no encontrado' });

    if (u.active === 0) {
      return res.status(400).json({ msg: 'No puedes resetear password de un usuario inactivo (reactívalo primero)' });
    }

    const tempPassword = generarPasswordTemporal();
    const hashed = await bcrypt.hash(tempPassword, 10);

    await query(
      `UPDATE users SET password_hash=@password_hash WHERE id=@id`,
      { id, password_hash: hashed }
    );

    return res.json({ ok: true, tempPassword });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: 'Error reseteando password' });
  }
});

module.exports = router;
