const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

let pool;

async function conectarDB() {
  try {
    pool = await sql.connect(config);
    await pool.request().query('SELECT 1 as ok');
    console.log('✅ Conectado a Azure SQL:', process.env.DB_DATABASE);
  } catch (err) {
    console.error('❌ Error de conexión Azure SQL:', err.message);
    throw err;
  }
}

async function query(text, params = {}) {
  if (!pool) {
    throw new Error('Pool no inicializado. Llama conectarDB() antes.');
  }
  const request = pool.request();
  for (const [k, v] of Object.entries(params)) {
    request.input(k, v);
  }
  return request.query(text);
}

module.exports = { conectarDB, query, sql };
