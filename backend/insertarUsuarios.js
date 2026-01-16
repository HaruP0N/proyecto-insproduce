const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuración de la base de datos (usa los datos que proporcionaste)
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'Fruticola-2',
    password: process.env.DB_PASSWORD || 'Admin_Postgre',
    port: process.env.DB_PORT || 5432,
});

async function insertarUsuarios() {
    try {
        // Encriptar contraseñas
        const hashedPasswordAdmin = await bcrypt.hash('insproduce123', 10);  // Contraseña para Admin Insproduce
        const hashedPasswordInspector = await bcrypt.hash('calidad123', 10);  // Contraseña para Inspector Calidad

        // Insertar el Administrador
        await pool.query(`
            INSERT INTO usuarios (nombre, email, password, rol) 
            VALUES ('Admin Insproduce', 'admin@insproduce.cl', $1, 'admin')
        `, [hashedPasswordAdmin]);

        // Insertar el Inspector
        await pool.query(`
            INSERT INTO usuarios (nombre, email, password, rol) 
            VALUES ('Inspector Calidad', 'inspector@insproduce.cl', $1, 'inspector')
        `, [hashedPasswordInspector]);

        console.log("Usuarios insertados correctamente con contraseñas encriptadas");
    } catch (error) {
        console.error("Error al insertar usuarios:", error.message);
    } finally {
        // Cerrar la conexión con la base de datos
        pool.end();
    }
}

// Ejecutar la función
insertarUsuarios();
