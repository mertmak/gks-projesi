import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';

// AG Grid importları ve Yeni Tema Motoru
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ValidationModule, themeQuartz } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

// ÖZEL İKONLAR (Belirgin Filtre Simgesi)
const customIcons = {
  filter: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>'
};

// AG GRID TÜRKÇE DİL DESTEĞİ
const AG_GRID_LOCALE_TR = {
  contains: 'İçerir',
  notContains: 'İçermez',
  startsWith: 'Şununla Başlar',
  endsWith: 'Şununla Biter',
  equals: 'Eşittir',
  notEqual: 'Eşit Değildir',
  blank: 'Boş Olanlar',
  notBlank: 'Boş Olmayanlar',
  empty: 'Seçiniz',
  filterOoo: 'Filtrele...',
  applyFilter: 'Uygula',
  clearFilter: 'Temizle',
  resetFilter: 'Sıfırla',
  cancelFilter: 'İptal',
  andCondition: 'VE',
  orCondition: 'VEYA',
  page: 'Sayfa',
  more: 'Daha',
  to: '-',
  of: '/',
  next: 'İleri',
  last: 'Son',
  first: 'İlk',
  previous: 'Geri',
  loadingOoo: 'Yükleniyor...',
  noRowsToShow: 'Gösterilecek kayıt bulunamadı.'
};

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
        const response = await api.get('/system-logs', { params: { arama: value } });
        
        // Aynı personelin birden fazla logu varsa menüde sadece 1 kez göstermek için:
        const uniqueLogs = [];
        const seenNames = new Set();
        
        response.data.forEach(log => {
          const identifier = log.Personel_Ad || log.Sicil_No;
          if (identifier && !seenNames.has(identifier)) {
            seenNames.add(identifier);
            uniqueLogs.push(log);
          }
        });

        setSuggestions(uniqueLogs.slice(0, 6)); // En fazla 6 farklı sonuç göster
      } catch (err) {
        console.error("Öneriler çekilemedi:", err);
      }
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

  // --- SESSİZ CANLI GÜNCELLEME (REAL-TIME POLLING) ---
  useEffect(() => {
    let interval;
    if (hasSearched) {
      interval = setInterval(async () => {
        try {
          const response = await api.get('/system-logs', { params: filters });
          setLogs(response.data); 
        } catch (err) {
          console.error("Arka plan güncelleme hatası:", err);
        }
      }, 3000); 
    }
    return () => clearInterval(interval);
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