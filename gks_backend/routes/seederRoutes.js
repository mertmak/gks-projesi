const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

const isimler = ['Ali', 'Ayşe', 'Fatma', 'Ahmet', 'Mehmet', 'Can', 'Elif', 'Burak', 'Zeynep', 'Emre', 'Cem', 'Deniz', 'Eda', 'Ozan', 'Gökhan'];
const soyisimler = ['Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Şahin', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Yıldız', 'Özdemir', 'Çetin', 'Koç'];
const departmanlar = ['İşletme', 'Bilgi İşlem', 'İnsan Kaynakları', 'Muhasebe', 'Pazarlama', 'Üretim', 'Lojistik', 'Güvenlik'];

// SADECE RAKAMLARDAN OLUŞAN VERİ ÜRETİMİ
const generateRandomUser = (index) => {
    const adSoyad = index === 0 ? 'Mert Mak' : `${isimler[Math.floor(Math.random() * isimler.length)]} ${soyisimler[Math.floor(Math.random() * soyisimler.length)]}`;
    const rfid = `${Math.floor(1000000000 + Math.random() * 9000000000)}`; // 10 Haneli Saf Sayı
    const tc = `1${Math.floor(100000000 + Math.random() * 900000000)}`; // 11 Haneli Saf Sayı
    const sicil = `${10000 + Math.floor(Math.random() * 89999)}`; // 5 Haneli Saf Sayı
    const departman = index === 0 ? 'İşletme' : departmanlar[Math.floor(Math.random() * departmanlar.length)];
    return { adSoyad, rfid, tc, sicil, departman };
};

const formatTimeStr = (dbTime) => {
    if (!dbTime) return null;
    if (dbTime instanceof Date) return dbTime.toISOString().split('T')[1].substring(0, 5);
    return dbTime.toString().substring(0, 5);
};
const formatSqlDate = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

router.post('/seeder/run', verifyToken, verifyAdmin, async (req, res) => {
    const { userAction, doorAction, logAction, kapiSayisi, personelSayisi, vardiyaId, startDateStr, endDateStr } = req.body;

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
            try { 
                await sql.query(`DELETE FROM ${table}`); 
                await sql.query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
            } catch (e) { }
        };

        if (forceResetLogs) {
            await safeDelete('Logs');
        } else if (logAction === 'overwrite') {
            await sql.query(`DELETE FROM Logs WHERE CAST(Zaman AS DATE) >= '${startDateStr}' AND CAST(Zaman AS DATE) <= '${endDateStr}'`);
        } 

        if (forceResetPermissions) await safeDelete('Permissions');
        
        if (userAction === 'reset') {
            await safeDelete('Personel_Vardiya');
            await safeDelete('Izinler');
            await safeDelete('Users');
        }
        if (doorAction === 'reset') await safeDelete('Doors');

        let doors = [];
        if (doorAction === 'reset' || doorAction === 'append') {
            const kapiTipleri = ['Ana Giriş', 'Ana Çıkış', 'Yemekhane Giriş', 'Yemekhane Çıkış', 'Mola / Sigara Alanı', 'İç Geçiş'];
            for (let i = 1; i <= Number(kapiSayisi); i++) {
                const tur = kapiTipleri[i % kapiTipleri.length];
                // KAPI ADI SADECE RAKAMDAN OLUŞACAK (Örn: 101, 102...)
                const kapiNo = 100 + i; 
                await sql.query(`INSERT INTO Doors (Kapi_Adi, Departman, Konum, Kapi_Turu, Durum) VALUES (N'${kapiNo}', 'Genel', 'Zemin Kat', N'${tur}', 1)`);
            }
        }
        const dbDoors = await sql.query(`SELECT ID as id, Kapi_Turu as tur FROM Doors WHERE Durum = 1`);
        doors = dbDoors.recordset;
        if (doors.length === 0) return res.status(400).json({ success: false, message: 'Aktif kapı bulunamadı. Lütfen kapı üretmeyi seçin.' });

        if (userAction === 'reset' || userAction === 'append') {
            for (let i = 0; i < Number(personelSayisi); i++) {
                const u = generateRandomUser(i);
                const resUser = await sql.query(`INSERT INTO Users (Ad_Soyad, RFID_Kart_No, TC_Kimlik, Sicil_No, Departman, Durum, Ise_Giris_Tarihi) OUTPUT INSERTED.ID VALUES (N'${u.adSoyad}', '${u.rfid}', '${u.tc}', '${u.sicil}', N'${u.departman}', 1, CAST(GETDATE() AS DATE))`);
                await sql.query(`INSERT INTO Personel_Vardiya (User_ID, Vardiya_ID, Baslangic_Tarihi) VALUES (${resUser.recordset[0].ID}, ${hedefVardiya.ID}, CAST(GETDATE() AS DATE))`);
            }
        }
        const dbUsers = await sql.query(`SELECT ID as id, RFID_Kart_No as rfid, Ad_Soyad as adSoyad FROM Users WHERE Durum = 1`);
        const users = dbUsers.recordset;
        if (users.length === 0) return res.status(400).json({ success: false, message: 'Aktif personel bulunamadı.' });

        if (forceResetPermissions || userAction === 'append' || doorAction === 'append') {
            await sql.query(`
                INSERT INTO Permissions (User_ID, Door_ID)
                SELECT U.ID, D.ID FROM Users U CROSS JOIN Doors D
                WHERE U.Durum = 1 AND D.Durum = 1
                AND NOT EXISTS (SELECT 1 FROM Permissions P WHERE P.User_ID = U.ID AND P.Door_ID = D.ID)
            `);
        }

        let logValues = [];
        for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
            const islemTarihi = new Date(dt);
            if (!calismaGunleri.includes(islemTarihi.getDay())) continue;
            
            for (let u of users) {
                if (Math.random() < 0.05 && u.adSoyad !== 'Mert Mak') continue; 

                const anaGirisler = doors.filter(d => d.tur === 'Ana Giriş');
                const anaCikislar = doors.filter(d => d.tur === 'Ana Çıkış');
                
                if (anaGirisler.length > 0) {
                    let girisDate = new Date(islemTarihi);
                    girisDate.setHours(vBaslangicSaat, 0, 0, 0);
                    if (Math.random() > 0.8) girisDate.setMinutes(Math.floor(Math.random() * 15) + 1); 
                    else girisDate.setMinutes(-(Math.floor(Math.random() * 10) + 5)); 
                    logValues.push(`('${u.rfid}', ${anaGirisler[0].id}, 1, '${formatSqlDate(girisDate)}')`);
                }

                if (Math.random() > 0.5) {
                    const molaAlanlari = doors.filter(d => d.tur === 'Mola / Sigara Alanı');
                    const icGecisler = doors.filter(d => d.tur === 'İç Geçiş');
                    if (molaAlanlari.length > 0 && icGecisler.length > 0) {
                        let molaGiris = new Date(islemTarihi); molaGiris.setHours(vMola, Math.floor(Math.random() * 15) + 30, 0, 0);
                        let molaCikis = new Date(molaGiris); molaCikis.setMinutes(molaCikis.getMinutes() + Math.floor(Math.random() * 25) + 5); 
                        logValues.push(`('${u.rfid}', ${molaAlanlari[0].id}, 1, '${formatSqlDate(molaGiris)}')`);
                        logValues.push(`('${u.rfid}', ${icGecisler[0].id}, 1, '${formatSqlDate(molaCikis)}')`);
                    }
                }

                const yemekGirisler = doors.filter(d => d.tur === 'Yemekhane Giriş');
                const yemekCikislar = doors.filter(d => d.tur === 'Yemekhane Çıkış');
                if (yemekGirisler.length > 0 && yemekCikislar.length > 0) {
                    let yGiris = new Date(islemTarihi); yGiris.setHours(vYemek, Math.floor(Math.random() * 10), 30, 0);
                    let yCikis = new Date(yGiris); yCikis.setMinutes(yCikis.getMinutes() + Math.floor(Math.random() * 15) + 40); 
                    logValues.push(`('${u.rfid}', ${yemekGirisler[0].id}, 1, '${formatSqlDate(yGiris)}')`);
                    logValues.push(`('${u.rfid}', ${yemekCikislar[0].id}, 1, '${formatSqlDate(yCikis)}')`);
                }

                if (anaCikislar.length > 0) {
                    let cikisDate = new Date(islemTarihi);
                    cikisDate.setHours(vBitisSaat, 0, 0, 0);
                    if (Math.random() < 0.1) cikisDate.setMinutes(-(Math.floor(Math.random() * 15) + 1)); 
                    else cikisDate.setMinutes(Math.floor(Math.random() * 30) + 1); 
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
        
        res.json({ success: true, message: `İşlem tamamlandı! ${basariliKayit} adet log başarıyla işlendi.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Veri üretimi sırasında bir hata oluştu.' });
    }
});

module.exports = router;