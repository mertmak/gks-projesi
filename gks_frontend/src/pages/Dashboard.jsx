import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { socket } from '../api/socket';

// Recharts Grafik Bileşenleri
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('gunluk'); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [stats, setStats] = useState({ AktifPersonel: 0, BugunGecis: 0, YetkisizGiris: 0, AktifKapi: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  
  // YENİ: Grafikler için gerçek verileri tutacağımız state'ler
  const [trendData, setTrendData] = useState([]);
  const [deptData, setDeptData] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const fetchDashboardData = async () => {
      try {
        // timeFilter değerini API'ye parametre olarak gönderiyoruz
        const response = await api.get('/dashboard/summary', { params: { filter: timeFilter } }); 
        
        if (response.data.success) {
            setStats(response.data.stats);
            setRecentLogs(response.data.recentLogs);
            setTrendData(response.data.trendData); // YENİ
            setDeptData(response.data.deptData);   // YENİ
        }
      } catch (err) {
        console.error("Dashboard verileri çekilemedi.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    socket.on('new_rfid_log', fetchDashboardData);
    socket.on('system_updated', fetchDashboardData); 

return () => {
      clearInterval(timer);
      socket.off('new_rfid_log', fetchDashboardData);
      socket.off('system_updated', fetchDashboardData);
    };
  }, [timeFilter]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // --- GRAFİKLER İÇİN DİNAMİK (MOCK) VERİLER ---
  const mockTrendDataGunluk = [
    { label: '08:00', basarili: 120, yetkisiz: 5 },
    { label: '10:00', basarili: 45, yetkisiz: 2 },
    { label: '12:00', basarili: 180, yetkisiz: 8 },
    { label: '14:00', basarili: 60, yetkisiz: 3 },
    { label: '16:00', basarili: 55, yetkisiz: 1 },
    { label: '18:00', basarili: 150, yetkisiz: 7 },
  ];

  const mockTrendDataHaftalik = [
    { label: 'Pzt', basarili: 850, yetkisiz: 12 },
    { label: 'Sal', basarili: 880, yetkisiz: 8 },
    { label: 'Çar', basarili: 860, yetkisiz: 15 },
    { label: 'Per', basarili: 890, yetkisiz: 5 },
    { label: 'Cum', basarili: 820, yetkisiz: 20 },
    { label: 'Cmt', basarili: 150, yetkisiz: 2 },
    { label: 'Paz', basarili: 50, yetkisiz: 1 },
  ];

  const mockTrendDataAylik = [
    { label: '1. Hafta', basarili: 4200, yetkisiz: 45 },
    { label: '2. Hafta', basarili: 4500, yetkisiz: 30 },
    { label: '3. Hafta', basarili: 4300, yetkisiz: 50 },
    { label: '4. Hafta', basarili: 4600, yetkisiz: 25 },
  ];

  // Seçilen filtreye göre veriyi döndüren yardımcı fonksiyon
  const getActiveTrendData = () => {
    if (timeFilter === 'haftalik') return mockTrendDataHaftalik;
    if (timeFilter === 'aylik') return mockTrendDataAylik;
    return mockTrendDataGunluk;
  };

  const mockDeptData = [
    { name: 'İşletme', gelen: 45, gelmeyen: 5 },
    { name: 'Bilgi İşlem', gelen: 20, gelmeyen: 1 },
    { name: 'Güvenlik', gelen: 15, gelmeyen: 0 },
    { name: 'Üretim', gelen: 85, gelmeyen: 10 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center">
          <span className="w-12 h-12 border-4 border-slate-200 border-t-cyan-500 rounded-full animate-spin"></span>
          <span className="mt-4 font-bold text-slate-500 animate-pulse">Sistem Verileri Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10 mt-6">
      
      {/* ÜST BİLGİ, SAAT VE FİLTRELEME ALANI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Kontrol Paneli</h1>
          <p className="text-slate-500 text-sm mt-1">Sistemdeki anlık durumu ve geçiş trendlerini takip edin.</p>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          {/* YENİ: Tarih ve Saat Göstergesi */}
          <div className="text-right">
            <p className="text-sm font-bold text-cyan-600 uppercase tracking-wide">
              {currentTime.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">
              {currentTime.toLocaleTimeString('tr-TR')}
            </p>
          </div>

          {/* ZAMAN FİLTRESİ */}
          <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 inline-flex">
            <button 
              onClick={() => setTimeFilter('gunluk')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${timeFilter === 'gunluk' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              Günlük
            </button>
            <button 
              onClick={() => setTimeFilter('haftalik')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${timeFilter === 'haftalik' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              Haftalık
            </button>
            <button 
              onClick={() => setTimeFilter('aylik')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${timeFilter === 'aylik' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              Aylık
            </button>
          </div>
        </div>
      </div>

      {/* İSTATİSTİK WIDGET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform group-hover:opacity-20 text-blue-600">
             <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <p className="text-sm font-bold text-slate-500 relative z-10">Aktif Personel</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1 relative z-10">{stats.AktifPersonel}</h3>
          <p className="text-xs font-bold text-blue-500 mt-2 relative z-10 flex items-center">
            Sistemde kayıtlı çalışanlar
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform group-hover:opacity-20 text-emerald-600">
             <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          </div>
          <p className="text-sm font-bold text-slate-500 relative z-10">İşe Gelen / Geçişler</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1 relative z-10">{stats.BugunGecis}</h3>
          <p className="text-xs font-bold text-emerald-500 mt-2 relative z-10 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            Başarılı okutulan kartlar
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform group-hover:opacity-20 text-red-600">
             <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <p className="text-sm font-bold text-slate-500 relative z-10">İzinsiz Hareketler</p>
          <h3 className="text-3xl font-black text-red-600 mt-1 relative z-10">{stats.YetkisizGiris}</h3>
          <p className="text-xs font-bold text-red-500 mt-2 relative z-10 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Yetkisiz erişim denemesi
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform group-hover:opacity-20 text-amber-500">
             <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <p className="text-sm font-bold text-slate-500 relative z-10">Aktif Kapı / Turnike</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1 relative z-10">{stats.AktifKapi}</h3>
          <p className="text-xs font-bold text-amber-600 mt-2 relative z-10 flex items-center">
            Sistemde dinlenen kapılar
          </p>
        </div>

      </div>

      {/* GRAFİKLER ALANI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Çizgi Grafik (Alan Grafiği) - Geçiş Trendi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Geçiş Trendi <span className="text-xs font-normal text-slate-500">({timeFilter.toUpperCase()})</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {/* YENİ: data prop'u seçilen filtreye göre dinamik geliyor */}
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBasarili" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorYetkisiz" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                {/* YENİ: dataKey 'saat' yerine 'label' yapıldı */}
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                <Area type="monotone" name="Başarılı Geçiş" dataKey="basarili" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorBasarili)" />
                <Area type="monotone" name="İzinsiz Deneme" dataKey="yetkisiz" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorYetkisiz)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Grafik - Departman Bazlı Katılım */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Departman Katılım Özeti</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                <Bar name="Gelen Personel" dataKey="gelen" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar name="Gelmeyen / İzinli" dataKey="gelmeyen" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ALT BÖLÜM: SON HAREKETLER VE HIZLI ERİŞİM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Son Hareketler Tablosu (Sol taraf 2/3 alan) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Canlı Geçiş İzleme</h3>
            <span className="flex items-center text-xs font-bold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span> Canlı Akış
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Saat</th>
                  <th className="p-4 font-bold">Personel</th>
                  <th className="p-4 font-bold">Kapı Bilgisi</th>
                  <th className="p-4 font-bold text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-mono text-slate-600">{formatDate(log.Zaman)}</td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{log.Ad_Soyad || 'Bilinmeyen Kart'}</p>
                        <p className="text-xs text-slate-500">{log.Sicil_No || '-'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-700">{log.Kapi_Adi || '-'}</p>
                        <p className="text-xs text-slate-500">{log.Kapi_Turu || '-'}</p>
                      </td>
                      <td className="p-4 text-center">
                        {log.Basarili_Mi ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Onaylandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            Yetkisiz İşlem
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500 text-sm font-bold">Henüz hareket bulunmuyor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <Link to="/loglar/gecis" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Tüm Geçiş Loglarını Görüntüle →</Link>
          </div>
        </div>

        {/* Hızlı Kısayollar (Sağ taraf 1/3 alan) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">Hızlı Kısayollar</h3>
          </div>
          <div className="p-4 space-y-3">
            
            <Link to="/personel/bireysel" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                </div>
                <span className="font-bold text-slate-700">Yeni Personel Ekle</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>

            <Link to="/izinler" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-rose-300 hover:bg-rose-50 transition-colors group">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mr-3 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <span className="font-bold text-slate-700">İzin / Rapor Girişi</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>

            <Link to="/puantaj" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 transition-colors group">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <span className="font-bold text-slate-700">Puantaj Raporları</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;