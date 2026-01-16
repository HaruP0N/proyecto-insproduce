const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');

exports.loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    // Limpiamos los espacios extra antes de hacer cualquier comparación
    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();

    // Log para verificar los datos que estamos recibiendo
    console.log("Email recibido en el backend:", emailTrimmed);
    console.log("Password recibido en el backend:", passwordTrimmed);

    try {
        // Buscamos al usuario en la base de datos
        const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [emailTrimmed]);

        // Verificamos si el usuario existe y si las contraseñas coinciden
        if (resultado.rows.length === 0 || resultado.rows[0].password !== passwordTrimmed) {
            console.log("Credenciales inválidas");  // Log si las credenciales son incorrectas
            return res.status(401).json({ msg: "Credenciales inválidas" });
        }

        const usuario = resultado.rows[0];

        // Generamos el Token
        const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

        // Log de éxito: Login exitoso y rol recibido
        console.log("Login exitoso para:", usuario.email);

        // Respondemos con el token y el rol
        res.json({
            token,
            nombre: usuario.nombre,
            rol: usuario.rol
        });

    } catch (error) {
        console.error("Error en el servidor:", error);  // Log de error si ocurre un fallo en el backend
        res.status(500).send("Error en el servidor");
    }
};
