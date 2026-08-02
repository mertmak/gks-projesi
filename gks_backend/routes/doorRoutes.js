const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');
const { addDoorLog } = require('../utils/logger');
const socket = require('../utils/socket');
const logger = require('../utils/appLogger');

router.get('/doors', verifyToken, async (req, res) => {
    // Get doors kodlarınız...
        try {
        const result = await sql.query('SELECT * FROM Doors ORDER BY ID ASC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kapılar getirilemedi.' });
    }
});

router.post('/doors', verifyToken, validate(schemas.kapiEkleSchema), async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.Kullanici_Adi || req.user?.username || 'Sistem Yetkilisi';
    // YENİ: kapi_turu eklendi
    const { kapi_adi, departman, konum, kapi_turu } = req.body; 
    
    try {
        const request = new sql.Request();
        request.input('kapi_adi', sql.NVarChar, kapi_adi);
        request.input('departman', sql.NVarChar, departman || ''); 
        request.input('konum', sql.NVarChar, konum || ''); 
        request.input('kapi_turu', sql.NVarChar, kapi_turu || 'İç Geçiş'); // YENİ
        request.input('durum', sql.Bit, 1); 
        
        await request.query(`
            INSERT INTO Doors (Kapi_Adi, Departman, Konum, Kapi_Turu, Durum) 
            VALUES (@kapi_adi, @departman, @konum, @kapi_turu, @durum)
        `);
        
        await addDoorLog(aktifKullanici, 'YENİ KAPI', kapi_adi, `Sisteme yeni kapı eklendi. Türü: ${kapi_turu || 'İç Geçiş'}`);
        socket.getIO().emit('doors_updated');
        socket.getIO().emit('system_updated');
        res.json({ success: true, message: 'Kapı başarıyla eklendi.' });
    } catch (err) {
        logger.error('Kapı ekleme hatası: ' + err.message);
        res.status(500).json({ success: false, message: 'Kapı eklenemedi.' });
    }
});

router.put('/doors/:id', verifyToken, validate(schemas.kapiEkleSchema), async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.Kullanici_Adi || req.user?.username || 'Sistem Yetkilisi';
    const doorId = req.params.id;
    // YENİ: kapi_turu eklendi
    const { kapi_adi, departman, konum, kapi_turu } = req.body;

    try {
        const request = new sql.Request();
        request.input('id', sql.Int, doorId);
        request.input('kapi_adi', sql.NVarChar, kapi_adi);
        request.input('departman', sql.NVarChar, departman || '');
        request.input('konum', sql.NVarChar, konum || '');
        request.input('kapi_turu', sql.NVarChar, kapi_turu || 'İç Geçiş'); // YENİ

        await request.query(`
            UPDATE Doors 
            SET Kapi_Adi = @kapi_adi, Departman = @departman, Konum = @konum, Kapi_Turu = @kapi_turu 
            WHERE ID = @id
        `);

        await addDoorLog(aktifKullanici, 'KAPI GÜNCELLENDİ', kapi_adi, `Kapı bilgileri güncellendi. Yeni Tür: ${kapi_turu}`);
        socket.getIO().emit('doors_updated');
        socket.getIO().emit('system_updated');
        res.json({ success: true, message: 'Kapı başarıyla güncellendi.' });
    } catch (err) {
        logger.error('Kapı güncelleme hatası: ' + err.message);
        res.status(500).json({ success: false, message: 'Kapı güncellenemedi.' });
    }
});

router.patch('/doors/:id/status', verifyToken, validate(schemas.kapiDurumSchema), async (req, res) => {
    // Patch doors status kodlarınız...
        const aktifKullanici = req.user?.kullanici_adi || req.user?.Kullanici_Adi || req.user?.username || 'Sistem Yetkilisi';
        const doorId = req.params.id;
        const { durum, kapi_adi } = req.body; // 0 veya 1 değeri gelecek
    
        try {
            const request = new sql.Request();
            request.input('id', sql.Int, doorId);
            request.input('durum', sql.Bit, durum);
    
            // Eğer kapı pasife alınıyorsa güvenlik için herkesin yetkisini kaldıralım
            if (durum === 0) {
                await request.query(`DELETE FROM Permissions WHERE Door_ID = @id`);
            }
    
            // Kapının durumunu güncelle
            await request.query(`UPDATE Doors SET Durum = @durum WHERE ID = @id`);
    
            const islem = durum === 1 ? 'KAPI AKTİFLEŞTİRİLDİ' : 'KAPI PASİFE ALINDI';
            const detay = durum === 1 
                ? 'Kapı tekrar kullanıma açıldı.' 
                : 'Kapı kullanıma kapatıldı ve üzerindeki tüm personel yetkileri temizlendi.';
                
            await addDoorLog(aktifKullanici, islem, kapi_adi, detay);
            socket.getIO().emit('doors_updated');
            socket.getIO().emit('system_updated');
            res.json({ success: true, message: `Kapı başarıyla ${durum === 1 ? 'aktifleştirildi' : 'pasife alındı'}.` });
        } catch (err) {
            logger.error('Kapı durum güncelleme hatası: ' + err.message);
            res.status(500).json({ success: false, message: 'İşlem başarısız oldu.' });
        }
});

module.exports = router;