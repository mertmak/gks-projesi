import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';

// ORTAK BİLEŞENLER
import CustomDataGrid from '../components/CustomDataGrid';
import AutocompleteSearch from '../components/AutocompleteSearch';
import Modal from '../components/Modal'; // YENİ: Modal bileşeni
import AlertMessage from '../components/AlertMessage';

function Overtimes() {
  const gridRef = useRef();
  const bugun = new Date();
  const basTarihi = new Date(bugun.setDate(bugun.getDate() - 7)).toISOString().split('T')[0];
  const bitTarihi = new Date().toISOString().split('T')[0];
  
  const [filters, setFilters] = useState({ baslangic: basTarihi, bitis: bitTarihi });
  const [overtimes, setOvertimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [quickFilterText, setQuickFilterText] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  // Bireysel İnceleme Modalı
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [approvalData, setApprovalData] = useState({ onaylanan_dk: 0, durum: 'Onaylandı', aciklama: '' });

  // Sayfa İçi Toplu İşlem Paneli State'leri
  const [bulkData, setBulkData] = useState({ hedef_turu: 'Tumu', hedef_deger: '', durum: 'Onaylandı', aciklama: '' });
  const [bulkSuggestions, setBulkSuggestions] = useState([]); 

  const fetchOvertimes = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    setSelectedRows([]);
    setQuickFilterText(''); 
    try {
      const response = await api.get('/overtimes', { params: filters });
      setOvertimes(response.data);
      
      if (response.data.length === 0) {
        setMessage({ text: 'Seçili tarih aralığında mesaiye kalan personel bulunmuyor.', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: "Veriler çekilemedi.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOvertimes();
  }, []);

  const onSelectionChanged = () => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    setSelectedRows(selectedNodes.map(node => node.data));
  };

  const handleOpenApproval = (data) => {
    setSelectedRow(data);
    setApprovalData({
      onaylanan_dk: data.Onaylanan_Dk || data.Fazla_Mesai_Dk,
      durum: data.Mesai_Durumu !== 'Bekliyor' ? data.Mesai_Durumu : 'Onaylandı',
      aciklama: ''
    });
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/overtimes/approve', {
        user_id: selectedRow.User_ID, tarih: selectedRow.TarihStr, hesaplanan_dk: selectedRow.Fazla_Mesai_Dk,
        onaylanan_dk: approvalData.durum === 'Reddedildi' ? 0 : approvalData.onaylanan_dk,
        durum: approvalData.durum, aciklama: approvalData.aciklama
      });
      setShowApprovalModal(false);
      setMessage({ text: 'Mesai durumu kaydedildi.', type: 'success' });
      fetchOvertimes();
    } catch (err) { alert("Hata oluştu."); }
  };

  const handleBulkSearchChange = (e) => {
    const value = e.target.value;
    setBulkData({ ...bulkData, hedef_deger: value });

    if (value.length >= 2 && bulkData.hedef_turu !== 'Tumu') {
      const lowerVal = value.toLowerCase();
      const uniqueResults = [];
      const seen = new Set();

      overtimes.forEach(row => {
        if (bulkData.hedef_turu === 'Departman' && row.Departman?.toLowerCase().includes(lowerVal)) {
          if (!seen.has(row.Departman)) { 
            seen.add(row.Departman); 
            uniqueResults.push({ label: row.Departman, subLabel: 'Departman', value: row.Departman }); 
          }
        } else if (bulkData.hedef_turu === 'Sirket' && row.Sirket?.toLowerCase().includes(lowerVal)) {
          if (!seen.has(row.Sirket)) { 
            seen.add(row.Sirket); 
            uniqueResults.push({ label: row.Sirket, subLabel: 'Şirket', value: row.Sirket }); 
          }
        } else if (bulkData.hedef_turu === 'Personel' && (row.Ad_Soyad?.toLowerCase().includes(lowerVal) || row.Sicil_No?.includes(value))) {
          if (!seen.has(row.Sicil_No)) { 
            seen.add(row.Sicil_No); 
            uniqueResults.push({ label: row.Ad_Soyad, subLabel: `Sicil: ${row.Sicil_No} | ${row.Departman}`, value: row.Ad_Soyad }); 
          }
        }
      });
      setBulkSuggestions(uniqueResults.slice(0, 5));
    } else {
      setBulkSuggestions([]);
    }
  };

  const handleAdvancedBulkSubmit = async (e) => {
    e.preventDefault();
    let targetRows = overtimes;
    
    if (bulkData.hedef_turu === 'Departman') {
        targetRows = overtimes.filter(o => o.Departman === bulkData.hedef_deger);
    } else if (bulkData.hedef_turu === 'Sirket') {
        targetRows = overtimes.filter(o => o.Sirket === bulkData.hedef_deger);
    } else if (bulkData.hedef_turu === 'Personel') {
        targetRows = overtimes.filter(o => o.Ad_Soyad.toLowerCase().includes(bulkData.hedef_deger.toLowerCase()) || o.Sicil_No === bulkData.hedef_deger);
    }

    if (targetRows.length === 0) {
        alert("Girdiğiniz kritere uyan mesai kaydı bulunamadı.");
        return;
    }

    const payload = targetRows.map(row => ({
      user_id: row.User_ID, tarih: row.TarihStr, hesaplanan_dk: row.Fazla_Mesai_Dk, onaylanan_dk: row.Fazla_Mesai_Dk 
    }));

    try {
      await api.post('/overtimes/approve-bulk', { mesailer: payload, durum: bulkData.durum, aciklama: bulkData.aciklama });
      setMessage({ text: `Kritere uyan ${payload.length} adet mesai toplu olarak işlendi.`, type: 'success' });
      setBulkData({ hedef_turu: 'Tumu', hedef_deger: '', durum: 'Onaylandı', aciklama: '' });
      fetchOvertimes();
    } catch (err) { alert("Toplu işlem başarısız oldu."); }
  };

  const handleGridBulkSubmit = async () => {
    const payload = selectedRows.map(row => ({
      user_id: row.User_ID, tarih: row.TarihStr, hesaplanan_dk: row.Fazla_Mesai_Dk, onaylanan_dk: row.Fazla_Mesai_Dk
    }));
    try {
      await api.post('/overtimes/approve-bulk', { mesailer: payload, durum: 'Onaylandı', aciklama: 'Tablodan Hızlı Onay' });
      setMessage({ text: `${payload.length} adet mesai başarıyla onaylandı.`, type: 'success' });
      fetchOvertimes();
    } catch (err) { alert("İşlem başarısız."); }
  };

  const colDefs = useMemo(() => [
    { headerName: '', checkboxSelection: true, headerCheckboxSelection: true, width: 50, pinned: 'left' },
    { field: 'TarihStr', headerName: 'Tarih', width: 110, pinned: 'left', cellRenderer: (params) => <span className="text-slate-500 font-bold">{params.value.split('-').reverse().join('.')}</span> },
    { field: 'Sicil_No', headerName: 'Sicil No', width: 100 },
    { field: 'Ad_Soyad', headerName: 'Ad Soyad', flex: 1, minWidth: 160, cellClass: 'font-bold text-slate-800' },
    { field: 'Departman', headerName: 'Departman / Şirket', flex: 1, minWidth: 150, valueGetter: params => `${params.data.Departman} ${params.data.Sirket ? `(${params.data.Sirket})` : ''}` },
    { 
      field: 'Fazla_Mesai_Dk', headerName: 'Hesaplanan', width: 140,
      cellRenderer: (params) => {
        const dk = params.value; const saat = Math.floor(dk / 60); const dakika = dk % 60;
        return <span className="text-blue-600 font-bold">+{saat > 0 ? `${saat}s ${dakika}d` : `${dk}dk`}</span>;
      }
    },
    { 
      field: 'Mesai_Durumu', headerName: 'Onay Durumu', width: 140,
      cellRenderer: (params) => {
        const durum = params.value; const onaylanan = params.data.Onaylanan_Dk;
        if (durum === 'Onaylandı') return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Onay: {onaylanan}dk</span>;
        if (durum === 'Reddedildi') return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Reddedildi</span>;
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">Bekliyor</span>;
      }
    },
    {
      headerName: 'İşlem', width: 95, sortable: false, filter: false, pinned: 'right',
      cellRenderer: (params) => (
        <button onClick={() => handleOpenApproval(params.data)} className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded hover:bg-slate-800 transition-colors">
          İncele
        </button>
      )
    }
  ], []);

  return (
    <div className="space-y-6 relative mt-8">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Mesai Onay İşlemleri</h2>
          <p className="text-slate-500 text-sm mt-1">Personellerin fazla mesailerini inceleyin ve karara bağlayın.</p>
        </div>

        <div className="flex items-end space-x-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Başlangıç Tarihi</label>
            <input type="date" value={filters.baslangic} onChange={(e) => setFilters({...filters, baslangic: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Bitiş Tarihi</label>
            <input type="date" value={filters.bitis} onChange={(e) => setFilters({...filters, bitis: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={fetchOvertimes} disabled={loading} className="px-5 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800">
            {loading ? 'Yükleniyor...' : 'Kayıtları Getir'}
          </button>
        </div>
      </div>

      <AlertMessage message={message.text} type={message.type} />
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
        <h3 className="text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">Hedefe Yönelik Toplu İşlem</h3>
        <form onSubmit={handleAdvancedBulkSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Hedef Türü</label>
            <select 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
              value={bulkData.hedef_turu} 
              onChange={(e) => {
                setBulkData({...bulkData, hedef_turu: e.target.value, hedef_deger: ''});
                setBulkSuggestions([]);
              }}
            >
              <option value="Tumu">Tüm Personeller</option>
              <option value="Departman">Departmana Göre</option>
              <option value="Sirket">Şirkete Göre</option>
              <option value="Personel">Kişiye Göre (İsim/Sicil)</option>
            </select>
          </div>
          
          <div className="relative z-50">
            <AutocompleteSearch 
              label="Hedef Adı"
              placeholder={bulkData.hedef_turu === 'Tumu' ? 'Tümü Seçili' : 'Aramak için yazın...'}
              value={bulkData.hedef_deger}
              onChange={handleBulkSearchChange}
              suggestions={bulkSuggestions}
              onSelect={(item) => {
                setBulkData({...bulkData, hedef_deger: item.value});
                setBulkSuggestions([]);
              }}
              disabled={bulkData.hedef_turu === 'Tumu'}
              required={bulkData.hedef_turu !== 'Tumu'}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Kararınız</label>
            <select value={bulkData.durum} onChange={(e) => setBulkData({...bulkData, durum: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="Onaylandı">Tümünü Onayla</option>
              <option value="Reddedildi">Tümünü Reddet</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama (Opsiyonel)</label>
            <input type="text" placeholder="Yönetici Notu" value={bulkData.aciklama} onChange={(e) => setBulkData({...bulkData, aciklama: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
             <button type="submit" disabled={overtimes.length === 0} className={`w-full py-2 text-white font-bold rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 ${bulkData.durum === 'Onaylandı' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
               İşlemi Uygula
             </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full md:w-1/2">
           <input 
              type="text" 
              placeholder="Tabloda personel, departman veya durum ara..." 
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
           />
        </div>
        {selectedRows.length > 0 && (
           <button onClick={handleGridBulkSubmit} className="w-full md:w-auto px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md">
             Seçili {selectedRows.length} Kişiyi Onayla
           </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col p-4 h-[55vh]">
        <CustomDataGrid 
          ref={gridRef}
          rowData={overtimes}
          columnDefs={colDefs}
          getRowId={(params) => `${params.data.User_ID}-${params.data.TarihStr}`}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          quickFilterText={quickFilterText}
          rowHeight={60}
        />
      </div>

      {/* --- MESAİ ONAY MODALI (YENİ YAPI) --- */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} title="Mesai İnceleme" maxWidth="max-w-sm">
        {selectedRow && (
          <>
            <p className="text-sm text-slate-500 mb-4 font-bold">{selectedRow.Ad_Soyad} - {selectedRow.TarihStr.split('-').reverse().join('.')}</p>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 flex justify-between items-center">
              <span className="text-sm font-bold text-blue-900">Hesaplanan:</span>
              <span className="text-lg font-black text-blue-700">{selectedRow.Fazla_Mesai_Dk} Dk</span>
            </div>

            <form onSubmit={handleApprovalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Kararınız</label>
                <select value={approvalData.durum} onChange={(e) => setApprovalData({...approvalData, durum: e.target.value})} className="w-full px-3 py-2 border rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Onaylandı">Mesaiyi Onayla</option>
                  <option value="Reddedildi">Mesaiyi Reddet</option>
                </select>
              </div>
              {approvalData.durum === 'Onaylandı' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Onaylanan Süre (Dakika)</label>
                  <input type="number" value={approvalData.onaylanan_dk} onChange={(e) => setApprovalData({...approvalData, onaylanan_dk: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" min="1" max={selectedRow.Fazla_Mesai_Dk + 120} />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Açıklama (Opsiyonel)</label>
                <input type="text" value={approvalData.aciklama} onChange={(e) => setApprovalData({...approvalData, aciklama: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowApprovalModal(false)} className="px-4 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-sm">İptal</button>
                <button type="submit" className={`px-4 py-2 text-white font-bold rounded-lg text-sm ${approvalData.durum === 'Onaylandı' ? 'bg-green-600' : 'bg-red-600'}`}>Kaydet</button>
              </div>
            </form>
          </>
        )}
      </Modal>

    </div>
  );
}

export default Overtimes;