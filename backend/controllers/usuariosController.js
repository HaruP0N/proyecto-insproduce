// backend/controllers/usuariosController.js
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

exports.listarUsuariosAdmin = async (req, res) => {
  try {
    const { activo = 'true', search = '' } = req.query;

    const where = [];
    const params = [];

    if (activo !== 'all') {
      params.push(activo === 'true');
      where.push(`activo = $${params.length}`);
    }

    if (search && String(search).trim().length > 0) {
      params.push(`%${String(search).trim()}%`);
      where.push(`(nombre ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const sql = `
      SELECT id, nombre, email, rol, activo
      FROM usuarios
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY id DESC
    `;

    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al listar usuarios' });
  }
};

exports.crearUsuarioAdmin = async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;

    if (!nombre || !String(nombre).trim()) return res.status(400).json({ msg: 'Nombre requerido' });
    if (!email || !isEmail(email)) return res.status(400).json({ msg: 'Email inválido' });
    if (!['admin', 'inspector'].includes(rol)) return res.status(400).json({ msg: 'Rol inválido' });
    if (!password || String(password).trim().length < 6) return res.status(400).json({ msg: 'Password mínimo 6 caracteres' });

    const hashed = await bcrypt.hash(String(password).trim(), 10);

    const sql = `
      INSERT INTO usuarios (nombre, email, password, rol, activo)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, nombre, email, rol, activo
    `;
    const r = await pool.query(sql, [String(nombre).trim(), String(email).trim().toLowerCase(), hashed, rol]);
    res.json(r.rows[0]);
  } catch (error) {
    console.error(error);
    if (String(error.message || '').includes('duplicate key')) {
      return res.status(400).json({ msg: 'Email ya existe' });
    }
    res.status(500).json({ msg: 'Error al crear usuario' });
  }
};

exports.actualizarUsuarioAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ msg: 'ID inválido' });

    const { nombre, email, rol } = req.body;

    if (!nombre || !String(nombre).trim()) return res.status(400).json({ msg: 'Nombre requerido' });
    if (!email || !isEmail(email)) return res.status(400).json({ msg: 'Email inválido' });
    if (!['admin', 'inspector'].includes(rol)) return res.status(400).json({ msg: 'Rol inválido' });

    const sql = `
      UPDATE usuarios
      SET nombre = $1, email = $2, rol = $3
      WHERE id = $4
      RETURNING id, nombre, email, rol, activo
    `;
    const r = await pool.query(sql, [String(nombre).trim(), String(email).trim().toLowerCase(), rol, id]);

    if (r.rows.length === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });
    res.json(r.rows[0]);
  } catch (error) {
    console.error(error);
    if (String(error.message || '').includes('duplicate key')) {
      return res.status(400).json({ msg: 'Email ya existe' });
    }
    res.status(500).json({ msg: 'Error al actualizar usuario' });
  }
};

exports.cambiarEstadoUsuarioAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ msg: 'ID inválido' });

    const { activo } = req.body;
    if (typeof activo !== 'boolean') return res.status(400).json({ msg: 'activo debe ser boolean' });

    // Evitar que un admin se desactive a sí mismo
    if (String(req.usuario?.id) === String(id) && activo === false) {
      return res.status(400).json({ msg: 'No puedes desactivarte a ti mismo' });
    }

    const r = await pool.query(
      `UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, email, rol, activo`,
      [activo, id]
    );

    if (r.rows.length === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });
    res.json(r.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al cambiar estado' });
  }
};

exports.resetPasswordAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ msg: 'ID inválido' });

    const { password } = req.body;
    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ msg: 'Password mínimo 6 caracteres' });
    }

    const hashed = await bcrypt.hash(String(password).trim(), 10);

    const r = await pool.query(
      `UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING id, nombre, email, rol, activo`,
      [hashed, id]
    );

    if (r.rows.length === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al resetear password' });
  }
};
