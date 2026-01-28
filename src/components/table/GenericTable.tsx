import React from 'react';
import { useTableState } from './useTableState';
import { tableStyles, combineStyles, getRowStyle } from './tableStyles';

/**
 * Column definition for GenericTable
 */
export interface ColumnDefinition<T> {
  /** Unique key for the column (usually the field name) */
  key: string;
  /** Column header text */
  header: string;
  /** Field to use for sorting (defaults to key if it's a valid field) */
  sortKey?: keyof T;
  /** Whether this column is sortable (default: true) */
  sortable?: boolean;
  /** Custom render function for cell content */
  render?: (row: T) => React.ReactNode;
  /** Apply monospace font to cell */
  mono?: boolean;
  /** Apply bold font to cell */
  bold?: boolean;
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Custom cell style */
  cellStyle?: React.CSSProperties;
  /** Custom header style */
  headerStyle?: React.CSSProperties;
}

/**
 * Props for GenericTable component
 */
export interface GenericTableProps<T> {
  /** Array of data items to display */
  data: T[];
  /** Column definitions */
  columns: ColumnDefinition<T>[];
  /** Function to get unique key for each row */
  getRowKey: (row: T) => string;
  /** Fields to include in filter search */
  filterFields: (keyof T)[];
  /** Default column key to sort by */
  defaultSortKey: keyof T;
  /** Optional CSS class name for the container */
  className?: string;
  /** Callback when a row is selected */
  onRowSelect?: (row: T) => void;
  /** Placeholder text for filter input */
  filterPlaceholder?: string;
  /** Label for the count display (e.g., "tags", "parameters") */
  itemLabel?: string;
}

/**
 * Generic reusable table component with filtering, sorting, and row selection.
 * Used as the base for TagTable, AOILocalTagTable, and AOIParameterTable.
 */
export function GenericTable<T>({
  data,
  columns,
  getRowKey,
  filterFields,
  defaultSortKey,
  className = '',
  onRowSelect,
  filterPlaceholder = 'Filter...',
  itemLabel = 'items',
}: GenericTableProps<T>) {
  const {
    filteredAndSorted,
    filter,
    setFilter,
    handleSort,
    getSortIndicator,
    totalCount,
    filteredCount,
  } = useTableState({
    data,
    filterFields,
    defaultSortKey,
  });

  const handleRowClick = (row: T) => {
    if (onRowSelect) {
      onRowSelect(row);
    }
  };

  const handleRowMouseEnter = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (onRowSelect) {
      e.currentTarget.style.backgroundColor = tableStyles.rowHoverBg;
    }
  };

  const handleRowMouseLeave = (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.backgroundColor = '';
  };

  const getCellStyle = (column: ColumnDefinition<T>): React.CSSProperties => {
    return combineStyles(
      tableStyles.cell,
      column.mono ? tableStyles.monoCell : undefined,
      column.bold ? tableStyles.boldCell : undefined,
      column.truncate ? tableStyles.truncatedCell : undefined,
      column.cellStyle
    );
  };

  const renderCell = (row: T, column: ColumnDefinition<T>): React.ReactNode => {
    if (column.render) {
      return column.render(row);
    }
    // Default: try to get value from row using key
    const value = (row as Record<string, unknown>)[column.key];
    if (value == null) return '-';
    return String(value);
  };

  return (
    <div className={className} style={tableStyles.wrapper}>
      <div style={tableStyles.filterContainer}>
        <input
          type="text"
          placeholder={filterPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={tableStyles.filterInput}
        />
        <span style={tableStyles.countText}>
          {filteredCount} of {totalCount} {itemLabel}
        </span>
      </div>

      <div style={tableStyles.tableContainer}>
        <table style={tableStyles.table}>
          <thead style={tableStyles.stickyThead}>
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable !== false;
                const sortKey = column.sortKey ?? (column.key as keyof T);
                
                return (
                  <th
                    key={column.key}
                    style={combineStyles(
                      tableStyles.header,
                      tableStyles.stickyHeader,
                      !sortable ? { cursor: 'default' } : undefined,
                      column.headerStyle
                    )}
                    onClick={sortable ? () => handleSort(sortKey) : undefined}
                  >
                    {column.header}
                    {sortable && getSortIndicator(sortKey)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((row, index) => (
              <tr
                key={getRowKey(row)}
                style={getRowStyle(index, !!onRowSelect)}
                onClick={() => handleRowClick(row)}
                onMouseEnter={handleRowMouseEnter}
                onMouseLeave={handleRowMouseLeave}
              >
                {columns.map((column) => (
                  <td key={column.key} style={getCellStyle(column)}>
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
