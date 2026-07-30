require('dotenv').config();
const express = require('express');
const cors = require('cors'); // CORS paketini sisteme dahil ettik
const { connectDB, sql } = require('./db'); // SQL objesini sorgular için çağırdık
const startPullService = require('./pullService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Şifreleme kütüphanesini ekledik
const SECRET_KEY = "gks_super_gizli_anahtar_2026"; // Şifreleme için kullanılacak anahtar

const app = express();

// --- MIDDLEWARE (ARA KATMANLAR) ---
app.use(cors()); // Tarayıcı güvenlik (Cross-Origin) engelini kaldırır
app.use(express.json()); // Dışarıdan gelen JSON verilerini çözümler

// --- SİSTEM BAŞLATMA ---
connectDB();
startPullService();

// 1. GENEL KİLİT (Sisteme giriş yapmış HERKESİ içeri alır)
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const token = bearerHeader.split(' ')[1]; 
        jwt.verify(token, SECRET_KEY, (err, authData) => {
            if (err) {
                return res.status(403).json({ message: 'Token geçersiz veya süresi dolmuş.' });
            } else {
                req.user = authData; // KULLANICI BİLGİSİNİ İSTEĞE YAPIŞTIRIYORUZ (Kritik nokta)
                next(); 
            }
        });
    } else {
        res.status(401).json({ message: 'Erişim reddedildi. Token bulunamadı.' });
    }
};

// 2. YÖNETİCİ KİLİDİ (Sadece rolü 'admin' olanları içeri alır)
// Not: Bu kilit her zaman verifyToken'dan SONRA çalışmalıdır.
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // Rol admin ise geçişe izin ver
    } else {
        res.status(403).json({ message: 'Bu işlem için YÖNETİCİ yetkisine sahip olmalısınız!' });
    }
};

// --- İLK KURULUM UCU (Sadece tablo boşsa çalışır) ---
app.post('/api/ilk-kurulum', async (req, res) => {
    try {
        // Tabloda hiç kayıt var mı diye kontrol et
        const checkReq = new sql.Request();
        const checkRes = await checkReq.query('SELECT COUNT(*) as sayi FROM Yoneticiler');
        
        if (checkRes.recordset[0].sayi > 0) {
            return res.status(403).json({ success: false, message: 'Sistem zaten kurulu. Bu uç kilitlenmiştir.' });
        }

        // Tablo boşsa ilk admini oluştur
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const insertReq = new sql.Request();
        insertReq.input('kullanici', sql.VarChar, username);
        insertReq.input('sifre', sql.VarChar, hashedPassword);
        insertReq.input('rol', sql.VarChar, 'admin'); // İlk kişi zorunlu admin olur
        
        await insertReq.query('INSERT INTO Yoneticiler (Kullanici_Adi, Sifre_Hash, Rol) VALUES (@kullanici, @sifre, @rol)');
        
        res.json({ success: true, message: 'Sistem başlatıldı. İlk yönetici hesabı başarıyla oluşturuldu!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + err.message });
    }
});

// --- YENİ HESAP OLUŞTURMA UCU (Sadece Yöneticiler Kullanabilir) ---
app.post('/api/hesap-ekle', verifyToken, verifyAdmin, async (req, res) => {
    const { username, password, rol } = req.body; // rol: 'admin' veya 'user' gelmeli

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const request = new sql.Request();
        request.input('kullanici', sql.VarChar, username);
        request.input('sifre', sql.VarChar, hashedPassword);
        request.input('rol', sql.VarChar, rol || 'user'); // Boş gelirse varsayılan olarak normal kullanıcı yap
        
        await request.query('INSERT INTO Yoneticiler (Kullanici_Adi, Sifre_Hash, Rol) VALUES (@kullanici, @sifre, @rol)');
        
        res.json({ success: true, message: `${rol} yetkisine sahip yeni hesap oluşturuldu!` });
    } catch (err) {
        // 2627: MS SQL'de benzersizlik (Unique) hatası kodu
        if (err.number === 2627) {
            return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten mevcut.' });
        }
        res.status(500).json({ success: false, message: 'Sunucu hatası!' });
    }
});

// --- TÜM HESAPLARI LİSTELEME UCU (Sadece Yöneticiler) ---
app.get('/api/hesaplar', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Şifreleri çekmiyoruz! Sadece ID, kullanıcı adı, rol ve tarihi alıyoruz.
        const result = await sql.query('SELECT ID, Kullanici_Adi, Rol, Olusturulma_Tarihi FROM Yoneticiler ORDER BY ID DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error("Hesapları listeleme hatası:", err);
        res.status(500).json({ success: false, message: 'Hesaplar çekilirken hata oluştu.' });
    }
});

// --- HESAP SİLME UCU (Sadece Yöneticiler) ---
app.delete('/api/hesap-sil/:id', verifyToken, verifyAdmin, async (req, res) => {
    const silinecekId = req.params.id;

    // Güvenlik Koruması: Token'ın içindeki kendi ID'si ile silmeye çalıştığı ID aynı mı?
    if (req.user.id == silinecekId) {
        return res.status(403).json({ success: false, message: 'Güvenlik İhlali: Kendi hesabınızı silemezsiniz!' });
    }

    try {
        const request = new sql.Request();
        request.input('id', sql.Int, silinecekId);
        
        await request.query('DELETE FROM Yoneticiler WHERE ID = @id');
        
        res.json({ success: true, message: 'Hesap başarıyla sistemden silindi!' });
    } catch (err) {
        console.error("Silme hatası:", err);
        res.status(500).json({ success: false, message: 'Hesap silinirken hata oluştu.' });
    }
});

// --- API UÇLARI (ENDPOINTS) ---

// --- 1. GİRİŞ YAPMA (LOGIN) UCU ---
// --- 1. İLK YÖNETİCİYİ EKLEME UCU (Sadece Kurulum İçin) ---
// --- YENİ YÖNETİCİ EKLEME UCU (Artık Korumalı!) ---
// --- 2. VERİTABANI BAĞLANTILI GÜNCEL GİRİŞ (LOGIN) UCU ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const request = new sql.Request();
        request.input('kullanici', sql.VarChar, username);
        const result = await request.query('SELECT * FROM Yoneticiler WHERE Kullanici_Adi = @kullanici');

        // Kullanıcı veritabanında var mı?
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            
            // Girilen düz şifre ile veritabanındaki Karmaşık (Hash'li) şifreyi karşılaştır
            const isMatch = await bcrypt.compare(password, user.Sifre_Hash);
            
            if (isMatch) {
                // Şifreler eşleşti! Token üret.
                const token = jwt.sign({ role: user.Rol, id: user.ID }, SECRET_KEY, { expiresIn: '2h' });
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

// --- ŞİFRE DEĞİŞTİRME UCU (Korumalı) ---
app.post('/api/sifre-degistir', verifyToken, async (req, res) => {
    const { username, eskiSifre, yeniSifre } = req.body;

    try {
        // 1. Kullanıcıyı veritabanında bul
        const request = new sql.Request();
        request.input('kullanici', sql.VarChar, username);
        const result = await request.query('SELECT * FROM Yoneticiler WHERE Kullanici_Adi = @kullanici');

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            
            // 2. Mevcut (Eski) şifrenin doğruluğunu kontrol et
            const isMatch = await bcrypt.compare(eskiSifre, user.Sifre_Hash);
            
            if (isMatch) {
                // 3. Eski şifre doğruysa, yeni şifreyi hash'le
                const yeniHashedSifre = await bcrypt.hash(yeniSifre, 10);
                
                // 4. Veritabanındaki şifreyi güncelle
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
        console.error("Şifre değiştirme hatası:", err);
        res.status(500).json({ success: false, message: 'Sunucu hatası!' });
    }
});

// --- 2. GÜVENLİK KONTROLÜ (MIDDLEWARE) ---
// Bu fonksiyon, korumak istediğimiz uçlara gelen isteklerin geçerli bir Token'ı olup olmadığını denetler.


// 1. Sistem Durum Testi
app.get('/api/status', (req, res) => {
    res.json({ durum: 'Başarılı', mesaj: 'GKS API Sistemleri Aktif ve Çalışıyor' });
});

// 2. Geçiş Loglarını Listeleme (Arayüzdeki tablo için birleştirilmiş veriler)
app.get('/api/logs',verifyToken ,async (req, res) => {
    try {
        const query = `
            SELECT 
                l.ID, 
                l.Zaman, 
                ISNULL(u.Ad_Soyad, 'Bilinmeyen Kullanıcı') AS Ad_Soyad, 
                l.RFID_Kart_No, 
                d.Kapi_Adi, 
                l.Basarili_Mi
            FROM Logs l
            LEFT JOIN Users u ON l.RFID_Kart_No = u.RFID_Kart_No
            LEFT JOIN Doors d ON l.Door_ID = d.ID
            ORDER BY l.Zaman DESC
        `;
        const result = await sql.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Log çekme hatası:', err.message);
        res.status(500).json({ hata: 'Loglar çekilirken sunucu hatası oluştu.' });
    }
});

// 3. Sistemdeki Personelleri Listeleme
app.get('/api/users', verifyToken,async (req, res) => {
    try {
        const result = await sql.query('SELECT * FROM Users');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ hata: 'Kullanıcı verileri çekilemedi.' });
    }
});

// 4. Yeni Personel Ekleme
app.post('/api/users', verifyToken,async (req, res) => {
    try {
        // Arayüzden gelen form verilerini alıyoruz
        const { adSoyad, rfid } = req.body;
        
        const request = new sql.Request();
        request.input('adSoyad', sql.NVarChar, adSoyad);
        request.input('rfid', sql.NVarChar, rfid);
        
        // Yeni kullanıcıyı varsayılan olarak aktif (1) şekilde ekliyoruz
        await request.query(`
            INSERT INTO Users (Ad_Soyad, RFID_Kart_No, Durum) 
            VALUES (@adSoyad, @rfid, 1)
        `);
        
        res.status(201).json({ mesaj: 'Kullanıcı başarıyla sisteme eklendi.' });
    } catch (err) {
        console.error('Kullanıcı ekleme hatası:', err.message);
        res.status(500).json({ hata: 'Kullanıcı eklenirken bir hata oluştu.' });
    }
});

// --- SUNUCUYU DİNLEMEYE ALMA ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
    console.log(`Log API'sini test etmek için: http://localhost:${PORT}/api/logs`);
});