import { useState } from 'react';
import api from '../api/axios';

// AG Grid importları
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

function DoorLogs() {
  const bugunTarihi = new Date();
  const bitisTarihi = bugunTarihi.toISOString().split('T')[0];
  const baslangicTarihi = new Date(bugunTarihi.setMonth(bugunTarihi.getMonth() - 1)).toISOString().split('T')[0];

  const [filters, setFilters] = useState({ baslangic: baslangicTarihi, bitis: bitisTarihi, arama: '' });
  const [logs, setLogs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- AG GRID SÜTUN AYARLARI ---
  const [colDefs] = useState([
    { 
      field: 'Tarih', 
      headerName: 'Tarih / Saat', 
      width: 170, 
      filter: true,
      cellRenderer: (params) => new Date(params.value).toLocaleString('tr-TR')
    },

    { 
      field: 'Islemi_Yapan', 
      headerName: 'İşlemi Yapan', 
      width: 150, 
      filter: true,
      cellRenderer: (params) => (
        <span className="font-bold text-blue-600">{params.value || 'Sistem'}</span>
      )
    },
    { 
      field: 'Islem_Tipi', 
      headerName: 'İşlem Tipi', 
      width: 150, 
      filter: true,
      cellRenderer: (params) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${params.value === 'KAPI SİLİNDİ' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {params.value}
        </span>
      )
    },
    { field: 'Kapi_Adi', headerName: 'Kapı Adı', width: 250, filter: true },
    { field: 'Detay', headerName: 'Detay', flex: 1, filter: true, wrapText: true, autoHeight: true }
  ]);

  const defaultColDef = {
    filter: true,
    resizable: true,
    cellStyle: { borderRight: '1px solid #cbd5e1' },
    headerClass: 'border-r border-slate-300'
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
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Kapı Adı / İşlem</label>
          <input type="text" placeholder="Ara..." value={filters.arama} onChange={(e) => setFilters({...filters, arama: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors">
            {loading ? 'Yükleniyor...' : 'Kapı Loglarını Getir'}
          </button>
        </div>
      </form>

      {/* AG GRID TABLOSU */}
      {hasSearched && (
        <div className="flex-1 overflow-hidden border border-slate-300 rounded-2xl bg-white shadow-sm flex flex-col p-2 h-[60vh]">
          <div className="p-2 text-sm font-bold text-slate-700">
            Arama Sonuçları ({logs.length} Kayıt)
          </div>
          
          <div className="ag-theme-quartz flex-1 w-full h-full">
            <AgGridReact
              rowData={logs}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
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

export default DoorLogs;