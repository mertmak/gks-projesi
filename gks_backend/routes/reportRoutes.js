const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken } = require('../middlewares/auth');
const { parseTimeToMinutes } = require('../utils/dateHelper');

// GÜNCELLENEN YARDIMCI FONKSİYON: Saat bilgisini dakikaya çevirir
// GÜNLÜK PUANTAJ VE MOLA HESAPLAMA MOTORU
router.get('/reports/daily-attendance', verifyToken, async (req, res) => {
    const targetDate = req.query.tarih || new Date().toISOString().split('T')[0];

    try {
        const request = new sql.Request();
        request.input('tarih', sql.Date, targetDate);

        // YENİ: Izin_Durumu alt sorgusu eklendi!
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
                V.Calisma_Gunleri,
                (SELECT TOP 1 L.Zaman FROM Logs L JOIN Doors D ON L.Door_ID = D.ID 
                 WHERE L.RFID_Kart_No = U.RFID_Kart_No AND CAST(L.Zaman AS DATE) = @tarih AND D.Kapi_Turu = N'Ana Giriş' AND L.Basarili_Mi = 1 
                 ORDER BY L.Zaman ASC) AS Ilk_Giris,
                (SELECT TOP 1 L.Zaman FROM Logs L JOIN Doors D ON L.Door_ID = D.ID 
                 WHERE L.RFID_Kart_No = U.RFID_Kart_No AND CAST(L.Zaman AS DATE) = @tarih AND D.Kapi_Turu = N'Ana Çıkış' AND L.Basarili_Mi = 1 
                 ORDER BY L.Zaman DESC) AS Son_Cikis,
                (SELECT TOP 1 Izin_Turu FROM Izinler 
                 WHERE User_ID = U.ID AND @tarih BETWEEN Baslangic_Tarihi AND Bitis_Tarihi) AS Izin_Durumu
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

        // VERİYİ İŞLEME
        const reportData = userResult.recordset.map(row => {
            let durumText = 'Normal';
            let gecKalmaDk = 0; let erkenCikmaDk = 0; let toplamYemekDk = 0; let toplamMolaDk = 0;

            // HEDEF GÜNÜN HANGİ GÜN OLDUĞUNU BUL (0:Pazar, 1:Pzt, ... 6:Cmt)
            const targetDayIndex = new Date(targetDate).getDay();
            // Veritabanındaki metni sayı dizisine çevir (örn: '1,2,3,4,5' -> [1,2,3,4,5])
            const calismaGunleri = row.Calisma_Gunleri ? row.Calisma_Gunleri.split(',').map(Number) : [1,2,3,4,5];
            const isHaftaTatili = !calismaGunleri.includes(targetDayIndex); // Eğer bugünün indeksi dizide yoksa, tatildir!

            // 1. ÖNCELİK: İzinli mi?
            if (row.Izin_Durumu) {
                return { ...row, Durum: row.Izin_Durumu, Gec_Kalma_Dk: 0, Erken_Cikma_Dk: 0, Toplam_Yemek_Dk: 0, Toplam_Mola_Dk: 0, Mola_Asimi_Dk: 0 };
            }

            // 2. ÖNCELİK: Vardiyası var mı?
            if (!row.Vardiya_Adi) {
                return { ...row, Durum: 'Vardiya Yok', Gec_Kalma_Dk: 0, Erken_Cikma_Dk: 0, Toplam_Yemek_Dk: 0, Toplam_Mola_Dk: 0, Mola_Asimi_Dk: 0 };
            }

            // YENİ 3. ÖNCELİK: Hafta Tatili Kontrolü
            if (isHaftaTatili) {
                if (!row.Ilk_Giris) {
                    // Tatil gününde işe gelmediyse (olması gereken bu)
                    return { ...row, Durum: 'Hafta Tatili', Gec_Kalma_Dk: 0, Erken_Cikma_Dk: 0, Toplam_Yemek_Dk: 0, Toplam_Mola_Dk: 0, Mola_Asimi_Dk: 0 };
                } else {
                    // Tatil gününde kart bastıysa! (Fazla Mesai / Tatil Mesaisi)
                    durumText = 'Tatil Mesaisi';
                }
            } else if (!row.Ilk_Giris) {
                // Çalışma gününde gelmediyse
                return { ...row, Durum: 'Devamsız', Gec_Kalma_Dk: 0, Erken_Cikma_Dk: 0, Toplam_Yemek_Dk: 0, Toplam_Mola_Dk: 0, Mola_Asimi_Dk: 0 };
            }

            // ... GEÇ KALMA ERKEN ÇIKMA HESAPLARI (Sadece çalışma günüyse cezai işlem yap)
            if (!isHaftaTatili && row.Ilk_Giris) {
                const expectedStartMins = parseTimeToMinutes(row.Mesai_Baslangic);
                const expectedEndMins = parseTimeToMinutes(row.Mesai_Bitis);
                
                const ilkGirisDt = new Date(row.Ilk_Giris);
                const actualStartMins = ilkGirisDt.getUTCHours() * 60 + ilkGirisDt.getUTCMinutes();
                
                if (actualStartMins > (expectedStartMins + (row.Tolerans_Dk || 0))) {
                    gecKalmaDk = actualStartMins - expectedStartMins;
                    durumText = 'Geç Kaldı';
                }
                
                if (row.Son_Cikis) {
                    const sonCikisDt = new Date(row.Son_Cikis);
                    const actualEndMins = sonCikisDt.getUTCHours() * 60 + sonCikisDt.getUTCMinutes();
                    if (actualEndMins < expectedEndMins) {
                        erkenCikmaDk = expectedEndMins - actualEndMins;
                        durumText = durumText === 'Geç Kaldı' ? 'Geç Kaldı / Erken Çıktı' : 'Erken Çıktı';
                    }
                } else {
                    durumText = durumText === 'Geç Kaldı' ? 'Geç Kaldı / Çıkış Yok' : 'Çıkış Yok';
                }
            }
            // --- MOLA VE YEMEK SÜRESİ HESABI ---
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