import { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Logs from './pages/Logs';
import Login from './pages/Login';
import Settings from './pages/Settings';
import HesapEkle from './pages/HesapEkle';
import Dashboard from './pages/Dashboard';
import PersonnelHub from './pages/PersonnelHub';
import Shifts from './pages/Shifts';
import Reports from './pages/Reports';
import Leaves from './pages/Leaves';
import Simulation from './pages/Simulation'; // YENİ: Simülasyon sayfası import edildi

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const location = useLocation();

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

  const NavItem = ({ to, label, exact = false }) => {
    const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
    return (
      <Link 
        to={to} 
        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
          isActive 
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md' 
            : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* ÜST MENÜ (NAVBAR) */}
      <nav className="bg-slate-900 px-6 py-4 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <Link to ="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tighter">
            GKS PANEL
          </Link>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2">
          <NavItem to="/" label="Ana Sayfa" exact={true} />
          <NavItem to="/personel" label="Erişim & Personel" />
          <NavItem to="/shifts" label="Vardiya" />
          <NavItem to="/leaves" label="İzinler" />
          <NavItem to="/reports" label="Puantaj" />
          <NavItem to="/logs" label="Geçiş Logları" />

          {/* Ayırıcı Çizgi */}
          <div className="hidden md:block w-px h-6 bg-slate-700 mx-2"></div>

          {/* SADECE ADMİNLERİN GÖRECEĞİ ALAN */}
          {userRole === 'admin' && (
            <>
              <NavItem to="/hesap-ekle" label="Yönetim" />
              <NavItem to="/simulation" label="Simülasyon" /> {/* YENİ: Admin menüsüne eklendi */}
            </>
          )}
          
          <NavItem to="/settings" label="Ayarlar" />
          
          <button 
            onClick={handleLogout} 
            className="ml-2 bg-slate-800 border border-slate-700 hover:bg-red-500 hover:border-red-500 hover:text-white text-slate-300 px-4 py-2 rounded-xl font-bold text-sm transition-all"
            title="Sistemden Çıkış Yap"
          >
            Çıkış
          </button>
        </div>
      </nav>

      {/* SAYFALARIN GÖSTERİLECEĞİ ALAN */}
      <div className="px-6 pb-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/personel/*" element={<PersonnelHub />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/hesap-ekle" element={<HesapEkle />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/simulation" element={<Simulation />} /> {/* YENİ: Route tanımlandı */}
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

    </div>
  );
}

export default App;