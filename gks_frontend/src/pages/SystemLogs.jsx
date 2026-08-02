import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../api/socket';

// YENİ ORTAK BİLEŞENLER
import CustomDataGrid from '../components/CustomDataGrid';
import AutocompleteSearch from '../components/AutocompleteSearch';

function SystemLogs() {
  const bugunTarihi = new Date();
  const bitisTarihi = bugunTarihi.toISOString().split('T')[0];
  const baslangicTarihi = new Date(bugunTarihi.setMonth(bugunTarihi.getMonth() - 1)).toISOString().split('T')[0];

  const [filters, setFilters] = useState({ baslangic: baslangicTarihi, bitis: bitisTarihi, arama: '' });
  const [logs, setLogs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ARAMA ÖNERİLERİ İÇİN STATE
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
        <span className="font-bold text-slate-700">{params.value}</span>
      )
    },
    { field: 'Personel_Ad', headerName: 'Personel Adı', width: 200 },
    { field: 'Sicil_No', headerName: 'Sicil No', width: 130 },
    { field: 'Detay', headerName: 'Detay', flex: 1, minWidth: 200 }
  ], []);

  // --- YENİ BİLEŞENE UYGUN ARAMA FONKSİYONU ---
  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setFilters({ ...filters, arama: value }); 
    if (value.length >= 2) {
      try {
        const response = await api.get('/users', { params: { arama: value } });
        const formattedSuggestions = response.data.map(user => ({
           label: user.Ad_Soyad,
           subLabel: `Sicil: ${user.Sicil_No} | ${user.Departman || 'Departman Yok'}`,
           value: user.Ad_Soyad,
           originalData: user 
        }));
        setSuggestions(formattedSuggestions.slice(0, 5)); 
      } catch (err) {}
    } else {
      setSuggestions([]); 
    }
  };

  const handleFetchData = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.get('/system-logs', { params: filters });
      setLogs(response.data);
      setHasSearched(true);
    } catch (err) {
      console.error("Veriler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- SOCKET.IO İLE ANLIK GÜNCELLEME ---
  useEffect(() => {
    const refreshLogs = async () => {
      if (!hasSearched) return;
      try {
        const response = await api.get('/system-logs', { params: filters });
        setLogs(response.data); 
      } catch (err) {
        console.error("Socket güncelleme hatası:", err);
      }
    };

    socket.on('new_system_log', refreshLogs);

    return () => {
      socket.off('new_system_log', refreshLogs);
    };
  }, [hasSearched, filters]);

  return (
    <div className="space-y-4">
      {/* FİLTRE MENÜSÜ */}
      <form onSubmit={handleFetchData} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Başlangıç Tarihi</label>
          <input type="date" value={filters.baslangic} onChange={(e) => setFilters({...filters, baslangic: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
          <input type="date" value={filters.bitis} onChange={(e) => setFilters({...filters, bitis: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        {/* YENİ ORTAK ARAMA BİLEŞENİ */}
        <div className="relative z-50">
           <AutocompleteSearch 
             label="Ad Soyad / Sicil No"
             placeholder="Sicil veya isim ara..."
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
            {loading ? 'Yükleniyor...' : 'Kayıtları Getir'}
          </button>
        </div>
      </form>

      {/* YENİ ORTAK TABLO BİLEŞENİ */}
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

export default SystemLogs;