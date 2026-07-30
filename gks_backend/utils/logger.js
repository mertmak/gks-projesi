const { sql } = require('../db');
const socket = require('./socket');

const addSystemLog = async (islemiYapan, islemTipi, personelAd, sicil, detay) => {
    try {
        const req = new sql.Request();
        req.input('yapan', sql.NVarChar, islemiYapan || 'Sistem Yetkilisi');
        req.input('islem', sql.NVarChar, islemTipi);
        req.input('kisi', sql.NVarChar, personelAd);
        req.input('sicil', sql.NVarChar, sicil || '');
        req.input('detay', sql.NVarChar, detay || '');
        await req.query(`
            INSERT INTO SystemLogs (Islemi_Yapan, Islem_Tipi, Personel_Ad, Sicil_No, Detay) 
            VALUES (@yapan, @islem, @kisi, @sicil, @detay)
        `);
        socket.getIO().emit('new_system_log');
    } catch (err) {
        console.error("Sistem logu yazılamadı:", err);
    }
};

const addDoorLog = async (islemiYapan, islemTipi, kapiAdi, detay) => {
    try {
        const req = new sql.Request();
        req.input('yapan', sql.NVarChar, islemiYapan || 'Sistem Yetkilisi');
        req.input('islem', sql.NVarChar, islemTipi);
        req.input('kapi', sql.NVarChar, kapiAdi);
        req.input('detay', sql.NVarChar, detay || '');
        await req.query(`
            INSERT INTO DoorLogs (Islemi_Yapan, Islem_Tipi, Kapi_Adi, Detay) 
            VALUES (@yapan, @islem, @kapi, @detay)
        `);
        socket.getIO().emit('new_door_log');
    } catch (err) {
        console.error("Kapı logu yazılamadı:", err);
    }
};

module.exports = { addSystemLog, addDoorLog };