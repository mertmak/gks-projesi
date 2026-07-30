require('dotenv').config();
const express = require('express');
const cors = require('cors'); // CORS paketini sisteme dahil ettik
const { connectDB, sql } = require('./db'); // SQL objesini sorgular için çağırdık
const startPullService = require('./pullService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SECRET_KEY = 'gks_super_gizli_anahtar_2026';

const app = express();

// --- MIDDLEWARE (ARA KATMANLAR) ---
app.use(cors()); // Tarayıcı güvenlik (Cross-Origin) engelini kaldırır
app.use(express.json()); // Dışarıdan gelen JSON verilerini çözümler

// --- SİSTEM BAŞLATMA ---
connectDB();
startPullService();

// --- API UÇLARI (ENDPOINTS) ---

// 1. Sistem Durum Testi
app.get('/api/status', (req, res) => {
    res.json({ durum: 'Başarılı', mesaj: 'GKS API Sistemleri Aktif ve Çalışıyor' });
});

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

// --- 2. GÜVENLİK KONTROLÜ (MIDDLEWARE) ---
// Bu fonksiyon, korumak istediğimiz uçlara gelen isteklerin geçerli bir Token'ı olup olmadığını denetler.

// --- ANA SAYFA (DASHBOARD) ÖZET VERİLERİNİ GETİR ---
// --- ANA SAYFA (DASHBOARD) ÖZET VERİLERİNİ GETİR ---
app.get('/api/dashboard/summary', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM Logs WHERE CAST(Zaman AS DATE) = CAST(GETDATE() AS DATE)) AS BugunGecis,
                (SELECT COUNT(*) FROM Users WHERE Durum = 1) AS AktifPersonel,
                (SELECT COUNT(*) FROM Logs WHERE CAST(Zaman AS DATE) = CAST(GETDATE() AS DATE) AND Basarili_Mi = 0) AS YetkisizGiris
        `;
        const result = await sql.query(query);
        
        res.json(result.recordset[0]); 
    } catch (err) {
        console.error("Dashboard özet verisi çekilemedi:", err);
        res.status(500).json({ success: false, message: 'Özet veriler çekilemedi.' });
    }
});

// 2. Geçiş Loglarını Listeleme (Arayüzdeki tablo için birleştirilmiş veriler)
app.get('/api/logs', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `
            SELECT TOP 5000 
                L.ID, U.Ad_Soyad, L.RFID_Kart_No, D.Kapi_Adi, L.Basarili_Mi, L.Zaman 
            FROM Logs L
            LEFT JOIN Users U ON L.RFID_Kart_No = U.RFID_Kart_No
            LEFT JOIN Doors D ON L.Door_ID = D.ID
            WHERE 1=1
        `;
        const request = new sql.Request();

        if (baslangic) {
            query += ` AND L.Zaman >= @baslangic`;
            request.input('baslangic', sql.DateTime, baslangic);
        }
        if (bitis) {
            query += ` AND L.Zaman <= @bitis`;
            request.input('bitis', sql.DateTime, bitis + ' 23:59:59');
        }
        if (arama) {
            query += ` AND (U.Ad_Soyad LIKE @arama OR L.RFID_Kart_No LIKE @arama)`;
            request.input('arama', sql.NVarChar, `%${arama}%`);
        }

        query += ` ORDER BY L.Zaman DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Loglar çekilemedi.' });
    }
});



// --- SİSTEM LOG KAYDEDİCİ FONKSİYON ---
const addSystemLog = async (islemiYapan, islemTipi, personelAd, sicil, detay) => {
    try {
        const req = new sql.Request();
        req.input('yapan', sql.NVarChar, islemiYapan || 'Bilinmiyor');
        req.input('islem', sql.NVarChar, islemTipi);
        req.input('kisi', sql.NVarChar, personelAd);
        req.input('sicil', sql.NVarChar, sicil || '');
        req.input('detay', sql.NVarChar, detay || '');
        await req.query(`
            INSERT INTO SystemLogs (Islemi_Yapan, Islem_Tipi, Personel_Ad, Sicil_No, Detay) 
            VALUES (@yapan, @islem, @kisi, @sicil, @detay)
        `);
    } catch (err) {
        console.error("Sistem logu yazılamadı:", err);
    }
};

// 1. TÜM PERSONELİ GETİR
app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `SELECT TOP 2000 * FROM Users WHERE 1=1`;
        const request = new sql.Request();

        if (baslangic) {
            query += ` AND (Ise_Giris_Tarihi >= @baslangic OR Ise_Giris_Tarihi IS NULL)`;
            request.input('baslangic', sql.Date, baslangic);
        }
        if (bitis) {
            query += ` AND (Ise_Giris_Tarihi <= @bitis OR Ise_Giris_Tarihi IS NULL)`;
            request.input('bitis', sql.Date, bitis);
        }
        if (arama) {
            query += ` AND (Ad_Soyad LIKE @arama OR Sicil_No LIKE @arama OR TC_Kimlik LIKE @arama)`;
            request.input('arama', sql.NVarChar, `%${arama}%`);
        }

        query += ` ORDER BY ID DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Personeller getirilemedi.' });
    }
});

// 2. YENİ PERSONEL EKLE
// 2. YENİ PERSONEL EKLE (Mükerrer Kayıt Korumalı)
// Benzersiz Sistem_ID üreten ve veritabanını kontrol eden fonksiyon (app.post'un hemen üstüne ekle)
const generateUniqueSistemId = async () => {
    let isUnique = false;
    let newId = '';
    
    // Benzersiz bir ID bulana kadar döngüye girer
    while (!isUnique) {
        newId = Math.floor(10000000000 + Math.random() * 90000000000).toString();
        const req = new sql.Request();
        req.input('checkId', sql.NVarChar, newId);
        
        // Veritabanına sor: "Bu Sistem_ID daha önce kullanılmış mı?"
        const check = await req.query(`SELECT ID FROM Users WHERE Sistem_ID = @checkId`);
        if (check.recordset.length === 0) {
            isUnique = true; // Kayıt yoksa döngüyü kır ve bu ID'yi kullan
        }
    }
    return newId;
};

// 2. YENİ PERSONEL EKLE (Mükerrer TC/Sicil ve Benzersiz Sistem ID Korumalı)
app.post('/api/users', verifyToken, async (req, res) => {
    // İşlemi yapan kişiyi token'dan alıyoruz
    const aktifKullanici = req.user?.username || req.user?.kullanici_adi || 'Sistem Yetkilisi';
    
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
        
        // LOG TUT (Aktif kullanıcı bilgisiyle)
        await addSystemLog(aktifKullanici, 'YENİ KAYIT', ad_soyad, sicil, `Sisteme yeni eklendi. Departman: ${departman || '-'}`);
        
        res.json({ success: true, message: 'Personel başarıyla eklendi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kayıt Hatası: ' + err.message });
    }
});

// 3. PERSONEL BİLGİLERİNİ GÜNCELLE (Mükerrer Kayıt Korumalı)
app.put('/api/users/:id', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.username || req.user?.kullanici_adi || 'Sistem Yetkilisi';
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

        // LOG TUT
        await addSystemLog(aktifKullanici, 'GÜNCELLEME', ad_soyad, sicil, 'Personel bilgileri güncellendi.');
        res.json({ success: true, message: 'Personel bilgileri güncellendi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Güncelleme hatası.' });
    }
});

// 4. İŞTEN ÇIKIŞ / TEKRAR İŞE ALIM (SOFT DELETE & RESTORE)
app.patch('/api/users/:id/status', verifyToken, async (req, res) => {
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
            
            // LOG TUT
            await addSystemLog('İŞTEN ÇIKIŞ', ad_soyad, sicil, `Çıkış Tarihi: ${cikis_tarihi} | Neden: ${cikis_nedeni || 'Belirtilmedi'}`);
            
            res.json({ success: true, message: 'Personel pasife alındı.' });
        } else {
            // İşe tekrar alımda mevcut İşe Giriş Tarihini bozmuyoruz, sadece çıkış detaylarını temizliyoruz
            await request.query(`
                UPDATE Users 
                SET Durum = @durum, Isten_Cikis_Tarihi = NULL, Cikis_Nedeni = NULL 
                WHERE ID = @id
            `);
            
            // LOG TUT
            await addSystemLog('TEKRAR İŞE ALIM', ad_soyad, sicil, 'Personel tekrar aktifleştirildi (Önceki çıkış bilgileri temizlendi).');
            
            res.json({ success: true, message: 'Personel aktifleştirildi.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi.' });
    }
});

// --- YENİ UÇ: SİSTEM LOGLARINI GETİR ---
app.get('/api/system-logs', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `SELECT TOP 5000 * FROM SystemLogs WHERE 1=1`;
        const request = new sql.Request();

        if (baslangic) {
            query += ` AND Tarih >= @baslangic`;
            request.input('baslangic', sql.DateTime, baslangic);
        }
        if (bitis) {
            query += ` AND Tarih <= @bitis`;
            request.input('bitis', sql.DateTime, bitis + ' 23:59:59');
        }
        if (arama) {
            query += ` AND (Personel_Ad LIKE @arama OR Sicil_No LIKE @arama OR Islem_Tipi LIKE @arama)`;
            request.input('arama', sql.NVarChar, `%${arama}%`);
        }

        query += ` ORDER BY Tarih DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sistem logları çekilemedi.' });
    }
});

const addDoorLog = async (islemiYapan, islemTipi, kapiAdi, detay) => {
    try {
        const req = new sql.Request();
        req.input('yapan', sql.NVarChar, islemiYapan || 'Bilinmiyor');
        req.input('islem', sql.NVarChar, islemTipi);
        req.input('kapi', sql.NVarChar, kapiAdi);
        req.input('detay', sql.NVarChar, detay || '');
        await req.query(`
            INSERT INTO DoorLogs (Islemi_Yapan, Islem_Tipi, Kapi_Adi, Detay) 
            VALUES (@yapan, @islem, @kapi, @detay)
        `);
    } catch (err) {
        console.error("Kapı logu yazılamadı:", err);
    }
};

app.get('/api/door-logs', verifyToken, async (req, res) => {
    try {
        const { baslangic, bitis, arama } = req.query;
        let query = `SELECT TOP 5000 * FROM DoorLogs WHERE 1=1`;
        const request = new sql.Request();

        if (baslangic) {
            query += ` AND Tarih >= @baslangic`;
            request.input('baslangic', sql.DateTime, baslangic);
        }
        if (bitis) {
            query += ` AND Tarih <= @bitis`;
            request.input('bitis', sql.DateTime, bitis + ' 23:59:59');
        }
        if (arama) {
            query += ` AND (Kapi_Adi LIKE @arama OR Islem_Tipi LIKE @arama OR Detay LIKE @arama)`;
            request.input('arama', sql.NVarChar, `%${arama}%`);
        }

        query += ` ORDER BY Tarih DESC`;
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kapı logları çekilemedi.' });
    }
});


// ============================================
// KAPI VE YETKİLENDİRME (ACCESS CONTROL) UÇLARI
// ============================================

app.get('/api/doors', verifyToken, async (req, res) => {
    try {
        const result = await sql.query('SELECT * FROM Doors ORDER BY ID ASC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kapılar getirilemedi.' });
    }
});

// 2. YENİ KAPI EKLE (Yeni DoorLogs tablosuna log yazar)
app.post('/api/doors', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.username || req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const { kapi_adi } = req.body;
    try {
        const request = new sql.Request();
        request.input('kapi_adi', sql.NVarChar, kapi_adi);
        await request.query(`INSERT INTO Doors (Kapi_Adi) VALUES (@kapi_adi)`);
        
        // KAPI LOGU TUT
        await addDoorLog(aktifKullanici, 'YENİ KAPI', kapi_adi, 'Sisteme yeni kapı tanımlandı.');
        res.json({ success: true, message: 'Kapı başarıyla eklendi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kapı eklenemedi.' });
    }
});

// 3. YENİ UÇ: KAPI SİL 
app.delete('/api/doors/:id', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.username || req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const doorId = req.params.id;
    try {
        const reqName = new sql.Request();
        reqName.input('id', sql.Int, doorId);
        const doorResult = await reqName.query('SELECT Kapi_Adi FROM Doors WHERE ID = @id');
        
        if (doorResult.recordset.length === 0) return res.status(404).json({ success: false, message: 'Kapı bulunamadı.' });
        
        const kapiAdi = doorResult.recordset[0].Kapi_Adi;
        
        const request = new sql.Request();
        request.input('id', sql.Int, doorId);

        // Bağlı yetkileri ve kapıyı sil
        await request.query(`DELETE FROM Permissions WHERE Door_ID = @id`);
        await request.query(`DELETE FROM Doors WHERE ID = @id`);

        // KAPI LOGU TUT
        await addDoorLog(aktifKullanici, 'KAPI SİLİNDİ', kapiAdi, 'Sistemden kapı kaldırıldı ve yetkiler temizlendi.');
        res.json({ success: true, message: 'Kapı başarıyla silindi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kapı silinemedi.' });
    }
});

// 4. PERSONELİN YETKİLİ OLDUĞU KAPILARI GETİR
app.get('/api/users/:id/doors', verifyToken, async (req, res) => {
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

// 5. PERSONELİN YETKİLERİNİ GÜNCELLE (Personel Logu - SystemLogs'a yazar)
app.post('/api/users/:id/doors', verifyToken, async (req, res) => {
    const aktifKullanici = req.user?.username || req.user?.kullanici_adi || 'Sistem Yetkilisi';
    const { doorIds } = req.body; 
    const userId = req.params.id;
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, userId);
        
        const userRes = await request.query(`SELECT Ad_Soyad, Sicil_No FROM Users WHERE ID = @id`);
        const user = userRes.recordset[0];

        await request.query(`DELETE FROM Permissions WHERE User_ID = @id`);
        
        if (doorIds && doorIds.length > 0) {
            for (let doorId of doorIds) {
                const reqInsert = new sql.Request();
                reqInsert.input('uid', sql.Int, userId);
                reqInsert.input('did', sql.Int, doorId);
                await reqInsert.query(`INSERT INTO Permissions (User_ID, Door_ID) VALUES (@uid, @did)`);
            }
        }

        // YETKİ LOGU TUT
        const yetkiDurumu = (doorIds && doorIds.length > 0) ? `${doorIds.length} adet kapıya yetki verildi.` : 'Tüm kapı yetkileri KALDIRILDI.';
        await addSystemLog(aktifKullanici, 'YETKİ GÜNCELLEME', user.Ad_Soyad, user.Sicil_No, yetkiDurumu);

        res.json({ success: true, message: 'Yetkiler başarıyla kaydedildi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Yetkiler güncellenemedi.' });
    }
});
// --- SUNUCUYU DİNLEMEYE ALMA ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
    console.log(`Log API'sini test etmek için: http://localhost:${PORT}/api/logs`);
});