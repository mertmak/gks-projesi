import { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

// Sayfa Bileşenleri İçe Aktarımı
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import DoorLogs from './pages/DoorLogs';
import SystemLogs from './pages/SystemLogs';
import Users from './pages/Users';
import PersonnelOperations from './pages/PersonnelOperations';
import BulkOperations from './pages/BulkOperations';
import Doors from './pages/Doors';
import Shifts from './pages/Shifts';
import Leaves from './pages/Leaves';
import Reports from './pages/Reports';
import Simulation from './pages/Simulation';
import Settings from './pages/Settings';
import HesapEkle from './pages/HesapEkle';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const token = localStorage.getItem('token');
  let userRole = null;
  let username = 'Kullanıcı';

  if (token) {
    try {
      const payload = atob(token.split('.')[1]);
      const decodedInfo = JSON.parse(payload);
      userRole = decodedInfo.role;
      if (decodedInfo.kullanici_adi) username = decodedInfo.kullanici_adi;
    } catch (err) {
      console.error("Token okunurken hata:", err);
    }
  }

  if (!isAuthenticated) {
    return <Login setAuth={setIsAuthenticated} />;
  }

  // Aktif menü/link kontrolü için yardımcı fonksiyon
  const isActive = (path) => location.pathname === path;

  // Açılır Menü (Dropdown) Kapsayıcı Bileşeni
  const DropdownMenu = ({ title, children, activePaths = [] }) => {
    const isMenuActive = activePaths.some(p => location.pathname.startsWith(p));
    
    return (
      <div className="relative group">
        <button className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
          isMenuActive 
            ? 'bg-slate-800 text-cyan-400 shadow-inner' 
            : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
        }`}>
          {title}
          <svg className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
        {/* Açılır Kutu (Hover ile görünür) */}
        <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top-left scale-95 group-hover:scale-100">
          <div className="py-2 flex flex-col">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Dropdown İçi Link Bileşeni
  const DropdownItem = ({ to, label }) => (
    <Link 
      to={to} 
      className={`px-4 py-3 text-sm font-bold transition-colors ${
        isActive(to) ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-500'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* ÜST MENÜ (NAVBAR) */}
      <nav className="bg-slate-900 px-6 py-4 shadow-lg flex flex-col lg:flex-row justify-between items-center gap-4 z-50 relative">
        <div className="flex items-center">
          <Link to ="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tighter">
            GKS PANEL
          </Link>
        </div>
        
        {/* MERKEZİ MENÜ (Sayfa Düzeni) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          
          <Link to="/" className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/') ? 'bg-slate-800 text-cyan-400' : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800'}`}>Ana Sayfa</Link>

          {/* PERSONEL İŞLEMLERİ */}
          <DropdownMenu title="Personel" activePaths={['/personel']}>
            <DropdownItem to="/personel/liste" label="Personel Listesi" />
            <DropdownItem to="/personel/bireysel" label="Bireysel İşlem Merkezi" />
            <DropdownItem to="/personel/toplu" label="Toplu İşlem Merkezi" />
          </DropdownMenu>

          {/* KAPI İŞLEMLERİ */}
          <DropdownMenu title="Kapılar" activePaths={['/kapilar']}>
            <DropdownItem to="/kapilar/yonetim" label="Kapı Tanımlama ve Yönetim" />
            {/* İleride kapılarla ilgili yeni sayfalar eklersen buraya ekleyebilirsin */}
          </DropdownMenu>

          {/* VARDİYA & İZİN İŞLEMLERİ */}
          <DropdownMenu title="Vardiya & İzin" activePaths={['/vardiya', '/izinler']}>
            <DropdownItem to="/vardiya" label="Vardiya Yönetimi" />
            <DropdownItem to="/izinler" label="İzin ve Rapor Girişi" />
          </DropdownMenu>

          {/* PUANTAJ (Tek Sayfa) */}
          <Link to="/puantaj" className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/puantaj') ? 'bg-slate-800 text-cyan-400' : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-800'}`}>Puantaj</Link>

          {/* LOGLAR */}
          <DropdownMenu title="Loglar" activePaths={['/loglar']}>
            <DropdownItem to="/loglar/gecis" label="Geçiş Logları (Canlı)" />
            <DropdownItem to="/loglar/kapi" label="Kapı İşlem Logları" />
            <DropdownItem to="/loglar/ik" label="Sistem & İK Logları" />
          </DropdownMenu>

          {/* SİMÜLASYON (Admin) */}
          {userRole === 'admin' && (
            <Link to="/simulasyon" className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${isActive('/simulasyon') ? 'bg-slate-800 text-amber-500' : 'text-amber-500/70 hover:text-amber-400 hover:bg-slate-800'}`}>Simülasyon</Link>
          )}

        </div>

        {/* SAĞ KÖŞE - KULLANICI MENÜSÜ */}
        <div className="relative group">
          <button className="flex items-center gap-3 pl-4 border-l border-slate-700 focus:outline-none">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-white leading-tight">{username}</span>
              <span className="text-xs font-medium text-cyan-400">{userRole === 'admin' ? 'Yönetici' : 'Kullanıcı'}</span>
            </div>
            {/* Kullanıcı Avatarı */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
              {username.substring(0, 2).toUpperCase()}
            </div>
          </button>
          
          {/* Kullanıcı Açılır Menüsü */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
            <div className="py-2 flex flex-col">
              {userRole === 'admin' && (
                <Link to="/hesap-ekle" className="px-4 py-3 text-sm font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-600 border-b border-slate-100 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  Yönetici Hesapları
                </Link>
              )}
              <Link to="/settings" className="px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 border-b border-slate-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Hesap Ayarları
              </Link>
              <button onClick={handleLogout} className="px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 text-left flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Güvenli Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* SAYFALARIN GÖSTERİLECEĞİ ALAN */}
      <div className="px-6 pb-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          {/* Personel Rotası */}
          <Route path="/personel/liste" element={<Users />} />
          <Route path="/personel/bireysel" element={<PersonnelOperations />} />
          <Route path="/personel/toplu" element={<BulkOperations />} />

          {/* Kapı Rotası */}
          <Route path="/kapilar/yonetim" element={<Doors />} />

          {/* Vardiya ve İzin Rotaları */}
          <Route path="/vardiya" element={<Shifts />} />
          <Route path="/izinler" element={<Leaves />} />

          {/* Puantaj Rotası */}
          <Route path="/puantaj" element={<Reports />} />

          {/* Log Rotaları */}
          <Route path="/loglar/gecis" element={<Logs />} />
          <Route path="/loglar/kapi" element={<DoorLogs />} />
          <Route path="/loglar/ik" element={<SystemLogs />} />

          {/* Admin Rotaları */}
          <Route path="/simulasyon" element={<Simulation />} />
          <Route path="/hesap-ekle" element={<HesapEkle />} />
          
          {/* Ortak Rotalar */}
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

    </div>
  );
}

export default App;