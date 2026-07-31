import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { customIcons, AG_GRID_LOCALE_TR } from '../utils/constants';
import { socket } from '../api/socket';
import AutocompleteSearch from '../components/AutoCompleteSearch';


// AG Grid importları ve Yeni Tema Motoru
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ValidationModule, themeQuartz } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

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

  // --- AG GRID SÜTUN AYARLARI (useMemo İle Sabitlendi) ---
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

  const defaultColDef = useMemo(() => ({
    filter: true,
    sortable: true, // SIRALAMA AKTİF
    resizable: true,
    cellStyle: { borderRight: '1px solid #cbd5e1' },
    headerClass: 'border-r border-slate-300'
  }), []);

  // --- OTOMATİK TAMAMLAMA VE TEKRARLARI GİZLEME ---
const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setFilters({ ...filters, arama: value }); 
    if (value.length >= 2) {
      try {
        const response = await api.get('/users', { params: { arama: value } });
        // YENİ: Veriyi AutocompleteSearch bileşeninin okuyacağı formata haritalıyoruz
        const formattedSuggestions = response.data.map(user => ({
           label: user.Ad_Soyad,
           subLabel: `Sicil: ${user.Sicil_No} | ${user.Departman || 'Departman Yok'}`,
           value: user.Ad_Soyad,
           originalData: user // İleride objenin tamamı gerekirse diye tutuyoruz
        }));
        setSuggestions(formattedSuggestions.slice(0, 5)); 
      } catch (err) {}
    } else {
      setSuggestions([]); 
    }
  };

  const handleSuggestionClick = (log) => {
    // Listeden tıklanan personelin adını veya sicilini arama kutusuna yazdır
    setFilters({ ...filters, arama: log.Personel_Ad || log.Sicil_No });
    setSuggestions([]);
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

useEffect(() => {
    // 1. Eğer bir arama/filtre yapıldıysa verileri tazeleyecek fonksiyon
    const refreshLogs = async () => {
      if (!hasSearched) return;
      try {
        const response = await api.get('/system-logs', { params: filters });
        setLogs(response.data); 
      } catch (err) {
        console.error("Socket güncelleme hatası:", err);
      }
    };

    // 2. Backend'den 'new_system_log' sinyali geldiğinde refreshLogs'u çalıştır
    socket.on('new_system_log', refreshLogs);

    // 3. Component ekrandan gidince dinlemeyi bırak (Memory leak önleme)
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
        
        {/* YENİ EKLENEN AÇILIR MENÜLÜ ARAMA KUTUSU */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-600 mb-1">Ad Soyad / Sicil No</label>
          <input 
            type="text" 
            placeholder="Sicil veya isim ara..." 
            value={filters.arama} 
            onChange={handleSearchInputChange} 
            onBlur={() => setTimeout(() => setSuggestions([]), 200)} 
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
          />
          
          {suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl max-h-56 overflow-y-auto rounded-lg mt-1 left-0 divide-y divide-slate-100">
              {suggestions.map((log) => (
                <li 
                  key={log.ID || Math.random()} 
                  onClick={() => handleSuggestionClick(log)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col"
                >
                  <span className="font-bold text-slate-800 text-sm">{log.Personel_Ad || 'Bilinmeyen Personel'}</span>
                  <span className="text-slate-500 text-xs">Sicil: {log.Sicil_No || 'Belirtilmemiş'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-end">
          <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors">
            {loading ? 'Yükleniyor...' : 'Kayıtları Getir'}
          </button>
        </div>
      </form>

      {/* AG GRID TABLOSU */}
      {hasSearched && (
        <div className="flex-1 overflow-hidden border border-slate-300 rounded-2xl bg-white shadow-sm flex flex-col p-2 h-[60vh]">
          <div className="p-2 text-sm font-bold text-slate-700">
            Arama Sonuçları ({logs.length} Kayıt)
          </div>
          
          <div className="flex-1 w-full h-full">
            <AgGridReact
              theme={themeQuartz} 
              icons={customIcons} 
              alwaysMultiSort={true} 
              getRowId={(params) => params.data.ID} // SATIR KİMLİK BELİRLEYİCİ
              rowData={logs}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              pagination={true}
              localeText={AG_GRID_LOCALE_TR}
              paginationPageSize={50}
              domLayout="normal"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemLogs;