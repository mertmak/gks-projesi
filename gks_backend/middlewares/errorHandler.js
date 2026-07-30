const errorHandler = (err, req, res, next) => {
    console.error("🔥 Sistem Hatası Yakalandı:", err.stack);
    
    // Eğer hata SQL ile ilgili bir unique constraint (çakışma) hatasıysa (Örn: Aynı TC veya Sicil)
    if (err.number === 2627) {
        return res.status(400).json({ 
            success: false, 
            message: 'Bu kayıt sistemde zaten mevcut. (Çift kayıt hatası)' 
        });
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Sunucu tarafında beklenmeyen bir hata oluştu.';

    res.status(statusCode).json({
        success: false,
        message: message
    });
};

module.exports = errorHandler;