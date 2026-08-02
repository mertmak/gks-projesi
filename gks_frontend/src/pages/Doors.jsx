import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../api/socket';
import CustomDataGrid from '../components/CustomDataGrid';
import AutocompleteSearch from '../components/AutocompleteSearch';
import AlertMessage from '../components/AlertMessage';

function Doors() {
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // ARAMA VE OTOMATİK TAMAMLAMA STATE'LERİ
  const [arama, setArama] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // DÜZENLEME (EDIT) VE EKLEME STATE'LERİ
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ kapi_adi: '', departman: '', konum: '', kapi_turu: 'İç Geçiş' });

  const fetchDoors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doors');
      setDoors(response.data);
    } catch (err) {
      console.error("Kapılar çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoors();
  }, []);

  // --- YENİ YAPI: SOCKET.IO İLE ANLIK GÜNCELLEME ---
  useEffect(() => {
    const refreshDoors = async () => {
      try {
        const response = await api.get('/doors');
        setDoors(response.data); 
      } catch (err) {
        console.error("Socket güncelleme hatası:", err);
      }
    };

    socket.on('doors_updated', refreshDoors);

    return () => {
      socket.off('doors_updated', refreshDoors);
    };
  }, []);

  // --- BİLEŞENE UYGUN LOKAL KAPILARDA ARAMA ---
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setArama(value); 
    
    if (value.length >= 2) {
      const lowerVal = value.toLowerCase();
      // Halihazırda çekilmiş olan kapılar içinde (frontend'de) filtreleme yapıyoruz
      const matchedDoors = doors.filter(door => door.Kapi_Adi.toLowerCase().includes(lowerVal));
      
      const formattedSuggestions = matchedDoors.map(door => ({
         label: door.Kapi_Adi,
         subLabel: `Tür: ${door.Kapi_Turu} | Departman: ${door.Departman}`,
         value: door.Kapi_Adi,
         originalData: door
      }));
      setSuggestions(formattedSuggestions.slice(0, 5)); 
    } else {
      setSuggestions([]); 
    }
  };

  const handleSuggestionClick = (door) => {
    setArama(door.Kapi_Adi);
    setSuggestions([]);
  };

  // Tabloda sadece aranan kapıları göstermek için
  const filteredDoors = useMemo(() => {
    if (!arama) return doors;
    return doors.filter(door => door.Kapi_Adi.toLowerCase().includes(arama.toLowerCase()));
  }, [arama, doors]);

  // --- FORM İŞLEMLERİ ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      if (isEditing) {
        await api.put(`/doors/${editId}`, formData);
        setMessage({ text: 'Kapı başarıyla güncellendi.', type: 'success' });
      } else {
        await api.post('/doors', formData);
        setMessage({ text: 'Yeni kapı sisteme eklendi.', type: 'success' });
      }
      
      setFormData({ kapi_adi: '', departman: '', konum: '', kapi_turu: 'İç Geçiş' });
      setIsEditing(false);
      setEditId(null);
      fetchDoors(); 
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'İşlem başarısız oldu.', type: 'error' });
    }
  };

  const handleEditClick = (door) => {
    setIsEditing(true);
    setEditId(door.ID);
    setFormData({ 
      kapi_adi: door.Kapi_Adi || '',
      departman: door.Departman || '',
      konum: door.Konum || '',
      kapi_turu: door.Kapi_Turu || 'İç Geçiş'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = async (door) => {
    const isActive = door.Durum === undefined || door.Durum === null ? true : door.Durum;
    const yeniDurum = isActive ? 0 : 1;
    
    const uyariMesaji = isActive 
        ? `"${door.Kapi_Adi}" isimli kapıyı PASİFE ALMAK istediğinize emin misiniz? (Bu kapıya ait tüm geçiş yetkileri silinecektir!)`
        : `"${door.Kapi_Adi}" isimli kapıyı tekrar AKTİFLEŞTİRMEK istediğinize emin misiniz?`;

    if (window.confirm(uyariMesaji)) {
      try {
        await api.patch(`/doors/${door.ID}/status`, { durum: yeniDurum, kapi_adi: door.Kapi_Adi });
        setMessage({ text: isActive ? 'Kapı pasife alındı.' : 'Kapı aktifleştirildi.', type: 'success' });
        fetchDoors();
      } catch (err) {
        setMessage({ text: 'İşlem başarısız oldu.', type: 'error' });
      }
    }
  };

  const cancelEdit = () => {
    setIsEditing(false); 
    setEditId(null);
    setFormData({ kapi_adi: '', departman: '', konum: '', kapi_turu: 'İç Geçiş' });
    setMessage({ text: '', type: '' });
  };

  // --- AG GRID SÜTUN AYARLARI ---
  const colDefs = useMemo(() => [
    { field: 'ID', headerName: 'ID', width: 90 },
    { field: 'Kapi_Adi', headerName: 'Kapı Adı', flex: 1, minWidth: 200 },
    { 
      field: 'Kapi_Turu', 
      headerName: 'Kapı Türü', 
      flex: 1, 
      minWidth: 150,
      cellRenderer: (params) => {
        const val = params.value || 'İç Geçiş';
        const color = val.includes('Giriş') ? 'text-blue-600' : val.includes('Çıkış') ? 'text-orange-600' : 'text-slate-600';
        return <span className={`font-bold ${color}`}>{val}</span>;
      }
    },
    { field: 'Departman', headerName: 'Departman', flex: 1, minWidth: 150 },
    { field: 'Konum', headerName: 'Konum', flex: 1, minWidth: 150 },
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

  return (
    <div className="space-y-8 relative mt-8">
      
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Kapı Tanımlama ve Yönetim</h2>
        <p className="text-slate-500 text-sm mt-1">Sistemdeki geçiş noktalarını (kapıları) buradan ekleyebilir, düzenleyebilir veya durumlarını değiştirebilirsiniz.</p>
      </div>

      {/* EKLEME / DÜZENLEME FORMU */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {isEditing ? 'Kapı Bilgilerini Düzenle' : 'Yeni Kapı Ekle'}
        </h2>
        
      <AlertMessage message={message.text} type={message.type} />
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kapı Adı *</label>
            <input 
              type="text" 
              name="kapi_adi" 
              value={formData.kapi_adi} 
              onChange={handleChange} 
              placeholder="Örn: Ana Giriş Turnikesi"
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kapı Türü (İşlevi) *</label>
            <select 
              name="kapi_turu" 
              value={formData.kapi_turu} 
              onChange={handleChange} 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="İç Geçiş">İç Geçiş (Standart Kapı)</option>
              <option value="Ana Giriş">Ana Giriş (Mesai Başlar)</option>
              <option value="Ana Çıkış">Ana Çıkış (Mesai Biter)</option>
              <option value="Yemekhane Giriş">Yemekhane Giriş</option>
              <option value="Yemekhane Çıkış">Yemekhane Çıkış</option>
              <option value="Mola / Sigara Alanı">Mola / Sigara Alanı</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Bağlı Olduğu Departman *</label>
            <input 
              type="text" 
              name="departman" 
              value={formData.departman} 
              onChange={handleChange} 
              placeholder="Örn: Bilgi İşlem"
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Fiziksel Konum *</label>
            <input 
              type="text" 
              name="konum" 
              value={formData.konum} 
              onChange={handleChange} 
              placeholder="Örn: A Blok Zemin Kat"
              required 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            />
          </div>
          
          <div className="md:col-span-4 flex justify-end space-x-3 mt-2">
            {isEditing && (
              <button 
                type="button" 
                onClick={cancelEdit} 
                className="px-6 py-2 bg-slate-200 font-bold text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                İptal Et
              </button>
            )}
            <button 
              type="submit" 
              className={`px-6 py-2 font-bold rounded-lg text-white transition-colors ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {isEditing ? 'Bilgileri Güncelle' : 'Sisteme Kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* ARAMA VE TABLO BÖLÜMÜ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-4 h-[60vh]">
        
        {/* YENİ ORTAK ARAMA KUTUSU */}
        <div className="mb-4 relative w-full md:w-1/3 z-50">
          <AutocompleteSearch 
            label="Kapı Ara"
            placeholder="Kapı adı yazın..."
            value={arama}
            onChange={handleSearchInputChange}
            suggestions={suggestions}
            onSelect={(item) => {
              handleSuggestionClick(item.originalData);
            }}
          />
        </div>

        <div className="p-2 text-sm font-bold text-slate-700 bg-slate-50 border-t border-x border-slate-200 rounded-t-lg">
          Kayıtlı Kapılar ({filteredDoors.length} Kayıt)
        </div>
        
        {/* YENİ ORTAK TABLO BİLEŞENİ */}
        <div className="flex-1 w-full h-full">
          <CustomDataGrid 
            rowData={filteredDoors}
            columnDefs={colDefs}
            getRowId={(params) => params.data.ID}
          />
        </div>
      </div>

    </div>
  );
}

export default Doors;