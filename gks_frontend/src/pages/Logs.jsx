import { useState, useEffect } from 'react';
import api from '../api/axios'; 

function Logs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/logs');
        setLogs(response.data);
      } catch (err) {
        setError("Veriler çekilirken bir hata oluştu.");
      }
    };
    fetchLogs();
  }, []);

  // Zaman formatını güzelleştirmek için ufak bir yardımcı fonksiyon
  const formatZaman = (zamanString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(zamanString).toLocaleDateString('tr-TR', options);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Canlı Geçiş Logları</h2>
        <span className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Canlı İzleme Aktif
        </span>
      </div>

      {error && <p className="text-red-500 bg-red-50 p-4 rounded-lg mb-4 font-semibold text-center border border-red-200">{error}</p>}

      {/* --- PROFESYONEL VERİ TABLOSU --- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-t-lg">
            <tr>
              <th scope="col" className="px-6 py-4 rounded-tl-lg">ID</th>
              <th scope="col" className="px-6 py-4">Tarih / Saat</th>
              <th scope="col" className="px-6 py-4">Ad Soyad</th>
              <th scope="col" className="px-6 py-4">Kart No</th>
              <th scope="col" className="px-6 py-4">Kapı Adı</th>
              <th scope="col" className="px-6 py-4 rounded-tr-lg">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.ID} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{log.ID}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{formatZaman(log.Zaman)}</td>
                  <td className="px-6 py-4 font-semibold text-slate-950">{log.Ad_Soyad}</td>
                  <td className="px-6 py-4 font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded text-xs inline-block mt-3">{log.RFID_Kart_No}</td>
                  <td className="px-6 py-4 text-blue-800 font-medium">{log.Kapi_Adi}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      log.Basarili_Mi 
                        ? 'bg-green-100 text-green-900 border border-green-200' 
                        : 'bg-red-100 text-red-900 border border-red-200'
                    }`}>
                      {log.Basarili_Mi ? '✓ Başarılı' : '✕ Reddedildi'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic bg-slate-50">Sistemde henüz log kaydı bulunmuyor veya veriler yükleniyor...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Logs;