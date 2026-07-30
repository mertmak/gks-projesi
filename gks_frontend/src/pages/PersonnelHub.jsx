import { useState } from 'react';
import Users from './Users';
import PersonnelOperations from './PersonnelOperations';
import BulkOperations from './BulkOperations';
import SystemLogs from './SystemLogs';
import Doors from './Doors';
import DoorLogs from './DoorLogs';

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
        <button onClick={() => setActiveTab('personel')} className={`px-5 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'personel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Personel Listesi
        </button>
        
        <button onClick={() => setActiveTab('islem-merkezi')} className={`px-5 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'islem-merkezi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Bireysel İşlem
        </button>

        <button onClick={() => setActiveTab('toplu-islem')} className={`px-5 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'toplu-islem' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Toplu İşlem Merkezi
        </button>
        
        <button onClick={() => setActiveTab('ik-log')} className={`px-5 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ik-log' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          İK Logları
        </button>
        <button onClick={() => setActiveTab('kapilar')} className={`px-5 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'kapilar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Kapı Tanımlama
        </button>
        <button onClick={() => setActiveTab('kapi-log')} className={`px-5 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'kapi-log' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Kapı İşlem Logları
        </button>
      </div>

      {/* İLGİLİ SAYFAYI GÖSTER */}
      <div className="pb-8">
        {activeTab === 'personel' && <Users />}
        {activeTab === 'islem-merkezi' && <PersonnelOperations />}
        {activeTab === 'toplu-islem' && <BulkOperations />}
        {activeTab === 'ik-log' && <SystemLogs />}
        {activeTab === 'kapilar' && <Doors />}
        {activeTab === 'kapi-log' && <DoorLogs />}
      </div>
    </div>
  );
}

export default PersonnelHub;