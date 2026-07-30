// Node.js'in saat dilimi (Timezone) eklemesini engellemek için sadece saati ve dakikayı çeken fonksiyon
const parseTimeToMinutes = (timeObj) => {
    if (!timeObj) return 0;
    
    if (timeObj instanceof Date) {
        const timeStr = timeObj.toISOString().split('T')[1].substring(0, 5);
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    
    const parts = timeObj.toString().split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// SQL Time objesini HH:mm formatına çeviren fonksiyon
const formatTimeStr = (dbTime) => {
    if (!dbTime) return null;
    if (dbTime instanceof Date) return dbTime.toISOString().split('T')[1].substring(0, 5);
    return dbTime.toString().substring(0, 5);
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