require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');

// Rotaları projeye dahil ediyoruz
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const doorRoutes = require('./routes/doorRoutes');
const shiftRoutes = require('./routes/shiftRoutes'); 
const reportRoutes = require('./routes/reportRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const seederRoutes = require('./routes/seederRoutes');

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
app.use('/api', leaveRoutes);
app.use('/api', seederRoutes);

// Sunucuyu başlatma
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
    console.log(`Log API'sini test etmek için: http://localhost:${PORT}/api/logs`);
});