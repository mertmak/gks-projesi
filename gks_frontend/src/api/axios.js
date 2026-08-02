import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    timeout: 5000,
});

// Interceptor (Araya Girici): Her istek backend'e gitmeden hemen önce çalışır
api.interceptors.request.use((config) => {
    // Tarayıcının hafızasından token'ı al
    const token = localStorage.getItem('token');
    
    // Eğer token varsa, bunu Authorization başlığına 'Bearer ...' formatında ekle
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;