import { useState, useEffect } from 'react';
import api from '../api/axios';

function PersonnelOperations() {
  // ARAMA STATE'LERİ
  const [arama, setArama] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // SİSTEM VERİLERİ (Kapılar ve Vardiyalar)
  const [allDoors, setAllDoors] = useState([]);
  const [allShifts, setAllShifts] = useState([]);

  // AKTİF İŞLEM MODALI STATE'İ (add, edit, auth, shift, status)
  const [activeModal, setActiveModal] = useState(null);

  // FORM STATE'LERİ
  const [formData, setFormData] = useState({
    ad_soyad: '', rfid: '', tc: '', sicil: '', sirket: '', departman: '', gorev: '', ise_giris: ''
  });
  const [authData, setAuthData] = useState([]);
  const [shiftData, setShiftData] = useState('');
  const [exitData, setExitData] = useState({ cikis_tarihi: new Date().toISOString().split('T')[0], cikis_nedeni: '' });

  // SİSTEM VERİLERİNİ ÇEK
  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const [doorsRes, shiftsRes] = await Promise.all([
          api.get('/doors'),
          api.get('/shifts')
        ]);
        setAllDoors(doorsRes.data.filter(d => d.Durum === 1 || d.Durum === true || d.Durum === null));
        setAllShifts(shiftsRes.data.filter(s => s.Durum === 1 || s.Durum === true));
      } catch (err) {
        console.error("Sistem verileri çekilemedi", err);
      }
    };
    fetchSystemData();
  }, []);

  // ARAMA FONKSİYONU
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setArama(value);
    
    if (value.length >= 2) {
      try {
        const res = await api.get('/users', { params: { arama: value } });
        setSuggestions(res.data.slice(0, 8));
      } catch (err) {}
    } else {
      setSuggestions([]);
    }
  };

  // PERSONEL SEÇİLDİĞİNDE VERİLERİNİ TOPLA
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
        ad_soyad: user.Ad_Soyad || '', 
        rfid: user.RFID_Kart_No?.includes('KART_YOK') ? '' : (user.RFID_Kart_No || ''), 
        tc: user.TC_Kimlik || '', 
        sicil: user.Sicil_No || '', 
        sirket: user.Sirket || '', 
        departman: user.Departman || '', 
        gorev: user.Gorev || '', 
        ise_giris: user.Ise_Giris_Tarihi ? user.Ise_Giris_Tarihi.split('T')[0] : ''
      });
      setAuthData(authRes.data);
      setShiftData(shiftRes.data.vardiya_id || '');
    } catch (err) {
      setMessage({ text: 'Personel detayları alınırken hata oluştu.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- SADECE RAKAM GİRİŞİNE İZİN VEREN FONKSİYON ---
  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    // Harfleri temizler, sadece rakam bırakır
    const onlyNums = value.replace(/[^0-9]/g, ''); 
    setFormData({ ...formData, [name]: onlyNums });
  };

  // --- SUBMIT İŞLEMLERİ ---

  // 1. YENİ PERSONEL EKLEME
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // UZUNLUK KONTROLLERİ
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

  // 2. MEVCUT PERSONELİ DÜZENLEME
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // UZUNLUK KONTROLLERİ
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

      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* ARAMA ÇUBUĞU */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative z-20">
        <label className="block text-sm font-bold text-slate-700 mb-2">İşlem Yapılacak Personeli Ara (Ad Soyad veya Sicil)</label>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Örn: Mert Mak..." 
            value={arama} 
            onChange={handleSearchChange} 
            className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all" 
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl rounded-xl mt-2 left-0 divide-y divide-slate-100 overflow-hidden">
              {suggestions.map((user) => (
                <li 
                  key={user.ID} 
                  onClick={() => handleSelectUser(user)}
                  className="px-5 py-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-800 block text-lg">{user.Ad_Soyad}</span>
                    <span className="text-slate-500 text-sm">Sicil: {user.Sicil_No} | {user.Departman || 'Departman Yok'}</span>
                  </div>
                  {user.Durum ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Aktif</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Pasif</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {loading && <div className="text-sm font-bold text-blue-600 mt-2 animate-pulse">Personel verileri yükleniyor...</div>}
      </div>

      {/* PERSONEL DASHBOARD */}
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

      {/* ---------------- MODALLAR ---------------- */}

      {/* 0. YENİ PERSONEL EKLE MODALI */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-800 mb-4">Yeni Personel Kaydı</h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* YENİ EKLENEN KISIM: handleNumericChange ve minLength Kullanımları */}
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
          </div>
        </div>
      )}
      
      {/* 1. DÜZENLE MODALI */}
      {activeModal === 'edit' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-800 mb-4">Kimlik Bilgilerini Düzenle</h3>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* YENİ EKLENEN KISIM: handleNumericChange ve minLength Kullanımları */}
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
          </div>
        </div>
      )}

      {/* 2. YETKİ MODALI */}
      {activeModal === 'auth' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-slate-800 mb-4">Geçiş İzinleri</h3>
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
          </div>
        </div>
      )}

      {/* 3. VARDİYA MODALI */}
      {activeModal === 'shift' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-black text-slate-800 mb-4">Vardiya Ataması</h3>
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
          </div>
        </div>
      )}

      {/* 4. DURUM (İŞTEN ÇIKIŞ/İŞE ALIM) MODALI */}
      {activeModal === 'status' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className={`text-xl font-black mb-4 ${selectedUser.Durum ? 'text-red-600' : 'text-green-600'}`}>
              {selectedUser.Durum ? 'İşten Çıkış İşlemi' : 'İşe Alım İşlemi'}
            </h3>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              {selectedUser.Durum ? (
                <>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Tarihi *</label><input type="date" value={exitData.cikis_tarihi} onChange={(e) => setExitData({...exitData, cikis_tarihi: e.target.value})} required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Nedeni</label><textarea value={exitData.cikis_nedeni} onChange={(e) => setExitData({...exitData, cikis_nedeni: e.target.value})} rows="3" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 resize-none"></textarea></div>
                </>
              ) : (
                <p className="text-sm font-medium text-slate-600 mb-4">Bu personeli tekrar sisteme dahil etmek istediğinize emin misiniz? (Geçmiş logları korunacaktır).</p>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200">İptal</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-lg ${selectedUser.Durum ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                  {selectedUser.Durum ? 'İlişiği Kes' : 'İşe Al'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default PersonnelOperations;