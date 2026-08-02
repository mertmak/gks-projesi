const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');
const socket = require('../utils/socket');
const logger = require('../utils/appLogger');

// TÜM VARDİYALARI GETİR
router.get('/shifts', verifyToken, async (req, res) => {
    try {
        const result = await sql.query(`SELECT * FROM Vardiyalar ORDER BY ID DESC`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Vardiyalar getirilemedi.' });
    }
});

// YENİ VARDİYA EKLE
router.post('/shifts', verifyToken, validate(schemas.vardiyaSchema), async (req, res) => {
    const { vardiya_adi, mesai_baslangic, mesai_bitis, yemek_baslangic, yemek_bitis, tolerans_dk, mola_hakki_dk, calisma_gunleri } = req.body;
    try {
        const request = new sql.Request();
        request.input('ad', sql.NVarChar, vardiya_adi);
        
        // KESİN ÇÖZÜM: sql.Time yerine sql.NVarChar kullanıyoruz!
        // SQL Server '00:00' metnini hatasız şekilde otomatik olarak TIME tipine dönüştürecektir.
        request.input('baslangic', sql.NVarChar, mesai_baslangic);
        request.input('bitis', sql.NVarChar, mesai_bitis);
        request.input('yBaslangic', sql.NVarChar, yemek_baslangic || null);
        request.input('yBitis', sql.NVarChar, yemek_bitis || null);
        
        request.input('tolerans', sql.Int, tolerans_dk || 0);
        request.input('mola', sql.Int, mola_hakki_dk || 0);
        request.input('gunler', sql.NVarChar, calisma_gunleri || '1,2,3,4,5');

        await request.query(`
            INSERT INTO Vardiyalar (Vardiya_Adi, Mesai_Baslangic, Mesai_Bitis, Yemek_Baslangic, Yemek_Bitis, Tolerans_Dk, Mola_Hakki_Dk, Calisma_Gunleri, Durum)
            VALUES (@ad, @baslangic, @bitis, @yBaslangic, @yBitis, @tolerans, @mola, @gunler, 1)
        `);
        socket.getIO().emit('shifts_updated');
        res.json({ success: true, message: 'Vardiya başarıyla eklendi.' });
    } catch (err) {
        logger.error('Vardiya ekleme hatası: ' + err.message);
        res.status(500).json({ success: false, message: 'Vardiya eklenemedi.' });
    }
});

// VARDİYA GÜNCELLE
router.put('/shifts/:id', verifyToken, validate(schemas.vardiyaSchema), async (req, res) => {
    const { vardiya_adi, mesai_baslangic, mesai_bitis, yemek_baslangic, yemek_bitis, tolerans_dk, mola_hakki_dk, calisma_gunleri } = req.body;
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('ad', sql.NVarChar, vardiya_adi);
        
        request.input('baslangic', sql.NVarChar, mesai_baslangic);
        request.input('bitis', sql.NVarChar, mesai_bitis);
        request.input('yBaslangic', sql.NVarChar, yemek_baslangic || null);
        request.input('yBitis', sql.NVarChar, yemek_bitis || null);
        
        request.input('tolerans', sql.Int, tolerans_dk || 0);
        request.input('mola', sql.Int, mola_hakki_dk || 0);
        request.input('gunler', sql.NVarChar, calisma_gunleri || '1,2,3,4,5');

        await request.query(`
            UPDATE Vardiyalar 
            SET Vardiya_Adi = @ad, Mesai_Baslangic = @baslangic, Mesai_Bitis = @bitis, 
                Yemek_Baslangic = @yBaslangic, Yemek_Bitis = @yBitis,
                Tolerans_Dk = @tolerans, Mola_Hakki_Dk = @mola, Calisma_Gunleri = @gunler 
            WHERE ID = @id
        `);
        socket.getIO().emit('shifts_updated');
        res.json({ success: true, message: 'Vardiya başarıyla güncellendi.' });
    } catch (err) {
        logger.error('Vardiya güncelleme hatası: ' + err.message);
        res.status(500).json({ success: false, message: 'Vardiya güncellenemedi.' });
    }
});

// VARDİYA DURUM GÜNCELLE (AKTİF/PASİF)
router.patch('/shifts/:id/status', verifyToken, validate(schemas.vardiyaDurumSchema), async (req, res) => {
    const { durum } = req.body;
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, req.params.id);
        request.input('durum', sql.Bit, durum);
        
        await request.query(`UPDATE Vardiyalar SET Durum = @durum WHERE ID = @id`);
        socket.getIO().emit('shifts_updated');
        res.json({ success: true, message: 'Durum güncellendi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi.' });
    }
});

module.exports = router;