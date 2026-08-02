require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./utils/swagger');
const { connectDB } = require('./db');
const http = require('http');
const socket = require('./utils/socket');
const logger = require('./utils/appLogger');

// Rotaları projeye dahil ediyoruz

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const doorRoutes = require('./routes/doorRoutes');
const shiftRoutes = require('./routes/shiftRoutes'); 
const reportRoutes = require('./routes/reportRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const seederRoutes = require('./routes/seederRoutes'); // Yukarıdaki require alanlarına
const errorHandler = require('./middlewares/errorHandler');
const overtimeRoutes = require('./routes/overtimeRoutes'); // YENİ
const app = express();

// Temel Middleware'ler
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Veritabanı bağlantısı
connectDB();

// Sağlık kontrolü
app.get('/api/status', (req, res) => {
    res.json({ durum: 'Başarılı', mesaj: 'GKS API Sistemleri Aktif ve Çalışıyor' });
});

// API Dokümantasyonu (yalnızca geliştirme/test ortamında açık)
if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'GKS API Docs',
    }));
    logger.info('Swagger UI: http://localhost:' + (process.env.PORT || 3000) + '/api-docs');
}

// Rotaları '/api' kök dizini altında Express'e bağlıyoruz
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', userRoutes);
app.use('/api', doorRoutes);
app.use('/api', shiftRoutes); 
app.use('/api', reportRoutes);
app.use('/api',leaveRoutes);
app.use('/api', seederRoutes); // app.use alanlarına
app.use('/api', overtimeRoutes); // YENİ

const server = http.createServer(app);
socket.init(server);

app.use(errorHandler);
// Sunucuyu başlatma
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`GKS Sunucusu ${PORT} portunda başarıyla başlatıldı.`);
});