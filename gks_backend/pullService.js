const cron = require('node-cron');
const {sql} = require('./db');

async function generateMockData() {
    const request = new sql.Request();

    const usersResult = await request.query(`
        SELECT ID, Ad_Soyad, RFID_Kart_No
        FROM Users
        WHERE Durum = 1`);

    // DÜZELTME: Sadece durumu aktif (1) olan veya varsayılan (NULL) olan kapıları seç
    const doorResult = await new sql.Request().query(`
        SELECT ID
        FROM Doors
        WHERE Durum = 1 OR Durum IS NULL`);

    const cards = usersResult.recordset.map(x => x.RFID_Kart_No);
    cards.push('Kart Yok'); // Sisteme kayıtlı olmayan bir kart denemesi (Reddedildi simülasyonu)
    
    const doors = doorResult.recordset.map(door => door.ID);

    // GÜVENLİK: Eğer sistemde hiç aktif kapı yoksa işlem yapma, null dön
    if (doors.length === 0) {
        return null; 
    }

    const rfid = cards[Math.floor(Math.random() * cards.length)];
    const doorID = doors[Math.floor(Math.random() * doors.length)];
    
    return { rfid, doorID }
}

async function processCardReading(rfid, doorID){
    try {
        const request = new sql.Request();
        request.input('rfid', sql.NVarChar, rfid);
        request.input('doorId', sql.Int, doorID);

        const checkQuery = `
            SELECT u.ID, u.Durum, p.ID as PermissionID
            FROM USERS u 
            LEFT JOIN Permissions p ON u.ID = p.User_ID AND p.Door_ID = @doorId
            WHERE u.RFID_Kart_No = @rfid`;
        const result = await request.query(checkQuery);
        let basariliMi = 0;
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            if (user.Durum === true && user.PermissionID !== null) {
                basariliMi = 1;
            }
        }

        // Sonucu Logs tablosuna kaydediyoruz
        const logRequest = new sql.Request();
        logRequest.input('logRfid', sql.NVarChar, rfid);
        logRequest.input('logDoorId', sql.Int, doorID);
        logRequest.input('logBasarili', sql.Bit, basariliMi);

        await logRequest.query(`
            INSERT INTO Logs (RFID_Kart_No, Door_ID, Basarili_Mi) 
            VALUES (@logRfid, @logDoorId, @logBasarili)
        `);
        
        console.log(`[Pull Service] Kart : ${rfid} | Kapı: ${doorID} | Sonuç: ${basariliMi ? 'Geçiş Başarılı': 'Geçiş Reddedildi'} `);
    
    } catch (error) {
        console.error('[Pull Service] Veritabanı işlemi sırasında hata:', error.message);
    }
}

function startPullService() {
    // '*/10 * * * * *' -> Her 10 saniyede bir tetiklenir
    cron.schedule('*/10 * * * * *', async () => {
        // const data = await generateMockData();
        
        // // Eğer data geçerliyse (aktif kapı varsa) işlemi gerçekleştir
        // if (data) {
        //     await processCardReading(data.rfid, data.doorID);
        // }
    });
    
    console.log('Pull Service aktif. (Her 10 saniyede bir cihazlardan veri çekiliyor...)');
}

// Server.js'te kullanmak için dışa aktarıyoruz
module.exports = startPullService;