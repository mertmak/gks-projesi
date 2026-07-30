const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');
const { addSystemLog } = require('../utils/logger');

// Generate Unique Sistem ID Yardımcı Fonksiyonu
const generateUniqueSistemId = async () => {
    let isUnique = false;
    let newId = '';
    while (!isUnique) {
        newId = Math.floor(10000000000 + Math.random() * 90000000000).toString();
        const req = new sql.Request();
        req.input('checkId', sql.NVarChar, newId);
        const check = await req.query(`SELECT ID FROM Users WHERE Sistem_ID = @checkId`);
        if (check.recordset.length === 0) isUnique = true;
    }
    return newId;
};

// ============================================
// 1. BÖLÜM: TOPLU İŞLEMLER (Önce Çalışmalı Ki Rota Çakışması Olmasın)
// ============================================

router.post('/users/bulk/shift', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const { hedef_turu, hedef_deger, vardiya_id } = req.body;

    try {
        const request = new sql.Request();
        if (hedef_deger) request.input('deger', sql.NVarChar, hedef_deger);
        
        // YENİ: "Tumu" seçeneği için dinamik koşul
        let condition = '1=1';
        if (hedef_turu === 'Sirket') condition = 'Sirket = @deger';
        else if (hedef_turu === 'Departman') condition = 'Departman = @deger';

        const usersRes = await request.query(`SELECT ID FROM Users WHERE Durum = 1 AND ${condition}`);
        const affectedUsers = usersRes.recordset;

        if (affectedUsers.length === 0) {
            return res.status(404).json({ success: false, message: 'Bu kritere uygun aktif personel bulunamadı.' });
        }

        let shiftName = 'İptal Edildi';
        if (vardiya_id) {
            const shiftReq = new sql.Request();
            shiftReq.input('vid', sql.Int, Number(vardiya_id)); 
            const shiftRes = await shiftReq.query('SELECT Vardiya_Adi FROM Vardiyalar WHERE ID = @vid');
            if (shiftRes.recordset.length > 0) shiftName = shiftRes.recordset[0].Vardiya_Adi;
        }

        for (let user of affectedUsers) {
            const reqUser = new sql.Request();
            reqUser.input('uid', sql.Int, user.ID);
            
            await reqUser.query(`
                UPDATE Personel_Vardiya 
                SET Bitis_Tarihi = CAST(GETDATE() AS DATE) 
                WHERE User_ID = @uid AND Bitis_Tarihi IS NULL
            `);

            if (vardiya_id) {
                reqUser.input('vid', sql.Int, Number(vardiya_id)); 
                await reqUser.query(`
                    INSERT INTO Personel_Vardiya (User_ID, Vardiya_ID, Baslangic_Tarihi) 
                    VALUES (@uid, @vid, CAST(GETDATE() AS DATE))
                `);
            }
        }

        const logHedef = hedef_turu === 'Tumu' ? 'Sistemdeki Tüm Personeller' : hedef_deger;
        await addSystemLog(aktifKullanici, 'TOPLU VARDİYA', logHedef, '', `${hedef_turu}: ${logHedef} kriterine uyan ${affectedUsers.length} personele "${shiftName}" atandı.`);
        res.json({ success: true, message: `${affectedUsers.length} personel için vardiya güncellendi.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Toplu atama başarısız oldu.' });
    }
});

router.post('/users/bulk/doors', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const { hedef_turu, hedef_deger, doorIds } = req.body;

    try {
        const request = new sql.Request();
        if (hedef_deger) request.input('deger', sql.NVarChar, hedef_deger);
        
        let condition = '1=1';
        if (hedef_turu === 'Sirket') condition = 'Sirket = @deger';
        else if (hedef_turu === 'Departman') condition = 'Departman = @deger';
        
        const usersRes = await request.query(`SELECT ID FROM Users WHERE Durum = 1 AND ${condition}`);
        const affectedUsers = usersRes.recordset;

        if (affectedUsers.length === 0) return res.status(404).json({ success: false, message: 'Bu kritere uygun aktif personel bulunamadı.' });

        for (let user of affectedUsers) {
            const reqUser = new sql.Request();
            reqUser.input('uid', sql.Int, user.ID);
            
            await reqUser.query(`
                DELETE FROM Permissions 
                WHERE User_ID = @uid AND Door_ID IN (SELECT ID FROM Doors WHERE Durum = 1 OR Durum IS NULL)
            `);

            if (doorIds && doorIds.length > 0) {
                for (let doorId of doorIds) {
                    const reqInsert = new sql.Request();
                    reqInsert.input('uid', sql.Int, user.ID);
                    reqInsert.input('did', sql.Int, Number(doorId)); 
                    await reqInsert.query(`INSERT INTO Permissions (User_ID, Door_ID) VALUES (@uid, @did)`);
                }
            }
        }

        const yetkiDurumu = doorIds?.length > 0 ? `${doorIds.length} adet kapıya yetki verildi.` : 'Tüm yetkiler kaldırıldı.';
        const logHedef = hedef_turu === 'Tumu' ? 'Sistemdeki Tüm Personeller' : hedef_deger;
        await addSystemLog(aktifKullanici, 'TOPLU YETKİ', logHedef, '', `${hedef_turu}: ${logHedef} grubundaki ${affectedUsers.length} personele işlem yapıldı. ${yetkiDurumu}`);
        
        res.json({ success: true, message: `${affectedUsers.length} personel için yetkiler başarıyla güncellendi.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Toplu yetkilendirme başarısız oldu.' });
    }
});

router.post('/users/bulk/status', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const { hedef_turu, hedef_deger, durum, cikis_tarihi, cikis_nedeni } = req.body;

    try {
        const request = new sql.Request();
        if (hedef_deger) request.input('deger', sql.NVarChar, hedef_deger);
        
        const arananDurum = durum === 0 ? 1 : 0; 
        
        let condition = '1=1';
        if (hedef_turu === 'Sirket') condition = 'Sirket = @deger';
        else if (hedef_turu === 'Departman') condition = 'Departman = @deger';
        
        const usersRes = await request.query(`SELECT ID FROM Users WHERE Durum = ${arananDurum} AND ${condition}`);
        const affectedUsers = usersRes.recordset;

        if (affectedUsers.length === 0) return res.status(404).json({ success: false, message: `Bu kritere uygun işlem yapılabilecek personel bulunamadı (Belki hepsi zaten istenilen durumda).` });

        for (let user of affectedUsers) {
            const reqUser = new sql.Request();
            reqUser.input('uid', sql.Int, user.ID);
            reqUser.input('durum', sql.Bit, durum);
            
            if (durum === 0) {
                reqUser.input('ct', sql.Date, cikis_tarihi);
                reqUser.input('cn', sql.NVarChar, cikis_nedeni || '');
                await reqUser.query(`UPDATE Users SET Durum = @durum, Isten_Cikis_Tarihi = @ct, Cikis_Nedeni = @cn WHERE ID = @uid`);
            } else {
                await reqUser.query(`UPDATE Users SET Durum = @durum, Isten_Cikis_Tarihi = NULL, Cikis_Nedeni = NULL WHERE ID = @uid`);
            }
        }

        const islem = durum === 1 ? 'TOPLU İŞE ALIM' : 'TOPLU İŞTEN ÇIKIŞ';
        const logHedef = hedef_turu === 'Tumu' ? 'Sistemdeki Tüm Personeller' : hedef_deger;
        await addSystemLog(aktifKullanici, islem, logHedef, '', `${hedef_turu}: ${logHedef} grubundaki ${affectedUsers.length} personelin durumu güncellendi.`);
        
        res.json({ success: true, message: `${affectedUsers.length} personelin sistem durumu başarıyla güncellendi.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Toplu durum işlemi başarısız oldu.' });
    }
});


// ============================================
// 2. BÖLÜM: BİREYSEL İŞLEMLER (GET, POST, :id)
// ============================================

router.get('/users', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `SELECT TOP 2000 * FROM Users WHERE 1=1`;
        const request = new sql.Request();
        if (baslangic) { query += ` AND (Ise_Giris_Tarihi >= @baslangic OR Ise_Giris_Tarihi IS NULL)`; request.input('baslangic', sql.Date, baslangic); }
        if (bitis) { query += ` AND (Ise_Giris_Tarihi <= @bitis OR Ise_Giris_Tarihi IS NULL)`; request.input('bitis', sql.Date, bitis); }
        if (arama) { query += ` AND (Ad_Soyad LIKE @arama OR Sicil_No LIKE @arama OR TC_Kimlik LIKE @arama)`; request.input('arama', sql.NVarChar, `%${arama}%`); }
        query += ` ORDER BY ID DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Personeller getirilemedi.' });
    }
});

router.post('/users', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const { ad_soyad, rfid, tc, sicil, sirket, departman, gorev, ise_giris } = req.body;

    if (!ad_soyad || !tc || !sicil) return res.status(400).json({ success: false, message: 'Ad, TC ve Kurum Sicil No zorunludur!' });

    let finalRfid = `KART_YOK_${Date.now()}`;
    if (rfid && typeof rfid === 'string' && rfid.trim() !== '') finalRfid = rfid.trim();
    const finalIseGiris = (ise_giris && ise_giris.trim() !== '') ? ise_giris : new Date().toISOString().split('T')[0];

    try {
        const request = new sql.Request();
        request.input('tc', sql.NVarChar, tc);
        request.input('sicil', sql.NVarChar, sicil);

        const checkDuplicate = await request.query(`SELECT ID FROM Users WHERE TC_Kimlik = @tc OR Sicil_No = @sicil`);
        if (checkDuplicate.recordset.length > 0) return res.status(400).json({ success: false, message: 'Bu T.C. veya Sicil No sistemde kayıtlı!' });

        const sistemId = await generateUniqueSistemId();

        request.input('ad', sql.NVarChar, ad_soyad);
        request.input('rfid', sql.NVarChar, finalRfid);
        request.input('sirket', sql.NVarChar, sirket || '');
        request.input('departman', sql.NVarChar, departman || '');
        request.input('gorev', sql.NVarChar, gorev || '');
        request.input('sistemId', sql.NVarChar, sistemId);
        request.input('ise_giris', sql.Date, finalIseGiris);

        await request.query(`
            INSERT INTO Users (Ad_Soyad, RFID_Kart_No, TC_Kimlik, Sicil_No, Sirket, Departman, Gorev, Durum, Sistem_ID, Ise_Giris_Tarihi) 
            VALUES (@ad, @rfid, @tc, @sicil, @sirket, @departman, @gorev, 1, @sistemId, @ise_giris)
        `);
        
        await addSystemLog(aktifKullanici, 'YENİ KAYIT', ad_soyad, sicil, `Sisteme yeni eklendi. Departman: ${departman || '-'}`);
        res.json({ success: true, message: 'Personel başarıyla eklendi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kayıt Hatası: ' + err.message });
    }
});

router.put('/users/:id', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const { ad_soyad, rfid, tc, sicil, sirket, departman, gorev, ise_giris } = req.body;
    const currentUserId = req.params.id;

    let finalRfid = `KART_YOK_${Date.now()}`;
    if (rfid && typeof rfid === 'string' && rfid.trim() !== '') finalRfid = rfid.trim();
    const finalIseGiris = (ise_giris && ise_giris.trim() !== '') ? ise_giris : new Date().toISOString().split('T')[0];

    try {
        const request = new sql.Request();
        request.input('id', sql.Int, currentUserId);
        request.input('tc', sql.NVarChar, tc || '');
        request.input('sicil', sql.NVarChar, sicil || '');

        const checkDuplicate = await request.query(`SELECT ID FROM Users WHERE (TC_Kimlik = @tc OR Sicil_No = @sicil) AND ID != @id`);
        if (checkDuplicate.recordset.length > 0) return res.status(400).json({ success: false, message: 'Bu T.C. veya Sicil BAŞKA bir personele ait!' });

        request.input('ad', sql.NVarChar, ad_soyad || '');
        request.input('rfid', sql.NVarChar, finalRfid);
        request.input('sirket', sql.NVarChar, sirket || '');
        request.input('departman', sql.NVarChar, departman || '');
        request.input('gorev', sql.NVarChar, gorev || '');
        request.input('ise_giris', sql.Date, finalIseGiris);

        await request.query(`
            UPDATE Users SET 
                Ad_Soyad = @ad, RFID_Kart_No = @rfid, TC_Kimlik = @tc, 
                Sicil_No = @sicil, Sirket = @sirket, Departman = @departman, Gorev = @gorev, Ise_Giris_Tarihi = @ise_giris
            WHERE ID = @id
        `);

        await addSystemLog(aktifKullanici, 'GÜNCELLEME', ad_soyad, sicil, 'Personel bilgileri güncellendi.');
        res.json({ success: true, message: 'Personel bilgileri güncellendi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Güncelleme hatası.' });
    }
});

router.patch('/users/:id/status', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const { durum, cikis_tarihi, cikis_nedeni, ad_soyad, sicil } = req.body; 
    
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('durum', sql.Bit, durum);

        if (durum === 0) {
            request.input('cikis_tarihi', sql.Date, cikis_tarihi);
            request.input('cikis_nedeni', sql.NVarChar, cikis_nedeni);
            await request.query(`
                UPDATE Users 
                SET Durum = @durum, Isten_Cikis_Tarihi = @cikis_tarihi, Cikis_Nedeni = @cikis_nedeni 
                WHERE ID = @id
            `);
            await addSystemLog(aktifKullanici, 'İŞTEN ÇIKIŞ', ad_soyad, sicil, `Çıkış Tarihi: ${cikis_tarihi} | Neden: ${cikis_nedeni || 'Belirtilmedi'}`);
            res.json({ success: true, message: 'Personel pasife alındı.' });
        } else {
            await request.query(`
                UPDATE Users 
                SET Durum = @durum, Isten_Cikis_Tarihi = NULL, Cikis_Nedeni = NULL 
                WHERE ID = @id
            `);
            await addSystemLog(aktifKullanici, 'TEKRAR İŞE ALIM', ad_soyad, sicil, 'Personel tekrar aktifleştirildi.');
            res.json({ success: true, message: 'Personel aktifleştirildi.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi.' });
    }
});

router.get('/users/:id/doors', verifyToken, async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        const result = await request.query(`SELECT Door_ID FROM Permissions WHERE User_ID = @id`);
        const doorIds = result.recordset.map(r => r.Door_ID);
        res.json(doorIds);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Yetkiler getirilemedi.' });
    }
});

router.post('/users/:id/doors', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.Kullanici_Adi || req.user?.username || 'Sistem Yetkilisi';
    const { doorIds } = req.body; 
    const userId = req.params.id;
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, userId);
        
        const userRes = await request.query(`SELECT Ad_Soyad, Sicil_No FROM Users WHERE ID = @id`);
        const user = userRes.recordset[0];

        await request.query(`
            DELETE FROM Permissions 
            WHERE User_ID = @id AND Door_ID IN (SELECT ID FROM Doors WHERE Durum = 1 OR Durum IS NULL)
        `);
        
        if (doorIds && doorIds.length > 0) {
            for (let doorId of doorIds) {
                const reqInsert = new sql.Request();
                reqInsert.input('uid', sql.Int, userId);
                // DÜZELTME: Kapı ID'sini Number() yaptık
                reqInsert.input('did', sql.Int, Number(doorId)); 
                await reqInsert.query(`INSERT INTO Permissions (User_ID, Door_ID) VALUES (@uid, @did)`);
            }
        }

        const yetkiDurumu = (doorIds && doorIds.length > 0) ? `${doorIds.length} adet aktif kapıya yetki verildi.` : 'Tüm aktif kapı yetkileri KALDIRILDI.';
        await addSystemLog(aktifKullanici, 'YETKİ GÜNCELLEME', user.Ad_Soyad, user.Sicil_No, yetkiDurumu);

        res.json({ success: true, message: 'Yetkiler başarıyla kaydedildi.' });
    } catch (err) {
        console.error("Yetki atama hatası:", err);
        res.status(500).json({ success: false, message: 'Yetkiler güncellenemedi.' });
    }
});

router.get('/users/:id/shift', verifyToken, async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        
        const result = await request.query(`
            SELECT Vardiya_ID FROM Personel_Vardiya 
            WHERE User_ID = @id AND Bitis_Tarihi IS NULL
        `);
        
        if (result.recordset.length > 0) {
            res.json({ vardiya_id: result.recordset[0].Vardiya_ID });
        } else {
            res.json({ vardiya_id: '' }); 
        }
    } catch (err) {
        console.error("Personel vardiya çekme hatası:", err);
        res.status(500).json({ success: false, message: 'Vardiya bilgisi getirilemedi.' });
    }
});

router.post('/users/:id/shift', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.Kullanici_Adi || req.user?.username || 'Sistem Yetkilisi';
    const { vardiya_id } = req.body;
    const userId = req.params.id;

    try {
        const request = new sql.Request();
        request.input('uid', sql.Int, userId);
        
        const userRes = await request.query(`SELECT Ad_Soyad, Sicil_No FROM Users WHERE ID = @uid`);
        const user = userRes.recordset[0];

        await request.query(`
            UPDATE Personel_Vardiya 
            SET Bitis_Tarihi = CAST(GETDATE() AS DATE) 
            WHERE User_ID = @uid AND Bitis_Tarihi IS NULL
        `);

        if (vardiya_id) {
            // DÜZELTME: Gelen vardiya ID'sini Number() yaptık
            request.input('vid', sql.Int, Number(vardiya_id)); 
            await request.query(`
                INSERT INTO Personel_Vardiya (User_ID, Vardiya_ID, Baslangic_Tarihi) 
                VALUES (@uid, @vid, CAST(GETDATE() AS DATE))
            `);
            
            const shiftRes = await request.query(`SELECT Vardiya_Adi FROM Vardiyalar WHERE ID = @vid`);
            const shiftName = shiftRes.recordset[0]?.Vardiya_Adi || 'Bilinmeyen Vardiya';
            
            await addSystemLog(aktifKullanici, 'VARDİYA ATAMA', user.Ad_Soyad, user.Sicil_No, `Personele "${shiftName}" atandı.`);
        } else {
            await addSystemLog(aktifKullanici, 'VARDİYA İPTALİ', user.Ad_Soyad, user.Sicil_No, `Personelin vardiya ataması kaldırıldı.`);
        }

        res.json({ success: true, message: 'Vardiya ataması başarıyla güncellendi.' });
    } catch (err) {
        console.error("Vardiya atama hatası:", err);
        res.status(500).json({ success: false, message: 'Vardiya ataması yapılamadı.' });
    }
});

module.exports = router;