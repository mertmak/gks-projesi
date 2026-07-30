const cron = require('node-cron');
const { sql } = require('./db');

// 1. Simülasyon Veri Üretici (Gerçek cihaz olmadığı için mock data)
async function generateMockData() {
const request =new sql.Request();
const usersResult = await request.query(`
SELECT ID,Ad_Soyad,RFID_Kart_No
FROM Users`);
const doorResult = await new sql.Request().query(`
SELECT ID
FROM Doors`);
const cards = usersResult.recordset.map(x=>x.RFID_Kart_No);
cards.push('Kart Yok');
const doors= doorResult.recordset.map(door=>door.ID);
const rfid = cards[Math.floor(Math.random()*cards.length)];
const doorID = doors[Math.floor(Math.random()*doors.length)]
return {rfid,doorID}
}

// 2. İş Mantığı: Veritabanı Kontrolü ve Loglama
async function processCardReading(rfid, doorId) {
    try {
        // Parametreli sorgu nesnemizi oluşturuyoruz (SQL Injection koruması)
        const request = new sql.Request();
        request.input('rfid', sql.NVarChar, rfid);
        request.input('doorId', sql.Int, doorId);

        // Kullanıcıyı, durumunu ve yetkisini tek bir sorguyla çekiyoruz
        const checkQuery = `
            SELECT u.ID, u.Durum, p.ID as PermissionID
            FROM Users u
            LEFT JOIN Permissions p ON u.ID = p.User_ID AND p.Door_ID = @doorId
            WHERE u.RFID_Kart_No = @rfid
        `;
        
        const result = await request.query(checkQuery);
        let basariliMi = 0; // Başlangıçta yetkisiz (0) kabul ediyoruz

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            // Eğer kullanıcı aktifse ve bu kapı için bir yetki kaydı varsa
            if (user.Durum === true && user.PermissionID !== null) {
                basariliMi = 1;
            }
        }

        // Sonucu Logs tablosuna kaydediyoruz
// Sonucu Logs tablosuna kaydediyoruz
        const logRequest = new sql.Request();
        logRequest.input('logRfid', sql.NVarChar, rfid);
        logRequest.input('logDoorId', sql.Int, doorId);
        logRequest.input('logBasarili', sql.Bit, basariliMi);

        await logRequest.query(`
            INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi) 
            VALUES (@logRfid, @logDoorId, @logBasarili)
        `);

        console.log(`[Pull Service] Kart: ${rfid} | Kapı: ${doorId} | Sonuç: ${basariliMi ? 'GEÇİŞ BAŞARILI' : 'GEÇİŞ REDDEDİLDİ'}`);

    } catch (error) {
        console.error('[Pull Service] Veritabanı işlemi sırasında hata:', error.message);
    }
}

// 3. Zamanlanmış Görevi (Cron) Başlatma
function startPullService() {
    // '*/10 * * * * *' -> Her 10 saniyede bir tetiklenir
    cron.schedule('*/10 * * * * *', async () => {
        const data = generateMockData();
        await processCardReading(data.rfid, data.doorID);    });
    
    console.log('Pull Service aktif. (Her 10 saniyede bir cihazlardan veri çekiliyor...)');
}

// Server.js'te kullanmak için dışa aktarıyoruz
module.exports = startPullService;