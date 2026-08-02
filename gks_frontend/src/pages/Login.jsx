import { useState } from 'react';
import api from '../api/axios';
import { connectSocket } from '../api/socket';

function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // YENİ: Sistemin ilk kez kurulup kurulmadığını kontrol eden state
  const [isSetupMode, setIsSetupMode] = useState(false);

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (isSetupMode) {
        // İLK KURULUM (ADMIN OLUŞTURMA) İŞLEMİ
        const response = await api.post('/ilk-kurulum', { username, password });
        if (response.data.success) {
          setSuccessMsg('Sistem başarıyla kuruldu! Şimdi giriş yapabilirsiniz.');
          setIsSetupMode(false); // Kurulum bitince normal giriş moduna dön
          setUsername('');
          setPassword('');
        }
      } else {
        // NORMAL GİRİŞ İŞLEMİ
        const response = await api.post('/login', { username, password });
        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          connectSocket();
          setAuth(true);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bir hata oluştu!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 transition-all duration-300">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            GKS <span className={isSetupMode ? "text-orange-500" : "text-cyan-500"}>
              {isSetupMode ? "KURULUM" : "GİRİŞ"}
            </span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            {isSetupMode 
              ? "Sistemi başlatmak için ilk yönetici hesabını oluşturun." 
              : "Yönetim paneline erişmek için yetkilendirme gerekiyor."}
          </p>
        </div>

        <form onSubmit={handleAction} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {isSetupMode ? "Yeni Yönetici Kullanıcı Adı" : "Kullanıcı Adı"}
            </label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={isSetupMode ? "Örn: admin" : ""}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {isSetupMode ? "Yeni Yönetici Şifresi" : "Şifre"}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
            />
          </div>

          {/* Mesaj Alanları */}
          {error && <p className="text-red-600 text-sm font-bold text-center bg-red-50 py-3 rounded-xl border border-red-100">{error}</p>}
          {successMsg && <p className="text-green-600 text-sm font-bold text-center bg-green-50 py-3 rounded-xl border border-green-100">{successMsg}</p>}

          <button 
            type="submit" 
            className={`w-full text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg mt-4 ${
              isSetupMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {isSetupMode ? 'Sistemi Başlat ve Kaydet' : 'Sisteme Giriş Yap'}
          </button>
        </form>

        {/* Mod Değiştirme Butonu */}
        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <button 
            type="button" 
            onClick={() => {
              setIsSetupMode(!isSetupMode);
              setError('');
              setSuccessMsg('');
            }}
            className="text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors"
          >
            {isSetupMode ? "← Normal Giriş Ekranına Dön" : "Sistem yeni mi kuruldu? İlk kurulumu yap."}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;