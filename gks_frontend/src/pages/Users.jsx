import { useState } from 'react';
import api from '../api/axios';

// AG Grid importları
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

function Users() {
  const now = new Date();
  const bitisTarihi = now.toISOString().split('T')[0];
  const baslangicTarihi = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({ baslangic: baslangicTarihi, bitis: bitisTarihi, arama: '' });
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitUser, setExitUser] = useState(null);
  const [exitData, setExitData] = useState({ cikis_tarihi: new Date().toISOString().split('T')[0], cikis_nedeni: '' });
  const [formData, setFormData] = useState({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });

  // --- YETKİ MODALI STATE'LERİ ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authData, setAuthData] = useState({ user: null, allDoors: [], selectedDoors: [] });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users', { params: filters });
      setUsers(response.data);
    } catch (err) {
      console.error("Veri çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = async (e) => {
    e.preventDefault();
    setHasSearched(true);
    await fetchUsers();
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleExitChange = (e) => setExitData({ ...exitData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      if (isEditing) {
        await api.put(`/users/${editId}`, formData);
        setMessage({ text: 'Personel güncellendi.', type: 'success' });
      } else {
        await api.post('/users', formData);
        setMessage({ text: 'Yeni personel kaydedildi.', type: 'success' });
      }
      setFormData({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
      setIsEditing(false);
      setEditId(null);
      if (hasSearched) fetchUsers(); 
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'İşlem başarısız oldu.', type: 'error' });
    }
  };

  const handleEditClick = (user) => {
    setIsEditing(true);
    setEditId(user.ID);
    setFormData({
      ad_soyad: user.Ad_Soyad || '', rfid: user.RFID_Kart_No?.includes('KART_YOK') ? '' : (user.RFID_Kart_No || ''), tc: user.TC_Kimlik || '', sicil: user.Sicil_No || '', sirket: user.Sirket || '', departman: user.Departman || '', gorev: user.Gorev || '', ise_giris: user.Ise_Giris_Tarihi ? user.Ise_Giris_Tarihi.split('T')[0] : ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = async (user) => {
    if (user.Durum === true || user.Durum === 1) {
      setExitUser(user);
      setShowExitModal(true);
    } else {
      if (window.confirm(`${user.Ad_Soyad} isimli personeli tekrar İŞE ALMAK istediğinize emin misiniz?`)) {
        try {
          await api.patch(`/users/${user.ID}/status`, { durum: 1, ad_soyad: user.Ad_Soyad, sicil: user.Sicil_No });
          setMessage({ text: 'Personel aktifleştirildi.', type: 'success' });
          if (hasSearched) fetchUsers();
        } catch (err) {
          setMessage({ text: 'Durum güncellenemedi.', type: 'error' });
        }
      }
    }
  };

  const handleExitSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/users/${exitUser.ID}/status`, { durum: 0, cikis_tarihi: exitData.cikis_tarihi, cikis_nedeni: exitData.cikis_nedeni, ad_soyad: exitUser.Ad_Soyad, sicil: exitUser.Sicil_No });
      setMessage({ text: 'Personel pasife alındı.', type: 'success' });
      setShowExitModal(false);
      setExitData({ cikis_tarihi: new Date().toISOString().split('T')[0], cikis_nedeni: '' });
      if (hasSearched) fetchUsers();
    } catch (err) {
      alert("İşten çıkış işlemi başarısız oldu.");
    }
  };

  const cancelEdit = () => {
    setIsEditing(false); setEditId(null);
    setFormData({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
    setMessage({ text: '', type: '' });
  };

  // --- YETKİ FONKSİYONLARI ---
  const handleAuthClick = async (user) => {
    try {
      const doorsRes = await api.get('/doors');
      const authRes = await api.get(`/users/${user.ID}/doors`);
      
      setAuthData({
        user: user,
        allDoors: doorsRes.data,
        selectedDoors: authRes.data
      });
      setShowAuthModal(true);
    } catch (err) {
      alert("Yetki bilgileri alınırken hata oluştu.");
    }
  };

  const handleAuthChange = (doorId) => {
    setAuthData(prev => ({
      ...prev,
      selectedDoors: prev.selectedDoors.includes(doorId)
        ? prev.selectedDoors.filter(id => id !== doorId) 
        : [...prev.selectedDoors, doorId] 
    }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${authData.user.ID}/doors`, { doorIds: authData.selectedDoors });
      setMessage({ text: `${authData.user.Ad_Soyad} için yetkiler güncellendi.`, type: 'success' });
      setShowAuthModal(false);
    } catch (err) {
      alert("Yetkiler kaydedilemedi.");
    }
  };

  // --- AG GRID SÜTUN AYARLARI ---
  const [colDefs] = useState([
    { field: 'Sicil_No', headerName: 'Sicil No', width: 120, filter: true },
    { field: 'Sistem_ID', headerName: 'Sistem ID', width: 130, filter: true },
    { field: 'Ad_Soyad', headerName: 'Ad Soyad', flex: 1, filter: true },
    { field: 'TC_Kimlik', headerName: 'TC Kimlik', width: 130, filter: true },
    { field: 'Departman', headerName: 'Departman', flex: 1, filter: true },
    { 
      field: 'Durum', 
      headerName: 'Durum', 
      width: 100,
      cellRenderer: (params) => {
        return params.value 
          ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Aktif</span>
          : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Pasif</span>;
      }
    },
    {
      headerName: 'İşlemler',
      width: 260,
      sortable: false,
      filter: false,
      cellRenderer: (params) => (
        <div className="space-x-2 mt-1">
          <button onClick={() => handleEditClick(params.data)} className="px-2 py-1 bg-blue-50 text-blue-600 font-bold rounded text-xs">
            Düzenle
          </button>
          
          <button onClick={() => handleAuthClick(params.data)} className="px-2 py-1 bg-purple-50 text-purple-600 font-bold rounded text-xs border border-purple-200">
            Yetkiler
          </button>

          <button 
            onClick={() => handleToggleStatus(params.data)} 
            className={`px-2 py-1 font-bold rounded text-xs ${params.data.Durum ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
          >
            {params.data.Durum ? 'İşten Çıkar' : 'İşe Al'}
          </button>
        </div>
      )
    }
  ]);

  const defaultColDef = {
    filter: true, 
    resizable: true, 
    cellStyle: { borderRight: '1px solid #cbd5e1' }, 
    headerClass: 'border-r border-slate-300' 
  };

  return (
    <div className="space-y-8 relative">
      
      {/* ÇIKIŞ MODALI */}
      {showExitModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-red-600 mb-2">İşten Çıkış / Pasife Al</h3>
            <form onSubmit={handleExitSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">İşten Çıkış Tarihi *</label>
                <input type="date" name="cikis_tarihi" value={exitData.cikis_tarihi} onChange={handleExitChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Nedeni (Opsiyonel)</label>
                <textarea name="cikis_nedeni" value={exitData.cikis_nedeni} onChange={handleExitChange} rows="3" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"></textarea>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowExitModal(false)} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200">İptal</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Onayla ve Kapat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YETKİ (CHECKBOX) MODALI */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Kapı Geçiş Yetkileri</h3>
            <p className="text-sm text-slate-600 mb-4">
              <span className="font-bold">{authData.user?.Ad_Soyad}</span> için izinli kapıları seçin.
            </p>
            <form onSubmit={handleAuthSubmit}>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 mb-4 bg-slate-50">
                {authData.allDoors.map(door => (
                  <label key={door.ID} className="flex items-center p-3 hover:bg-white cursor-pointer border-b border-slate-200 last:border-0 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={authData.selectedDoors.includes(door.ID)}
                      onChange={() => handleAuthChange(door.ID)}
                    />
                    <span className="ml-3 text-sm font-bold text-slate-700">{door.Kapi_Adi}</span>
                  </label>
                ))}
                {authData.allDoors.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-6 font-medium">Sistemde tanımlı kapı bulunmuyor.<br/>Önce "Kapı Tanımlama" sekmesinden kapı ekleyin.</div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowAuthModal(false)} className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Yetkileri Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EKLEME FORMU */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{isEditing ? 'Personel Düzenle' : 'Yeni Personel Kaydı'}</h2>
        {message.text && <div className={`mb-4 p-3 rounded-lg text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{message.text}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-xs font-bold text-slate-500 mb-1">T.C. Kimlik No *</label><input type="text" maxLength="11" name="tc" value={formData.tc} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad *</label><input type="text" name="ad_soyad" value={formData.ad_soyad} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Kurum Sicil No *</label><input type="text" maxLength="11" name="sicil" value={formData.sicil} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">RFID Kart No</label><input type="text" name="rfid" value={formData.rfid} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" /></div>
          <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Şirket / Taşeron</label><input type="text" name="sirket" value={formData.sirket} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Departman & Görev</label><input type="text" name="departman" value={formData.departman} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">İşe Giriş Tarihi</label><input type="date" name="ise_giris" value={formData.ise_giris} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div className="md:col-span-4 flex justify-end space-x-3 mt-2">
            {isEditing && <button type="button" onClick={cancelEdit} className="px-6 py-2 bg-slate-200 font-bold rounded-lg hover:bg-slate-300">İptal Et</button>}
            <button type="submit" className={`px-6 py-2 font-bold rounded-lg text-white ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>{isEditing ? 'Bilgileri Güncelle' : 'Kaydet'}</button>
          </div>
        </form>
      </div>

      {/* PERSONEL ARAMA FİLTRESİ */}
      <form onSubmit={handleFetchData} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end shrink-0">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">İşe Giriş (Başlangıç)</label>
          <input type="date" value={filters.baslangic} onChange={(e) => setFilters({...filters, baslangic: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">İşe Giriş (Bitiş)</label>
          <input type="date" value={filters.bitis} onChange={(e) => setFilters({...filters, bitis: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Ad Soyad / Sicil</label>
          <input type="text" placeholder="Ara..." value={filters.arama} onChange={(e) => setFilters({...filters, arama: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg">
             {loading ? 'Aranıyor...' : 'Personelleri Listele'}
          </button>
        </div>
      </form>

      {/* AG GRID TABLOSU */}
      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-2 h-[50vh]">
          <div className="p-2 text-sm font-bold text-slate-700">Arama Sonuçları ({users.length} Kayıt)</div>
          
          <div className="ag-theme-quartz flex-1 w-full h-full">
            <AgGridReact
              rowData={users}
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

export default Users;