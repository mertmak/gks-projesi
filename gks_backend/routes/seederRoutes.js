const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');
const { formatTimeStr, formatSqlDate } = require('../utils/dateHelper');
const socket = require('../utils/socket');

// Genişletilmiş Varsayılan Veri Havuzu
const defaultIsimler = ['Ali', 'Ayşe', 'Fatma', 'Ahmet', 'Mehmet', 'Can', 'Elif', 'Burak', 'Zeynep', 'Emre', 'Cem', 'Deniz', 'Eda', 'Ozan', 'Gökhan', 'Ceren', 'Tolga', 'Büşra', 'Sinan', 'Selin', 'Kaan'];
const defaultSoyisimler = ['Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Şahin', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Yıldız', 'Özdemir', 'Çetin', 'Koç', 'Güneş', 'Bulut', 'Yavuz', 'Tekin'];
const defaultDepartmanlar = ['İşletme', 'Bilgi İşlem', 'İnsan Kaynakları', 'Muhasebe', 'Pazarlama', 'Üretim', 'Lojistik', 'Güvenlik', 'Ar-Ge', 'Satın Alma'];
const defaultKapilar = ['Ana Giriş', 'Ana Çıkış', 'Yemekhane Giriş', 'Yemekhane Çıkış', 'Mola / Sigara Alanı', 'İç Geçiş', 'İç Geçiş', 'İç Geçiş'];

// Yardımcı Fonksiyonlar
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const parseCustomList = (str, defaultList) => str && str.trim().length > 0 ? str.split(',').map(s => s.trim()) : defaultList;

router.post('/seeder/run', verifyToken, verifyAdmin, async (req, res) => {
    const { 
        userAction, doorAction, logAction, kapiSayisi, personelSayisi, 
        vardiyaId, startDateStr, endDateStr,
        customIsimler, customSoyisimler, customDepartmanlar, customKapilar
    } = req.body;

    // Arayüzden gelen özel listeleri ayrıştır, boşsa varsayılanları kullan
    const seciliIsimler = parseCustomList(customIsimler, defaultIsimler);
    const seciliSoyisimler = parseCustomList(customSoyisimler, defaultSoyisimler);
    const seciliDepartmanlar = parseCustomList(customDepartmanlar, defaultDepartmanlar);
    const seciliKapilar = parseCustomList(customKapilar, defaultKapilar);

    const generateRandomUser = (index) => {
        const adSoyad = index === 0 ? 'Mert Mak' : `${getRandomItem(seciliIsimler)} ${getRandomItem(seciliSoyisimler)}`;
        const rfid = `${10000000000 + Math.floor(Math.random() * 89999999999)}`; 
        const tc = `${10000000000 + Math.floor(Math.random() * 89999999999)}`;   
        const sicil = `${10000 + Math.floor(Math.random() * 89999)}`;            
        const departman = index === 0 ? 'İşletme' : getRandomItem(seciliDepartmanlar);
        return { adSoyad, rfid, tc, sicil, departman };
    };

    try {
        const vardiyalarRes = await sql.query(`SELECT ID, Vardiya_Adi, Mesai_Baslangic, Mesai_Bitis, Yemek_Baslangic, Calisma_Gunleri FROM Vardiyalar WHERE ID = ${Number(vardiyaId)}`);
        if (vardiyalarRes.recordset.length === 0) return res.status(404).json({ success: false, message: 'Seçilen vardiya bulunamadı.' });

        const hedefVardiya = vardiyalarRes.recordset[0];
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        const vBaslangicSaat = parseInt((formatTimeStr(hedefVardiya.Mesai_Baslangic) || '09:00').split(':')[0]);
        const vBitisSaat = parseInt((formatTimeStr(hedefVardiya.Mesai_Bitis) || '18:00').split(':')[0]);
        const calismaGunleri = hedefVardiya.Calisma_Gunleri ? hedefVardiya.Calisma_Gunleri.split(',').map(Number) : [1, 2, 3, 4, 5];
        const vYemekStr = formatTimeStr(hedefVardiya.Yemek_Baslangic);
        let vYemek = vYemekStr ? parseInt(vYemekStr.split(':')[0]) : Math.floor((vBaslangicSaat + vBitisSaat) / 2);
        let vMola = Math.floor((vBaslangicSaat + vYemek) / 2);

        const forceResetLogs = logAction === 'reset_all' || userAction === 'reset' || doorAction === 'reset';
        const forceResetPermissions = userAction === 'reset' || doorAction === 'reset';

        const safeDelete = async (table) => {
            try { await sql.query(`DELETE FROM ${table}`); await sql.query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`); } catch (e) { }
        };

        if (forceResetLogs) await safeDelete('Logs');
        else if (logAction === 'overwrite') await sql.query(`DELETE FROM Logs WHERE CAST(Zaman AS DATE) >= '${startDateStr}' AND CAST(Zaman AS DATE) <= '${endDateStr}'`);

        if (forceResetPermissions) await safeDelete('Permissions');
        
        if (userAction === 'reset') {
            await safeDelete('Personel_Vardiya'); await safeDelete('Izinler'); await safeDelete('Users');
        }
        if (doorAction === 'reset') await safeDelete('Doors');

        let doors = [];
        if (doorAction === 'reset' || doorAction === 'append') {
            for (let i = 1; i <= Number(kapiSayisi); i++) {
                const tur = seciliKapilar[i % seciliKapilar.length];
                const kapiAd = customKapilar ? `${tur}` : `${100 + i} - ${tur}`; // Özelse direkt ismi al, değilse numara ver
                const temizTur = tur.includes('-') ? tur.split('-')[1].trim() : tur; // Örn: "Arge-İç Geçiş" için türü ayrıştır
                const finalTur = ['Ana Giriş', 'Ana Çıkış', 'Yemekhane Giriş', 'Yemekhane Çıkış', 'Mola / Sigara Alanı'].includes(temizTur) ? temizTur : 'İç Geçiş';
                
                await sql.query(`INSERT INTO Doors (Kapi_Adi, Departman, Konum, Kapi_Turu, Durum) VALUES (N'${kapiAd}', 'Genel', 'Belirtilmedi', N'${finalTur}', 1)`);
            }
        }
        
        const dbDoors = await sql.query(`SELECT ID as id, Kapi_Turu as tur FROM Doors WHERE Durum = 1`);
        doors = dbDoors.recordset;
        if (doors.length === 0) return res.status(400).json({ success: false, message: 'Aktif kapı bulunamadı. Lütfen kapı üretmeyi seçin.' });

        if (userAction === 'reset' || userAction === 'append') {
            for (let i = 0; i < Number(personelSayisi); i++) {
                const u = generateRandomUser(i);
                await sql.query(`INSERT INTO Users (Ad_Soyad, RFID_Kart_No, TC_Kimlik, Sicil_No, Departman, Durum, Ise_Giris_Tarihi) VALUES (N'${u.adSoyad}', '${u.rfid}', '${u.tc}', '${u.sicil}', N'${u.departman}', 1, CAST('${startDateStr}' AS DATE))`);
            }
        }
        
        const dbUsers = await sql.query(`SELECT ID as id, RFID_Kart_No as rfid, Ad_Soyad as adSoyad FROM Users WHERE Durum = 1`);
        const users = dbUsers.recordset;
        if (users.length === 0) return res.status(400).json({ success: false, message: 'Aktif personel bulunamadı.' });

        // Vardiya Atamaları (Zaman Makinesi)
        await sql.query(`DELETE FROM Personel_Vardiya WHERE Baslangic_Tarihi = CAST('${startDateStr}' AS DATE)`);
        await sql.query(`UPDATE Personel_Vardiya SET Bitis_Tarihi = DATEADD(day, -1, CAST('${startDateStr}' AS DATE)) WHERE Bitis_Tarihi IS NULL AND Baslangic_Tarihi < CAST('${startDateStr}' AS DATE)`);
        await sql.query(`INSERT INTO Personel_Vardiya (User_ID, Vardiya_ID, Baslangic_Tarihi) SELECT ID, ${hedefVardiya.ID}, CAST('${startDateStr}' AS DATE) FROM Users WHERE Durum = 1`);

        // YENİ: RASTGELE YETKİLENDİRME (Ana kapılar herkese, iç kapılar rastgele)
        if (forceResetPermissions || userAction === 'append' || doorAction === 'append') {
            await sql.query(`
                INSERT INTO Permissions (User_ID, Door_ID)
                SELECT U.ID, D.ID FROM Users U CROSS JOIN Doors D
                WHERE U.Durum = 1 AND D.Durum = 1
                AND (D.Kapi_Turu IN (N'Ana Giriş', N'Ana Çıkış', N'Yemekhane Giriş', N'Yemekhane Çıkış') OR (ABS(CHECKSUM(NEWID())) % 100) > 60)
                AND NOT EXISTS (SELECT 1 FROM Permissions P WHERE P.User_ID = U.ID AND P.Door_ID = D.ID)
            `);
        }

        // LOG ÜRETİMİ (Geniş Sapmalar ve Hatalı Geçişler)
        let logValues = [];
        for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
            const islemTarihi = new Date(dt);
            if (!calismaGunleri.includes(islemTarihi.getDay())) continue;
            
            for (let u of users) {
                if (Math.random() < 0.05 && u.adSoyad !== 'Mert Mak') continue; // %5 ihtimalle o gün işe gelmedi

                const anaGirisler = doors.filter(d => d.tur === 'Ana Giriş');
                const anaCikislar = doors.filter(d => d.tur === 'Ana Çıkış');
                
                // YENİ: Ana Giriş (Gerçekçi Sapma: -30 ile +45 dakika arası)
                if (anaGirisler.length > 0) {
                    let girisDate = new Date(islemTarihi);
                    girisDate.setHours(vBaslangicSaat, 0, 0, 0);
                    let sapmaDk = Math.floor(Math.random() * 75) - 30; // -30 dk erken, +45 dk geç
                    girisDate.setMinutes(sapmaDk);
                    
                    // %5 ihtimalle kartı yanlış okuttu (Başarısız log), 1 dk sonra tekrar bastı
                    if (Math.random() < 0.05) {
                        let failDate = new Date(girisDate); failDate.setMinutes(failDate.getMinutes() - 1);
                        logValues.push(`('${u.rfid}', ${anaGirisler[0].id}, 0, '${formatSqlDate(failDate)}')`);
                    }
                    logValues.push(`('${u.rfid}', ${anaGirisler[0].id}, 1, '${formatSqlDate(girisDate)}')`);
                }

                // İç Geçiş ve Mola
                if (Math.random() > 0.3) { // %70 ihtimalle molaya çıktı
                    const molaAlanlari = doors.filter(d => d.tur === 'Mola / Sigara Alanı');
                    const icGecisler = doors.filter(d => d.tur === 'İç Geçiş');
                    if (molaAlanlari.length > 0 && icGecisler.length > 0) {
                        let molaGiris = new Date(islemTarihi); molaGiris.setHours(vMola, Math.floor(Math.random() * 30), 0, 0);
                        let molaCikis = new Date(molaGiris); molaCikis.setMinutes(molaCikis.getMinutes() + Math.floor(Math.random() * 25) + 5); 
                        logValues.push(`('${u.rfid}', ${getRandomItem(molaAlanlari).id}, 1, '${formatSqlDate(molaGiris)}')`);
                        
                        // %5 İç Kapı Yetkisiz Erişim Denemesi
                        if (Math.random() < 0.05) {
                            logValues.push(`('${u.rfid}', ${getRandomItem(icGecisler).id}, 0, '${formatSqlDate(molaGiris)}')`);
                        }
                        logValues.push(`('${u.rfid}', ${getRandomItem(icGecisler).id}, 1, '${formatSqlDate(molaCikis)}')`);
                    }
                }

                // Yemek
                const yemekGirisler = doors.filter(d => d.tur === 'Yemekhane Giriş');
                const yemekCikislar = doors.filter(d => d.tur === 'Yemekhane Çıkış');
                if (yemekGirisler.length > 0 && yemekCikislar.length > 0) {
                    let yGiris = new Date(islemTarihi); yGiris.setHours(vYemek, Math.floor(Math.random() * 20), 0, 0);
                    let yCikis = new Date(yGiris); yCikis.setMinutes(yCikis.getMinutes() + Math.floor(Math.random() * 20) + 30); 
                    logValues.push(`('${u.rfid}', ${yemekGirisler[0].id}, 1, '${formatSqlDate(yGiris)}')`);
                    logValues.push(`('${u.rfid}', ${yemekCikislar[0].id}, 1, '${formatSqlDate(yCikis)}')`);
                }

                // YENİ: Ana Çıkış (Gerçekçi Sapma: -15 ile +90 dakika arası)
                if (anaCikislar.length > 0) {
                    let cikisDate = new Date(islemTarihi);
                    cikisDate.setHours(vBitisSaat, 0, 0, 0);
                    let sapmaDk = Math.floor(Math.random() * 105) - 15; // -15 dk erken, +90 dk fazla mesai
                    cikisDate.setMinutes(sapmaDk);
                    logValues.push(`('${u.rfid}', ${anaCikislar[0].id}, 1, '${formatSqlDate(cikisDate)}')`);
                }
            }
        }
        
        let basariliKayit = 0;
        if (logValues.length > 0) {
            const CHUNK = 1000;
            for (let i = 0; i < logValues.length; i += CHUNK) {
                const chunk = logValues.slice(i, i + CHUNK);
                await sql.query(`INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi, Zaman) VALUES ${chunk.join(',')}`);
                basariliKayit += chunk.length;
            }
        }
        socket.getIO().emit('users_updated'); socket.getIO().emit('doors_updated'); socket.getIO().emit('system_updated'); socket.getIO().emit('new_rfid_log'); 
        res.json({ success: true, message: `Simülasyon tamamlandı! ${basariliKayit} adet log ve rastgele yetkiler işlendi.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Veri üretimi sırasında bir hata oluştu.' });
    }
});

module.exports = router;