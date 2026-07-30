const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken } = require('../middlewares/auth');

// GÜNCELLENEN YARDIMCI FONKSİYON: Saat bilgisini dakikaya çevirir
// Node.js'in saat dilimi (Timezone) eklemesini engellemek için sadece saati ve dakikayı alıyoruz.
const parseTimeToMinutes = (timeObj) => {
    if (!timeObj) return 0;
    
    // Eğer bir Date nesnesi ise (SQL'den gelmişse)
    if (timeObj instanceof Date) {
        // .getUTCHours() KULLANMIYORUZ! UTC'ye çevirmeden, doğrudan saati string'den çekiyoruz
        const timeStr = timeObj.toISOString().split('T')[1].substring(0, 5);
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    
    // Eğer '09:00' veya '09:00:00' şeklinde düz bir string gelmişse
    const parts = timeObj.toString().split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// GÜNLÜK PUANTAJ VE MOLA HESAPLAMA MOTORU
router.get('/reports/daily-attendance', verifyToken, async (req, res) => {
    const targetDate = req.query.tarih || new Date().toISOString().split('T')[0];

    try {
        const request = new sql.Request();
        request.input('tarih', sql.Date, targetDate);

        // DÜZELTME 1: Kapi_Turu sorgularındaki kelimelerin başına 'N' takısı eklendi (N'Ana Giriş')
        const userQuery = `
            SELECT 
                U.ID as User_ID, 
                U.Ad_Soyad, 
                U.Sicil_No, 
                U.Departman,
                U.RFID_Kart_No,
                V.Vardiya_Adi, 
                V.Mesai_Baslangic, 
                V.Mesai_Bitis, 
                V.Tolerans_Dk,
                V.Mola_Hakki_Dk,
                (SELECT TOP 1 L.Zaman FROM Logs L JOIN Doors D ON L.Door_ID = D.ID 
                 WHERE L.RFID_Kart_No = U.RFID_Kart_No AND CAST(L.Zaman AS DATE) = @tarih AND D.Kapi_Turu = N'Ana Giriş' AND L.Basarili_Mi = 1 
                 ORDER BY L.Zaman ASC) AS Ilk_Giris,
                (SELECT TOP 1 L.Zaman FROM Logs L JOIN Doors D ON L.Door_ID = D.ID 
                 WHERE L.RFID_Kart_No = U.RFID_Kart_No AND CAST(L.Zaman AS DATE) = @tarih AND D.Kapi_Turu = N'Ana Çıkış' AND L.Basarili_Mi = 1 
                 ORDER BY L.Zaman DESC) AS Son_Cikis
            FROM Users U
            LEFT JOIN Personel_Vardiya PV ON U.ID = PV.User_ID AND PV.Bitis_Tarihi IS NULL
            LEFT JOIN Vardiyalar V ON PV.Vardiya_ID = V.ID
            WHERE U.Durum = 1
        `;

        const logQuery = `
            SELECT L.RFID_Kart_No, L.Zaman, D.Kapi_Turu 
            FROM Logs L 
            JOIN Doors D ON L.Door_ID = D.ID 
            WHERE CAST(L.Zaman AS DATE) = @tarih AND L.Basarili_Mi = 1 
            ORDER BY L.Zaman ASC
        `;

        const [userResult, logResult] = await Promise.all([
            request.query(userQuery),
            request.query(logQuery)
        ]);

        const allLogs = logResult.recordset;

        const reportData = userResult.recordset.map(row => {
            let durumText = 'Normal';
            let gecKalmaDk = 0;
            let erkenCikmaDk = 0;
            
            let toplamYemekDk = 0;
            let toplamMolaDk = 0;

            if (!row.Vardiya_Adi) {
                return { ...row, Durum: 'Vardiya Yok', Gec_Kalma_Dk: 0, Erken_Cikma_Dk: 0, Toplam_Yemek_Dk: 0, Toplam_Mola_Dk: 0, Mola_Asimi_Dk: 0 };
            }

            if (!row.Ilk_Giris) {
                return { ...row, Durum: 'Devamsız', Gec_Kalma_Dk: 0, Erken_Cikma_Dk: 0, Toplam_Yemek_Dk: 0, Toplam_Mola_Dk: 0, Mola_Asimi_Dk: 0 };
            }

// --- 1. GEÇ KALMA VE ERKEN ÇIKMA HESABI ---
            const expectedStartMins = parseTimeToMinutes(row.Mesai_Baslangic);
            const expectedEndMins = parseTimeToMinutes(row.Mesai_Bitis);
            
            const ilkGirisDt = new Date(row.Ilk_Giris);
            // KESİN ÇÖZÜM: node-mssql DB'deki ham saati UTC nesnesi olarak oluşturduğu için,
            // +3 saat (Türkiye) eklemesini engellemek adına .getUTCHours() kullanmalıyız!
            const actualStartMins = ilkGirisDt.getUTCHours() * 60 + ilkGirisDt.getUTCMinutes();
            
            if (actualStartMins > (expectedStartMins + (row.Tolerans_Dk || 0))) {
                gecKalmaDk = actualStartMins - expectedStartMins;
                durumText = 'Geç Kaldı';
            }

            if (row.Son_Cikis) {
                const sonCikisDt = new Date(row.Son_Cikis);
                // Burada da aynı şekilde .getUTCHours() kullanıyoruz.
                const actualEndMins = sonCikisDt.getUTCHours() * 60 + sonCikisDt.getUTCMinutes();
                
                if (actualEndMins < expectedEndMins) {
                    erkenCikmaDk = expectedEndMins - actualEndMins;
                    durumText = durumText === 'Geç Kaldı' ? 'Geç Kaldı / Erken Çıktı' : 'Erken Çıktı';
                }
            } else {
                durumText = durumText === 'Geç Kaldı' ? 'Geç Kaldı / Çıkış Yok' : 'Çıkış Yok';
            }

            const userLogs = allLogs.filter(l => l.RFID_Kart_No === row.RFID_Kart_No);
            
            let yemekBaslangicTarihi = null;
            let molaBaslangicTarihi = null;

            userLogs.forEach(log => {
                const kapi = log.Kapi_Turu;
                const zaman = new Date(log.Zaman);

                if (kapi === 'Yemekhane Giriş') {
                    yemekBaslangicTarihi = zaman;
                } else if (kapi === 'Yemekhane Çıkış' && yemekBaslangicTarihi) {
                    toplamYemekDk += Math.floor((zaman - yemekBaslangicTarihi) / 60000);
                    yemekBaslangicTarihi = null; 
                }

                if (kapi === 'Mola / Sigara Alanı') {
                    if (!molaBaslangicTarihi) molaBaslangicTarihi = zaman;
                } else if (molaBaslangicTarihi && kapi !== 'Mola / Sigara Alanı') {
                    toplamMolaDk += Math.floor((zaman - molaBaslangicTarihi) / 60000);
                    molaBaslangicTarihi = null; 
                }
            });

            let molaAsimiDk = 0;
            if (row.Mola_Hakki_Dk > 0 && toplamMolaDk > row.Mola_Hakki_Dk) {
                molaAsimiDk = toplamMolaDk - row.Mola_Hakki_Dk;
                durumText = durumText === 'Normal' ? 'Mola Aşımı' : durumText + ' / Mola Aşımı';
            }

            return {
                ...row,
                Gec_Kalma_Dk: gecKalmaDk,
                Erken_Cikma_Dk: erkenCikmaDk,
                Toplam_Yemek_Dk: toplamYemekDk,
                Toplam_Mola_Dk: toplamMolaDk,
                Mola_Asimi_Dk: molaAsimiDk,
                Durum: durumText
            };
        });

        res.json(reportData);
    } catch (err) {
        console.error("Günlük Puantaj Hesaplama Hatası:", err);
        res.status(500).json({ success: false, message: 'Puantaj hesaplanamadı.' });
    }
});

module.exports = router;