import { useState, useEffect } from 'react';
import api from '../api/axios';

function Simulation() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const today = new Date();
  const tenDaysAgo = new Date(today);
  tenDaysAgo.setDate(today.getDate() - 10);

  const [formData, setFormData] = useState({
    userAction: 'keep',    
    doorAction: 'keep',    
    logAction: 'overwrite',
    kapiSayisi: 5,
    personelSayisi: 20,
    vardiyaId: '',
    startDateStr: tenDaysAgo.toISOString().split('T')[0],
    endDateStr: today.toISOString().split('T')[0],
    
    // YENİ: Özelleştirilebilir Veriler
    veriKaynagi: 'otomatik', // otomatik | ozel
    customIsimler: '',
    customSoyisimler: '',
    customDepartmanlar: '',
    customKapilar: ''
  });

  const isLogsForced = formData.userAction === 'reset' || formData.doorAction === 'reset';

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const response = await api.get('/shifts');
        const activeShifts = response.data.filter(s => s.Durum === 1 || s.Durum === true);
        setShifts(activeShifts);
        if (activeShifts.length > 0) setFormData(prev => ({ ...prev, vardiyaId: activeShifts[0].ID }));
      } catch (err) {}
    };
    fetchShifts();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vardiyaId) {
      setMessage({ text: 'Lütfen bir vardiya seçin.', type: 'error' }); return;
    }

    if (window.confirm("Gelişmiş ayarlar ve rastgele dağılımlarla simülasyon başlatılacaktır. Onaylıyor musunuz?")) {
      setLoading(true); setMessage({ text: '', type: '' });
      
      // Sadece 'ozel' seçiliyse textarealardaki verileri gönder
      const payload = { ...formData };
      if (payload.veriKaynagi === 'otomatik') {
        payload.customIsimler = ''; payload.customSoyisimler = ''; 
        payload.customDepartmanlar = ''; payload.customKapilar = '';
      }

      try {
        const response = await api.post('/seeder/run', payload);
        setMessage({ text: response.data.message, type: 'success' });
      } catch (err) {
        setMessage({ text: err.response?.data?.message || 'İşlem başarısız oldu.', type: 'error' });
      } finally {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="space-y-8 mt-8 animate-fade-in-up pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gelişmiş Veri Simülatörü</h2>
        <p className="text-slate-500 text-sm mt-1">Sisteme yeni veriler ilave edin, rastgele hatalı geçişler ve asimetrik yetkilerle gerçeğe en yakın test ortamını yaratın.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ADIM 1: SIFIRLAMA VEYA İLAVE ETME */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span>
            Veritabanı Müdahale Ayarları
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">Personel İşlemi</label>
              <select name="userAction" value={formData.userAction} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="keep">Mevcut Personelleri Kullan (Değiştirme)</option>
                <option value="append">Sisteme Yeni Personeller İlave Et (+Ekle)</option>
                <option value="reset">Tümünü Sil ve Baştan Üret (Sıfırla)</option>
              </select>
              {formData.userAction !== 'keep' && (
                <div className="mt-4 flex items-center bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 w-full px-2">Kaç kişi üretilecek?</span>
                  <input type="number" name="personelSayisi" value={formData.personelSayisi} onChange={handleChange} min="1" className="w-24 px-3 py-1 border rounded focus:ring-2 outline-none" />
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">Kapı & Yetki İşlemi</label>
              <select name="doorAction" value={formData.doorAction} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="keep">Mevcut Kapıları Kullan</option>
                <option value="append">Yeni Kapılar İlave Et (+Ekle)</option>
                <option value="reset">Tümünü Sil ve Baştan Üret (Sıfırla)</option>
              </select>
              {formData.doorAction !== 'keep' && (
                <div className="mt-4 flex items-center bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 w-full px-2">Kaç kapı üretilecek?</span>
                  <input type="number" name="kapiSayisi" value={formData.kapiSayisi} onChange={handleChange} min="1" className="w-24 px-3 py-1 border rounded focus:ring-2 outline-none" />
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2 font-bold">* Sistem, kapı yetkilerini otomatik ve asimetrik (rastgele) olarak dağıtacaktır.</p>
            </div>

            <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2">Geçiş Logları İşlemi</label>
              <select name="logAction" value={formData.logAction} onChange={handleChange} disabled={isLogsForced} className="w-full px-4 py-3 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50">
                {isLogsForced ? (
                  <option value="reset_all">MECBURİ: Tablolar sıfırlandığı için tüm loglar silinecek</option>
                ) : (
                  <>
                    <option value="overwrite">Seçili Tarihteki Logları Yenile</option>
                    <option value="append">Seçili Tarihte Eski Loglara İlave Et</option>
                    <option value="reset_all">Veritabanındaki TÜM geçmiş logları sil</option>
                  </>
                )}
              </select>
              <p className="text-[10px] text-blue-700 mt-2 font-bold">* Yeni nesil simülasyon, daha gerçekçi olması için aralara geç kalma, fazla mesai ve %5 ihtimalle hatalı kart okutma (yetkisiz geçiş) logları ekleyecektir.</p>
            </div>
          </div>
        </div>

        {/* YENİ ADIM: VERİ KAYNAĞI ÖZELLEŞTİRME */}
        {(formData.userAction !== 'keep' || formData.doorAction !== 'keep') && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-4">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 text-sm">2</span>
              Veri Havuzu Seçimi
            </h3>
            
            <div className="mb-6 flex space-x-4 border-b border-slate-100 pb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="veriKaynagi" value="otomatik" checked={formData.veriKaynagi === 'otomatik'} onChange={handleChange} className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-slate-700 text-sm">Genişletilmiş Otomatik Verileri Kullan</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="veriKaynagi" value="ozel" checked={formData.veriKaynagi === 'ozel'} onChange={handleChange} className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-slate-700 text-sm">Kendi Özel Listemi Girmek İstiyorum</span>
              </label>
            </div>

            {formData.veriKaynagi === 'ozel' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                {formData.userAction !== 'keep' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">İsim Listesi (Virgülle Ayırın)</label>
                      <textarea name="customIsimler" value={formData.customIsimler} onChange={handleChange} placeholder="Örn: Aslı, Kenan, Berk..." rows="2" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Soyisim Listesi (Virgülle Ayırın)</label>
                      <textarea name="customSoyisimler" value={formData.customSoyisimler} onChange={handleChange} placeholder="Örn: Güler, Koç, Şen..." rows="2" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Departman Listesi (Virgülle Ayırın)</label>
                      <input type="text" name="customDepartmanlar" value={formData.customDepartmanlar} onChange={handleChange} placeholder="Örn: Ar-Ge, Pazarlama, Yönetim..." className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                    </div>
                  </>
                )}
                
                {formData.doorAction !== 'keep' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Kapılar ve Türleri (Virgülle Ayırın)</label>
                    <textarea name="customKapilar" value={formData.customKapilar} onChange={handleChange} placeholder="Örn: Zemin Giriş - Ana Giriş, Arge Odası - İç Geçiş, Yemekhane - Yemekhane Giriş..." rows="2" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"></textarea>
                    <p className="text-[10px] text-slate-400 mt-1">Özel tür belirtmek için "Kapı Adı - Kapı Türü" formatını kullanabilirsiniz. Tür belirtilmezse otomatik "İç Geçiş" sayılır.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ZAMAN VE VARDİYA AYARLARI */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 text-sm">{(formData.userAction !== 'keep' || formData.doorAction !== 'keep') ? '3' : '2'}</span>
            Zaman ve Vardiya Ayarları
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-2">Simülasyon Hangi Vardiyaya Göre Üretilsin?</label>
              <select name="vardiyaId" value={formData.vardiyaId} onChange={handleChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 font-bold text-slate-700">
                {shifts.map(s => <option key={s.ID} value={s.ID}>{s.Vardiya_Adi} (ID: {s.ID})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Başlangıç Tarihi</label>
              <input type="date" name="startDateStr" value={formData.startDateStr} onChange={handleChange} required className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Bitiş Tarihi</label>
              <input type="date" name="endDateStr" value={formData.endDateStr} onChange={handleChange} required className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
            </div>
          </div>
        </div>

        {/* BAŞLAT BUTONU */}
        <div className="flex justify-end mt-4">
          <button type="submit" disabled={loading || shifts.length === 0} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-xl transition-all shadow-xl disabled:opacity-50 flex items-center">
            {loading ? 'Simülasyon İşleniyor...' : 'Gelişmiş Simülasyonu Başlat'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default Simulation;