import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function Dashboard() {
  // Özet verileri tutacağımız state
  const [summary, setSummary] = useState({
    BugunGecis: 0,
    AktifPersonel: 0,
    YetkisizGiris: 0
  });
  
  const [loading, setLoading] = useState(true);

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/dashboard/summary');
        if (response.data) {
          setSummary(response.data);
        }
      } catch (err) {
        console.error("Dashboard verileri çekilirken hata oluştu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return (
    <div className="mt-8 space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Hoş Geldiniz</h2>
        <p className="text-slate-500 mt-1">Sisteminizin bugünkü genel durumu aşağıdadır.</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KART 1: Bugünkü Geçişler */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Bugünkü Geçişler</div>
          <div className="text-4xl font-black text-slate-800">
            {loading ? '...' : summary.BugunGecis}
          </div>
          <div className="text-green-500 text-sm font-bold mt-2">Sistemdeki günlük toplam hareket</div>
        </div>
        
        {/* KART 2: Aktif Personel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Aktif Personel</div>
          <div className="text-4xl font-black text-slate-800">
            {loading ? '...' : summary.AktifPersonel}
          </div>
          <div className="text-slate-400 text-sm font-bold mt-2">Sisteme kayıtlı çalışan kişi sayısı</div>
        </div>

        {/* KART 3: Yetkisiz Giriş */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow border-l-4 border-l-red-500">
          <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Yetkisiz Giriş Denemesi</div>
          <div className="text-4xl font-black text-red-500">
            {loading ? '...' : summary.YetkisizGiris}
          </div>
          <div className="text-slate-400 text-sm font-bold mt-2">Bugün reddedilen kart sayısı</div>
        </div>
      </div>

      {/* Hızlı Eylemler */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Hızlı İşlemler</h3>
        <div className="flex space-x-4">
          <Link to="/logs" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md">
            Detaylı Logları İncele
          </Link>
          <Link to="/personel" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md">
            Personel Yönetimi
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;