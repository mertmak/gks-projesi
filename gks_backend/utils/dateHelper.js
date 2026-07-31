// Node.js'in saat dilimi (Timezone) eklemesini engellemek için sadece saati ve dakikayı çeken fonksiyon
const parseTimeToMinutes = (timeObj) => {
    if (!timeObj) return 0;
    
    if (timeObj instanceof Date) {
        const timeStr = timeObj.toISOString().split('T')[1].substring(0, 5);
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    
    const timeStr = timeObj.toString();
    
    // Veritabanında kalan eski T formatlı stringleri düzeltmek için:
    if (timeStr.includes('T')) {
        const parts = timeStr.split('T')[1].substring(0, 5).split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// SQL Time objesini veya hatalı stringi HH:mm formatına çeviren fonksiyon
const formatTimeStr = (dbTime) => {
    if (!dbTime) return null;
    if (dbTime instanceof Date) return dbTime.toISOString().split('T')[1].substring(0, 5);
    
    const dbTimeStr = dbTime.toString();
    
    // YENİ: String formatındaysa ve içinde 'T' varsa (Örn: 1970-01-01T09:00:00.000Z)
    if (dbTimeStr.includes('T')) {
        return dbTimeStr.split('T')[1].substring(0, 5);
    }
    
    return dbTimeStr.substring(0, 5);
};

// JavaScript Date objesini SQL DateTime formatına (YYYY-MM-DD HH:mm:ss) çeviren fonksiyon
const formatSqlDate = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

module.exports = { 
    parseTimeToMinutes, 
    formatTimeStr, 
    formatSqlDate 
};