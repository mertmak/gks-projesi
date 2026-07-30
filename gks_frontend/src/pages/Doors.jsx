import { useState, useEffect } from 'react';
import api from '../api/axios';

function Doors() {
  const [doors, setDoors] = useState([]);
  const [kapiAdi, setKapiAdi] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const fetchDoors = async () => {
    try {
      const response = await api.get('/doors');
      setDoors(response.data);
    } catch (err) {
      console.error('Kapılar çekilemedi:', err);
    }
  };

  useEffect(() => {
    fetchDoors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kapiAdi.trim()) return;
    setLoading(true);
    try {
      await api.post('/doors', { kapi_adi: kapiAdi });
      setMessage({ text: 'Kapı başarıyla tanımlandı.', type: 'success' });
      setKapiAdi('');
      fetchDoors();
    } catch (err) {
      setMessage({ text: 'Kapı tanımlanırken hata oluştu.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // KAPI SİLME FONKSİYONU
  const handleDelete = async (doorId, doorName) => {
    if (window.confirm(`DİKKAT: "${doorName}" isimli kapıyı silmek istediğinize emin misiniz? (Bu kapıya ait tüm personel yetkileri de silinecektir!)`)) {
      try {
        await api.delete(`/doors/${doorId}`);
        setMessage({ text: `"${doorName}" kapısı başarıyla silindi.`, type: 'success' });
        fetchDoors(); // Listeyi yenile
      } catch (err) {
        setMessage({ text: 'Kapı silinirken hata oluştu.', type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Kapı Ekleme Formu */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-xl">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Sisteme Yeni Kapı Tanımla</h3>
        
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input 
            type="text" 
            placeholder="Örn: Sistem Odası, Ana Giriş..." 
            value={kapiAdi}
            onChange={(e) => setKapiAdi(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <button type="submit" disabled={loading} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors">
            {loading ? 'Ekleniyor...' : 'Kapı Ekle'}
          </button>
        </form>
      </div>

      {/* Kapı Listesi ve Silme Butonları */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-xl">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h4 className="font-bold text-slate-700">Kayıtlı Kapılar ({doors.length})</h4>
        </div>
        <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {doors.map(door => (
            <li key={door.ID} className="p-4 hover:bg-slate-50 flex justify-between items-center group">
              <div>
                <span className="font-bold text-slate-700 block">{door.Kapi_Adi}</span>
                <span className="text-xs font-mono text-slate-400">Kapı ID: #{door.ID}</span>
              </div>
              
              {/* SİL BUTONU EKLENDİ */}
              <button 
                onClick={() => handleDelete(door.ID, door.Kapi_Adi)}
                className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-red-50 text-red-600 font-bold rounded text-xs border border-red-200 transition-all hover:bg-red-100"
              >
                Sil
              </button>
            </li>
          ))}
          {doors.length === 0 && <li className="p-6 text-center text-slate-500">Henüz hiç kapı tanımlanmamış.</li>}
        </ul>
      </div>
    </div>
  );
}

export default Doors;