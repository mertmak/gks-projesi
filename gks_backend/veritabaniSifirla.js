require('dotenv').config();
const { sql, connectDB } = require('./db');

const resetDB = async () => {
    await connectDB();
    console.log("⚠️ Veritabanı sıfırlama işlemi başlıyor...");

    try {
        // Tabloları doğru ilişki sırasına (Child -> Parent) göre silmek çok önemlidir.
        // Aksi takdirde Foreign Key (Yabancı Anahtar) hataları alabiliriz.
        const tablolar = [
            'Logs',
            'DoorLogs',
            'SystemLogs',
            'Permissions',
            'Personel_Vardiya',
            'Users',
            'Doors',
            'Vardiyalar',
            'Yoneticiler' // DİKKAT: Yönetici (Admin) hesaplarını da silip sistemi fabrikaya ayarlarına 
                           // döndürmek istersen başındaki // işaretlerini kaldır.
        ];

        for (let tablo of tablolar) {
            console.log(`🧹 ${tablo} tablosu temizleniyor...`);
            
            // Tablodaki tüm verileri sil
            await sql.query(`DELETE FROM ${tablo}`);
            
            // ID (Identity) sayacını sıfırla (Yeni kayıtlar tekrar 1'den başlasın diye)
            try {
                await sql.query(`DBCC CHECKIDENT ('${tablo}', RESEED, 0)`);
                console.log(`   └─ ${tablo} tablosunun ID sayacı sıfırlandı.`);
            } catch (e) {
                // Bazı tablolarda otomatik artan ID olmayabilir, bu hatayı yoksayıyoruz.
            }
        }

        console.log("\n✅ İŞLEM TAMAM: Tüm operasyonel veriler başarıyla silindi ve sistem sıfırlandı!");
        console.log("🚀 Şimdi 'node veriUretici_2.js' komutunu çalıştırarak yeni ve temiz verileri üretebilirsin.");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ Sıfırlama sırasında kritik hata:", err.message);
        process.exit(1);
    }
};

resetDB();