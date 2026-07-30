import { useState } from 'react';
import api from '../api/axios';

function Settings() {
  const [formData, setFormData] = useState({
    username: '',
    eskiSifre: '',
    yeniSifre: ''
  });
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      // Backend'deki şifre değiştirme ucuna verileri yolluyoruz
      const response = await api.post('/sifre-degistir', formData);
      setIsSuccess(true);
      setMessage(response.data.message);
      
      // Başarılı olursa formu temizle
      setFormData({ username: '', eskiSifre: '', yeniSifre: '' });
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.response?.data?.message || 'Şifre değiştirilirken bir hata oluştu.');
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mt-10">
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">Hesap Ayarları</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Kullanıcı Adı</label>
          <input 
            type="text" 
            name="username"
            value={formData.username} 
            onChange={handleChange} 
            required 
            placeholder="Örn: mert"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Mevcut Şifre</label>
          <input 
            type="password" 
            name="eskiSifre"
            value={formData.eskiSifre} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Yeni Şifre</label>
          <input 
            type="password" 
            name="yeniSifre"
            value={formData.yeniSifre} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm"
          />
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg mt-2"
        >
          Şifreyi Güncelle
        </button>
      </form>

      {/* Mesaj Gösterge Alanı */}
      {message && (
        <div className={`mt-6 p-4 rounded-xl text-sm font-bold text-center border ${
          isSuccess 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default Settings;