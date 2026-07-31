import { forwardRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ValidationModule, themeQuartz } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import { customIcons, AG_GRID_LOCALE_TR } from '../utils/constants';

// Modülleri sadece burada bir kez kaydediyoruz
ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

const CustomDataGrid = forwardRef(({ 
  rowData, 
  columnDefs, 
  getRowId, 
  quickFilterText, 
  rowSelection, 
  onSelectionChanged,
  rowHeight = 50, // Dışarıdan verilmezse varsayılan 50px
  paginationPageSize = 50 
}, ref) => {

  // Tüm tablolarda geçerli olacak standart sütun ayarları
  const defaultColDef = useMemo(() => ({
    filter: true, 
    sortable: true, 
    resizable: true, 
    cellStyle: { borderRight: '1px solid #cbd5e1' }, 
    headerClass: 'border-r border-slate-300' 
  }), []);

  return (
    <div className="flex-1 w-full h-full">
      <AgGridReact
        ref={ref}
        theme={themeQuartz} 
        icons={customIcons} 
        alwaysMultiSort={true} 
        getRowId={getRowId} 
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        localeText={AG_GRID_LOCALE_TR}
        pagination={true}
        paginationPageSize={paginationPageSize}
        domLayout="normal"
        rowHeight={rowHeight}
        rowSelection={rowSelection}
        onSelectionChanged={onSelectionChanged}
        quickFilterText={quickFilterText}
      />
    </div>
  );
});

// DevTools'ta ismin düzgün görünmesi için
CustomDataGrid.displayName = 'CustomDataGrid';

export default CustomDataGrid;