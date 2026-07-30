const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken } = require('../middlewares/auth');

router.get('/dashboard/summary', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM Logs WHERE CAST(Zaman AS DATE) = CAST(GETDATE() AS DATE)) AS BugunGecis,
                (SELECT COUNT(*) FROM Users WHERE Durum = 1) AS AktifPersonel,
                (SELECT COUNT(*) FROM Logs WHERE CAST(Zaman AS DATE) = CAST(GETDATE() AS DATE) AND Basarili_Mi = 0) AS YetkisizGiris,
                (SELECT COUNT(*) FROM Doors WHERE Durum = 1 OR Durum IS NULL) AS AktifKapi
        `;
        const result = await sql.query(query);
        
        // Yeni Tasarım İçin: Son 10 geçiş hareketini ekliyoruz
        const recentLogsRes = await sql.query(`
            SELECT TOP 10 
                L.ID, L.Zaman, L.Basarili_Mi, 
                U.Ad_Soyad, U.Departman, U.Sicil_No,
                D.Kapi_Adi, D.Kapi_Turu
            FROM Logs L
            LEFT JOIN Users U ON L.RFID_Kart_No = U.RFID_Kart_No
            LEFT JOIN Doors D ON L.Door_ID = D.ID
            ORDER BY L.Zaman DESC
        `);

        res.json({
            success: true,
            stats: result.recordset[0],
            recentLogs: recentLogsRes.recordset
        }); 
    } catch (err) {
        res.status(500).json({ success: false, message: 'Özet veriler çekilemedi.' });
    }
});

router.get('/logs', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `
            SELECT TOP 5000 L.ID, U.Ad_Soyad, L.RFID_Kart_No, D.Kapi_Adi, L.Basarili_Mi, L.Zaman 
            FROM Logs L
            LEFT JOIN Users U ON L.RFID_Kart_No = U.RFID_Kart_No
            LEFT JOIN Doors D ON L.Door_ID = D.ID
            WHERE 1=1
        `;
        const request = new sql.Request();
        if (baslangic) { query += ` AND L.Zaman >= @baslangic`; request.input('baslangic', sql.DateTime, baslangic); }
        if (bitis) { query += ` AND L.Zaman <= @bitis`; request.input('bitis', sql.DateTime, bitis + ' 23:59:59'); }
        if (arama) { query += ` AND (U.Ad_Soyad LIKE @arama OR L.RFID_Kart_No LIKE @arama)`; request.input('arama', sql.NVarChar, `%${arama}%`); }
        query += ` ORDER BY L.Zaman DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Loglar çekilemedi.' });
    }
});

router.get('/system-logs', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `SELECT TOP 5000 * FROM SystemLogs WHERE 1=1`;
        const request = new sql.Request();
        if (baslangic) { query += ` AND Tarih >= @baslangic`; request.input('baslangic', sql.DateTime, baslangic); }
        if (bitis) { query += ` AND Tarih <= @bitis`; request.input('bitis', sql.DateTime, bitis + ' 23:59:59'); }
        if (arama) { query += ` AND (Personel_Ad LIKE @arama OR Sicil_No LIKE @arama OR Islem_Tipi LIKE @arama)`; request.input('arama', sql.NVarChar, `%${arama}%`); }
        query += ` ORDER BY Tarih DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sistem logları çekilemedi.' });
    }
});

router.get('/door-logs', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `SELECT TOP 5000 * FROM DoorLogs WHERE 1=1`;
        const request = new sql.Request();
        if (baslangic) { query += ` AND Tarih >= @baslangic`; request.input('baslangic', sql.DateTime, baslangic); }
        if (bitis) { query += ` AND Tarih <= @bitis`; request.input('bitis', sql.DateTime, bitis + ' 23:59:59'); }
        if (arama) { query += ` AND (Kapi_Adi LIKE @arama OR Islem_Tipi LIKE @arama OR Detay LIKE @arama)`; request.input('arama', sql.NVarChar, `%${arama}%`); }
        query += ` ORDER BY Tarih DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kapı logları çekilemedi.' });
    }
});

module.exports = router;