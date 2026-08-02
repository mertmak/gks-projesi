/**
 * Personel ekleme ve düzenleme formlarında ortak kullanılan alan grubu.
 * formData ve değiştirici fonksiyonlar prop olarak alınır.
 */
function PersonnelFormFields({ formData, onChange, onNumericChange }) {
  return (
    <>
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">T.C. Kimlik No (11 Hane) *</label>
        <input
          type="text" maxLength="11" minLength="11"
          name="tc" value={formData.tc || ''}
          onChange={onNumericChange} required
          placeholder="11 haneli sayı"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad *</label>
        <input
          type="text" name="ad_soyad" value={formData.ad_soyad || ''}
          onChange={onChange} required
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Kurum Sicil No (5 Hane) *</label>
        <input
          type="text" maxLength="5" minLength="5"
          name="sicil" value={formData.sicil || ''}
          onChange={onNumericChange} required
          placeholder="5 haneli sayı"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">RFID Kart No (11 Hane)</label>
        <input
          type="text" maxLength="11" minLength="11"
          name="rfid" value={formData.rfid || ''}
          onChange={onNumericChange}
          placeholder="11 haneli sayı"
          className="w-full px-3 py-2 border rounded-lg bg-slate-50 outline-none font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Şirket / Taşeron</label>
        <input
          type="text" name="sirket" value={formData.sirket || ''}
          onChange={onChange}
          className="w-full px-3 py-2 border rounded-lg outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">Departman</label>
        <input
          type="text" name="departman" value={formData.departman || ''}
          onChange={onChange}
          className="w-full px-3 py-2 border rounded-lg outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1">İşe Giriş Tarihi</label>
        <input
          type="date" name="ise_giris" value={formData.ise_giris || ''}
          onChange={onChange}
          className="w-full px-3 py-2 border rounded-lg outline-none"
        />
      </div>
    </>
  );
}

export default PersonnelFormFields;
