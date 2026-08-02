import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../api/socket';

// ORTAK BİLEŞENLER
import CustomDataGrid from '../components/CustomDataGrid';
import AutocompleteSearch from '../components/AutocompleteSearch';
import Modal from '../components/Modal'; // YENİ: Modal bileşeni
import AlertMessage from '../components/AlertMessage';

function Users() {
  const [filters, setFilters] = useState({ durum: 'tumu', departman: '', arama: '' });
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  
  const [suggestions, setSuggestions] = useState([]);
  const [deptSuggestions, setDeptSuggestions] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });

  const [showExitModal, setShowExitModal] = useState(false);
  const [exitUser, setExitUser] = useState(null);
  const [exitData, setExitData] = useState({ cikis_tarihi: new Date().toISOString().split('T')[0], cikis_nedeni: '' });
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authData, setAuthData] = useState({ user: null, allDoors: [], selectedDoors: [] });

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftData, setShiftData] = useState({ user: null, allShifts: [], selectedShiftId: '' });

  const [quickSearch, setQuickSearch] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [quickSelectedUser, setQuickSelectedUser] = useState(null);

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

  const handleDeptSearchChange = async (e) => {
    const value = e.target.value;
    setFilters({ ...filters, departman: value }); 
    if (value.length >= 2) {
      try {
        const response = await api.get('/users', { params: { departman: value } });
        const uniqueDepts = [...new Set(response.data.map(u => u.Departman).filter(d => d && d.trim() !== ''))];
        
        const formattedDepts = uniqueDepts.map(dept => ({
           label: dept,
           value: dept
        }));
        setDeptSuggestions(formattedDepts.slice(0, 5)); 
      } catch (err) {}
    } else {
      setDeptSuggestions([]); 
    }
  };
 
  const handleFetchData = async (e) => {
    e.preventDefault();
    setHasSearched(true);
    setSuggestions([]); 
    setDeptSuggestions([]);
    await fetchUsers();
  };

  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    const onlyNums = value.replace(/[^0-9]/g, ''); 
    setFormData({ ...formData, [name]: onlyNums });
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleExitChange = (e) => setExitData({ ...exitData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (formData.tc.length !== 11) return setMessage({ text: 'HATA: TC Kimlik No tam 11 haneli olmalıdır.', type: 'error' });
    if (formData.sicil.length !== 5) return setMessage({ text: 'HATA: Sicil No tam 5 haneli olmalıdır.', type: 'error' });
    if (formData.rfid && formData.rfid.length !== 11) return setMessage({ text: 'HATA: RFID Kart No tam 11 haneli olmalıdır.', type: 'error' });

    try {
      if (isEditing) {
        await api.put(`/users/${editId}`, formData);
        setMessage({ text: 'Personel başarıyla güncellendi.', type: 'success' });
      } else {
        await api.post('/users', formData);
        setMessage({ text: 'Yeni personel başarıyla kaydedildi.', type: 'success' });
      }
      setFormData({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
      setIsEditing(false);
      setEditId(null);
      setShowAddEditModal(false); 
      
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
    setShowAddEditModal(true); 
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
    setIsEditing(false); 
    setEditId(null);
    setFormData({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
    setMessage({ text: '', type: '' });
    setShowAddEditModal(false); 
  };

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

  const handleQuickSearchChange = async (e) => {
    const value = e.target.value;
    setQuickSearch(value);
    setQuickSelectedUser(null);
    if (value.length >= 2) {
      try {
        const response = await api.get('/users', { params: { arama: value } });
        const formattedSuggestions = response.data.map(user => ({
           label: user.Ad_Soyad,
           subLabel: `Sicil: ${user.Sicil_No} | ${user.Departman || 'Departman Yok'}`,
           value: user.Ad_Soyad,
           originalData: user 
        }));
        setQuickSuggestions(formattedSuggestions.slice(0, 5));
      } catch (err) {}
    } else {
      setQuickSuggestions([]);
    }
  };

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
          <button onClick={() => handleEditClick(params.data)} className="px-2 py-1 bg-blue-50 text-blue-600 font-bold rounded text-xs hover:bg-blue-100 transition-colors">Düzenle</button>
          <button onClick={() => handleAuthClick(params.data)} className="px-2 py-1 bg-purple-50 text-purple-600 font-bold rounded text-xs border border-purple-200 hover:bg-purple-100 transition-colors">Yetkiler</button>
          <button onClick={() => handleShiftClick(params.data)} className="px-2 py-1 bg-amber-50 text-amber-600 font-bold rounded text-xs border border-amber-200 hover:bg-amber-100 transition-colors">Vardiya</button>
          <button onClick={() => handleToggleStatus(params.data)} className={`px-2 py-1 font-bold rounded text-xs transition-colors ${params.data.Durum ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
            {params.data.Durum ? 'İşten Çıkar' : 'İşe Al'}
          </button>
        </div>
      )
    }
  ], []);

  useEffect(() => {
    const refreshUsers = async () => {
      if (!hasSearched) return;
      try { 
        const response = await api.get('/users', { params: filters }); 
        setUsers(response.data); 
      } catch (err) {}
    };

    socket.on('users_updated', refreshUsers);
    return () => { socket.off('users_updated', refreshUsers); };
  }, [hasSearched, filters]);

  return (
    <div className="space-y-6 relative mt-4">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Personel Listesi ve Hızlı İşlemler</h2>
          <p className="text-slate-500 text-sm mt-1">Sistemdeki personelleri arayın, yönetin veya yeni kayıt ekleyin.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditing(false);
            setFormData({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
            setShowAddEditModal(true);
          }}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors flex items-center space-x-2 whitespace-nowrap"
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
           <span>Yeni Personel Ekle</span>
        </button>
      </div>
      
      {/* --- MODALLAR --- */}
      
      <Modal isOpen={showAddEditModal} onClose={cancelEdit} title={isEditing ? 'Personel Düzenle' : 'Yeni Personel Kaydı'} maxWidth="max-w-4xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-xs font-bold text-slate-500 mb-1">T.C. Kimlik No (11 Hane) *</label><input type="text" maxLength="11" minLength="11" name="tc" value={formData.tc} onChange={handleNumericChange} required placeholder="11 haneli sayı" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad *</label><input type="text" name="ad_soyad" value={formData.ad_soyad} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Kurum Sicil No (5 Hane) *</label><input type="text" maxLength="5" minLength="5" name="sicil" value={formData.sicil} onChange={handleNumericChange} required placeholder="5 haneli sayı" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">RFID Kart No (11 Hane)</label><input type="text" maxLength="11" minLength="11" name="rfid" value={formData.rfid} onChange={handleNumericChange} placeholder="11 haneli sayı" className="w-full px-3 py-2 border rounded-lg bg-slate-50 outline-none font-mono tracking-widest" /></div>
          
          <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Şirket / Taşeron</label><input type="text" name="sirket" value={formData.sirket} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Departman & Görev</label><input type="text" name="departman" value={formData.departman} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">İşe Giriş Tarihi</label><input type="date" name="ise_giris" value={formData.ise_giris} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          
          <div className="md:col-span-4 flex justify-end space-x-3 mt-4">
            <button type="button" onClick={cancelEdit} className="px-6 py-2 bg-slate-200 font-bold rounded-lg hover:bg-slate-300">İptal</button>
            <button type="submit" className={`px-6 py-2 font-bold rounded-lg text-white hover:opacity-90 ${isEditing ? 'bg-orange-500' : 'bg-slate-900'}`}>
              {isEditing ? 'Bilgileri Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showExitModal} onClose={() => setShowExitModal(false)} title="İşten Çıkış / Pasife Al" maxWidth="max-w-md">
        <form onSubmit={handleExitSubmit} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-500 mb-1">İşten Çıkış Tarihi *</label><input type="date" name="cikis_tarihi" value={exitData.cikis_tarihi} onChange={handleExitChange} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Nedeni (Opsiyonel)</label><textarea name="cikis_nedeni" value={exitData.cikis_nedeni} onChange={handleExitChange} rows="3" className="w-full px-3 py-2 border rounded-lg outline-none resize-none"></textarea></div>
          <div className="flex justify-end space-x-3 mt-6"><button type="button" onClick={() => setShowExitModal(false)} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200">İptal</button><button type="submit" className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Onayla ve Kapat</button></div>
        </form>
      </Modal>

      <Modal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} title="Kapı Geçiş Yetkileri" maxWidth="max-w-md">
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
      </Modal>

      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title="Bireysel Vardiya Ataması" maxWidth="max-w-md">
        <p className="text-sm text-slate-600 mb-4"><span className="font-bold">{shiftData.user?.Ad_Soyad}</span> adlı personelin vardiyasını belirleyin.</p>
        <form onSubmit={handleShiftSubmit}>
          <select className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={shiftData.selectedShiftId} onChange={(e) => setShiftData({...shiftData, selectedShiftId: e.target.value})}>
            <option value="">-- Vardiya Atanmamış --</option>
            {shiftData.allShifts.map(shift => <option key={shift.ID} value={shift.ID}>{shift.Vardiya_Adi}</option>)}
          </select>
          <div className="flex justify-end space-x-3 mt-6"><button type="button" onClick={() => setShowShiftModal(false)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg">İptal</button><button type="submit" className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg">Vardiyayı Kaydet</button></div>
        </form>
      </Modal>

      <Modal isOpen={showBulkShiftModal} onClose={() => setShowBulkShiftModal(false)} title="Toplu Vardiya Atama" maxWidth="max-w-md">
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
      </Modal>

      <AlertMessage message={message.text} type={message.type} />
      {/* --- HIZLI İŞLEM PANELİ --- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 md:items-end z-20 relative">
        <div className="flex-1">
          <AutocompleteSearch 
            label="Hızlı İşlem (İsim veya Sicil No Ara)"
            placeholder="Kişiyi bul ve işlemi yap..."
            value={quickSearch}
            onChange={handleQuickSearchChange}
            suggestions={quickSuggestions}
            onSelect={(item) => {
              setQuickSelectedUser(item.originalData);
              setQuickSearch(item.value);
              setQuickSuggestions([]);
            }}
          />
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

      <form onSubmit={handleFetchData} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Durum Filtresi</label>
          <select 
            value={filters.durum} 
            onChange={(e) => setFilters({...filters, durum: e.target.value})} 
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="tumu">Tüm Personeller</option>
            <option value="1">Sadece Aktif (Çalışan)</option>
            <option value="0">Sadece Pasif (İşten Çıkan)</option>
          </select>
        </div>
        
        <div className="relative z-50">
          <AutocompleteSearch 
            label="Departman"
            placeholder="Örn: Bilgi İşlem"
            value={filters.departman}
            onChange={handleDeptSearchChange}
            suggestions={deptSuggestions}
            onSelect={(item) => {
              setFilters({...filters, departman: item.value});
              setDeptSuggestions([]);
            }}
          />
        </div>
        
        <div className="relative z-50">
          <AutocompleteSearch 
            label="Ad Soyad / Sicil No / TC"
            placeholder="Tabloyu filtrele..."
            value={filters.arama}
            onChange={handleSearchInputChange}
            suggestions={suggestions}
            onSelect={(item) => {
              setFilters({...filters, arama: item.value});
              setSuggestions([]);
            }}
          />
        </div>
        
        <div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
             {loading ? 'Aranıyor...' : 'Personelleri Listele'}
          </button>
        </div>
      </form>

      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-2 h-[50vh]">
          <div className="p-2 text-sm font-bold text-slate-700">Arama Sonuçları ({users.length} Kayıt)</div>
          <div className="flex-1 w-full h-full">
            <CustomDataGrid 
              rowData={users}
              columnDefs={colDefs}
              getRowId={(params) => params.data.ID}
            />          
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;