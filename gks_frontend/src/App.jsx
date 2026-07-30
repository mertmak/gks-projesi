import { useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Logs from './pages/Logs';
import Login from './pages/Login';
import Settings from './pages/Settings';
import HesapEkle from './pages/HesapEkle';
import Dashboard from './pages/Dashboard';
import PersonnelHub from './pages/PersonnelHub';
import Shifts from './pages/Shifts';
import Reports from './pages/Reports';
import Leaves from './pages/leaves';
import Simulation from './pages/Simulation';

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
        <div>
          <Link to ="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 trackin-tighter">GKS PANEL
        </Link>
        </div>
        
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Ana Sayfa</Link>
          
          <Link to="/logs" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Loglar</Link>
          
          <Link to="/personel" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Personel Yönetimi</Link>          
          <Link to="/leaves" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">İzinler</Link>          

          <Link to="/shifts" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Vardiya</Link>          

          <Link to="/simulation" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Simülasyon</Link>

          <Link to="/reports" className="text-slate-300 hover:text-cyan-400 transition-colors font-semibold tracking-wide">Puantaj Raporu</Link>          

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/personel" element={<PersonnelHub />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/hesap-ekle" element={<HesapEkle />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/simulation" element={<Simulation />} />


          
          {/* Hatalı URL girilirse Ana Sayfaya atacak kural en sona alındı */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

    </div>
  );
}

export default App;