import { useEffect } from 'react';

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-md' // Varsayılan genişlik (max-w-sm, max-w-lg, max-w-4xl vb. alabilir)
}) {
  
  // ESC tuşuna basıldığında modalı kapatma özelliği
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`bg-white p-6 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto relative`}>
        
        {/* Çarpı (Kapatma) Butonu */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        {/* Modal Başlığı */}
        {title && (
          <h3 className="text-xl font-black text-slate-800 mb-4 border-b border-slate-100 pb-3 pr-6">
            {title}
          </h3>
        )}

        {/* Modal İçeriği */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;