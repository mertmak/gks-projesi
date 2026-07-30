import { useState } from 'react';
import api from '../api/axios';

// 1. DEĞİŞİKLİK: Buradaki setToken yerine setAuth yazdık
function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', { username, password });
      
      if (response.data.success) {
        const alinanToken = response.data.token;
        
        // Token'ı tarayıcının kalıcı hafızasına kaydet
        localStorage.setItem('token', alinanToken);
        
        // 2. DEĞİŞİKLİK: App.jsx'e "Giriş başarılı, kapıları aç" mesajını (true) gönderiyoruz
        setAuth(true);
      }
    } catch (err) {
      setError('Hatalı kullanıcı adı veya şifre!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">GKS <span className="text-cyan-500">GİRİŞ</span></h1>
          <p className="text-slate-500 mt-2 text-sm">Yönetim paneline erişmek için yetkilendirme gerekiyor.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Kullanıcı Adı</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Şifre</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-lg">{error}</p>}

          <button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg mt-4"
          >
            Sisteme Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;