const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');
const { parseTimeToMinutes, diffMinutes } = require('../utils/dateHelper');

// 1. TARİH ARALIĞINA GÖRE SADECE MESAİSİ OLANLARI GETİR
router.get('/overtimes', verifyToken, async (req, res) => {
    const { baslangic, bitis } = req.query;

    try {
        const request = new sql.Request();
        request.input('bas', sql.Date, baslangic);
        request.input('bit', sql.Date, bitis);

        const userQuery = `
            WITH DateRange AS (
                SELECT CAST(@bas AS DATE) AS RaporTarihi
                UNION ALL
                SELECT DATEADD(day, 1, RaporTarihi) FROM DateRange WHERE RaporTarihi < CAST(@bit AS DATE)
            )
            SELECT 
                U.ID as User_ID, U.Ad_Soyad, U.Sicil_No, U.Departman, U.Sirket,
                DR.RaporTarihi as Tarih,
                V.Vardiya_Adi, V.Mesai_Baslangic, V.Mesai_Bitis, V.Calisma_Gunleri,
                MO.Durum AS Mesai_Durumu, MO.Onaylanan_Dk,
                (SELECT TOP 1 L.Zaman FROM Logs L JOIN Doors D ON L.Door_ID = D.ID 
                 WHERE L.RFID_Kart_No = U.RFID_Kart_No AND CAST(L.Zaman AS DATE) = DR.RaporTarihi AND D.Kapi_Turu = N'Ana Giriş' AND L.Basarili_Mi = 1 
                 ORDER BY L.Zaman ASC) AS Ilk_Giris,
                (SELECT TOP 1 L.Zaman FROM Logs L JOIN Doors D ON L.Door_ID = D.ID 
                 WHERE L.RFID_Kart_No = U.RFID_Kart_No AND CAST(L.Zaman AS DATE) = DR.RaporTarihi AND D.Kapi_Turu = N'Ana Çıkış' AND L.Basarili_Mi = 1 
                 ORDER BY L.Zaman DESC) AS Son_Cikis,
                (SELECT TOP 1 Izin_Turu FROM Izinler 
                 WHERE User_ID = U.ID AND DR.RaporTarihi BETWEEN Baslangic_Tarihi AND Bitis_Tarihi) AS Izin_Durumu
            FROM Users U
            CROSS JOIN DateRange DR
            OUTER APPLY (
                SELECT TOP 1 Vardiya_ID 
                FROM Personel_Vardiya 
                WHERE User_ID = U.ID AND Baslangic_Tarihi <= DR.RaporTarihi
                ORDER BY Baslangic_Tarihi DESC
            ) PV
            LEFT JOIN Vardiyalar V ON PV.Vardiya_ID = V.ID
            LEFT JOIN Mesai_Onaylari MO ON MO.User_ID = U.ID AND MO.Tarih = DR.RaporTarihi
            WHERE U.Durum = 1
            OPTION (MAXRECURSION 365)
        `;

        const logResult = await request.query(`
            SELECT L.RFID_Kart_No, L.Zaman, D.Kapi_Turu 
            FROM Logs L JOIN Doors D ON L.Door_ID = D.ID 
            WHERE CAST(L.Zaman AS DATE) BETWEEN @bas AND @bit AND L.Basarili_Mi = 1 
        `);
        const allLogs = logResult.recordset;
        const userResult = await request.query(userQuery);

        const reportData = userResult.recordset.map(row => {
            let fazlaMesaiDk = 0;
            let toplamYemekDk = 0; let toplamMolaDk = 0;

            const targetDayIndex = new Date(row.Tarih).getDay();
            const calismaGunleri = row.Calisma_Gunleri ? row.Calisma_Gunleri.split(',').map(Number) : [1,2,3,4,5];
            const isHaftaTatili = !calismaGunleri.includes(targetDayIndex);

            if (row.Izin_Durumu || !row.Vardiya_Adi || (!isHaftaTatili && !row.Ilk_Giris)) {
                return null; // İzinliyse veya gelmediyse baştan ele
            }

            if (isHaftaTatili && row.Ilk_Giris && row.Son_Cikis) {
                fazlaMesaiDk = diffMinutes(row.Ilk_Giris, row.Son_Cikis);
            } else if (!isHaftaTatili && row.Ilk_Giris && row.Son_Cikis) {
                const expectedEndMins = parseTimeToMinutes(row.Mesai_Bitis);
                const actualEndMins = new Date(row.Son_Cikis).getUTCHours() * 60 + new Date(row.Son_Cikis).getUTCMinutes();
                if (actualEndMins > expectedEndMins) fazlaMesaiDk = actualEndMins - expectedEndMins;
            }

            const rowDateStr = new Date(row.Tarih).toISOString().split('T')[0];
            const userLogs = allLogs.filter(l => l.RFID_Kart_No === row.RFID_Kart_No && new Date(l.Zaman).toISOString().split('T')[0] === rowDateStr);
            
            let yBas = null; let mBas = null;
            userLogs.forEach(log => {
                const kapi = log.Kapi_Turu; const zaman = new Date(log.Zaman);
                if (kapi === 'Yemekhane Giriş') yBas = zaman;
                else if (kapi === 'Yemekhane Çıkış' && yBas) { toplamYemekDk += diffMinutes(yBas, zaman); yBas = null; }
                if (kapi === 'Mola / Sigara Alanı') { if (!mBas) mBas = zaman; }
                else if (mBas && kapi !== 'Mola / Sigara Alanı') { toplamMolaDk += diffMinutes(mBas, zaman); mBas = null; }
            });

            if (isHaftaTatili && fazlaMesaiDk > 0) fazlaMesaiDk = Math.max(0, fazlaMesaiDk - (toplamYemekDk + toplamMolaDk));

            if (fazlaMesaiDk <= 0 && row.Mesai_Durumu !== 'Onaylandı') return null; // 0 DAKİKA OLANLARI GİZLER

            return {
                ...row, 
                Fazla_Mesai_Dk: fazlaMesaiDk,
                Mesai_Durumu: row.Mesai_Durumu || 'Bekliyor', 
                Onaylanan_Dk: row.Onaylanan_Dk || 0,
                TarihStr: rowDateStr
            };
        }).filter(item => item !== null); // null dönenleri (mesaisi olmayanları) diziden çıkarıyoruz

        res.json(reportData);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Veriler hesaplanamadı.' });
    }
});

// 2. BİREYSEL MESAİ ONAY / RED İŞLEMİ
router.post('/overtimes/approve', verifyToken, validate(schemas.mesaiOnaySchema), async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const { user_id, tarih, hesaplanan_dk, onaylanan_dk, durum, aciklama } = req.body;
    try {
        const request = new sql.Request();
        request.input('uid', sql.Int, user_id); request.input('tarih', sql.Date, tarih); request.input('hesaplanan', sql.Int, hesaplanan_dk); request.input('onaylanan', sql.Int, onaylanan_dk); request.input('durum', sql.NVarChar, durum); request.input('aciklama', sql.NVarChar, aciklama || ''); request.input('yapan', sql.NVarChar, aktifKullanici);
        const checkRes = await request.query(`SELECT ID FROM Mesai_Onaylari WHERE User_ID = @uid AND Tarih = @tarih`);
        if (checkRes.recordset.length > 0) {
            await request.query(`UPDATE Mesai_Onaylari SET Onaylanan_Dk = @onaylanan, Durum = @durum, Aciklama = @aciklama, Islemi_Yapan = @yapan, Islem_Zamani = GETDATE() WHERE User_ID = @uid AND Tarih = @tarih`);
        } else {
            await request.query(`INSERT INTO Mesai_Onaylari (User_ID, Tarih, Hesaplanan_Dk, Onaylanan_Dk, Durum, Aciklama, Islemi_Yapan) VALUES (@uid, @tarih, @hesaplanan, @onaylanan, @durum, @aciklama, @yapan)`);
        }
        res.json({ success: true, message: `Mesai işlemi başarıyla '${durum}' olarak kaydedildi.` });
    } catch (err) { res.status(500).json({ success: false, message: 'İşlem kaydedilemedi.' }); }
});

// 3. TOPLU MESAİ ONAY / RED İŞLEMİ
router.post('/overtimes/approve-bulk', verifyToken, validate(schemas.mesaiBulkOnaySchema), async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const { mesailer, durum, aciklama } = req.body;
    try {
        for (let item of mesailer) {
            const request = new sql.Request();
            request.input('uid', sql.Int, item.user_id); request.input('tarih', sql.Date, item.tarih); request.input('hesaplanan', sql.Int, item.hesaplanan_dk); request.input('onaylanan', sql.Int, durum === 'Reddedildi' ? 0 : item.onaylanan_dk); request.input('durum', sql.NVarChar, durum); request.input('aciklama', sql.NVarChar, aciklama || ''); request.input('yapan', sql.NVarChar, aktifKullanici);
            const checkRes = await request.query(`SELECT ID FROM Mesai_Onaylari WHERE User_ID = @uid AND Tarih = @tarih`);
            if (checkRes.recordset.length > 0) {
                await request.query(`UPDATE Mesai_Onaylari SET Onaylanan_Dk = @onaylanan, Durum = @durum, Aciklama = @aciklama, Islemi_Yapan = @yapan, Islem_Zamani = GETDATE() WHERE User_ID = @uid AND Tarih = @tarih`);
            } else {
                await request.query(`INSERT INTO Mesai_Onaylari (User_ID, Tarih, Hesaplanan_Dk, Onaylanan_Dk, Durum, Aciklama, Islemi_Yapan) VALUES (@uid, @tarih, @hesaplanan, @onaylanan, @durum, @aciklama, @yapan)`);
            }
        }
        res.json({ success: true, message: `${mesailer.length} personelin mesai durumu güncellendi.` });
    } catch (err) { res.status(500).json({ success: false, message: 'Toplu işlem kaydedilemedi.' }); }
});

module.exports = router;