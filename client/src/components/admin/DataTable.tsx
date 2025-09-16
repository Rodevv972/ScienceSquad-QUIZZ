import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import './DataTable.css';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  onRowClick,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Rechercher...',
  filters,
  pagination,
  actions,
  emptyMessage = 'Aucune donnée disponible'
}) => {
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    let filteredData = [...data];

    // Apply search filter
    if (searchable && searchTerm) {
      filteredData = filteredData.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortField) {
      filteredData.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (sortDirection === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    return filteredData;
  };

  const sortedData = getSortedData();

  const renderPagination = () => {
    if (!pagination) return null;

    const { currentPage, totalPages, onPageChange } = pagination;
    const pages = [];
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        pages.push(i);
      } else if (
        i === currentPage - 3 || 
        i === currentPage + 3
      ) {
        pages.push('...');
      }
    }

    return (
      <div className="data-table-pagination">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Précédent
        </button>
        
        <div className="pagination-pages">
          {pages.map((page, index) => (
            <button
              key={index}
              className={`pagination-page ${page === currentPage ? 'active' : ''}`}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={typeof page !== 'number'}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Suivant
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="data-table-container">
        <div className="data-table-loading">
          <div className="loading-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      {(searchable || filters) && (
        <div className="data-table-header">
          {searchable && (
            <div className="data-table-search">
              <Search size={20} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          {filters && (
            <div className="data-table-filters">
              <Filter size={20} />
              {filters}
            </div>
          )}
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="header-content">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="sort-icons">
                        <ChevronUp 
                          size={14} 
                          className={
                            sortField === column.key && sortDirection === 'asc' 
                              ? 'active' : ''
                          }
                        />
                        <ChevronDown 
                          size={14} 
                          className={
                            sortField === column.key && sortDirection === 'desc' 
                              ? 'active' : ''
                          }
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th style={{ width: "120px" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-row">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={row.id || row._id || index}
                  className={onRowClick ? 'clickable' : ''}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </td>
                  ))}
                  {actions && (
                    <td className="actions-cell" onClick={e => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderPagination()}
    </div>
  );
};

export default DataTable;