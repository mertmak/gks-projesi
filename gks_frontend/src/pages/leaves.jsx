import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import AutocompleteSearch from '../components/AutocompleteSearch';
import CustomDataGrid from '../components/CustomDataGrid';
import AlertMessage from '../components/AlertMessage';

function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Arama ve Personel Seçimi
  const [arama, setArama] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    izin_turu: 'Yıllık İzin',
    baslangic: new Date().toISOString().split('T')[0],
    bitis: new Date().toISOString().split('T')[0],
    aciklama: ''
  });

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data);
    } catch (err) {
      console.error("İzinler çekilemedi:", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // --- BİLEŞENE UYGUN LOKAL HIZLI ARAMA ---
  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setArama(value); 
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

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setArama(user.Ad_Soyad);
    setSuggestions([]);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setMessage({ text: 'Lütfen önce bir personel seçiniz.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await api.post('/leaves', { ...formData, user_id: selectedUser.ID });
      setMessage({ text: 'İzin başarıyla kaydedildi.', type: 'success' });
      
      // Formu sıfırla
      setFormData({ izin_turu: 'Yıllık İzin', baslangic: new Date().toISOString().split('T')[0], bitis: new Date().toISOString().split('T')[0], aciklama: '' });
      setSelectedUser(null);
      setArama('');
      fetchLeaves();
    } catch (err) {
      setMessage({ text: 'İzin eklenirken hata oluştu.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu izin kaydını silmek istediğinize emin misiniz?")) {
      try {
        await api.delete(`/leaves/${id}`);
        setMessage({ text: 'İzin silindi.', type: 'success' });
        fetchLeaves();
      } catch (err) {
        setMessage({ text: 'Silme işlemi başarısız.', type: 'error' });
      }
    }
  };

  const colDefs = useMemo(() => [
    { field: 'Sicil_No', headerName: 'Sicil No', width: 120 },
    { field: 'Ad_Soyad', headerName: 'Ad Soyad', flex: 1, minWidth: 150, cellClass: 'font-bold text-slate-800' },
    { field: 'Departman', headerName: 'Departman', width: 130 },
    { 
      field: 'Izin_Turu', 
      headerName: 'İzin Türü', 
      width: 150,
      cellRenderer: (params) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${params.value === 'Raporlu' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
          {params.value}
        </span>
      )
    },
    { 
      headerName: 'Tarih Aralığı', 
      valueGetter: (params) => {
        const bas = new Date(params.data.Baslangic_Tarihi).toLocaleDateString('tr-TR');
        const bit = new Date(params.data.Bitis_Tarihi).toLocaleDateString('tr-TR');
        return `${bas} - ${bit}`;
      },
      width: 220 
    },
    { field: 'Aciklama', headerName: 'Açıklama', flex: 1, minWidth: 150 },
    {
      headerName: 'İşlemler', width: 100, sortable: false, filter: false,
      cellRenderer: (params) => (
        <button onClick={() => handleDelete(params.data.ID)} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded text-xs hover:bg-red-100 transition-colors mt-1">
          İptal Et
        </button>
      )
    }
  ], []);

  return (
    <div className="space-y-8 relative mt-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">İzin ve Tatil Yönetimi</h2>
        <p className="text-slate-500 text-sm mt-1">Personellerin yıllık izin, sağlık raporu veya mazeret izinlerini buradan yönetebilirsiniz.</p>
      </div>

      <AlertMessage message={message.text} type={message.type} />

      {/* İZİN EKLEME FORMU */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Yeni İzin Girişi</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          
          <div className="md:col-span-1 relative z-50">
            {/* YENİ ORTAK ARAMA BİLEŞENİ */}
            <AutocompleteSearch 
              label="Personel Ara *"
              placeholder="İsim veya Sicil yazın..."
              value={arama}
              onChange={handleSearchInputChange}
              suggestions={suggestions}
              onSelect={(item) => {
                handleSelectUser(item.originalData);
              }}
              required={!selectedUser}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">İzin Türü *</label>
            <select name="izin_turu" value={formData.izin_turu} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="Yıllık İzin">Yıllık İzin</option>
              <option value="Raporlu">Sağlık Raporu</option>
              <option value="Mazeret İzni">Mazeret İzni</option>
              <option value="Ücretsiz İzin">Ücretsiz İzin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç Tarihi *</label>
            <input type="date" name="baslangic" value={formData.baslangic} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Bitiş Tarihi *</label>
            <input type="date" name="bitis" value={formData.bitis} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama (Opsiyonel)</label>
            <input type="text" name="aciklama" value={formData.aciklama} onChange={handleChange} placeholder="İzin sebebi, rapor numarası vb." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="flex items-end h-full">
            <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors shadow-sm">
              {loading ? 'İşleniyor...' : 'İzni Kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* İZİN TABLOSU */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-4 h-[55vh]">
        <div className="p-2 text-sm font-bold text-slate-700 border-b border-slate-100 mb-2">
          Sistemde Kayıtlı İzinler ({leaves.length})
        </div>
        
        {/* YENİ ORTAK TABLO BİLEŞENİ */}
        <div className="flex-1 w-full h-full">
          <CustomDataGrid 
            rowData={leaves}
            columnDefs={colDefs}
            getRowId={(params) => params.data.ID}
          />
        </div>
      </div>
    </div>
  );
}

export default Leaves;