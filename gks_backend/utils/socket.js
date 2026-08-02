const jwt = require('jsonwebtoken');
const logger = require('./appLogger');

let io;

module.exports = {
    init: (httpServer) => {
        const { Server } = require('socket.io');
        const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

        io = new Server(httpServer, {
            cors: {
                origin: allowedOrigin,
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
            }
        });

        // JWT doğrulama middleware'i
        io.use((socket, next) => {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Kimlik doğrulama hatası: Token bulunamadı.'));
            }
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return next(new Error('Kimlik doğrulama hatası: Token geçersiz.'));
                }
                socket.user = decoded;
                next();
            });
        });

        io.on('connection', (socket) => {
            logger.info(`Socket bağlandı: ${socket.id} (kullanıcı: ${socket.user?.kullanici_adi || 'bilinmiyor'})`);
            socket.on('disconnect', () => {
                logger.info(`Socket ayrıldı: ${socket.id}`);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io henüz başlatılmadı!');
        }
        return io;
    }
};
