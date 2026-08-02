const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');
const { addSystemLog } = require('../utils/logger');
const logger = require('../utils/appLogger');

// 1. TÜM İZİNLERİ GETİR
router.get('/leaves', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT I.ID, I.User_ID, U.Ad_Soyad, U.Sicil_No, U.Departman, 
                   I.Izin_Turu, I.Baslangic_Tarihi, I.Bitis_Tarihi, I.Aciklama, I.Durum 
            FROM Izinler I
            JOIN Users U ON I.User_ID = U.ID
            ORDER BY I.Baslangic_Tarihi DESC
        `;
        const result = await sql.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('İzinleri çekme hatası: ' + err.message);
        res.status(500).json({ success: false, message: 'İzinler getirilemedi.' });
    }
});

// 2. YENİ İZİN EKLE
router.post('/leaves', verifyToken, validate(schemas.izinEkleSchema), async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const { user_id, izin_turu, baslangic, bitis, aciklama, durum } = req.body;

    try {
        const request = new sql.Request();
        request.input('uid', sql.Int, user_id);
        request.input('tur', sql.NVarChar, izin_turu);
        request.input('bas', sql.Date, baslangic);
        request.input('bit', sql.Date, bitis);
        request.input('aciklama', sql.NVarChar, aciklama || '');
        request.input('durum', sql.NVarChar, durum || 'Onaylandı');

        // Önce kullanıcının adını bulalım (Log için)
        const userRes = await request.query(`SELECT Ad_Soyad FROM Users WHERE ID = @uid`);
        const personelAd = userRes.recordset.length > 0 ? userRes.recordset[0].Ad_Soyad : 'Bilinmeyen Personel';

        await request.query(`
            INSERT INTO Izinler (User_ID, Izin_Turu, Baslangic_Tarihi, Bitis_Tarihi, Aciklama, Durum)
            VALUES (@uid, @tur, @bas, @bit, @aciklama, @durum)
        `);

        await addSystemLog(aktifKullanici, 'İZİN GİRİŞİ', personelAd, '', `${baslangic} - ${bitis} tarihleri arası ${izin_turu} girildi.`);
        res.json({ success: true, message: 'İzin başarıyla sisteme eklendi.' });
    } catch (err) {
        logger.error('İzin ekleme hatası: ' + err.message);
        res.status(500).json({ success: false, message: 'İzin eklenemedi.' });
    }
});

// 3. İZİN SİL
router.delete('/leaves/:id', verifyToken, verifyAdmin, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const leaveId = req.params.id;

    try {
        const request = new sql.Request();
        request.input('id', sql.Int, leaveId);
        
        // Silmeden önce kime ait olduğunu bul (Log için)
        const infoRes = await request.query(`
            SELECT U.Ad_Soyad, I.Izin_Turu FROM Izinler I 
            JOIN Users U ON I.User_ID = U.ID WHERE I.ID = @id
        `);
        
        await request.query(`DELETE FROM Izinler WHERE ID = @id`);

        if (infoRes.recordset.length > 0) {
            const info = infoRes.recordset[0];
            await addSystemLog(aktifKullanici, 'İZİN İPTALİ', info.Ad_Soyad, '', `${info.Izin_Turu} kaydı sistemden silindi.`);
        }

        res.json({ success: true, message: 'İzin kaydı başarıyla silindi.' });
    } catch (err) {
        logger.error('İzin silme hatası: ' + err.message);
        res.status(500).json({ success: false, message: 'İzin silinemedi.' });
    }
});

module.exports = router;