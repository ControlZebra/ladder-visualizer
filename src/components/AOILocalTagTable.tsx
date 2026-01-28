import React, { useState, useMemo } from 'react';
import type { AOILocalTag } from '../types';

export interface AOILocalTagTableProps {
  localTags: AOILocalTag[];
}

export function AOILocalTagTable({ localTags }: AOILocalTagTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof AOILocalTag>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredAndSorted = useMemo(() => {
    let result = localTags;

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (tag) =>
          tag.name.toLowerCase().includes(lowerFilter) ||
          tag.dataType.toLowerCase().includes(lowerFilter)
      );
    }

    result = [...result].sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [localTags, filter, sortBy, sortAsc]);

  const handleSort = (column: keyof AOILocalTag) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const getSortIndicator = (column: keyof AOILocalTag) => {
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

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Filter local tags..."
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
          {filteredAndSorted.length} of {localTags.length} local tags
        </span>
      </div>

      <div style={{ overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={headerStyle} onClick={() => handleSort('name')}>
                Name{getSortIndicator('name')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('dataType')}>
                Data Type{getSortIndicator('dataType')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('dimensions')}>
                Dimensions{getSortIndicator('dimensions')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('radix')}>
                Radix{getSortIndicator('radix')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('externalAccess')}>
                Access{getSortIndicator('externalAccess')}
              </th>
              <th style={headerStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((tag) => (
              <tr key={tag.name}>
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontWeight: 500 }}>{tag.name}</td>
                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{tag.dataType}</td>
                <td style={cellStyle}>{tag.dimensions ? `[${tag.dimensions}]` : '-'}</td>
                <td style={cellStyle}>{tag.radix ?? '-'}</td>
                <td style={cellStyle}>{tag.externalAccess ?? '-'}</td>
                <td style={{ ...cellStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tag.description ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
