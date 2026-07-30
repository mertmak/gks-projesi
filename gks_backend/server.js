require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const http = require('http'); // YENİ: Node.js yerleşik http modülü
const socket = require('./utils/socket'); // YENİ: Socket yöneticimiz

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
const app = express();

// Temel Middleware'ler
app.use(cors());
app.use(express.json());

// Veritabanı bağlantısı
connectDB();

// Sağlık kontrolü (Status check) ucu
app.get('/api/status', (req, res) => {
    res.json({ durum: 'Başarılı', mesaj: 'GKS API Sistemleri Aktif ve Çalışıyor' });
});

// Rotaları '/api' kök dizini altında Express'e bağlıyoruz
app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', userRoutes);
app.use('/api', doorRoutes);
app.use('/api', shiftRoutes); 
app.use('/api', reportRoutes);
app.use('/api',leaveRoutes);
app.use('/api', seederRoutes); // app.use alanlarına

const server = http.createServer(app);
const io = socket.init(server);
io.on('connection', (client) => {
    console.log('⚡ Yeni bir frontend istemcisi bağlandı:', client.id);
    
    client.on('disconnect', () => {
        console.log('🔌 İstemci ayrıldı:', client.id);
    });
});

app.use(errorHandler);
// Sunucuyu başlatma
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});