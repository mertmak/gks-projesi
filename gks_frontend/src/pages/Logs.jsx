import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';

// AG Grid importları
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

  // --- AG GRID SÜTUN AYARLARI (useMemo İle Sabitlendi) ---
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

  const defaultColDef = useMemo(() => ({
    filter: true, 
    sortable: true,
    resizable: true, 
    cellStyle: { borderRight: '1px solid #cbd5e1' }, 
    headerClass: 'border-r border-slate-300' 
  }), []);

  // --- OTOMATİK TAMAMLAMA (TEKRARLARI GİZLEME MANTIĞI EKLENDİ) ---
  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setFilters({ ...filters, arama: value }); 

    if (value.length >= 2) {
      try {
        const response = await api.get('/logs', { params: { arama: value } });
        
        // Loglarda aynı kişi 50 kere geçiş yapmış olabilir, listede sadece 1 kere göstermek için filtreliyoruz:
        const uniqueLogs = [];
        const seenNames = new Set();
        
        response.data.forEach(log => {
          const identifier = log.Ad_Soyad || log.RFID_Kart_No;
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
    // Listeden tıklanan kişinin adını veya kart numarasını arama kutusuna yazdır
    setFilters({ ...filters, arama: log.Ad_Soyad || log.RFID_Kart_No });
    setSuggestions([]);
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

  // --- SESSİZ CANLI GÜNCELLEME (REAL-TIME POLLING) ---
  useEffect(() => {
    let interval;
    if (hasSearched) {
      interval = setInterval(async () => {
        try {
          const response = await api.get('/logs', { params: filters });
          setLogs(response.data); 
        } catch (err) {
          console.error("Arka plan güncelleme hatası:", err);
        }
      }, 3000); 
    }
    return () => clearInterval(interval);
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
          <input type="date" value={filters.baslangic} onChange={(e) => setFilters({...filters, baslangic: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
          <input type="date" value={filters.bitis} onChange={(e) => setFilters({...filters, bitis: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        {/* YENİ EKLENEN AÇILIR MENÜLÜ ARAMA KUTUSU */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-600 mb-1">Ad Soyad / Kart No</label>
          <input 
            type="text" 
            placeholder="İsim veya kart ara..." 
            value={filters.arama} 
            onChange={handleSearchInputChange} 
            onBlur={() => setTimeout(() => setSuggestions([]), 200)} 
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
          />
          
          {suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl max-h-56 overflow-y-auto rounded-lg mt-1 left-0 divide-y divide-slate-100">
              {suggestions.map((log) => (
                <li 
                  key={log.ID} 
                  onClick={() => handleSuggestionClick(log)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col"
                >
                  <span className="font-bold text-slate-800 text-sm">{log.Ad_Soyad || 'Bilinmeyen Kişi'}</span>
                  <span className="text-slate-500 text-xs">Kart: {log.RFID_Kart_No}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-end">
          <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors">
            {loading ? 'Aranıyor...' : 'Logları Getir'}
          </button>
        </div>
      </form>

      {/* AG GRID TABLOSU */}
      {hasSearched && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-2">
          <div className="p-2 text-sm font-bold text-slate-700">Arama Sonuçları ({logs.length} Kayıt)</div>
          
          <div className="flex-1 w-full h-full">
            <AgGridReact
              theme={themeQuartz} 
              icons={customIcons} 
              alwaysMultiSort={true} 
              getRowId={(params) => params.data.ID} 
              rowData={logs}
              columnDefs={colDefs}
              defaultColDef={defaultColDef} 
              localeText={AG_GRID_LOCALE_TR}
              pagination={true}
              paginationPageSize={50} 
              domLayout="normal"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Logs;