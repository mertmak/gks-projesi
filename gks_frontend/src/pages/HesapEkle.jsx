import { useState, useEffect } from 'react';
import api from '../api/axios';

function HesapEkle() {
  const [formData, setFormData] = useState({ username: '', password: '', rol: 'user' });
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [hesaplar, setHesaplar] = useState([]);

  // Sayfa açıldığında veya hesap eklendiğinde/silindiğinde listeyi yenile
  const hesaplariGetir = async () => {
    try {
      const response = await api.get('/hesaplar');
      setHesaplar(response.data);
    } catch (err) {
      console.error("Hesaplar çekilemedi", err);
    }
  };

  useEffect(() => {
    hesaplariGetir();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await api.post('/hesap-ekle', formData);
      setIsSuccess(true);
      setMessage(response.data.message);
      setFormData({ username: '', password: '', rol: 'user' });
      hesaplariGetir(); // Yeni hesap eklendiğinde tabloyu hemen güncelle
    } catch (err) {
      setIsSuccess(false);
      setMessage(err.response?.data?.message || 'Hesap oluşturulurken bir hata oluştu.');
    }
  };

  const handleDelete = async (id) => {
    // Silmeden önce kullanıcıdan onay iste
    if (window.confirm('Bu hesabı kalıcı olarak silmek istediğinize emin misiniz?')) {
      try {
        const response = await api.delete(`/hesap-sil/${id}`);
        setMessage(response.data.message);
        setIsSuccess(true);
        hesaplariGetir(); // Silme işleminden sonra tabloyu güncelle
      } catch (err) {
        setIsSuccess(false);
        setMessage(err.response?.data?.message || 'Silme işlemi başarısız.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-10">
      
      {/* 1. KISIM: YENİ HESAP EKLEME FORMU */}
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">Yeni Hesap Oluştur</h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Kullanıcı Adı</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required placeholder="Örn: ahmet_guvenlik" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Şifre</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Yetki Seviyesi</label>
            <select name="rol" value={formData.rol} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all shadow-sm bg-white">
              <option value="user">Sınırlı Kullanıcı</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md">
              Hesabı Kaydet
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-bold text-center border ${isSuccess ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {message}
          </div>
        )}
      </div>

      {/* 2. KISIM: KAYITLI HESAPLAR TABLOSU */}
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">Sistemdeki Hesaplar</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-sm font-bold text-slate-600">ID</th>
                <th className="py-4 px-6 text-sm font-bold text-slate-600">Kullanıcı Adı</th>
                <th className="py-4 px-6 text-sm font-bold text-slate-600">Rol</th>
                <th className="py-4 px-6 text-sm font-bold text-slate-600 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {hesaplar.map((hesap) => (
                <tr key={hesap.ID} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-800">#{hesap.ID}</td>
                  <td className="py-4 px-6 font-medium text-slate-700">{hesap.Kullanici_Adi}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${hesap.Rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {hesap.Rol === 'admin' ? 'YÖNETİCİ' : 'KULLANICI'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => handleDelete(hesap.ID)}
                      className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {hesaplar.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-slate-500">Sistemde henüz hesap bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default HesapEkle;