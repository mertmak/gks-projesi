const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken } = require('../middlewares/auth');

// 1. ÖZET VE GRAFİK VERİLERİ (Filtreli)
router.get('/dashboard/summary', verifyToken, async (req, res, next) => {
    try {
        const filter = req.query.filter || 'gunluk';
        
        // 1. Genel İstatistikler
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Logs WHERE CAST(Zaman AS DATE) = CAST(GETDATE() AS DATE)) AS BugunGecis,
                (SELECT COUNT(*) FROM Users WHERE Durum = 1) AS AktifPersonel,
                (SELECT COUNT(*) FROM Logs WHERE CAST(Zaman AS DATE) = CAST(GETDATE() AS DATE) AND Basarili_Mi = 0) AS YetkisizGiris,
                (SELECT COUNT(*) FROM Doors WHERE Durum = 1 OR Durum IS NULL) AS AktifKapi
        `;
        
        // 2. Son 10 Geçiş (Canlı İzleme İçin)
        const recentLogsQuery = `
            SELECT TOP 10 
                L.ID, L.Zaman, L.Basarili_Mi, 
                U.Ad_Soyad, U.Departman, U.Sicil_No,
                D.Kapi_Adi, D.Kapi_Turu
            FROM Logs L
            LEFT JOIN Users U ON L.RFID_Kart_No = U.RFID_Kart_No
            LEFT JOIN Doors D ON L.Door_ID = D.ID
            ORDER BY L.Zaman DESC
        `;

        // 3. Departman Bazlı Gelen/Gelmeyen Analizi (Bar Grafik İçin)
        const deptQuery = `
            SELECT 
                U.Departman as name,
                COUNT(DISTINCT U.ID) as ToplamPersonel,
                COUNT(DISTINCT CASE WHEN L.Basarili_Mi = 1 THEN L.RFID_Kart_No END) as Gelen
            FROM Users U
            LEFT JOIN Logs L ON U.RFID_Kart_No = L.RFID_Kart_No 
                AND CAST(L.Zaman AS DATE) = CAST(GETDATE() AS DATE) 
            WHERE U.Durum = 1 AND U.Departman IS NOT NULL AND U.Departman != ''
            GROUP BY U.Departman
        `;

        // 4. Trend Analizi (Çizgi Grafik İçin)
        let trendQuery = '';
        if (filter === 'haftalik') {
            trendQuery = `
                SELECT 
                    CAST(Zaman AS DATE) as Tarih,
                    SUM(CAST(Basarili_Mi AS INT)) as Basarili,
                    SUM(CASE WHEN Basarili_Mi = 0 THEN 1 ELSE 0 END) as Yetkisiz
                FROM Logs
                WHERE Zaman >= DATEADD(day, -6, CAST(GETDATE() AS DATE))
                GROUP BY CAST(Zaman AS DATE)
                ORDER BY Tarih ASC
            `;
        } else if (filter === 'aylik') {
            trendQuery = `
                SELECT 
                    DATEPART(WEEK, Zaman) as Hafta,
                    SUM(CAST(Basarili_Mi AS INT)) as Basarili,
                    SUM(CASE WHEN Basarili_Mi = 0 THEN 1 ELSE 0 END) as Yetkisiz
                FROM Logs
                WHERE Zaman >= DATEADD(day, -27, CAST(GETDATE() AS DATE))
                GROUP BY DATEPART(WEEK, Zaman)
                ORDER BY Hafta ASC
            `;
        } else { // gunluk
            trendQuery = `
                SELECT 
                    DATEPART(HOUR, Zaman) as Saat,
                    SUM(CAST(Basarili_Mi AS INT)) as Basarili,
                    SUM(CASE WHEN Basarili_Mi = 0 THEN 1 ELSE 0 END) as Yetkisiz
                FROM Logs
                WHERE CAST(Zaman AS DATE) = CAST(GETDATE() AS DATE)
                GROUP BY DATEPART(HOUR, Zaman)
                ORDER BY Saat ASC
            `;
        }

        // Tüm sorguları aynı anda paralel çalıştırarak performansı koruyoruz
        const [statsRes, recentLogsRes, deptRes, trendRes] = await Promise.all([
            sql.query(statsQuery),
            sql.query(recentLogsQuery),
            sql.query(deptQuery),
            sql.query(trendQuery)
        ]);

        // Verileri Frontend'in beklediği JSON yapısına (map) dönüştürme
        const deptData = deptRes.recordset.map(row => ({
            name: row.name,
            gelen: row.Gelen,
            gelmeyen: row.ToplamPersonel - row.Gelen
        }));

        let trendData = [];
        const trDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        
        if (filter === 'haftalik') {
            trendData = trendRes.recordset.map(row => ({
                label: trDays[new Date(row.Tarih).getDay()],
                basarili: row.Basarili,
                yetkisiz: row.Yetkisiz
            }));
        } else if (filter === 'aylik') {
            let haftaCounter = 1;
            trendData = trendRes.recordset.map(row => ({
                label: `${haftaCounter++}. Hafta`,
                basarili: row.Basarili,
                yetkisiz: row.Yetkisiz
            }));
        } else {
            trendData = trendRes.recordset.map(row => ({
                label: `${String(row.Saat).padStart(2, '0')}:00`,
                basarili: row.Basarili,
                yetkisiz: row.Yetkisiz
            }));
        }

        res.json({
            success: true,
            stats: statsRes.recordset[0],
            recentLogs: recentLogsRes.recordset,
            deptData: deptData,
            trendData: trendData
        }); 
    } catch (err) {
        next(err); // Global errorHandler'a yönlendirildi
    }
});

/**
 * @swagger
 * /logs:
 *   get:
 *     tags: [Dashboard]
 *     summary: Geçiş logları (sayfalama destekli)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100, maximum: 500 }
 *       - in: query
 *         name: baslangic
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: bitis
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: arama
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sayfalanmış log listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:       { type: array, items: { type: object } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
// 2. TÜM GEÇİŞ LOGLARI (Sayfalama destekli)
router.get('/logs', verifyToken, async (req, res, next) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
        const offset = (page - 1) * limit;

        const request = new sql.Request();
        let where = `WHERE 1=1`;
        if (baslangic) { where += ` AND L.Zaman >= @baslangic`; request.input('baslangic', sql.DateTime, baslangic); }
        if (bitis)     { where += ` AND L.Zaman <= @bitis`;     request.input('bitis', sql.DateTime, bitis + ' 23:59:59'); }
        if (arama)     { where += ` AND (U.Ad_Soyad LIKE @arama OR L.RFID_Kart_No LIKE @arama)`; request.input('arama', sql.NVarChar, `%${arama}%`); }

        request.input('offset', sql.Int, offset);
        request.input('limit',  sql.Int, limit);

        const countReq = new sql.Request();
        if (baslangic) countReq.input('baslangic', sql.DateTime, baslangic);
        if (bitis)     countReq.input('bitis', sql.DateTime, bitis + ' 23:59:59');
        if (arama)     countReq.input('arama', sql.NVarChar, `%${arama}%`);

        const [dataResult, countResult] = await Promise.all([
            request.query(`
                SELECT L.ID, U.Ad_Soyad, L.RFID_Kart_No, D.Kapi_Adi, L.Basarili_Mi, L.Zaman
                FROM Logs L
                LEFT JOIN Users U ON L.RFID_Kart_No = U.RFID_Kart_No
                LEFT JOIN Doors D ON L.Door_ID = D.ID
                ${where}
                ORDER BY L.Zaman DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `),
            countReq.query(`
                SELECT COUNT(*) AS toplam
                FROM Logs L
                LEFT JOIN Users U ON L.RFID_Kart_No = U.RFID_Kart_No
                ${where}
            `)
        ]);

        res.json({
            data: dataResult.recordset,
            pagination: { page, limit, total: countResult.recordset[0].toplam, totalPages: Math.ceil(countResult.recordset[0].toplam / limit) }
        });
    } catch (err) {
        next(err);
    }
});

// 3. SİSTEM VE İK LOGLARI (Sayfalama destekli)
router.get('/system-logs', verifyToken, async (req, res, next) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
        const offset = (page - 1) * limit;

        const request  = new sql.Request();
        const countReq = new sql.Request();
        let where = `WHERE 1=1`;
        if (baslangic) { where += ` AND Tarih >= @baslangic`; request.input('baslangic', sql.DateTime, baslangic); countReq.input('baslangic', sql.DateTime, baslangic); }
        if (bitis)     { where += ` AND Tarih <= @bitis`;     request.input('bitis', sql.DateTime, bitis + ' 23:59:59'); countReq.input('bitis', sql.DateTime, bitis + ' 23:59:59'); }
        if (arama)     { where += ` AND (Personel_Ad LIKE @arama OR Sicil_No LIKE @arama OR Islem_Tipi LIKE @arama)`; request.input('arama', sql.NVarChar, `%${arama}%`); countReq.input('arama', sql.NVarChar, `%${arama}%`); }
        request.input('offset', sql.Int, offset);
        request.input('limit',  sql.Int, limit);

        const [dataResult, countResult] = await Promise.all([
            request.query(`SELECT * FROM SystemLogs ${where} ORDER BY Tarih DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`),
            countReq.query(`SELECT COUNT(*) AS toplam FROM SystemLogs ${where}`)
        ]);

        res.json({
            data: dataResult.recordset,
            pagination: { page, limit, total: countResult.recordset[0].toplam, totalPages: Math.ceil(countResult.recordset[0].toplam / limit) }
        });
    } catch (err) {
        next(err);
    }
});

// 4. KAPI İŞLEM LOGLARI (Sayfalama destekli)
router.get('/door-logs', verifyToken, async (req, res, next) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
        const offset = (page - 1) * limit;

        const request  = new sql.Request();
        const countReq = new sql.Request();
        let where = `WHERE 1=1`;
        if (baslangic) { where += ` AND Tarih >= @baslangic`; request.input('baslangic', sql.DateTime, baslangic); countReq.input('baslangic', sql.DateTime, baslangic); }
        if (bitis)     { where += ` AND Tarih <= @bitis`;     request.input('bitis', sql.DateTime, bitis + ' 23:59:59'); countReq.input('bitis', sql.DateTime, bitis + ' 23:59:59'); }
        if (arama)     { where += ` AND (Kapi_Adi LIKE @arama OR Islem_Tipi LIKE @arama OR Detay LIKE @arama)`; request.input('arama', sql.NVarChar, `%${arama}%`); countReq.input('arama', sql.NVarChar, `%${arama}%`); }
        request.input('offset', sql.Int, offset);
        request.input('limit',  sql.Int, limit);

        const [dataResult, countResult] = await Promise.all([
            request.query(`SELECT * FROM DoorLogs ${where} ORDER BY Tarih DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`),
            countReq.query(`SELECT COUNT(*) AS toplam FROM DoorLogs ${where}`)
        ]);

        res.json({
            data: dataResult.recordset,
            pagination: { page, limit, total: countResult.recordset[0].toplam, totalPages: Math.ceil(countResult.recordset[0].toplam / limit) }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;