import { useState, useEffect } from 'react';

function AutocompleteSearch({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  suggestions = [], 
  onSelect,
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Menünün dışına tıklanınca kapanması için küçük bir gecikme (Tıklama olayını ezmemesi için)
  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) setIsOpen(true);
  };

  // Yeni öneriler geldiğinde menüyü otomatik aç
  useEffect(() => {
    if (suggestions.length > 0) setIsOpen(true);
    else setIsOpen(false);
  }, [suggestions]);

  return (
    <div className="relative w-full">
      {label && <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
      />
      
      {/* AÇILIR LİSTE (DROPDOWN) */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl rounded-lg mt-1 left-0 divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              onClick={() => {
                onSelect(item);
                setIsOpen(false);
              }}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors"
            >
              <span className="font-bold text-slate-800 text-sm">{item.label}</span>
              {item.subLabel && <span className="text-slate-500 text-[10px] mt-0.5">{item.subLabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutocompleteSearch;