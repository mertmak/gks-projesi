require('dotenv').config();
const sql = require('mssql');
const logger = require('./utils/appLogger');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

let pool = null;

const connectDB = async () => {
    if (pool) return pool;
    try {
        pool = await sql.connect(config);
        logger.info('MSSQL Veritabanına başarıyla bağlandı.');
        pool.on('error', (err) => {
            logger.error('Veritabanı havuz hatası: ' + err.message);
        });
        return pool;
    } catch (err) {
        logger.error('Veritabanı bağlantı hatası: ' + err.message);
        process.exit(1);
    }
};

const getPool = () => {
    if (!pool) throw new Error('Veritabanı bağlantısı henüz başlatılmadı. connectDB() önce çağrılmalıdır.');
    return pool;
};

module.exports = { sql, connectDB, getPool };
