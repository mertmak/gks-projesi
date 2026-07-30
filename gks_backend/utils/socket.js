let io;

module.exports = {
    init: (httpServer) => {
        const { Server } = require('socket.io');
        io = new Server(httpServer, {
            cors: {
                origin: "*", // Frontend'in URL'si (İleride sadece frontend'in portuna kısıtlayabilirsin)
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
            }
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