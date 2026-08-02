import { useState, useEffect } from 'react';
import api from '../api/axios';

// ORTAK BİLEŞENLER
import AutocompleteSearch from '../components/AutocompleteSearch';
import Modal from '../components/Modal'; // YENİ: Modal bileşeni
import AlertMessage from '../components/AlertMessage';

function PersonnelOperations() {
  const [arama, setArama] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [allDoors, setAllDoors] = useState([]);
  const [allShifts, setAllShifts] = useState([]);

  // AKTİF İŞLEM MODALI STATE'İ (add, edit, auth, shift, status)
  const [activeModal, setActiveModal] = useState(null);

  const [formData, setFormData] = useState({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
  const [authData, setAuthData] = useState([]);
  const [shiftData, setShiftData] = useState('');
  const [exitData, setExitData] = useState({ cikis_tarihi: new Date().toISOString().split('T')[0], cikis_nedeni: '' });

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const [doorsRes, shiftsRes] = await Promise.all([ api.get('/doors'), api.get('/shifts') ]);
        setAllDoors(doorsRes.data.filter(d => d.Durum === 1 || d.Durum === true || d.Durum === null));
        setAllShifts(shiftsRes.data.filter(s => s.Durum === 1 || s.Durum === true));
      } catch (err) {
        console.error("Sistem verileri çekilemedi", err);
      }
    };
    fetchSystemData();
  }, []);

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setArama(value);
    
    if (value.length >= 2) {
      try {
        const res = await api.get('/users', { params: { arama: value } });
        const formattedSuggestions = res.data.map(user => ({
           label: user.Ad_Soyad,
           subLabel: `Sicil: ${user.Sicil_No} | ${user.Departman || 'Departman Yok'} - ${user.Durum ? 'Aktif' : 'Pasif'}`,
           value: user.Ad_Soyad,
           originalData: user 
        }));
        setSuggestions(formattedSuggestions.slice(0, 8));
      } catch (err) {}
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectUser = async (user) => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    setArama('');
    setSuggestions([]);
    
    try {
      const [authRes, shiftRes] = await Promise.all([
        api.get(`/users/${user.ID}/doors`),
        api.get(`/users/${user.ID}/shift`)
      ]);
      
      setSelectedUser(user);
      setFormData({
        ad_soyad: user.Ad_Soyad || '', rfid: user.RFID_Kart_No?.includes('KART_YOK') ? '' : (user.RFID_Kart_No || ''), tc: user.TC_Kimlik || '', sicil: user.Sicil_No || '', sirket: user.Sirket || '', departman: user.Departman || '', gorev: user.Gorev || '', ise_giris: user.Ise_Giris_Tarihi ? user.Ise_Giris_Tarihi.split('T')[0] : ''
      });
      setAuthData(authRes.data);
      setShiftData(shiftRes.data.vardiya_id || '');
    } catch (err) {
      setMessage({ text: 'Personel detayları alınırken hata oluştu.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    const onlyNums = value.replace(/[^0-9]/g, ''); 
    setFormData({ ...formData, [name]: onlyNums });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    if (formData.tc.length !== 11) return setMessage({ text: 'HATA: TC Kimlik No tam 11 haneli olmalıdır.', type: 'error' });
    if (formData.sicil.length !== 5) return setMessage({ text: 'HATA: Sicil No tam 5 haneli olmalıdır.', type: 'error' });
    if (formData.rfid && formData.rfid.length !== 11) return setMessage({ text: 'HATA: RFID Kart No tam 11 haneli olmalıdır.', type: 'error' });

    try {
      await api.post('/users', formData);
      setMessage({ text: 'Yeni personel başarıyla sisteme kaydedildi.', type: 'success' });
      setActiveModal(null);
      setFormData({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
    } catch (err) { 
      setMessage({ text: err.response?.data?.message || 'Kayıt başarısız oldu.', type: 'error' }); 
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    if (formData.tc.length !== 11) return setMessage({ text: 'HATA: TC Kimlik No tam 11 haneli olmalıdır.', type: 'error' });
    if (formData.sicil.length !== 5) return setMessage({ text: 'HATA: Sicil No tam 5 haneli olmalıdır.', type: 'error' });
    if (formData.rfid && formData.rfid.length !== 11) return setMessage({ text: 'HATA: RFID Kart No tam 11 haneli olmalıdır.', type: 'error' });

    try {
      await api.put(`/users/${selectedUser.ID}`, formData);
      setMessage({ text: 'Kimlik bilgileri güncellendi.', type: 'success' });
      setSelectedUser({ ...selectedUser, ...formData });
      setActiveModal(null);
    } catch (err) { 
      setMessage({ text: err.response?.data?.message || 'Güncelleme başarısız.', type: 'error' }); 
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${selectedUser.ID}/doors`, { doorIds: authData });
      setMessage({ text: 'Kapı yetkileri güncellendi.', type: 'success' });
      setActiveModal(null);
    } catch (err) { setMessage({ text: 'Yetki ataması başarısız.', type: 'error' }); }
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${selectedUser.ID}/shift`, { vardiya_id: shiftData });
      setMessage({ text: 'Vardiya başarıyla atandı.', type: 'success' });
      setActiveModal(null);
    } catch (err) { setMessage({ text: 'Vardiya ataması başarısız.', type: 'error' }); }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedUser.Durum) {
        await api.patch(`/users/${selectedUser.ID}/status`, { durum: 0, cikis_tarihi: exitData.cikis_tarihi, cikis_nedeni: exitData.cikis_nedeni, ad_soyad: selectedUser.Ad_Soyad, sicil: selectedUser.Sicil_No });
        setMessage({ text: 'Personel başarıyla işten çıkarıldı.', type: 'success' });
        setSelectedUser({ ...selectedUser, Durum: false });
      } else {
        await api.patch(`/users/${selectedUser.ID}/status`, { durum: 1, ad_soyad: selectedUser.Ad_Soyad, sicil: selectedUser.Sicil_No });
        setMessage({ text: 'Personel başarıyla işe alındı.', type: 'success' });
        setSelectedUser({ ...selectedUser, Durum: true });
      }
      setActiveModal(null);
    } catch (err) { setMessage({ text: 'Durum güncellemesi başarısız.', type: 'error' }); }
  };

  return (
    <div className="space-y-6 mt-8 relative">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Personel İşlem Merkezi</h2>
          <p className="text-slate-500 text-sm mt-1">Personeli arayın veya sisteme yeni personel kaydı gerçekleştirin.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: '' });
            setActiveModal('add');
          }}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors flex items-center space-x-2 whitespace-nowrap"
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
           <span>Yeni Personel Ekle</span>
        </button>
      </div>

      <AlertMessage message={message.text} type={message.type} />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative z-20">
        <AutocompleteSearch 
           label="İşlem Yapılacak Personeli Ara (Ad Soyad veya Sicil)"
           placeholder="Örn: Mert Mak..."
           value={arama}
           onChange={handleSearchChange}
           suggestions={suggestions}
           onSelect={(item) => handleSelectUser(item.originalData)}
        />
        {loading && <div className="text-sm font-bold text-blue-600 mt-2 animate-pulse">Personel verileri yükleniyor...</div>}
      </div>

      {selectedUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800">{selectedUser.Ad_Soyad}</h3>
            <p className="text-slate-500 font-medium mb-4">{selectedUser.Departman || 'Departman Belirtilmedi'}</p>
            
            <div className="w-full space-y-2 text-sm text-left">
              <div className="flex justify-between p-2 bg-slate-50 rounded"><span className="text-slate-500 font-bold">Sicil No</span><span className="font-mono font-bold">{selectedUser.Sicil_No}</span></div>
              <div className="flex justify-between p-2 bg-slate-50 rounded"><span className="text-slate-500 font-bold">T.C. Kimlik</span><span className="font-mono font-bold">{selectedUser.TC_Kimlik}</span></div>
              <div className="flex justify-between p-2 bg-slate-50 rounded"><span className="text-slate-500 font-bold">Durum</span>
                {selectedUser.Durum ? <span className="text-green-600 font-bold">AKTİF ÇALIŞAN</span> : <span className="text-red-600 font-bold">İŞTEN ÇIKARILMIŞ</span>}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div onClick={() => setActiveModal('edit')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-slate-800">Kimlik Bilgileri</h4>
              <p className="text-sm text-slate-500 mt-1">Personelin departman, görev, kart numarası veya TC bilgilerini güncelleyin.</p>
            </div>

            <div onClick={() => setActiveModal('auth')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-400 hover:shadow-md cursor-pointer transition-all group">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-slate-800">Kapı Geçiş Yetkileri</h4>
              <p className="text-sm text-slate-500 mt-1">Giriş yapabileceği kapıları ve alanları yönetin.</p>
            </div>

            <div onClick={() => setActiveModal('shift')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all group">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-slate-800">Vardiya & Çalışma Saati</h4>
              <p className="text-sm text-slate-500 mt-1">Personelin bağlı olduğu vardiyayı atayın veya değiştirin.</p>
            </div>

            <div onClick={() => setActiveModal('status')} className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all group ${selectedUser.Durum ? 'hover:border-red-400' : 'hover:border-green-400'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${selectedUser.Durum ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-slate-800">{selectedUser.Durum ? 'İşten Çıkar / Pasife Al' : 'Tekrar İşe Al / Aktifleştir'}</h4>
              <p className="text-sm text-slate-500 mt-1">Personelin sistemdeki varlığını ve geçiş haklarını durdurur veya açar.</p>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALLAR --- */}
      <Modal isOpen={activeModal === 'add'} onClose={() => setActiveModal(null)} title="Yeni Personel Kaydı" maxWidth="max-w-4xl">
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold text-slate-500 mb-1">T.C. Kimlik No (11 Hane)*</label><input type="text" maxLength="11" minLength="11" name="tc" value={formData.tc || ''} onChange={handleNumericChange} required placeholder="11 haneli sayı" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad *</label><input type="text" name="ad_soyad" value={formData.ad_soyad || ''} onChange={(e) => setFormData({...formData, ad_soyad: e.target.value})} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Kurum Sicil No (5 Hane)*</label><input type="text" maxLength="5" minLength="5" name="sicil" value={formData.sicil || ''} onChange={handleNumericChange} required placeholder="5 haneli sayı" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">RFID Kart No (11 Hane)</label><input type="text" maxLength="11" minLength="11" name="rfid" value={formData.rfid || ''} onChange={handleNumericChange} placeholder="11 haneli sayı" className="w-full px-3 py-2 border rounded-lg bg-slate-50 outline-none font-mono" /></div>
          
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Şirket / Taşeron</label><input type="text" name="sirket" value={formData.sirket || ''} onChange={(e) => setFormData({...formData, sirket: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Departman & Görev</label><input type="text" name="departman" value={formData.departman || ''} onChange={(e) => setFormData({...formData, departman: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">İşe Giriş Tarihi</label><input type="date" name="ise_giris" value={formData.ise_giris || ''} onChange={(e) => setFormData({...formData, ise_giris: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
            <button type="button" onClick={() => setActiveModal(null)} className="px-6 py-2 bg-slate-200 font-bold rounded-lg hover:bg-slate-300">İptal</button>
            <button type="submit" className="px-6 py-2 font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800">Personeli Kaydet</button>
          </div>
        </form>
      </Modal>
      
      <Modal isOpen={activeModal === 'edit'} onClose={() => setActiveModal(null)} title="Kimlik Bilgilerini Düzenle" maxWidth="max-w-4xl">
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold text-slate-500 mb-1">T.C. Kimlik No (11 Hane)*</label><input type="text" maxLength="11" minLength="11" name="tc" value={formData.tc || ''} onChange={handleNumericChange} required placeholder="11 haneli sayı" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad *</label><input type="text" name="ad_soyad" value={formData.ad_soyad || ''} onChange={(e) => setFormData({...formData, ad_soyad: e.target.value})} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Kurum Sicil No (5 Hane)*</label><input type="text" maxLength="5" minLength="5" name="sicil" value={formData.sicil || ''} onChange={handleNumericChange} required placeholder="5 haneli sayı" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">RFID Kart No (11 Hane)</label><input type="text" maxLength="11" minLength="11" name="rfid" value={formData.rfid || ''} onChange={handleNumericChange} placeholder="11 haneli sayı" className="w-full px-3 py-2 border rounded-lg bg-slate-50 outline-none font-mono" /></div>
          
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Şirket / Taşeron</label><input type="text" name="sirket" value={formData.sirket || ''} onChange={(e) => setFormData({...formData, sirket: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">Departman & Görev</label><input type="text" name="departman" value={formData.departman || ''} onChange={(e) => setFormData({...formData, departman: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" /></div>
          <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
            <button type="button" onClick={() => setActiveModal(null)} className="px-6 py-2 bg-slate-200 font-bold rounded-lg hover:bg-slate-300">İptal</button>
            <button type="submit" className="px-6 py-2 font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700">Değişiklikleri Kaydet</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'auth'} onClose={() => setActiveModal(null)} title="Geçiş İzinleri" maxWidth="max-w-md">
        <form onSubmit={handleAuthSubmit}>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2 mb-4 bg-slate-50">
            {allDoors.map(door => (
              <label key={door.ID} className="flex items-center p-3 hover:bg-white cursor-pointer border-b border-slate-200 last:border-0 rounded transition-colors">
                <input type="checkbox" className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                  checked={authData.includes(door.ID)} 
                  onChange={() => {
                    setAuthData(prev => prev.includes(door.ID) ? prev.filter(id => id !== door.ID) : [...prev, door.ID]);
                }}/>
                <span className="ml-3 text-sm font-bold text-slate-700">{door.Kapi_Adi}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg hover:bg-slate-300">İptal</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700">Yetkileri Kaydet</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'shift'} onClose={() => setActiveModal(null)} title="Vardiya Ataması" maxWidth="max-w-md">
        <form onSubmit={handleShiftSubmit}>
          <select className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none mb-6" 
            value={shiftData} onChange={(e) => setShiftData(e.target.value)}>
            <option value="">-- Vardiya Atanmamış --</option>
            {allShifts.map(shift => <option key={shift.ID} value={shift.ID}>{shift.Vardiya_Adi}</option>)}
          </select>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg hover:bg-slate-300">İptal</button>
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600">Vardiyayı Kaydet</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'status'} onClose={() => setActiveModal(null)} title={selectedUser?.Durum ? 'İşten Çıkış İşlemi' : 'İşe Alım İşlemi'} maxWidth="max-w-md">
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          {selectedUser?.Durum ? (
            <>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Tarihi *</label><input type="date" value={exitData.cikis_tarihi} onChange={(e) => setExitData({...exitData, cikis_tarihi: e.target.value})} required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Nedeni</label><textarea value={exitData.cikis_nedeni} onChange={(e) => setExitData({...exitData, cikis_nedeni: e.target.value})} rows="3" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 resize-none"></textarea></div>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-600 mb-4">Bu personeli tekrar sisteme dahil etmek istediğinize emin misiniz? (Geçmiş logları korunacaktır).</p>
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200">İptal</button>
            <button type="submit" className={`px-4 py-2 text-white font-bold rounded-lg ${selectedUser?.Durum ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
              {selectedUser?.Durum ? 'İlişiği Kes' : 'İşe Al'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default PersonnelOperations;