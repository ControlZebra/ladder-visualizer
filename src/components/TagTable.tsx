import React, { useState, useMemo } from 'react';
import type { NormalizedTag } from '../types';

export interface TagTableProps {
  /** Array of tags to display */
  tags: NormalizedTag[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when a tag is selected */
  onTagSelect?: (tag: NormalizedTag) => void;
}

/**
 * React component that renders a sortable, filterable table of PLC tags.
 */
export function TagTable({ tags, className = '', onTagSelect }: TagTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof NormalizedTag>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredAndSorted = useMemo(() => {
    let result = tags;

    // Filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (tag) =>
          tag.name.toLowerCase().includes(lowerFilter) ||
          tag.dataType.toLowerCase().includes(lowerFilter) ||
          tag.tagType.toLowerCase().includes(lowerFilter)
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
  }, [tags, filter, sortBy, sortAsc]);

  const handleSort = (column: keyof NormalizedTag) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const getSortIndicator = (column: keyof NormalizedTag) => {
    if (sortBy !== column) return '';
    return sortAsc ? ' ▲' : ' ▼';
  };

  const handleTagClick = (tag: NormalizedTag) => {
    if (onTagSelect) {
      onTagSelect(tag);
    }
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
              <th style={headerStyle} onClick={() => handleSort('tagType')}>
                Type{getSortIndicator('tagType')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('dataType')}>
                Data Type{getSortIndicator('dataType')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('radix')}>
                Radix{getSortIndicator('radix')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('externalAccess')}>
                Access{getSortIndicator('externalAccess')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((tag) => (
              <tr
                key={tag.name}
                style={rowStyle}
                onClick={() => handleTagClick(tag)}
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
                <td style={cellStyle}>{tag.tagType}</td>
                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{tag.dataType}</td>
                <td style={cellStyle}>{tag.radix ?? '-'}</td>
                <td style={cellStyle}>{tag.externalAccess ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TagTable;
