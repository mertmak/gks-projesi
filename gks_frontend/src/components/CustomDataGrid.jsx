import { forwardRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, ValidationModule } from 'ag-grid-community';

// 1. ÇÖZÜM: Hem ana CSS hem de Tema CSS dosyası import edildi
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css'; 

import { AG_GRID_LOCALE_TR } from '../utils/constants';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

const CustomDataGrid = forwardRef(({ 
  rowData, 
  columnDefs, 
  getRowId, 
  quickFilterText, 
  rowSelection, 
  onSelectionChanged,
  rowHeight = 50, 
  paginationPageSize = 50 
}, ref) => {

  const defaultColDef = useMemo(() => ({
    filter: true, 
    sortable: true, 
    resizable: true, 
    cellStyle: { borderRight: '1px solid #cbd5e1' }, 
    headerClass: 'border-r border-slate-300' 
  }), []);

  return (
    // 2. ÇÖZÜM: 'ag-theme-quartz' class'ı ana kapsayıcıya eklendi
    <div className="ag-theme-quartz flex-1 w-full h-full">
      <AgGridReact
        ref={ref}
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

CustomDataGrid.displayName = 'CustomDataGrid';

export default CustomDataGrid;