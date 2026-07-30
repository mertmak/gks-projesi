const express = require('express');
const router = express.Router();
const { sql } = require('../db');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');
const { addSystemLog } = require('../utils/logger');

// 1. TÜM VARDİYALARI LİSTELE (GET)
router.get('/shifts', verifyToken, async (req, res) => {
    try {
        const result = await sql.query('SELECT * FROM Vardiyalar ORDER BY ID DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error("Vardiya çekme hatası:", err);
        res.status(500).json({ success: false, message: 'Vardiyalar getirilemedi.' });
    }
});

// 2. YENİ VARDİYA EKLE (POST)
router.post('/shifts', verifyToken, verifyAdmin, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const { vardiya_adi, mesai_baslangic, mesai_bitis, yemek_baslangic, yemek_bitis, tolerans_dk, mola_hakki_dk } = req.body;

    try {
        const request = new sql.Request();
        request.input('ad', sql.NVarChar, vardiya_adi);
        
        // DÜZELTME: sql.Time yerine sql.NVarChar kullanıyoruz. SQL Server dönüşümü kendi yapacak.
        request.input('mb', sql.NVarChar, mesai_baslangic);
        request.input('mbi', sql.NVarChar, mesai_bitis);
        request.input('yb', sql.NVarChar, yemek_baslangic || null);
        request.input('ybi', sql.NVarChar, yemek_bitis || null);
        
        request.input('tol', sql.Int, tolerans_dk || 0);
        request.input('mola', sql.Int, mola_hakki_dk || 0);
        request.input('durum', sql.Bit, 1); 

        await request.query(`
            INSERT INTO Vardiyalar (Vardiya_Adi, Mesai_Baslangic, Mesai_Bitis, Yemek_Baslangic, Yemek_Bitis, Tolerans_Dk, Mola_Hakki_Dk, Durum)
            VALUES (@ad, @mb, @mbi, @yb, @ybi, @tol, @mola, @durum)
        `);

        await addSystemLog(aktifKullanici, 'YENİ VARDİYA', vardiya_adi, '', `Sisteme ${mesai_baslangic}-${mesai_bitis} saatleri arası yeni vardiya eklendi.`);
        res.json({ success: true, message: 'Vardiya başarıyla sisteme eklendi.' });
    } catch (err) {
        console.error("Vardiya ekleme hatası:", err);
        res.status(500).json({ success: false, message: 'Vardiya eklenemedi.' });
    }
});

// 3. VARDİYA GÜNCELLE (PUT)
router.put('/shifts/:id', verifyToken, verifyAdmin, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const shiftId = req.params.id;
    const { vardiya_adi, mesai_baslangic, mesai_bitis, yemek_baslangic, yemek_bitis, tolerans_dk, mola_hakki_dk } = req.body;

    try {
        const request = new sql.Request();
        request.input('id', sql.Int, shiftId);
        request.input('ad', sql.NVarChar, vardiya_adi);
        
        // DÜZELTME: Aynı şekilde burayı da NVarChar yapıyoruz
        request.input('mb', sql.NVarChar, mesai_baslangic);
        request.input('mbi', sql.NVarChar, mesai_bitis);
        request.input('yb', sql.NVarChar, yemek_baslangic || null);
        request.input('ybi', sql.NVarChar, yemek_bitis || null);
        
        request.input('tol', sql.Int, tolerans_dk || 0);
        request.input('mola', sql.Int, mola_hakki_dk || 0);

        await request.query(`
            UPDATE Vardiyalar 
            SET Vardiya_Adi = @ad, Mesai_Baslangic = @mb, Mesai_Bitis = @mbi, 
                Yemek_Baslangic = @yb, Yemek_Bitis = @ybi, Tolerans_Dk = @tol, Mola_Hakki_Dk = @mola
            WHERE ID = @id
        `);

        await addSystemLog(aktifKullanici, 'VARDİYA GÜNCELLEME', vardiya_adi, '', 'Vardiya saatleri veya kuralları güncellendi.');
        res.json({ success: true, message: 'Vardiya bilgileri başarıyla güncellendi.' });
    } catch (err) {
        console.error("Vardiya güncelleme hatası:", err);
        res.status(500).json({ success: false, message: 'Vardiya güncellenemedi.' });
    }
});

// 4. VARDİYA DURUMUNU DEĞİŞTİR / PASİFE AL (PATCH)
router.patch('/shifts/:id/status', verifyToken, verifyAdmin, async (req, res) => {
    const aktifKullanici = req.user?.kullanici_adi || req.user?.username || 'Sistem Yetkilisi';
    const shiftId = req.params.id;
    const { durum, vardiya_adi } = req.body; // 1 (Aktif) veya 0 (Pasif) gelecek

    try {
        const request = new sql.Request();
        request.input('id', sql.Int, shiftId);
        request.input('durum', sql.Bit, durum);

        await request.query(`UPDATE Vardiyalar SET Durum = @durum WHERE ID = @id`);

        const islem = durum === 1 ? 'VARDİYA AKTİFLEŞTİRİLDİ' : 'VARDİYA PASİFE ALINDI';
        await addSystemLog(aktifKullanici, islem, vardiya_adi, '', `Vardiya durumu ${durum === 1 ? 'Aktif' : 'Pasif'} olarak değiştirildi.`);
        
        res.json({ success: true, message: `Vardiya başarıyla ${durum === 1 ? 'aktifleştirildi' : 'pasife alındı'}.` });
    } catch (err) {
        console.error("Vardiya durum değiştirme hatası:", err);
        res.status(500).json({ success: false, message: 'Durum güncellenemedi.' });
    }
});

module.exports = router;