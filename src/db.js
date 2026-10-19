
const mysql = require('mysql2/promise');
const fs = require('fs');

let ssl;

if (process.env.DB_SSL_CA_PATH) {
  ssl = {
    ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8'),
    rejectUnauthorized: true,
  };
} else if (process.env.DB_SSL_CA) {
  ssl = {
    ca: process.env.DB_SSL_CA,
    rejectUnauthorized: true,
  };
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Sertifikat CA database belum dikonfigurasi.');
}

module.exports = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'db_inventaris',
  ssl,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  charset: 'utf8mb4',
});
