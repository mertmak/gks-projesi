require('dotenv').config();
const sql = require('mssql');
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false, // Docker üzerinde lokal çalıştığımız için şifrelemeyi kapatıyoruz
        trustServerCertificate: true // SSL sertifikası zorunluluğunu atlıyoruz
    }
};

const connectDB = async () => {
    try{
        const pool = await sql.connect(config);
        console.log('MSSQL Veritabanına başarıyla bağlandı. ');
        return pool;
    }catch(err){
        console.error('Veritabanı bağlantı hatası: ',err.message);
    }
    process.exit(1);
};

module.exports = {
    sql,
    connectDB
};