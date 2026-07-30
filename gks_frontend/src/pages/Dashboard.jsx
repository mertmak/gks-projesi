import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

// Saat verisini formatlamak için yardımcı fonksiyon
const extractTime = (val) => {
  if (!val) return '-';
  if (typeof val === 'string' && val.includes('T')) {
    return val.split('T')[1].substring(0, 5);
  }
  return val.substring(0, 5); 
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // Sistem Özet Verileri
  const [summary, setSummary] = useState({ BugunGecis: 0, AktifPersonel: 0, YetkisizGiris: 0 });
  
  // Puantaj Motorundan Gelen Akıllı Veriler
  const [gecKalanlar, setGecKalanlar] = useState([]);
  const [molaAsanlar, setMolaAsanlar] = useState([]);
  const [iceridekiler, setIceridekiler] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Hem sistem özetini hem de bugünün puantajını aynı anda çekiyoruz
        const [summaryRes, attendanceRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get(`/reports/daily-attendance?tarih=${today}`)
        ]);

        if (summaryRes.data) setSummary(summaryRes.data);

        if (attendanceRes.data) {
          const attendance = attendanceRes.data;

          // Geç Kalanları Filtrele
          setGecKalanlar(attendance.filter(a => a.Gec_Kalma_Dk > 0));
          
          // Mola Sınırını Aşanları Filtrele
          setMolaAsanlar(attendance.filter(a => a.Mola_Asimi_Dk > 0));
          
          // Şu an İçeride Olanları Filtrele (Giriş yapmış ama çıkış yapmamış)
          setIceridekiler(attendance.filter(a => a.Ilk_Giris && !a.Son_Cikis));
        }
      } catch (err) {
        console.error("Dashboard verileri çekilirken hata oluştu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Verileri her 1 dakikada bir otomatik yenile (Canlı Dashboard Hissi)
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="mt-20 text-center font-bold text-slate-500 animate-pulse">Sistem verileri analiz ediliyor, lütfen bekleyin...</div>;
  }

  return (
    <div className="mt-8 space-y-8 animate-fade-in-up pb-10">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Kontrol Paneli</h2>
        <p className="text-slate-500 mt-1 font-medium">Sisteminizin bugünkü genel durumu ve anlık personel hareketleri.</p>
      </div>

      {/* --- ÜST KISIM: İSTATİSTİK KARTLARI --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Toplam Personel</div>
          <div className="text-4xl font-black text-slate-800">{summary.AktifPersonel}</div>
          <div className="text-slate-400 text-xs font-bold mt-2">Sisteme kayıtlı aktif çalışan</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 bg-blue-50/30">
          <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Anlık İçeridekiler</div>
          <div className="text-4xl font-black text-blue-700">{iceridekiler.length}</div>
          <div className="text-blue-500 text-xs font-bold mt-2">Giriş yapıp henüz çıkmayanlar</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-200 bg-orange-50/30">
          <div className="text-orange-600 text-xs font-bold uppercase tracking-wider mb-2">Geç Kalanlar</div>
          <div className="text-4xl font-black text-orange-700">{gecKalanlar.length}</div>
          <div className="text-orange-500 text-xs font-bold mt-2">Tolerans süresini aşanlar</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 bg-red-50/30">
          <div className="text-red-600 text-xs font-bold uppercase tracking-wider mb-2">Mola Limit Aşımı</div>
          <div className="text-4xl font-black text-red-700">{molaAsanlar.length}</div>
          <div className="text-red-500 text-xs font-bold mt-2">Hak edilen süreyi geçenler</div>
        </div>
      </div>

      {/* --- ORTA KISIM: DİNAMİK LİSTELER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LİSTE 1: GEÇ KALANLAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-orange-50/30">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span> Günün Geç Kalanları
            </h3>
            <span className="px-3 py-1 bg-white text-orange-600 rounded-full text-xs font-black shadow-sm border border-orange-100">{gecKalanlar.length} Kişi</span>
          </div>
          <div className="p-0 overflow-y-auto max-h-80">
            {gecKalanlar.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {gecKalanlar.map((kisi, idx) => (
                  <li key={idx} className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{kisi.Ad_Soyad}</div>
                      <div className="text-xs text-slate-500">{kisi.Vardiya_Adi}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-600 font-black text-sm">+{kisi.Gec_Kalma_Dk} dk</div>
                      <div className="text-xs text-slate-400">Giriş: {extractTime(kisi.Ilk_Giris)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-400 font-bold text-sm">Bugün geç kalan personel bulunmuyor. 🎉</div>
            )}
          </div>
        </div>

        {/* LİSTE 2: MOLA AŞANLAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-red-50/30">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Mola Limitini Aşanlar
            </h3>
            <span className="px-3 py-1 bg-white text-red-600 rounded-full text-xs font-black shadow-sm border border-red-100">{molaAsanlar.length} Kişi</span>
          </div>
          <div className="p-0 overflow-y-auto max-h-80">
            {molaAsanlar.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {molaAsanlar.map((kisi, idx) => (
                  <li key={idx} className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{kisi.Ad_Soyad}</div>
                      <div className="text-xs text-slate-500">Kullanılan: {kisi.Toplam_Mola_Dk} dk (Hak: {kisi.Mola_Hakki_Dk})</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-600 font-black text-sm">+{kisi.Mola_Asimi_Dk} dk Aşım</div>
                      <div className="text-xs text-slate-400">Departman: {kisi.Departman || '-'}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-400 font-bold text-sm">Mola ihlali yapan personel bulunmuyor.</div>
            )}
          </div>
        </div>

      </div>

      {/* --- ALT KISIM: SİSTEM SAĞLIĞI VE HIZLI ERİŞİM --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
          <h3 className="text-xl font-bold mb-2 z-10">Sistem Sağlık Özeti</h3>
          <p className="text-slate-400 text-sm mb-6 z-10">GKS cihazlarından gelen bugünkü ham veri okumaları.</p>
          
          <div className="grid grid-cols-2 gap-4 z-10">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs font-bold uppercase mb-1">Toplam Geçiş Logu</div>
              <div className="text-2xl font-black">{summary.BugunGecis}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-red-500/30">
              <div className="text-red-400 text-xs font-bold uppercase mb-1">Yetkisiz Denemeler</div>
              <div className="text-2xl font-black text-red-400">{summary.YetkisizGiris}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Hızlı İşlemler</h3>
          <p className="text-slate-500 text-sm mb-6">Sık kullanılan yönetim panellerine tek tıkla ulaşın.</p>
          
          <div className="grid grid-cols-2 gap-3">
            <Link to="/personel" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-center text-sm transition-colors">
              Personel & Yetkiler
            </Link>
            <Link to="/raporlar" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-xl text-center text-sm transition-colors shadow-md">
              Detaylı Puantaj Raporu
            </Link>
            <Link to="/loglar" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-center text-sm transition-colors">
              Geçiş Logları
            </Link>
            <Link to="/vardiyalar" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-center text-sm transition-colors">
              Vardiya Yönetimi
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;