import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../api/socket';

// YENİ ORTAK BİLEŞENLER
import CustomDataGrid from '../components/CustomDataGrid';
import AutocompleteSearch from '../components/AutocompleteSearch';

function Logs() {
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
    { field: 'ID', headerName: 'ID', width: 90 },
    { 
      field: 'Ad_Soyad', 
      headerName: 'Personel Adı', 
      flex: 1, minWidth: 200,
      cellRenderer: (params) => {
        return params.value ? (
          <span className="font-medium text-slate-800">{params.value}</span>
        ) : (
          <span className="text-red-500 italic font-bold">Bilinmeyen Kişi</span>
        );
      }
    },
    { field: 'RFID_Kart_No', headerName: 'Kart No', flex: 1, minWidth: 200 },
    { field: 'Kapi_Adi', headerName: 'Kapı', flex: 1 , minWidth: 200},
    { 
      field: 'Basarili_Mi', 
      headerName: 'Durum', 
      width: 130,
      cellRenderer: (params) => {
        return params.value 
          ? <span className="text-green-600 font-bold">Başarılı</span> 
          : <span className="text-red-600 font-bold">Reddedildi</span>;
      }
    },
    { 
      field: 'Zaman', 
      headerName: 'Tarih / Saat', 
      flex: 1, minWidth: 200,
      cellRenderer: (params) => new Date(params.value).toLocaleString('tr-TR')
    }
  ], []);

  // --- YENİ BİLEŞENE UYGUN LOKAL HIZLI ARAMA ---
  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setFilters({ ...filters, arama: value }); 
    if (value.length >= 2) {
      try {
        const response = await api.get('/users', { params: { arama: value } });
        // Veriyi AutocompleteSearch bileşeninin okuyacağı formata haritalıyoruz
        const formattedSuggestions = response.data.map(user => ({
           label: user.Ad_Soyad,
           subLabel: `Sicil: ${user.Sicil_No} | Kart: ${user.RFID_Kart_No || 'Yok'}`,
           value: user.Ad_Soyad || user.RFID_Kart_No, // Arama kutusuna adı veya kartı yazılabilir
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
      const response = await api.get('/logs', { params: filters });
      setLogs(response.data);
      setHasSearched(true);
    } catch (err) {
      console.error("Veriler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- YENİ YAPI: SOCKET.IO İLE ANLIK GÜNCELLEME ---
  useEffect(() => {
    const refreshLogs = async () => {
      if (!hasSearched) return;
      try {
        const response = await api.get('/logs', { params: filters });
        setLogs(response.data); 
      } catch (err) {
        console.error("Socket güncelleme hatası:", err);
      }
    };

    socket.on('new_rfid_log', refreshLogs);

    return () => {
      socket.off('new_rfid_log', refreshLogs);
    };
  }, [hasSearched, filters]); 
  
  return (
    <div className="mt-8 flex flex-col h-[85vh] space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Geçiş Logları</h2>
        <p className="text-slate-500 text-sm mt-1">Lütfen görüntülemek istediğiniz aralığı seçin.</p>
      </div>

      <form onSubmit={handleFetchData} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Başlangıç Tarihi</label>
          <input type="date" value={filters.baslangic} onChange={(e) => setFilters({...filters, baslangic: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
          <input type="date" value={filters.bitis} onChange={(e) => setFilters({...filters, bitis: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        {/* YENİ ORTAK ARAMA KUTUSU EKLENDİ */}
        <div className="relative z-50">
           <AutocompleteSearch 
             label="Ad Soyad / Kart No"
             placeholder="İsim veya kart ara..."
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
            {loading ? 'Aranıyor...' : 'Logları Getir'}
          </button>
        </div>
      </form>

      {/* YENİ ORTAK TABLO BİLEŞENİ EKLENDİ */}
      {hasSearched && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-2">
          <div className="p-2 text-sm font-bold text-slate-700">Arama Sonuçları ({logs.length} Kayıt)</div>
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

export default Logs;