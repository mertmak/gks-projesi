const jwt = require('jsonwebtoken');
const SECRET_KEY = 'gks_super_gizli_anahtar_2026';

const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const token = bearerHeader.split(' ')[1]; 
        jwt.verify(token, SECRET_KEY, (err, authData) => {
            if (err) {
                return res.status(403).json({ message: 'Token geçersiz veya süresi dolmuş.' });
            } else {
                req.user = authData; 
                next(); 
            }
        });
    } else {
        res.status(401).json({ message: 'Erişim reddedildi. Token bulunamadı.' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); 
    } else {
        res.status(403).json({ message: 'Bu işlem için YÖNETİCİ yetkisine sahip olmalısınız!' });
    }
};

module.exports = { verifyToken, verifyAdmin, SECRET_KEY };