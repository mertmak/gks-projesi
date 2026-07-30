import { useState, useEffect } from 'react';
import api from '../api/axios';

function BulkOperations() {
  const [hedefTuru, setHedefTuru] = useState('Departman');
  const [hedefDeger, setHedefDeger] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const [islemTuru, setIslemTuru] = useState('vardiya'); 
  const [vardiyaId, setVardiyaId] = useState('');
  const [allShifts, setAllShifts] = useState([]);
  
  const [allDoors, setAllDoors] = useState([]);
  const [selectedDoors, setSelectedDoors] = useState([]);

  const [durumHedefi, setDurumHedefi] = useState(0); 
  const [exitData, setExitData] = useState({ 
    cikis_tarihi: new Date().toISOString().split('T')[0], 
    cikis_nedeni: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const [shiftsRes, doorsRes] = await Promise.all([
          api.get('/shifts'),
          api.get('/doors')
        ]);
        setAllShifts(shiftsRes.data.filter(s => s.Durum === 1 || s.Durum === true));
        setAllDoors(doorsRes.data.filter(d => d.Durum === 1 || d.Durum === true || d.Durum === null));
      } catch (err) {
        console.error("Sistem verileri çekilemedi", err);
      }
    };
    fetchSystemData();
  }, []);

  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setHedefDeger(value);

    if (value.length >= 2) {
      try {
        const res = await api.get('/users', { params: { arama: value } });
        const grouped = {};
        res.data.forEach(user => {
          const key = hedefTuru === 'Departman' ? user.Departman : user.Sirket;
          if (key) { 
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(user.Ad_Soyad);
          }
        });

        const suggestionList = Object.keys(grouped).map(key => ({
          name: key,
          sampleUsers: grouped[key].slice(0, 2).join(', ') + (grouped[key].length > 2 ? '...' : '')
        }));

        if (suggestionList.length === 0) {
          suggestionList.push({ name: value, sampleUsers: 'Yeni/Eşleşmeyen Değer' });
        }

        setSuggestions(suggestionList.slice(0, 5)); 
      } catch (err) {
        console.error("Öneriler çekilemedi:", err);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleDoorSelection = (doorId) => {
    setSelectedDoors(prev => 
      prev.includes(doorId) ? prev.filter(id => id !== doorId) : [...prev, doorId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Tümü seçilmediyse ve değer girilmediyse uyarı ver
    if (hedefTuru !== 'Tumu' && !hedefDeger.trim()) {
      setMessage({ text: 'Lütfen bir hedef adı (Departman/Şirket) giriniz.', type: 'error' });
      return;
    }

    let islemAdi = islemTuru === 'vardiya' ? 'vardiyası' : (islemTuru === 'yetki' ? 'kapı yetkileri' : 'sistem giriş durumları');
    
    // Dinamik Onay Mesajı
    const hedefMetni = hedefTuru === 'Tumu' 
      ? 'SİSTEMDEKİ TÜM AKTİF' 
      : `"${hedefDeger}" isimli ${hedefTuru === 'Departman' ? 'departmandaki' : 'şirketteki/taşerondaki'} TÜM`;
      
    const uyariMesaji = `DİKKAT: ${hedefMetni} personellerin ${islemAdi} güncellenecektir. Onaylıyor musunuz?`;
    
    if (window.confirm(uyariMesaji)) {
      setLoading(true);
      setMessage({ text: '', type: '' });
      
      try {
        let res;
        if (islemTuru === 'vardiya') {
          res = await api.post('/users/bulk/shift', { 
            hedef_turu: hedefTuru, hedef_deger: hedefDeger.trim(), vardiya_id: vardiyaId 
          });
          setVardiyaId('');
        }
        else if (islemTuru === 'yetki') {
          res = await api.post('/users/bulk/doors', { 
            hedef_turu: hedefTuru, hedef_deger: hedefDeger.trim(), doorIds: selectedDoors 
          });
          setSelectedDoors([]);
        }
        else if (islemTuru === 'durum') {
          res = await api.post('/users/bulk/status', { 
            hedef_turu: hedefTuru, 
            hedef_deger: hedefDeger.trim(), 
            durum: durumHedefi,
            cikis_tarihi: exitData.cikis_tarihi,
            cikis_nedeni: exitData.cikis_nedeni
          });
          setExitData({ cikis_tarihi: new Date().toISOString().split('T')[0], cikis_nedeni: '' });
        }

        setMessage({ text: res.data.message, type: 'success' });
        setHedefDeger('');
        
      } catch (err) {
        setMessage({ text: err.response?.data?.message || "Toplu işlem başarısız oldu.", type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 mt-8 relative animate-fade-in-up">
      
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Toplu İşlem Merkezi</h2>
        <p className="text-slate-500 text-sm mt-1">Belirli bir gruba veya sistemdeki tüm personellere ait vardiya, yetki ve durum bilgilerini tek tıklamayla yönetin.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. ADIM: HEDEF BELİRLEME */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span>
              Hedef Kitleyi Seçin
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Filtreleme Türü</label>
                <select 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={hedefTuru} 
                  onChange={(e) => {
                    setHedefTuru(e.target.value);
                    setHedefDeger('');
                    setSuggestions([]);
                  }}
                >
                  <option value="Tumu">Tüm Aktif Personeller</option>
                  <option value="Departman">Departmana Göre</option>
                  <option value="Sirket">Şirket / Taşerona Göre</option>
                </select>
              </div>
              
              {/* Tümü seçiliyse arama kutusunu gizle */}
              {hedefTuru !== 'Tumu' && (
                <div className="relative z-50 animate-fade-in-up">
                  <label className="block text-sm font-bold text-slate-700 mb-2">{hedefTuru} Adı veya Personel Ara</label>
                  <input 
                    type="text" 
                    placeholder={`İsim veya ${hedefTuru === 'Departman' ? 'Departman' : 'Şirket'} yazın...`} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all" 
                    value={hedefDeger} 
                    onChange={handleSearchInputChange}
                    onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                    required 
                  />
                  
                  {suggestions.length > 0 && (
                    <ul className="absolute w-full bg-white border border-slate-200 shadow-2xl rounded-xl mt-2 left-0 divide-y divide-slate-100 overflow-hidden">
                      {suggestions.map((item, idx) => (
                        <li 
                          key={idx} 
                          onClick={() => { setHedefDeger(item.name); setSuggestions([]); }}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors"
                        >
                          <span className="font-bold text-slate-800 text-sm">Hedef: {item.name}</span>
                          <span className="text-slate-500 text-xs italic mt-1">Örnek: {item.sampleUsers}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. ADIM: İŞLEM BELİRLEME VE DETAYLAR */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 relative z-10">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3 text-sm">2</span>
              Yapılacak İşlemi Seçin
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">İşlem Türü</label>
                <select 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  value={islemTuru} onChange={(e) => setIslemTuru(e.target.value)}
                >
                  <option value="vardiya">Toplu Vardiya Atama / Değiştirme</option>
                  <option value="yetki">Toplu Kapı Yetkisi Verme</option>
                  <option value="durum">Toplu Durum (İşten Çıkış / İşe Alım)</option>
                </select>
              </div>

              {/* DİNAMİK FORM ALANI - VARDİYA */}
              {islemTuru === 'vardiya' && (
                <div className="animate-fade-in-up">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Atanacak Vardiya</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white" 
                    value={vardiyaId} onChange={(e) => setVardiyaId(e.target.value)}
                  >
                    <option value="">-- Tüm Vardiyaları İptal Et (Sıfırla) --</option>
                    {allShifts.map(shift => <option key={shift.ID} value={shift.ID}>{shift.Vardiya_Adi}</option>)}
                  </select>
                </div>
              )}

              {/* DİNAMİK FORM ALANI - YETKİ */}
              {islemTuru === 'yetki' && (
                <div className="animate-fade-in-up col-span-1 md:col-span-2 mt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-3">İzin Verilecek Kapıları Seçin (Hiç seçilmezse mevcut tüm yetkiler silinir)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                    {allDoors.map(door => (
                      <label key={door.ID} className="flex items-center p-2 hover:bg-slate-50 cursor-pointer rounded transition-colors border border-transparent hover:border-slate-200">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                          checked={selectedDoors.includes(door.ID)} 
                          onChange={() => handleDoorSelection(door.ID)}
                        />
                        <span className="ml-3 text-sm font-bold text-slate-700">{door.Kapi_Adi}</span>
                      </label>
                    ))}
                    {allDoors.length === 0 && <div className="text-sm text-slate-500 col-span-full">Aktif kapı bulunamadı.</div>}
                  </div>
                </div>
              )}

              {/* DİNAMİK FORM ALANI - DURUM */}
              {islemTuru === 'durum' && (
                <div className="animate-fade-in-up space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hedef Durum</label>
                    <select 
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 bg-white text-red-600 font-bold" 
                      value={durumHedefi} onChange={(e) => setDurumHedefi(Number(e.target.value))}
                    >
                      <option value={0}>Toplu İşten Çıkarma / Pasife Alma</option>
                      <option value={1} className="text-green-600">Toplu İşe Alım / Aktifleştirme</option>
                    </select>
                  </div>

                  {durumHedefi === 0 && (
                    <div className="grid grid-cols-1 gap-4 bg-red-50 p-4 rounded-xl border border-red-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Toplu Çıkış Tarihi *</label>
                        <input type="date" value={exitData.cikis_tarihi} onChange={(e) => setExitData({...exitData, cikis_tarihi: e.target.value})} required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Toplu Çıkış Nedeni (Opsiyonel)</label>
                        <textarea rows="2" value={exitData.cikis_nedeni} onChange={(e) => setExitData({...exitData, cikis_nedeni: e.target.value})} placeholder="Örn: Proje Bitişi" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 resize-none"></textarea>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* 3. ADIM: ONAY VE ÇALIŞTIRMA */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button 
              type="submit" 
              disabled={loading}
              className={`px-8 py-4 text-white font-bold text-lg rounded-xl transition-colors shadow-lg disabled:opacity-50 ${islemTuru === 'durum' && durumHedefi === 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {loading ? 'İşleniyor...' : 'Toplu İşlemi Başlat'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default BulkOperations;