import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';

import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ValidationModule, themeQuartz } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

const customIcons = {
  filter: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>'
};

const AG_GRID_LOCALE_TR = {
  contains: 'İçerir', notContains: 'İçermez', startsWith: 'Şununla Başlar', endsWith: 'Şununla Biter', equals: 'Eşittir', notEqual: 'Eşit Değildir', blank: 'Boş Olanlar', notBlank: 'Boş Olmayanlar', empty: 'Seçiniz',
  filterOoo: 'Filtrele...', applyFilter: 'Uygula', clearFilter: 'Temizle', resetFilter: 'Sıfırla', cancelFilter: 'İptal',
  andCondition: 'VE', orCondition: 'VEYA', page: 'Sayfa', more: 'Daha', to: '-', of: '/', next: 'İleri', last: 'Son', first: 'İlk', previous: 'Geri', loadingOoo: 'Yükleniyor...', noRowsToShow: 'Gösterilecek kayıt bulunamadı.'
};

function Users() {
  const now = new Date();
  const bitisTarihi = now.toISOString().split('T')[0];
  const baslangicTarihi = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({ baslangic: baslangicTarihi, bitis: bitisTarihi, arama: '' });
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // FORM / DÜZENLEME STATE'LERİ
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });

  // ÇIKIŞ MODALI
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitUser, setExitUser] = useState(null);
  const [exitData, setExitData] = useState({ cikis_tarihi: new Date().toISOString().split('T')[0], cikis_nedeni: '' });
  
  // YETKİ MODALI
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authData, setAuthData] = useState({ user: null, allDoors: [], selectedDoors: [] });

  // VARDİYA MODALI
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftData, setShiftData] = useState({ user: null, allShifts: [], selectedShiftId: '' });

  // --- YENİ EKLENEN: HIZLI İŞLEM PANELİ STATE'LERİ ---
  const [quickSearch, setQuickSearch] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [quickSelectedUser, setQuickSelectedUser] = useState(null);

  // --- YENİ EKLENEN: TOPLU VARDİYA STATE'LERİ ---
  const [showBulkShiftModal, setShowBulkShiftModal] = useState(false);
  const [bulkShiftData, setBulkShiftData] = useState({ hedef_turu: 'Departman', hedef_deger: '', vardiya_id: '', allShifts: [] });

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

  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setFilters({ ...filters, arama: value }); 
    if (value.length >= 2) {
      try {
        const response = await api.get('/users', { params: { arama: value } });
        setSuggestions(response.data);
      } catch (err) {}
    } else {
      setSuggestions([]); 
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
      if (quickSelectedUser) setQuickSelectedUser(null);
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
          setQuickSelectedUser(null);
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
      setQuickSelectedUser(null);
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
      const activeDoors = doorsRes.data.filter(d => d.Durum === 1 || d.Durum === true || d.Durum === null || d.Durum === undefined);
      const activeDoorIds = activeDoors.map(d => d.ID);
      const selectedActiveDoors = authRes.data.filter(doorId => activeDoorIds.includes(doorId));
      setAuthData({ user: user, allDoors: activeDoors, selectedDoors: selectedActiveDoors });
      setShowAuthModal(true);
    } catch (err) { alert("Yetki bilgileri alınırken hata oluştu."); }
  };
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${authData.user.ID}/doors`, { doorIds: authData.selectedDoors });
      setMessage({ text: `${authData.user.Ad_Soyad} için yetkiler güncellendi.`, type: 'success' });
      setShowAuthModal(false);
    } catch (err) { alert("Yetkiler kaydedilemedi."); }
  };

  // --- VARDİYA ATAMA FONKSİYONLARI ---
  const handleShiftClick = async (user) => {
    try {
      const shiftsRes = await api.get('/shifts');
      const currentShiftRes = await api.get(`/users/${user.ID}/shift`);
      const activeShifts = shiftsRes.data.filter(shift => shift.Durum === true || shift.Durum === 1);
      setShiftData({ user: user, allShifts: activeShifts, selectedShiftId: currentShiftRes.data.vardiya_id || '' });
      setShowShiftModal(true);
    } catch (err) { alert("Vardiya bilgileri alınırken hata oluştu."); }
  };
  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${shiftData.user.ID}/shift`, { vardiya_id: shiftData.selectedShiftId });
      setMessage({ text: `${shiftData.user.Ad_Soyad} için vardiya ataması yapıldı.`, type: 'success' });
      setShowShiftModal(false);
    } catch (err) { alert("Vardiya ataması kaydedilemedi."); }
  };

  // --- HIZLI ARAMA (TABLO DIŞI) ---
  const handleQuickSearchChange = async (e) => {
    const value = e.target.value;
    setQuickSearch(value);
    setQuickSelectedUser(null);
    if (value.length >= 2) {
      try {
        const response = await api.get('/users', { params: { arama: value } });
        setQuickSuggestions(response.data.slice(0, 5));
      } catch (err) {}
    } else {
      setQuickSuggestions([]);
    }
  };

  // --- TOPLU VARDİYA ATAMA ---
  const openBulkShiftModal = async () => {
    try {
      const shiftsRes = await api.get('/shifts');
      const activeShifts = shiftsRes.data.filter(shift => shift.Durum === true || shift.Durum === 1);
      setBulkShiftData({ ...bulkShiftData, allShifts: activeShifts, hedef_deger: '', vardiya_id: '' });
      setShowBulkShiftModal(true);
    } catch (err) {
      alert("Sistemdeki vardiyalar çekilemedi.");
    }
  };

  const handleBulkShiftSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users/bulk/shift', { 
        hedef_turu: bulkShiftData.hedef_turu, 
        hedef_deger: bulkShiftData.hedef_deger, 
        vardiya_id: bulkShiftData.vardiya_id 
      });
      setMessage({ text: res.data.message, type: 'success' });
      setShowBulkShiftModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Toplu işlem başarısız oldu.");
    }
  };

  // AG GRID SÜTUNLARI
  const colDefs = useMemo(() => [
    { field: 'Sicil_No', headerName: 'Sicil No', width: 120, filter: true },
    { field: 'Ad_Soyad', headerName: 'Ad Soyad', flex: 1, minWidth: 180, filter: true },
    { field: 'Departman', headerName: 'Departman', flex: 1, minWidth: 160, filter: true },
    { 
      field: 'Durum', headerName: 'Durum', width: 100,
      cellRenderer: (params) => params.value 
        ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Aktif</span>
        : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Pasif</span>
    },
    {
      headerName: 'İşlemler', width: 320, sortable: false, filter: false,
      cellRenderer: (params) => (
        <div className="space-x-2 mt-1">
          <button onClick={() => handleEditClick(params.data)} className="px-2 py-1 bg-blue-50 text-blue-600 font-bold rounded text-xs">Düzenle</button>
          <button onClick={() => handleAuthClick(params.data)} className="px-2 py-1 bg-purple-50 text-purple-600 font-bold rounded text-xs border border-purple-200">Yetkiler</button>
          <button onClick={() => handleShiftClick(params.data)} className="px-2 py-1 bg-amber-50 text-amber-600 font-bold rounded text-xs border border-amber-200">Vardiya</button>
          <button onClick={() => handleToggleStatus(params.data)} className={`px-2 py-1 font-bold rounded text-xs ${params.data.Durum ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {params.data.Durum ? 'İşten Çıkar' : 'İşe Al'}
          </button>
        </div>
      )
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    filter: true, sortable: true, resizable: true, 
    cellStyle: { borderRight: '1px solid #cbd5e1' }, 
    headerClass: 'border-r border-slate-300' 
  }), []);

  useEffect(() => {
    let interval;
    if (hasSearched) {
      interval = setInterval(async () => {
        try { const response = await api.get('/users', { params: filters }); setUsers(response.data); } catch (err) {}
      }, 3000); 
    }
    return () => clearInterval(interval);
  }, [hasSearched, filters]); 

  return (
    <div className="space-y-8 relative">
      
      {/* ---------------- MODALLAR ---------------- */}
      {showExitModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-red-600 mb-2">İşten Çıkış / Pasife Al</h3>
            <form onSubmit={handleExitSubmit} className="space-y-4 mt-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">İşten Çıkış Tarihi *</label><input type="date" name="cikis_tarihi" value={exitData.cikis_tarihi} onChange={handleExitChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Nedeni (Opsiyonel)</label><textarea name="cikis_nedeni" value={exitData.cikis_nedeni} onChange={handleExitChange} rows="3" className="w-full px-3 py-2 border rounded-lg outline-none resize-none"></textarea></div>
              <div className="flex justify-end space-x-3 mt-6"><button type="button" onClick={() => setShowExitModal(false)} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200">İptal</button><button type="submit" className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Onayla ve Kapat</button></div>
            </form>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Kapı Geçiş Yetkileri</h3>
            <p className="text-sm text-slate-600 mb-4"><span className="font-bold">{authData.user?.Ad_Soyad}</span> için izinli kapıları seçin.</p>
            <form onSubmit={handleAuthSubmit}>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-2 mb-4 bg-slate-50">
                {authData.allDoors.map(door => (
                  <label key={door.ID} className="flex items-center p-3 hover:bg-white cursor-pointer border-b border-slate-200 last:border-0 rounded transition-colors">
                    <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={authData.selectedDoors.includes(door.ID)} onChange={() => {
                        setAuthData(prev => ({...prev, selectedDoors: prev.selectedDoors.includes(door.ID) ? prev.selectedDoors.filter(id => id !== door.ID) : [...prev.selectedDoors, door.ID]}));
                    }}/>
                    <span className="ml-3 text-sm font-bold text-slate-700">{door.Kapi_Adi}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end space-x-3"><button type="button" onClick={() => setShowAuthModal(false)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg">İptal</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg">Kaydet</button></div>
            </form>
          </div>
        </div>
      )}

      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Bireysel Vardiya Ataması</h3>
            <p className="text-sm text-slate-600 mb-4"><span className="font-bold">{shiftData.user?.Ad_Soyad}</span> adlı personelin vardiyasını belirleyin.</p>
            <form onSubmit={handleShiftSubmit}>
              <select className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={shiftData.selectedShiftId} onChange={(e) => setShiftData({...shiftData, selectedShiftId: e.target.value})}>
                <option value="">-- Vardiya Atanmamış --</option>
                {shiftData.allShifts.map(shift => <option key={shift.ID} value={shift.ID}>{shift.Vardiya_Adi}</option>)}
              </select>
              <div className="flex justify-end space-x-3 mt-6"><button type="button" onClick={() => setShowShiftModal(false)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg">İptal</button><button type="submit" className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg">Vardiyayı Kaydet</button></div>
            </form>
          </div>
        </div>
      )}

      {/* TOPLU VARDİYA MODALI */}
      {showBulkShiftModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-amber-600 mb-2">Toplu Vardiya Atama</h3>
            <p className="text-sm text-slate-600 mb-4">Bir departman veya şirketteki tüm personellerin vardiyasını tek tıkla değiştirin.</p>
            <form onSubmit={handleBulkShiftSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Hedef Türü</label>
                  <select className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={bulkShiftData.hedef_turu} onChange={(e) => setBulkShiftData({...bulkShiftData, hedef_turu: e.target.value})}>
                    <option value="Departman">Departman'a Göre</option>
                    <option value="Sirket">Şirket / Taşeron'a Göre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Hedef Adı (Tam Eşleşme)</label>
                  <input type="text" placeholder="Örn: Bilgi İşlem" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={bulkShiftData.hedef_deger} onChange={(e) => setBulkShiftData({...bulkShiftData, hedef_deger: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Atanacak Vardiya</label>
                <select className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={bulkShiftData.vardiya_id} onChange={(e) => setBulkShiftData({...bulkShiftData, vardiya_id: e.target.value})}>
                  <option value="">-- Vardiyaları İptal Et --</option>
                  {bulkShiftData.allShifts.map(shift => <option key={shift.ID} value={shift.ID}>{shift.Vardiya_Adi}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowBulkShiftModal(false)} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200">İptal</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600">Toplu İşlemi Başlat</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ------------------------------------------- */}

      {message.text && <div className={`p-4 rounded-lg text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{message.text}</div>}

      {/* --- YENİ: HIZLI İŞLEM PANELİ (TABLO DIŞI) --- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 md:items-end z-10 relative">
        <div className="flex-1 relative">
          <label className="block text-xs font-bold text-slate-600 mb-1">Hızlı İşlem (İsim veya Sicil No Ara)</label>
          <input 
            type="text" 
            placeholder="Kişiyi bul ve işlemi yap..." 
            value={quickSearch} 
            onChange={handleQuickSearchChange} 
            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
          />
          {quickSuggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl rounded-lg mt-1 left-0 divide-y divide-slate-100">
              {quickSuggestions.map((user) => (
                <li 
                  key={user.ID} 
                  onClick={() => { setQuickSelectedUser(user); setQuickSearch(user.Ad_Soyad); setQuickSuggestions([]); }}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex flex-col"
                >
                  <span className="font-bold text-slate-800 text-sm">{user.Ad_Soyad}</span>
                  <span className="text-slate-500 text-xs">Sicil: {user.Sicil_No} | {user.Departman || 'Departman Yok'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {quickSelectedUser && (
          <div className="flex items-center space-x-2 pb-1">
             <button onClick={() => handleEditClick(quickSelectedUser)} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-sm transition-colors">Düzenle</button>
             <button onClick={() => handleAuthClick(quickSelectedUser)} className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold rounded-lg text-sm transition-colors">Yetkiler</button>
             <button onClick={() => handleShiftClick(quickSelectedUser)} className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-lg text-sm transition-colors">Vardiya</button>
             <button onClick={() => handleToggleStatus(quickSelectedUser)} className={`px-3 py-2 font-bold rounded-lg text-sm transition-colors ${quickSelectedUser.Durum ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                {quickSelectedUser.Durum ? 'Pasife Al' : 'İşe Al'}
             </button>
          </div>
        )}

        <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 pb-1">
           <button onClick={openBulkShiftModal} className="w-full md:w-auto px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-lg text-sm transition-colors">
              Toplu Vardiya Ata
           </button>
        </div>
      </div>
      {/* ------------------------------------------ */}

      {/* EKLEME FORMU */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{isEditing ? 'Personel Düzenle (Listeden / Hızlı Seçimden)' : 'Yeni Personel Kaydı'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-xs font-bold text-slate-500 mb-1">T.C. Kimlik No *</label><input type="text" maxLength="11" name="tc" value={formData.tc} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad *</label><input type="text" name="ad_soyad" value={formData.ad_soyad} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Kurum Sicil No *</label><input type="text" maxLength="11" name="sicil" value={formData.sicil} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">RFID Kart No</label><input type="text" name="rfid" value={formData.rfid} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-slate-50 outline-none" /></div>
          <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Şirket / Taşeron</label><input type="text" name="sirket" value={formData.sirket} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Departman & Görev</label><input type="text" name="departman" value={formData.departman} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">İşe Giriş Tarihi</label><input type="date" name="ise_giris" value={formData.ise_giris} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div className="md:col-span-4 flex justify-end space-x-3 mt-2">
            {isEditing && <button type="button" onClick={cancelEdit} className="px-6 py-2 bg-slate-200 font-bold rounded-lg">İptal Et</button>}
            <button type="submit" className={`px-6 py-2 font-bold rounded-lg text-white ${isEditing ? 'bg-orange-500' : 'bg-slate-900'}`}>{isEditing ? 'Bilgileri Güncelle' : 'Kaydet'}</button>
          </div>
        </form>
      </div>

      {/* PERSONEL ARAMA FİLTRESİ */}
      <form onSubmit={handleFetchData} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div><label className="block text-xs font-bold text-slate-600 mb-1">İşe Giriş (Başlangıç)</label><input type="date" value={filters.baslangic} onChange={(e) => setFilters({...filters, baslangic: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
        <div><label className="block text-xs font-bold text-slate-600 mb-1">İşe Giriş (Bitiş)</label><input type="date" value={filters.bitis} onChange={(e) => setFilters({...filters, bitis: e.target.value})} className="w-full px-3 py-2 text-sm border rounded-lg" /></div>
        <div className="relative">
          <label className="block text-xs font-bold text-slate-600 mb-1">Ad Soyad / Sicil No</label>
          <input type="text" placeholder="Tabloyu filtrele..." value={filters.arama} onChange={handleSearchInputChange} onBlur={() => setTimeout(() => setSuggestions([]), 200)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
        </div>
        <div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 text-white font-bold text-sm rounded-lg">
             {loading ? 'Aranıyor...' : 'Personelleri Listele'}
          </button>
        </div>
      </form>

      {/* AG GRID TABLOSU */}
      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-2 h-[50vh]">
          <div className="p-2 text-sm font-bold text-slate-700">Arama Sonuçları ({users.length} Kayıt)</div>
          <div className="flex-1 w-full h-full">
            <AgGridReact theme={themeQuartz} icons={customIcons} alwaysMultiSort={true} getRowId={(params) => params.data.ID} rowData={users} columnDefs={colDefs} defaultColDef={defaultColDef} localeText={AG_GRID_LOCALE_TR} pagination={true} paginationPageSize={50} domLayout="normal" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;