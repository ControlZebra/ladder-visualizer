import React, { useState, useMemo } from 'react';
import type { AOIParameter } from '../types';

export interface AOIParameterTableProps {
  parameters: AOIParameter[];
}

export function AOIParameterTable({ parameters }: AOIParameterTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof AOIParameter>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredAndSorted = useMemo(() => {
    let result = parameters;

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (param) =>
          param.name.toLowerCase().includes(lowerFilter) ||
          param.dataType.toLowerCase().includes(lowerFilter) ||
          param.usage.toLowerCase().includes(lowerFilter)
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
  }, [parameters, filter, sortBy, sortAsc]);

  const handleSort = (column: keyof AOIParameter) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const getSortIndicator = (column: keyof AOIParameter) => {
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

  const usageBadgeStyle = (usage: string): React.CSSProperties => ({
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: usage === 'Input' ? '#e8f5e9' : usage === 'Output' ? '#ffebee' : '#e3f2fd',
    color: usage === 'Input' ? '#2e7d32' : usage === 'Output' ? '#c62828' : '#1565c0',
  });

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Filter parameters..."
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
          {filteredAndSorted.length} of {parameters.length} parameters
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
              <th style={headerStyle} onClick={() => handleSort('usage')}>
                Usage{getSortIndicator('usage')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('required')}>
                Required{getSortIndicator('required')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('visible')}>
                Visible{getSortIndicator('visible')}
              </th>
              <th style={headerStyle} onClick={() => handleSort('externalAccess')}>
                Access{getSortIndicator('externalAccess')}
              </th>
              <th style={headerStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((param) => (
              <tr key={param.name}>
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontWeight: 500 }}>{param.name}</td>
                <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{param.dataType}</td>
                <td style={cellStyle}>
                  <span style={usageBadgeStyle(param.usage)}>{param.usage}</span>
                </td>
                <td style={cellStyle}>{param.required ? '✓' : '-'}</td>
                <td style={cellStyle}>{param.visible ? '✓' : '-'}</td>
                <td style={cellStyle}>{param.externalAccess ?? '-'}</td>
                <td style={{ ...cellStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {param.description ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
