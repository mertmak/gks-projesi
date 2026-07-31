import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../api/socket';

// YENİ ORTAK BİLEŞENLER EKLENDİ
import CustomDataGrid from '../components/CustomDataGrid';
import AutocompleteSearch from '../components/AutocompleteSearch';

function DoorLogs() {
  const bugunTarihi = new Date();
  const bitisTarihi = bugunTarihi.toISOString().split('T')[0];
  const baslangicTarihi = new Date(bugunTarihi.setMonth(bugunTarihi.getMonth() - 1)).toISOString().split('T')[0];

  const [filters, setFilters] = useState({ baslangic: baslangicTarihi, bitis: bitisTarihi, arama: '' });
  const [logs, setLogs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [suggestions, setSuggestions] = useState([]);

  // --- AG GRID SÜTUN AYARLARI ---
  const colDefs = useMemo(() => [
    { 
      field: 'Tarih', 
      headerName: 'Tarih / Saat', 
      width: 170, 
      cellRenderer: (params) => new Date(params.value).toLocaleString('tr-TR')
    },
    { 
      field: 'Islemi_Yapan', 
      headerName: 'İşlemi Yapan', 
      width: 150, 
      cellRenderer: (params) => (
        <span className="font-bold text-blue-600">{params.value || 'Sistem'}</span>
      )
    },
    { 
      field: 'Islem_Tipi', 
      headerName: 'İşlem Tipi', 
      width: 150, 
      cellRenderer: (params) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${params.value === 'KAPI SİLİNDİ' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {params.value}
        </span>
      )
    },
    { field: 'Kapi_Adi', headerName: 'Kapı Adı', width: 250 },
    { field: 'Detay', headerName: 'Detay', flex: 1, minWidth: 200, wrapText: true, autoHeight: true }
  ], []);

  // YENİ BİLEŞENE UYGUN ARAMA (Yanlışlıkla users olan api kopyası door-logs için düzeltildi)
  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setFilters({ ...filters, arama: value }); 
    if (value.length >= 2) {
      try {
        const response = await api.get('/door-logs', { params: { arama: value } });
        
        // Tekrar eden kapı isimlerini veya işlemleri filtreleyerek öneri oluşturur
        const uniqueLogs = [];
        const seen = new Set();
        response.data.forEach(log => {
          if(log.Kapi_Adi && !seen.has(log.Kapi_Adi)) {
             seen.add(log.Kapi_Adi);
             uniqueLogs.push({
                label: log.Kapi_Adi,
                subLabel: `Örnek İşlem: ${log.Islem_Tipi}`,
                value: log.Kapi_Adi
             });
          }
        });
        setSuggestions(uniqueLogs.slice(0, 5)); 
      } catch (err) {}
    } else {
      setSuggestions([]); 
    }
  };

  const handleFetchData = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.get('/door-logs', { params: filters });
      setLogs(response.data);
      setHasSearched(true);
    } catch (err) {
      console.error("Veriler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refreshLogs = async () => {
      if (!hasSearched) return;
      try {
        const response = await api.get('/door-logs', { params: filters });
        setLogs(response.data); 
      } catch (err) {}
    };

    socket.on('new_door_log', refreshLogs);
    return () => { socket.off('new_door_log', refreshLogs); };
  }, [hasSearched, filters]);

  return (
    <div className="space-y-4">
      {/* FİLTRE MENÜSÜ */}
      <form onSubmit={handleFetchData} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Başlangıç Tarihi</label>
          <input type="date" value={filters.baslangic} onChange={(e) => setFilters({...filters, baslangic: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
          <input type="date" value={filters.bitis} onChange={(e) => setFilters({...filters, bitis: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        {/* YENİ ORTAK ARAMA BİLEŞENİ */}
        <div className="relative">
          <AutocompleteSearch 
             label="Kapı Adı / İşlem Ara"
             placeholder="Örn: Ana Giriş..."
             value={filters.arama}
             onChange={handleSearchInputChange}
             suggestions={suggestions}
             onSelect={(item) => {
               setFilters({...filters, arama: item.value});
               setSuggestions([]);
             }}
          />
        </div>

        <div className="flex items-end">
          <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors">
            {loading ? 'Yükleniyor...' : 'Kapı Loglarını Getir'}
          </button>
        </div>
      </form>

      {/* YENİ ORTAK AG GRID BİLEŞENİ */}
      {hasSearched && (
        <div className="flex-1 overflow-hidden border border-slate-300 rounded-2xl bg-white shadow-sm flex flex-col p-2 h-[60vh]">
          <div className="p-2 text-sm font-bold text-slate-700">
            Arama Sonuçları ({logs.length} Kayıt)
          </div>
          
          <CustomDataGrid 
             rowData={logs}
             columnDefs={colDefs}
             getRowId={(params) => params.data.ID}
          />
        </div>
      )}
    </div>
  );
}

export default DoorLogs;