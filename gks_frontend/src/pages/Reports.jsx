import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';
import { customIcons, AG_GRID_LOCALE_TR } from '../utils/constants';

// AG Grid importları ve Yeni Tema Motoru
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ValidationModule, themeQuartz } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

// SQL'den gelen tarih (Date) veya saat (Time) verisini HH:mm formatına dönüştüren yardımcı fonksiyon
const extractTime = (val) => {
  if (!val) return '-';
  
  if (typeof val === 'string' && val.includes('T')) {
    return val.split('T')[1].substring(0, 5);
  }
  
  return val.substring(0, 5); 
};

function Reports() {
  const gridRef = useRef();
  const today = new Date().toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/daily-attendance', { 
        params: { tarih: selectedDate } 
      });
      setReportData(response.data);
    } catch (err) {
      console.error("Rapor çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  // Excel/CSV Dışa Aktarma Fonksiyonu
  const onExportClick = () => {
    if (gridRef.current) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `PDKS_Raporu_${selectedDate}.csv`,
        columnSeparator: ';'
      });
    }
  };

  // --- AG GRID SÜTUN AYARLARI ---
// --- AG GRID SÜTUN AYARLARI ---
  const colDefs = useMemo(() => [
    { field: 'Sicil_No', headerName: 'Sicil No', width: 110, pinned: 'left' },
    { field: 'Ad_Soyad', headerName: 'Ad Soyad', flex: 1, minWidth: 160, pinned: 'left', cellClass: 'font-bold text-slate-800' },
    
    // YENİ EKLENEN TARİH SÜTUNU
    { 
      headerName: 'Tarih', 
      valueGetter: () => {
        // YYYY-MM-DD formatını DD.MM.YYYY formatına çeviriyoruz
        return selectedDate.split('-').reverse().join('.');
      },
      width: 110,
      cellClass: 'text-slate-500 font-medium'
    },
    
    { field: 'Departman', headerName: 'Departman', width: 130 },
    { 
      field: 'Vardiya_Adi', 
      headerName: 'Vardiya', 
      width: 150,
      cellRenderer: (params) => params.value || <span className="text-slate-400 italic">Atanmamış</span>
    },
    { 
      headerName: 'Gerçekleşen', 
      valueGetter: (params) => {
        const giris = extractTime(params.data.Ilk_Giris);
        const cikis = extractTime(params.data.Son_Cikis);
        return `${giris} / ${cikis}`;
      },
      width: 140,
      cellClass: 'font-mono text-slate-700 font-bold'
    },
    { 
      field: 'Gec_Kalma_Dk', 
      headerName: 'Geç', 
      width: 90,
      cellRenderer: (params) => {
        const dk = params.value;
        if (dk > 0) return <span className="text-red-600 font-black">+{dk}dk</span>;
        return <span className="text-slate-300">-</span>;
      }
    },
    { 
      field: 'Erken_Cikma_Dk', 
      headerName: 'Erken', 
      width: 90,
      cellRenderer: (params) => {
        const dk = params.value;
        if (dk > 0) return <span className="text-orange-500 font-black">{dk}dk</span>;
        return <span className="text-slate-300">-</span>;
      }
    },
    { 
      field: 'Toplam_Yemek_Dk', 
      headerName: 'Yemek', 
      width: 100,
      cellRenderer: (params) => {
        const dk = params.value;
        if (dk > 0) return <span className="font-bold text-slate-700">{dk} dk</span>;
        return <span className="text-slate-300">-</span>;
      }
    },
    { 
      field: 'Toplam_Mola_Dk', 
      headerName: 'Mola', 
      width: 100,
      cellRenderer: (params) => {
        const dk = params.value;
        if (dk > 0) return <span className="font-bold text-slate-700">{dk} dk</span>;
        return <span className="text-slate-300">-</span>;
      }
    },
    { 
      field: 'Mola_Asimi_Dk', 
      headerName: 'Aşım', 
      width: 90,
      cellRenderer: (params) => {
        const dk = params.value;
        if (dk > 0) return <span className="text-red-600 font-black">+{dk}dk</span>;
        return <span className="text-slate-300">-</span>;
      }
    },
    { 
      field: 'Durum', 
      headerName: 'Durum Özeti', 
      width: 200,
      cellRenderer: (params) => {
        const text = params.value;
        let colorClass = 'bg-slate-100 text-slate-700';

        if (text === 'Normal') colorClass = 'bg-green-100 text-green-700 border border-green-200';
        else if (text.includes('Geç Kaldı') || text.includes('Devamsız') || text.includes('Mola Aşımı')) colorClass = 'bg-red-100 text-red-700 border border-red-200';
        else if (text.includes('Erken Çıktı')) colorClass = 'bg-orange-100 text-orange-700 border border-orange-200';
        else if (text.includes('Çıkış Yok') || text.includes('Çıkış Okutulmadı')) colorClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        // YENİ EKLENEN İZİN RENKLENDİRMELERİ
        // Reports.jsx içindeki Durum Özeti hücresi
        else if (text === 'Hafta Tatili') colorClass = 'bg-slate-100 text-slate-500 border border-slate-200';
        else if (text === 'Tatil Mesaisi') colorClass = 'bg-teal-100 text-teal-700 border border-teal-200';
        else if (text === 'Yıllık İzin' || text === 'Mazeret İzni' || text === 'Ücretsiz İzin') colorClass = 'bg-blue-100 text-blue-700 border border-blue-200';
        else if (text === 'Raporlu') colorClass = 'bg-purple-100 text-purple-700 border border-purple-200';

        return <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${colorClass}`}>{text}</span>;
      }
    }
  ], [selectedDate]); // DİKKAT: Buraya selectedDate eklendi!

  const defaultColDef = useMemo(() => ({
    filter: true,
    sortable: true,
    resizable: true,
    cellStyle: { borderRight: '1px solid #cbd5e1' },
    headerClass: 'border-r border-slate-300 text-xs'
  }), []);

  return (
    <div className="space-y-6 relative mt-8">
      
      {/* BAŞLIK VE KONTROLLER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Günlük Puantaj & Devam Kontrol</h2>
          <p className="text-slate-500 text-sm mt-1">Personellerin giriş-çıkış hareketlerini, yemek sürelerini ve mola uyumlarını inceleyin.</p>
        </div>

        <div className="flex items-end space-x-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Rapor Tarihi</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          
          <button 
            onClick={fetchReport} 
            disabled={loading}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors"
          >
            {loading ? 'Hesaplanıyor...' : 'Yenile'}
          </button>

          <button 
            onClick={onExportClick} 
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Excel İndir
          </button>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI (ÖZET) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Toplam Personel</div>
          <div className="text-2xl font-black text-slate-800">{reportData.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm">
          <div className="text-xs font-bold text-green-600 mb-1">Kurallara Uyanlar</div>
          <div className="text-2xl font-black text-green-700">
            {reportData.filter(r => r.Durum === 'Normal').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
          <div className="text-xs font-bold text-red-600 mb-1">Geç Kalan / Mola Aşan</div>
          <div className="text-2xl font-black text-red-700">
            {reportData.filter(r => r.Durum.includes('Geç Kaldı') || r.Durum.includes('Mola Aşımı')).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-1">Devamsız</div>
          <div className="text-2xl font-black text-slate-700">
            {reportData.filter(r => r.Durum === 'Devamsız').length}
          </div>
        </div>
      </div>

      {/* AG GRID TABLOSU */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-4 h-[60vh]">
        <div className="flex-1 w-full h-full">
          <AgGridReact
            ref={gridRef}
            theme={themeQuartz} 
            icons={customIcons} 
            alwaysMultiSort={true} 
            getRowId={(params) => params.data.User_ID} 
            rowData={reportData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            localeText={AG_GRID_LOCALE_TR}
            paginationPageSize={50}
            domLayout="normal"
          />
        </div>
      </div>

    </div>
  );
}

export default Reports;