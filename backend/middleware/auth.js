const jwt = require('jsonwebtoken');

exports.verificarToken = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No hay token, acceso denegado' });

    try {
        const cifrado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = cifrado.user;
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Token no válido' });
    }
};

exports.esAdmin = (req, res, next) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ msg: 'Permiso denegado: solo Administradores' });
    }
    next();
};