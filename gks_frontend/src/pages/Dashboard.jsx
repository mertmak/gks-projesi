import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { socket } from '../api/socket';

function Dashboard() {
  const [stats, setStats] = useState({
    AktifPersonel: 0,
    BugunGecis: 0,
    YetkisizGiris: 0,
    AktifKapi: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

 // --- YENİ YAPI: SOCKET.IO İLE ANLIK GÜNCELLEME ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/dashboard/summary');
        if (response.data.success) {
            setStats(response.data.stats);
            setRecentLogs(response.data.recentLogs);
        }
      } catch (err) {
        console.error("Dashboard verileri çekilemedi.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData(); // Sayfa açıldığında ilk veriyi çek

    // Yeni bir geçiş olduğunda, personel/kapı eklendiğinde Dashboard'u yenile
    socket.on('new_rfid_log', fetchDashboardData);
    socket.on('system_updated', fetchDashboardData); 

    return () => {
      socket.off('new_rfid_log', fetchDashboardData);
      socket.off('system_updated', fetchDashboardData);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <span className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></span>
          <span className="mt-4 font-bold text-slate-500 animate-pulse">Sistem Verileri Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      
      {/* KARŞILAMA ALANI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl shadow-lg text-white">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Sisteme Hoş Geldiniz</h1>
          <p className="text-slate-300 mt-2 text-sm">GKS<span className="text-blue-400 font-bold">PRO</span> - Kurumsal Personel Devam ve Geçiş Kontrol Sistemi</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400">Tarih</p>
          <p className="text-xl font-bold">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}</p>
        </div>
      </div>

      {/* İSTATİSTİK WIDGET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Personel Kartı */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center group transition-all hover:border-blue-300 hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Aktif Personel</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.AktifPersonel} <span className="text-sm font-normal text-slate-400">Kişi</span></h3>
          </div>
        </div>

        {/* Yetkisiz Giriş Kartı (Senin mevcut veritabanından) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center group transition-all hover:border-red-300 hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Yetkisiz Deneme</p>
            <h3 className="text-2xl font-black text-red-600">{stats.YetkisizGiris} <span className="text-sm font-normal text-slate-400">İşlem</span></h3>
          </div>
        </div>

        {/* Geçiş Kartı */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center group transition-all hover:border-purple-300 hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Bugünkü Geçişler</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.BugunGecis} <span className="text-sm font-normal text-slate-400">İşlem</span></h3>
          </div>
        </div>

        {/* Kapı Kartı */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center group transition-all hover:border-amber-300 hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Aktif Kapı / Turnike</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.AktifKapi} <span className="text-sm font-normal text-slate-400">Adet</span></h3>
          </div>
        </div>

      </div>

      {/* ALT BÖLÜM: SON HAREKETLER VE HIZLI ERİŞİM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Son Hareketler Tablosu (Sol taraf 2/3 alan) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Canlı Geçiş İzleme</h3>
            <span className="flex items-center text-xs font-bold text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span> Canlı Akış
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-slate-200">Saat</th>
                  <th className="p-4 font-bold border-b border-slate-200">Personel</th>
                  <th className="p-4 font-bold border-b border-slate-200">Kapı Bilgisi</th>
                  <th className="p-4 font-bold border-b border-slate-200 text-center">Durum</th>
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            Geçiş Onaylandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
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
            <Link to="/logs/doors" className="text-sm font-bold text-blue-600 hover:text-blue-800">Tüm Geçiş Loglarını Görüntüle →</Link>
          </div>
        </div>

        {/* Hızlı Kısayollar (Sağ taraf 1/3 alan) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">Hızlı Kısayollar</h3>
          </div>
          <div className="p-4 space-y-3">
            <Link to="/leaves" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-rose-300 hover:bg-rose-50 transition-colors group">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mr-3 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <span className="font-bold text-slate-700">İzin / Rapor Girişi</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>
            <Link to="/personnel/operations" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <span className="font-bold text-slate-700">Yeni Personel Ekle</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>

            <Link to="/doors/permissions" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-purple-300 hover:bg-purple-50 transition-colors group">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <span className="font-bold text-slate-700">Yetki Atama Matrisi</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>

            <Link to="/reports" className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 transition-colors group">
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