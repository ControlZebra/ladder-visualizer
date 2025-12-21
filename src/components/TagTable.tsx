import React, { useState, useMemo } from 'react';
import type { Tag } from '../types';

export interface TagTableProps {
  /** Array of tags to display */
  tags: Tag[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when a tag is selected */
  onTagSelect?: (tag: Tag) => void;
}

/**
 * React component that renders a sortable, filterable table of PLC tags.
 */
export function TagTable({ tags, className = '', onTagSelect }: TagTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof Tag>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredAndSorted = useMemo(() => {
    let result = tags;

    // Filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (tag) =>
          tag.name.toLowerCase().includes(lowerFilter) ||
          tag.data_type.toLowerCase().includes(lowerFilter) ||
          tag.tag_type.toLowerCase().includes(lowerFilter)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [tags, filter, sortBy, sortAsc]);

  const handleSort = (column: keyof Tag) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const getSortIndicator = (column: keyof Tag) => {
    if (sortBy !== column) return '';
    return sortAsc ? ' ▲' : ' ▼';
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    fontWeight: 600,
    userSelect: 'none',
  };

  const cellStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid #eee',
  };

  const rowStyle: React.CSSProperties = {
    cursor: onTagSelect ? 'pointer' : 'default',
  };

  return (
    <div className={`tag-table-container ${className}`}>
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Filter tags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            width: '100%',
            maxWidth: '300px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
        <span style={{ marginLeft: '12px', color: '#666', fontSize: '14px' }}>
          {filteredAndSorted.length} of {tags.length} tags
        </span>
      </div>

      <div style={{ overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={headerStyle} onClick={() => handleSort('name')}>
                Name{getSortIndicator('name')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('tag_type')}>
                Type{getSortIndicator('tag_type')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('data_type')}>
                Data Type{getSortIndicator('data_type')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('radix')}>
                Radix{getSortIndicator('radix')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('external_access')}>
                Access{getSortIndicator('external_access')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((tag) => (
              <tr
                key={tag.name}
                style={rowStyle}
                onClick={() => onTagSelect?.(tag)}
                onMouseEnter={(e) => {
                  if (onTagSelect) {
                    e.currentTarget.style.backgroundColor = '#f0f7ff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{tag.name}</td>
                <td style={cellStyle}>{tag.tag_type}</td>
                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{tag.data_type}</td>
                <td style={cellStyle}>{tag.radix}</td>
                <td style={cellStyle}>{tag.external_access}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TagTable;
