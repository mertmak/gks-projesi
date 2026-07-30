import { useState, useEffect } from 'react';
import api from '../api/axios'; 

function Users() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ adSoyad: '', rfid: '' });
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error("Veri çekme hatası:", err);
      setMessage("Personel listesi yüklenemedi.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await api.post('/users', formData);
      setMessage('Personel başarıyla eklendi!');
      setFormData({ adSoyad: '', rfid: '' }); 
      fetchUsers(); 
    } catch (err) {
      console.error("Ekleme hatası:", err);
      setMessage("Personel eklenirken bir hata oluştu.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* SOL TARAF: Yeni Personel Ekleme Formu */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 h-fit">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-6">Yeni Personel Ekle</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Ad Soyad</label>
            <input 
              type="text" 
              name="adSoyad" 
              value={formData.adSoyad} 
              onChange={handleChange} 
              required 
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm"
              placeholder="Örn: Mert Mak"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">RFID Kart No</label>
            <input 
              type="text" 
              name="rfid" 
              value={formData.rfid} 
              onChange={handleChange} 
              required 
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm font-mono"
              placeholder="Örn: KART_999"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg mt-2"
          >
            Sisteme Kaydet
          </button>
        </form>
        
        {message && (
          <div className={`mt-5 p-4 rounded-xl text-sm font-bold text-center border ${
            message.includes('başarıyla') 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* SAĞ TARAF: Mevcut Personel Listesi */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-6">Sistemdeki Personeller</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-t-lg">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">ID</th>
                <th className="px-6 py-4">Ad Soyad</th>
                <th className="px-6 py-4">Kart Numarası</th>
                <th className="px-6 py-4 rounded-tr-lg text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.ID} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{user.ID}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{user.Ad_Soyad}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-cyan-700 bg-cyan-50 px-3 py-1 rounded-md text-xs border border-cyan-100">
                        {user.RFID_Kart_No}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        user.Durum 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {user.Durum ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic bg-slate-50">Sistemde henüz personel kaydı bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default Users;