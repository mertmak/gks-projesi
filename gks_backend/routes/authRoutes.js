const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sql } = require('../db');
const { verifyToken, verifyAdmin, SECRET_KEY } = require('../middlewares/auth');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const request = new sql.Request();
        request.input('kullanici', sql.VarChar, username);
        const result = await request.query('SELECT * FROM Yoneticiler WHERE Kullanici_Adi = @kullanici');

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const isMatch = await bcrypt.compare(password, user.Sifre_Hash);
            
            if (isMatch) {
                const token = jwt.sign(
                    { role: user.Rol, id: user.ID, kullanici_adi: user.Kullanici_Adi }, 
                    SECRET_KEY, 
                    { expiresIn: '8h' }
                );
                res.json({ success: true, token: token });
            } else {
                res.status(401).json({ success: false, message: 'Hatalı şifre!' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı!' });
        }
    } catch (err) {
        console.error("Login hatası:", err);
        res.status(500).json({ success: false, message: 'Sunucu hatası!' });
    }
});

router.post('/ilk-kurulum', async (req, res) => {
    // Kurulum kodlarınız...
    try {
            const checkReq = new sql.Request();
            const checkRes = await checkReq.query('SELECT COUNT(*) as sayi FROM Yoneticiler');
            if (checkRes.recordset[0].sayi > 0) return res.status(403).json({ success: false, message: 'Sistem zaten kurulu.' });
    
            const { username, password } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const insertReq = new sql.Request();
            insertReq.input('kullanici', sql.VarChar, username);
            insertReq.input('sifre', sql.VarChar, hashedPassword);
            insertReq.input('rol', sql.VarChar, 'admin'); 
            
            await insertReq.query('INSERT INTO Yoneticiler (Kullanici_Adi, Sifre_Hash, Rol) VALUES (@kullanici, @sifre, @rol)');
            res.json({ success: true, message: 'Sistem başlatıldı. İlk yönetici hesabı oluşturuldu!' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Sunucu hatası: ' + err.message });
        }
});

router.post('/hesap-ekle', verifyToken, verifyAdmin, async (req, res) => {
    // Hesap ekleme kodlarınız...
        const { username, password, rol } = req.body;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const request = new sql.Request();
            request.input('kullanici', sql.VarChar, username);
            request.input('sifre', sql.VarChar, hashedPassword);
            request.input('rol', sql.VarChar, rol || 'user');
            await request.query('INSERT INTO Yoneticiler (Kullanici_Adi, Sifre_Hash, Rol) VALUES (@kullanici, @sifre, @rol)');
            res.json({ success: true, message: `${rol} yetkisine sahip yeni hesap oluşturuldu!` });
        } catch (err) {
            if (err.number === 2627) return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten mevcut.' });
            res.status(500).json({ success: false, message: 'Sunucu hatası!' });
        }
});

router.post('/sifre-degistir', verifyToken, async (req, res) => {
    // Şifre değiştirme kodlarınız...
    const { username, eskiSifre, yeniSifre } = req.body;
        try {
            const request = new sql.Request();
            request.input('kullanici', sql.VarChar, username);
            const result = await request.query('SELECT * FROM Yoneticiler WHERE Kullanici_Adi = @kullanici');
    
            if (result.recordset.length > 0) {
                const user = result.recordset[0];
                const isMatch = await bcrypt.compare(eskiSifre, user.Sifre_Hash);
                
                if (isMatch) {
                    const yeniHashedSifre = await bcrypt.hash(yeniSifre, 10);
                    const updateReq = new sql.Request();
                    updateReq.input('yeniSifre', sql.VarChar, yeniHashedSifre);
                    updateReq.input('kullanici', sql.VarChar, username);
                    await updateReq.query('UPDATE Yoneticiler SET Sifre_Hash = @yeniSifre WHERE Kullanici_Adi = @kullanici');
                    res.json({ success: true, message: 'Şifreniz başarıyla güncellendi!' });
                } else {
                    res.status(401).json({ success: false, message: 'Mevcut şifrenizi yanlış girdiniz!' });
                }
            } else {
                res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: 'Sunucu hatası!' });
        }
});

router.get('/hesaplar', verifyToken, verifyAdmin, async (req, res) => {
    // Hesapları çekme kodlarınız...
        try {
        const result = await sql.query('SELECT ID, Kullanici_Adi, Rol, Olusturulma_Tarihi FROM Yoneticiler ORDER BY ID DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Hesaplar çekilirken hata oluştu.' });
    }
});

router.delete('/hesap-sil/:id', verifyToken, verifyAdmin, async (req, res) => {
    // Hesap silme kodlarınız...
        const silinecekId = req.params.id;
    if (req.user.id == silinecekId) return res.status(403).json({ success: false, message: 'Kendi hesabınızı silemezsiniz!' });
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, silinecekId);
        await request.query('DELETE FROM Yoneticiler WHERE ID = @id');
        res.json({ success: true, message: 'Hesap başarıyla sistemden silindi!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Hesap silinirken hata oluştu.' });
    }
});

module.exports = router;