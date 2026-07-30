import { useState, useEffect } from 'react';
import api from '../api/axios';

// AG Grid importları
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
ModuleRegistry.registerModules([AllCommunityModule]);

// AG GRID TÜRKÇE DİL DESTEĞİ
const AG_GRID_LOCALE_TR = {
  // Filtreleme (Filter) Menüsü
  contains: 'İçerir',
  notContains: 'İçermez',
  startsWith: 'Şununla Başlar',
  endsWith: 'Şununla Biter',
  equals: 'Eşittir',
  notEqual: 'Eşit Değildir',
  blank: 'Boş Olanlar',
  notBlank: 'Boş Olmayanlar',
  empty: 'Seçiniz',

  // Arama Kutusu ve Butonlar
  filterOoo: 'Filtrele...',
  applyFilter: 'Uygula',
  clearFilter: 'Temizle',
  resetFilter: 'Sıfırla',
  cancelFilter: 'İptal',
  
  // Mantıksal Operatörler
  andCondition: 'VE',
  orCondition: 'VEYA',

  // Sayfalama (Pagination)
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

// --- AG GRID SÜTUN AYARLARI ---
  const [colDefs] = useState([
    { field: 'ID', headerName: 'ID', width: 90 },
    { 
      field: 'Ad_Soyad', 
      headerName: 'Personel Adı', 
      flex: 1,minWidth: 200,
      // ÇÖZÜM: Boş isimleri kırmızı ve eğik yazıyla "Bilinmeyen Kişi" yapar
      cellRenderer: (params) => {
        return params.value ? (
          <span className="font-medium text-slate-800">{params.value}</span>
        ) : (
          <span className="text-red-500 italic font-bold">Bilinmeyen Kişi</span>
        );
      }
    },
    { field: 'RFID_Kart_No', headerName: 'Kart No', flex: 1,minWidth: 200 },
    { field: 'Kapi_Adi', headerName: 'Kapı', flex: 1 ,minWidth: 200},
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
      flex: 1,minWidth: 200,
      cellRenderer: (params) => new Date(params.value).toLocaleString('tr-TR')
    }
  ]);

  // ÇÖZÜM: Tüm sütunların arasına dikey gri bir çizgi ekler
  const defaultColDef = {
    filter: true, // Hepsinde filtre açar
    resizable: true, // Sütun genişliklerini manuel ayarlamaya izin verir
    cellStyle: { borderRight: '1px solid #cbd5e1' }, // Sütunlar arasına çizgi çeker
    headerClass: 'border-r border-slate-300' // Başlıklar arasına da çizgi çeker
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



  // --- YENİ EKLENEN: SESSİZ CANLI GÜNCELLEME (REAL-TIME POLLING) ---
  useEffect(() => {
    let interval;
    
    // Sadece tablo ekrandaysa (arama yapıldıysa) arka planda çalışmaya başla
    if (hasSearched) {
      interval = setInterval(async () => {
        try {
          // DİKKAT: Burada setLoading(true) kullanmıyoruz ki tablo titremesin!
          const response = await api.get('/logs', { params: filters });
          setUsers(response.data); // Sadece veriyi sessizce ez
        } catch (err) {
          console.error("Arka plan güncelleme hatası:", err);
        }
      }, 3000); // 3000 milisaniye = 3 saniyede bir yeniler (İstersen 5000 yapabilirsin)
    }

    // Komponentten çıkıldığında veya filtre değiştiğinde eski sayacı temizle
    return () => clearInterval(interval);
  }, [hasSearched, filters]); 

  
  // ----------------------------------------------------------------
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
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Ad Soyad / Kart No</label>
          <input type="text" placeholder="İsim veya kart ara..." value={filters.arama} onChange={(e) => setFilters({...filters, arama: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
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
          
          <div className="ag-theme-quartz flex-1 w-full h-full">
            <AgGridReact
              rowData={logs}
              columnDefs={colDefs}
              defaultColDef={defaultColDef} // <-- BURA EKLENDİ
              localeText={AG_GRID_LOCALE_TR}
              pagination={true}
              paginationPageSize={50} // Sayfa başına 50 kayıt gösterir
              domLayout="normal"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Logs;