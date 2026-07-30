import { useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Logs from './pages/Logs';
import Users from './pages/Users';
import Login from './pages/Login';
import Settings from './pages/Settings';
import HesapEkle from './pages/HesapEkle';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const token = localStorage.getItem('token');
  let userRole = null;

  if (token) {
    try {
      const payload = atob(token.split('.')[1]);
      const decodedInfo = JSON.parse(payload);
      userRole = decodedInfo.role;
    } catch (err) {
      console.error("Token okunurken hata:", err);
    }
  }

  if (!isAuthenticated) {
    return <Login setAuth={setIsAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* Üst Menü (Navbar) */}
      <nav className="bg-slate-900 px-6 py-4 shadow-lg flex justify-between items-center">
        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tighter">
          GKS PANEL
        </div>
        
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Loglar</Link>
          <Link to="/users" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Personel Yönetimi</Link>
          
          {userRole === 'admin' && (
            <Link to="/hesap-ekle" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Yeni Hesap</Link>
          )}
          
          <Link to="/settings" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Ayarlar</Link>
          
          <button 
            onClick={handleLogout} 
            className="ml-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </nav>

      {/* Sayfaların Gösterileceği Alan */}
      <div className="px-6 pb-10">
        <Routes>
          <Route path="/" element={<Logs />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          
          <Route path="/hesap-ekle" element={<HesapEkle />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

    </div>
  );
}

export default App;