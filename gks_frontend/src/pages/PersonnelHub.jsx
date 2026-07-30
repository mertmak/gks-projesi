import { useState } from 'react';
import Users from './Users';
import SystemLogs from './SystemLogs';
import Doors from './Doors';
import DoorLogs from './DoorLogs'; // Yeni kapı logları sayfasını içeri aldık

function PersonnelHub() {
  const [activeTab, setActiveTab] = useState('personel'); 

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Erişim & Personel Yönetimi</h2>
        <p className="text-slate-500 text-sm mt-1">Sistem ayarlarına, yetkilere ve raporlara buradan ulaşabilirsiniz.</p>
      </div>

      {/* SEKME MENÜSÜ */}
      <div className="flex border-b border-slate-300 bg-white rounded-t-xl px-4 pt-2 overflow-x-auto">
        <button onClick={() => setActiveTab('personel')} className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'personel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Personel & Yetkiler
        </button>
        <button onClick={() => setActiveTab('ik-log')} className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ik-log' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          İK Logları
        </button>
        <button onClick={() => setActiveTab('kapilar')} className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'kapilar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Kapı Tanımlama
        </button>
        <button onClick={() => setActiveTab('kapi-log')} className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'kapi-log' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Kapı İşlem Logları
        </button>
      </div>

      {/* İLGİLİ SAYFAYI GÖSTER */}
      <div className="pb-8">
        {activeTab === 'personel' && <Users />}
        {activeTab === 'ik-log' && <SystemLogs />}
        {activeTab === 'kapilar' && <Doors />}
        {activeTab === 'kapi-log' && <DoorLogs />}
      </div>
    </div>
  );
}

export default PersonnelHub;