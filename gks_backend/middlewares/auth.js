const jwt = require('jsonwebtoken');

// Gizli anahtarı .env dosyasından çekiyoruz, bulamazsa güvenli bir hata atması için fallback ekliyoruz
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_guvenlik_anahtari_degistirilmeli';

const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const token = bearerHeader.split(' ')[1]; 
        jwt.verify(token, SECRET_KEY, (err, authData) => {
            if (err) {
                return res.status(403).json({ success: false, message: 'Token geçersiz veya süresi dolmuş.' });
            } else {
                req.user = authData; 
                next(); 
            }
        });
    } else {
        res.status(401).json({ success: false, message: 'Erişim reddedildi. Token bulunamadı.' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); 
    } else {
        res.status(403).json({ success: false, message: 'Bu işlem için YÖNETİCİ yetkisine sahip olmalısınız!' });
    }
};

module.exports = { verifyToken, verifyAdmin, SECRET_KEY };