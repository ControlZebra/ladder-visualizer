import React, { useState, useMemo } from 'react';
import type { Tag, NormalizedTag } from '../types';

/**
 * Internal unified tag format used by TagTable
 */
interface UnifiedTag {
  name: string;
  tagType: string;
  dataType: string;
  radix?: string;
  externalAccess?: string;
  description?: string;
}

/**
 * Check if a tag is in NormalizedTag format
 */
function isNormalizedTag(tag: Tag | NormalizedTag): tag is NormalizedTag {
  return 'tagType' in tag && 'dataType' in tag;
}

/**
 * Convert legacy Tag to unified format
 */
function legacyTagToUnified(tag: Tag): UnifiedTag {
  return {
    name: tag.name,
    tagType: tag.tag_type,
    dataType: tag.data_type,
    radix: tag.radix,
    externalAccess: tag.external_access,
  };
}

/**
 * Convert NormalizedTag to unified format
 */
function normalizedTagToUnified(tag: NormalizedTag): UnifiedTag {
  return {
    name: tag.name,
    tagType: tag.tagType,
    dataType: tag.dataType,
    radix: tag.radix,
    externalAccess: tag.externalAccess,
    description: tag.description,
  };
}

export interface TagTableProps {
  /** 
   * Array of tags to display. 
   * Accepts both legacy Tag[] and NormalizedTag[] formats.
   */
  tags: Tag[] | NormalizedTag[];
  /** Optional CSS class name */
  className?: string;
  /** 
   * Callback when a tag is selected.
   * Returns the tag in unified format.
   * @deprecated Use onNormalizedTagSelect for NormalizedTag callback
   */
  onTagSelect?: (tag: Tag | NormalizedTag) => void;
}

/**
 * React component that renders a sortable, filterable table of PLC tags.
 * Supports both legacy Tag[] and NormalizedTag[] formats.
 */
export function TagTable({ tags, className = '', onTagSelect }: TagTableProps) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof UnifiedTag>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Convert all tags to unified format for internal processing
  const unifiedTags = useMemo(() => {
    return tags.map((tag) => {
      if (isNormalizedTag(tag as Tag | NormalizedTag)) {
        return normalizedTagToUnified(tag as NormalizedTag);
      }
      return legacyTagToUnified(tag as Tag);
    });
  }, [tags]);

  const filteredAndSorted = useMemo(() => {
    let result = unifiedTags;

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
  }, [unifiedTags, filter, sortBy, sortAsc]);

  const handleSort = (column: keyof UnifiedTag) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const getSortIndicator = (column: keyof UnifiedTag) => {
    if (sortBy !== column) return '';
    return sortAsc ? ' ▲' : ' ▼';
  };

  // Find original tag by name for callback
  const handleTagClick = (unifiedTag: UnifiedTag) => {
    if (onTagSelect) {
      const originalTag = tags.find((t) => 
        isNormalizedTag(t as Tag | NormalizedTag) 
          ? (t as NormalizedTag).name === unifiedTag.name 
          : (t as Tag).name === unifiedTag.name
      );
      if (originalTag) {
        onTagSelect(originalTag as Tag | NormalizedTag);
      }
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
