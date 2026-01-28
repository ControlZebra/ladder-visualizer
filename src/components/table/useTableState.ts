import { useState, useMemo } from 'react';

export interface UseTableStateOptions<T> {
  /** Array of data items */
  data: T[];
  /** Fields to include in filter search */
  filterFields: (keyof T)[];
  /** Default column to sort by */
  defaultSortKey: keyof T;
  /** Default sort direction (default: true = ascending) */
  defaultSortAsc?: boolean;
}

export interface UseTableStateResult<T> {
  /** Filtered and sorted data */
  filteredAndSorted: T[];
  /** Current filter string */
  filter: string;
  /** Set filter string */
  setFilter: (value: string) => void;
  /** Current sort column */
  sortBy: keyof T;
  /** Current sort direction */
  sortAsc: boolean;
  /** Handle column header click for sorting */
  handleSort: (column: keyof T) => void;
  /** Get sort indicator for column header */
  getSortIndicator: (column: keyof T) => string;
  /** Total count of items (before filtering) */
  totalCount: number;
  /** Filtered count of items */
  filteredCount: number;
}

/**
 * Shared hook for table filtering and sorting logic.
 * Used by TagTable, AOILocalTagTable, and AOIParameterTable.
 */
export function useTableState<T>({
  data,
  filterFields,
  defaultSortKey,
  defaultSortAsc = true,
}: UseTableStateOptions<T>): UseTableStateResult<T> {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof T>(defaultSortKey);
  const [sortAsc, setSortAsc] = useState(defaultSortAsc);

  const filteredAndSorted = useMemo(() => {
    let result = data;

    // Filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter((item) =>
        filterFields.some((field) => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(lowerFilter);
        })
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, filter, filterFields, sortBy, sortAsc]);

  const handleSort = (column: keyof T) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const getSortIndicator = (column: keyof T): string => {
    if (sortBy !== column) return '';
    return sortAsc ? ' ▲' : ' ▼';
  };

  return {
    filteredAndSorted,
    filter,
    setFilter,
    sortBy,
    sortAsc,
    handleSort,
    getSortIndicator,
    totalCount: data.length,
    filteredCount: filteredAndSorted.length,
  };
}
