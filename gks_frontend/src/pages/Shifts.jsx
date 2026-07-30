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

// MSSQL'den gelen saat verisini (Örn: 1970-01-01T09:00:00.000Z veya 09:00:00) HH:mm formatına çeviren yardımcı fonksiyon
const formatTimeForInput = (val) => {
  if (!val) return '';
  if (val.includes('T')) return val.split('T')[1].substring(0, 5);
  return val.substring(0, 5);
};

function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // ARAMA VE OTOMATİK TAMAMLAMA STATE'LERİ
  const [arama, setArama] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // DÜZENLEME (EDIT) VE EKLEME STATE'LERİ
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ 
    vardiya_adi: '', 
    mesai_baslangic: '', 
    mesai_bitis: '', 
    yemek_baslangic: '', 
    yemek_bitis: '', 
    tolerans_dk: 0, 
    mola_hakki_dk: 0 
  });

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/shifts');
      setShifts(response.data);
    } catch (err) {
      console.error("Vardiyalar çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  // --- SESSİZ CANLI GÜNCELLEME (REAL-TIME POLLING) ---
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get('/shifts');
        setShifts(response.data); 
      } catch (err) {
        console.error("Arka plan güncelleme hatası:", err);
      }
    }, 3000); 
    return () => clearInterval(interval);
  }, []); 

  // --- OTOMATİK TAMAMLAMA ---
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setArama(value);

    if (value.length >= 2) {
      const filteredSuggestions = shifts.filter(shift => 
        shift.Vardiya_Adi.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (shift) => {
    setArama(shift.Vardiya_Adi);
    setSuggestions([]);
  };

  const filteredShifts = useMemo(() => {
    if (!arama) return shifts;
    return shifts.filter(shift => shift.Vardiya_Adi.toLowerCase().includes(arama.toLowerCase()));
  }, [arama, shifts]);

  // --- FORM İŞLEMLERİ ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      if (isEditing) {
        await api.put(`/shifts/${editId}`, formData);
        setMessage({ text: 'Vardiya başarıyla güncellendi.', type: 'success' });
      } else {
        await api.post('/shifts', formData);
        setMessage({ text: 'Yeni vardiya sisteme eklendi.', type: 'success' });
      }
      
      setFormData({ vardiya_adi: '', mesai_baslangic: '', mesai_bitis: '', yemek_baslangic: '', yemek_bitis: '', tolerans_dk: 0, mola_hakki_dk: 0 });
      setIsEditing(false);
      setEditId(null);
      fetchShifts(); 
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'İşlem başarısız oldu.', type: 'error' });
    }
  };

  const handleEditClick = (shift) => {
    setIsEditing(true);
    setEditId(shift.ID);
    setFormData({ 
      vardiya_adi: shift.Vardiya_Adi || '',
      mesai_baslangic: formatTimeForInput(shift.Mesai_Baslangic),
      mesai_bitis: formatTimeForInput(shift.Mesai_Bitis),
      yemek_baslangic: formatTimeForInput(shift.Yemek_Baslangic),
      yemek_bitis: formatTimeForInput(shift.Yemek_Bitis),
      tolerans_dk: shift.Tolerans_Dk || 0,
      mola_hakki_dk: shift.Mola_Hakki_Dk || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = async (shift) => {
    const isActive = shift.Durum === undefined || shift.Durum === null ? true : shift.Durum;
    const yeniDurum = isActive ? 0 : 1;
    
    const uyariMesaji = isActive 
        ? `"${shift.Vardiya_Adi}" isimli vardiyayı PASİFE ALMAK istediğinize emin misiniz?`
        : `"${shift.Vardiya_Adi}" isimli vardiyayı tekrar AKTİFLEŞTİRMEK istediğinize emin misiniz?`;

    if (window.confirm(uyariMesaji)) {
      try {
        await api.patch(`/shifts/${shift.ID}/status`, { durum: yeniDurum, vardiya_adi: shift.Vardiya_Adi });
        setMessage({ text: isActive ? 'Vardiya pasife alındı.' : 'Vardiya aktifleştirildi.', type: 'success' });
        fetchShifts();
      } catch (err) {
        setMessage({ text: 'İşlem başarısız oldu.', type: 'error' });
      }
    }
  };

  const cancelEdit = () => {
    setIsEditing(false); 
    setEditId(null);
    setFormData({ vardiya_adi: '', mesai_baslangic: '', mesai_bitis: '', yemek_baslangic: '', yemek_bitis: '', tolerans_dk: 0, mola_hakki_dk: 0 });
    setMessage({ text: '', type: '' });
  };

  // --- AG GRID SÜTUN AYARLARI ---
  const colDefs = useMemo(() => [
    { field: 'ID', headerName: 'ID', width: 90 },
    { field: 'Vardiya_Adi', headerName: 'Vardiya Adı', flex: 1, minWidth: 180, cellClass: 'font-bold text-slate-800' },
    { 
      headerName: 'Mesai Saatleri', 
      valueGetter: (params) => {
        const bas = formatTimeForInput(params.data.Mesai_Baslangic);
        const bit = formatTimeForInput(params.data.Mesai_Bitis);
        return `${bas} - ${bit}`;
      },
      width: 150 
    },
    { 
      headerName: 'Yemek Molası', 
      valueGetter: (params) => {
        const bas = formatTimeForInput(params.data.Yemek_Baslangic);
        const bit = formatTimeForInput(params.data.Yemek_Bitis);
        return (bas && bit) ? `${bas} - ${bit}` : 'Belirtilmedi';
      },
      width: 160 
    },
    { 
      headerName: 'Esneklik', 
      valueGetter: (params) => `Tol: ${params.data.Tolerans_Dk || 0}dk | Mola: ${params.data.Mola_Hakki_Dk || 0}dk`,
      width: 180 
    },
    { 
      field: 'Durum', 
      headerName: 'Durum', 
      width: 100,
      cellRenderer: (params) => {
        const isActive = params.value === undefined || params.value === null ? true : params.value;
        return isActive 
          ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Aktif</span>
          : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Pasif</span>;
      }
    },
    {
      headerName: 'İşlemler',
      width: 200,
      sortable: false,
      filter: false,
      cellRenderer: (params) => {
        const isActive = params.data.Durum === undefined || params.data.Durum === null ? true : params.data.Durum;
        return (
          <div className="space-x-2 mt-1">
            <button 
              onClick={() => handleEditClick(params.data)} 
              className="px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded text-xs hover:bg-blue-100 transition-colors"
            >
              Düzenle
            </button>
            <button 
              onClick={() => handleToggleStatus(params.data)} 
              className={`px-3 py-1 font-bold rounded text-xs transition-colors ${isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            >
              {isActive ? 'Pasife Al' : 'Aktifleştir'}
            </button>
          </div>
        );
      }
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    filter: true,
    sortable: true,
    resizable: true,
    cellStyle: { borderRight: '1px solid #cbd5e1' },
    headerClass: 'border-r border-slate-300'
  }), []);

  return (
    <div className="space-y-8 relative mt-8">
      
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Vardiya ve Çalışma Saatleri</h2>
        <p className="text-slate-500 text-sm mt-1">Sistemdeki çalışma vardiyalarını, tolerans sürelerini ve mola saatlerini buradan yönetebilirsiniz.</p>
      </div>

      {/* EKLEME / DÜZENLEME FORMU */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {isEditing ? 'Vardiyayı Düzenle' : 'Yeni Vardiya Ekle'}
        </h2>
        
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-500 mb-1">Vardiya Adı *</label>
            <input 
              type="text" 
              name="vardiya_adi" 
              value={formData.vardiya_adi} 
              onChange={handleChange} 
              placeholder="Örn: Hafta İçi Gündüz Vardiyası"
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mesai Başlangıç *</label>
            <input 
              type="time" 
              name="mesai_baslangic" 
              value={formData.mesai_baslangic} 
              onChange={handleChange} 
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mesai Bitiş *</label>
            <input 
              type="time" 
              name="mesai_bitis" 
              value={formData.mesai_bitis} 
              onChange={handleChange} 
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Yemek Başlangıç</label>
            <input 
              type="time" 
              name="yemek_baslangic" 
              value={formData.yemek_baslangic} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Yemek Bitiş</label>
            <input 
              type="time" 
              name="yemek_bitis" 
              value={formData.yemek_bitis} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tolerans (Dakika)</label>
            <input 
              type="number" 
              name="tolerans_dk" 
              value={formData.tolerans_dk} 
              onChange={handleChange} 
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Günlük Mola Hakkı (Dakika)</label>
            <input 
              type="number" 
              name="mola_hakki_dk" 
              value={formData.mola_hakki_dk} 
              onChange={handleChange} 
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>

          <div className="md:col-span-2 flex justify-end space-x-3 mt-2">
            {isEditing && (
              <button 
                type="button" 
                onClick={cancelEdit} 
                className="px-6 py-2 bg-slate-200 font-bold text-slate-700 rounded-lg hover:bg-slate-300 transition-colors w-full"
              >
                İptal Et
              </button>
            )}
            <button 
              type="submit" 
              className={`px-6 py-2 font-bold rounded-lg text-white transition-colors w-full ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {isEditing ? 'Vardiyayı Güncelle' : 'Sisteme Kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* ARAMA VE TABLO BÖLÜMÜ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-4 h-[55vh]">
        
        {/* ARAMA KUTUSU */}
        <div className="mb-4 relative w-full md:w-1/3">
          <label className="block text-xs font-bold text-slate-600 mb-1">Vardiya Ara</label>
          <input 
            type="text" 
            placeholder="Vardiya adı yazın..." 
            value={arama} 
            onChange={handleSearchInputChange} 
            onBlur={() => setTimeout(() => setSuggestions([]), 200)} 
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
          />
          
          {suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl max-h-56 overflow-y-auto rounded-lg mt-1 left-0 divide-y divide-slate-100">
              {suggestions.map((shift) => (
                <li 
                  key={shift.ID} 
                  onClick={() => handleSuggestionClick(shift)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <span className="font-bold text-slate-800 text-sm">{shift.Vardiya_Adi}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-2 text-sm font-bold text-slate-700 bg-slate-50 border-t border-x border-slate-200 rounded-t-lg">
          Kayıtlı Vardiyalar ({filteredShifts.length} Kayıt)
        </div>
        
        <div className="flex-1 w-full h-full">
          <AgGridReact
            theme={themeQuartz} 
            icons={customIcons} 
            alwaysMultiSort={true} 
            getRowId={(params) => params.data.ID} 
            rowData={filteredShifts}
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

export default Shifts;