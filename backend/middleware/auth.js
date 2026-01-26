// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

exports.verificarToken = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No hay token, acceso denegado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Soporta ambos formatos por compatibilidad
    // - nuevo: { id, role }
    // - viejo: { user: { id, role } }
    const payload = decoded.user ? decoded.user : decoded;

    req.user = {
      id: payload.id,
      role: payload.role || payload.rol
    };

    if (!req.user.id || !req.user.role) {
      return res.status(401).json({ msg: 'Token inválido (payload incompleto)' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ msg: 'Token no válido' });
  }
};

exports.esAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Permiso denegado: solo Administradores' });
  }
  next();
};

exports.esInspector = (req, res, next) => {
  if (!req.user || req.user.role !== 'inspector') {
    return res.status(403).json({ msg: 'Permiso denegado: solo Inspectores' });
  }
  next();
};
