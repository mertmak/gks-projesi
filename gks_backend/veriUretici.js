require('dotenv').config();
const { sql, connectDB } = require('./db');

// Örnek Veri Havuzu
const isimler = ['Ali', 'Ayşe', 'Fatma', 'Ahmet', 'Mehmet', 'Can', 'Elif', 'Burak', 'Zeynep', 'Emre', 'Cem', 'Deniz', 'Eda', 'Ozan', 'Gökhan'];
const soyisimler = ['Yılmaz', 'Demir', 'Kaya', 'Çelik', 'Şahin', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Yıldız', 'Özdemir', 'Çetin', 'Koç'];
const departmanlar = ['İşletme', 'Bilgi İşlem', 'İnsan Kaynakları', 'Muhasebe', 'Pazarlama', 'Üretim', 'Lojistik', 'Güvenlik'];

const generateRandomUser = (index) => {
    const adSoyad = index === 0 ? 'Mert Mak' : `${isimler[Math.floor(Math.random() * isimler.length)]} ${soyisimler[Math.floor(Math.random() * soyisimler.length)]}`;
    const rfid = `KART_${10000 + index}_${Math.floor(Math.random() * 9000)}`;
    const tc = `1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const sicil = `SCL-${1000 + index}`;
    const departman = index === 0 ? 'İşletme' : departmanlar[Math.floor(Math.random() * departmanlar.length)];
    return { adSoyad, rfid, tc, sicil, departman };
};

const runSeeder = async () => {
    await connectDB();
    console.log("🚀 Gelişmiş Veri Üretim işlemi başlatılıyor... Lütfen bekleyin.");

    try {
        // ÖNCE ESKİ VERİLERİ TEMİZLE (Sıfırdan tertemiz bir senaryo kuralım)
        await sql.query('DELETE FROM Logs');
        
        // 1. KAPI ÜRETİMİ
        console.log("🚪 Kapılar oluşturuluyor...");
        const kapiTipleri = ['Ana Giriş', 'Ana Çıkış', 'Yemekhane Giriş', 'Yemekhane Çıkış', 'Mola / Sigara Alanı', 'İç Geçiş'];
        const doors = [];
        
        for (let i = 1; i <= 15; i++) {
            const kapiTuru = kapiTipleri[i % kapiTipleri.length];
            const kapiAdi = `Kapı ${i} - ${kapiTuru}`;
            const req = new sql.Request();
            req.input('ad', sql.NVarChar, kapiAdi);
            req.input('tur', sql.NVarChar, kapiTuru);
            
            const res = await req.query(`
                INSERT INTO Doors (Kapi_Adi, Departman, Konum, Kapi_Turu, Durum) 
                OUTPUT INSERTED.ID
                VALUES (@ad, 'Genel', 'Zemin Kat', @tur, 1)
            `);
            doors.push({ id: res.recordset[0].ID, tur: kapiTuru });
        }

        // 2. PERSONEL ÜRETİMİ
        console.log("👥 Personeller oluşturuluyor...");
        const users = [];
        for (let i = 0; i < 100; i++) {
            const u = generateRandomUser(i);
            const req = new sql.Request();
            req.input('ad', sql.NVarChar, u.adSoyad);
            req.input('rfid', sql.NVarChar, u.rfid);
            req.input('tc', sql.NVarChar, u.tc);
            req.input('sicil', sql.NVarChar, u.sicil);
            req.input('dep', sql.NVarChar, u.departman);
            
            const res = await req.query(`
                INSERT INTO Users (Ad_Soyad, RFID_Kart_No, TC_Kimlik, Sicil_No, Departman, Durum, Ise_Giris_Tarihi) 
                OUTPUT INSERTED.ID
                VALUES (@ad, @rfid, @tc, @sicil, @dep, 1, CAST(GETDATE() AS DATE))
            `);
            users.push({ id: res.recordset[0].ID, rfid: u.rfid, adSoyad: u.adSoyad });

            for (let d of doors) {
                await new sql.Request().query(`INSERT INTO Permissions (User_ID, Door_ID) VALUES (${res.recordset[0].ID}, ${d.id})`);
            }
        }

        // 3. 09:00 - 18:00 VARDİYASINA GÖRE GELİŞMİŞ HAREKET SİMÜLASYONU
        console.log("📅 10 günlük gerçekçi geçiş verileri yazılıyor (Bu işlem birkaç saniye sürebilir)...");
        
        const today = new Date();
        let logSayisi = 0;

        for (let gun = 10; gun >= 0; gun--) {
            const islemTarihi = new Date(today);
            islemTarihi.setDate(today.getDate() - gun);
            const tarihStr = islemTarihi.toISOString().split('T')[0];

            for (let u of users) {
                // Hafta sonları pas geç (Cumartesi: 6, Pazar: 0)
                if (islemTarihi.getDay() === 0 || islemTarihi.getDay() === 6) continue;

                // Rastgele Devamsızlık İhtimali (%5) - Kendi hesabın hariç
                if (Math.random() < 0.05 && u.adSoyad !== 'Mert Mak') continue;

                // --- 1. SABAH GİRİŞ (Genelde 08:45-09:00, nadiren 09:00-09:15) ---
                const anaGirisler = doors.filter(d => d.tur === 'Ana Giriş');
                if (anaGirisler.length > 0) {
                    let saat = 8;
                    let dk = Math.floor(Math.random() * 15) + 45; // 08:45 ile 08:59 arası
                    if (Math.random() > 0.8) { 
                        saat = 9; // %20 ihtimalle geç kalsın
                        dk = Math.floor(Math.random() * 15); // 09:00 ile 09:14 arası
                    }
                    const zaman = `${tarihStr} 0${saat}:${String(dk).padStart(2, '0')}:${Math.floor(Math.random()*50)+10}`;
                    await new sql.Request().query(`INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi, Zaman) VALUES ('${u.rfid}', ${anaGirisler[0].id}, 1, '${zaman}')`);
                    logSayisi++;
                }

                // --- 2. KISA MOLA SİMÜLASYONU (10:30 civarı) ---
                if (Math.random() > 0.5) { // Herkes her gün çıkmasın
                    const molaAlanlari = doors.filter(d => d.tur === 'Mola / Sigara Alanı');
                    const icGecisler = doors.filter(d => d.tur === 'İç Geçiş');
                    if (molaAlanlari.length > 0 && icGecisler.length > 0) {
                        const molaGirisDk = Math.floor(Math.random() * 15) + 30; // 10:30 ile 10:45 arası molaya çıksın
                        const molaSuresi = Math.floor(Math.random() * 25) + 5; // 5 ile 30 dk arası kalsın (aşım durumu oluşsun)
                        const molaCikisDkTotal = molaGirisDk + molaSuresi;
                        
                        let molaCikisSaat = 10;
                        let molaCikisDk = molaCikisDkTotal;
                        if (molaCikisDk >= 60) { molaCikisSaat = 11; molaCikisDk -= 60; }

                        const girisZ = `${tarihStr} 10:${String(molaGirisDk).padStart(2, '0')}:00`;
                        const cikisZ = `${tarihStr} ${molaCikisSaat}:${String(molaCikisDk).padStart(2, '0')}:00`;
                        
                        await new sql.Request().query(`INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi, Zaman) VALUES ('${u.rfid}', ${molaAlanlari[0].id}, 1, '${girisZ}')`);
                        await new sql.Request().query(`INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi, Zaman) VALUES ('${u.rfid}', ${icGecisler[0].id}, 1, '${cikisZ}')`);
                        logSayisi += 2;
                    }
                }

                // --- 3. YEMEKHANE MANTIĞI (13:00 - 14:00 arası) ---
                const yemekGirisler = doors.filter(d => d.tur === 'Yemekhane Giriş');
                const yemekCikislar = doors.filter(d => d.tur === 'Yemekhane Çıkış');
                
                if (yemekGirisler.length > 0 && yemekCikislar.length > 0) {
                    const yGirisDk = Math.floor(Math.random() * 10); // 13:00 ile 13:09 arası
                    const yCikisDkTotal = yGirisDk + Math.floor(Math.random() * 15) + 40; // İçeride 40-55 dk geçirsin
                    
                    let yCikisSaat = 13;
                    let yCikisDk = yCikisDkTotal;
                    if (yCikisDk >= 60) { yCikisSaat = 14; yCikisDk -= 60; }

                    const girisZ = `${tarihStr} 13:${String(yGirisDk).padStart(2, '0')}:30`;
                    const cikisZ = `${tarihStr} ${yCikisSaat}:${String(yCikisDk).padStart(2, '0')}:45`;
                    
                    await new sql.Request().query(`INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi, Zaman) VALUES ('${u.rfid}', ${yemekGirisler[0].id}, 1, '${girisZ}')`);
                    await new sql.Request().query(`INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi, Zaman) VALUES ('${u.rfid}', ${yemekCikislar[0].id}, 1, '${cikisZ}')`);
                    logSayisi += 2;
                }

                // --- 4. AKŞAM ÇIKIŞ (Genelde 18:00 - 18:30) ---
                const anaCikislar = doors.filter(d => d.tur === 'Ana Çıkış');
                if (anaCikislar.length > 0) {
                    let exitSaat = 18;
                    let exitDk = Math.floor(Math.random() * 30); // 18:00 ile 18:29 arası çıkar
                    if (Math.random() < 0.1) { // %10 ihtimalle erken kaçar
                        exitSaat = 17;
                        exitDk = Math.floor(Math.random() * 15) + 45; // 17:45 ile 17:59
                    }
                    const zaman = `${tarihStr} ${exitSaat}:${String(exitDk).padStart(2, '0')}:${Math.floor(Math.random()*50)+10}`;
                    await new sql.Request().query(`INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi, Zaman) VALUES ('${u.rfid}', ${anaCikislar[0].id}, 1, '${zaman}')`);
                    logSayisi++;
                }
            }
        }

        console.log(`✅ İŞLEM TAMAMLANDI! 09:00 - 18:00 vardiyasına uygun toplam ${logSayisi} adet anlamlı geçiş logu sisteme eklendi.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Veri üretimi sırasında hata:", err.message);
        process.exit(1);
    }
};

runSeeder();