import React, { useCallback, useState } from 'react';

// ============================================================================
// TAB TYPES AND INTERFACES
// ============================================================================

export type TabType = 
  | 'routine' 
  | 'controller-tags' 
  | 'program-tags' 
  | 'controller-info' 
  | 'data-type' 
  | 'aoi-parameters' 
  | 'aoi-local-tags' 
  | 'aoi-routine';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  // Context data for rendering the tab content
  data: TabData;
}

export type TabData = 
  | { type: 'routine'; programIndex: number; routineIndex: number }
  | { type: 'controller-tags' }
  | { type: 'program-tags'; programIndex: number; programName: string }
  | { type: 'controller-info' }
  | { type: 'data-type'; dataTypeName: string }
  | { type: 'aoi-parameters'; aoiName: string }
  | { type: 'aoi-local-tags'; aoiName: string }
  | { type: 'aoi-routine'; aoiName: string; routineIndex: number };

// ============================================================================
// TAB ID GENERATORS
// ============================================================================

export function generateTabId(data: TabData): string {
  switch (data.type) {
    case 'routine':
      return `routine-${data.programIndex}-${data.routineIndex}`;
    case 'controller-tags':
      return 'controller-tags';
    case 'program-tags':
      return `program-tags-${data.programIndex}`;
    case 'controller-info':
      return 'controller-info';
    case 'data-type':
      return `data-type-${data.dataTypeName}`;
    case 'aoi-parameters':
      return `aoi-parameters-${data.aoiName}`;
    case 'aoi-local-tags':
      return `aoi-local-tags-${data.aoiName}`;
    case 'aoi-routine':
      return `aoi-routine-${data.aoiName}-${data.routineIndex}`;
  }
}

// ============================================================================
// TAB BAR COMPONENT
// ============================================================================

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onMiddleClick: (e: React.MouseEvent) => void;
}

function TabItem({ tab, isActive, onSelect, onClose, onMiddleClick }: TabItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  return (
    <div
      style={{
        ...styles.tab,
        ...(isActive ? styles.activeTab : {}),
        ...(isHovered && !isActive ? styles.tabHover : {}),
      }}
      onClick={onSelect}
      onMouseDown={onMiddleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={tab.title}
    >
      <span style={styles.tabTitle}>{tab.title}</span>
      <button
        style={{
          ...styles.closeButton,
          ...(isHovered || isActive ? styles.closeButtonVisible : {}),
          ...(isCloseHovered ? styles.closeButtonHover : {}),
        }}
        onClick={handleCloseClick}
        onMouseEnter={() => setIsCloseHovered(true)}
        onMouseLeave={() => setIsCloseHovered(false)}
        title="Close tab"
      >
        ×
      </button>
    </div>
  );
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabSelect, onTabClose }: TabBarProps) {
  const handleMiddleClick = useCallback((e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      onTabClose(tabId);
    }
  }, [onTabClose]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div style={styles.tabBarContainer}>
      <div style={styles.tabBar}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => onTabSelect(tab.id)}
            onClose={() => onTabClose(tab.id)}
            onMiddleClick={(e) => handleMiddleClick(e, tab.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  background: '#e8e8e8',
  surface: '#ffffff',
  border: '#c0c0c0',
  text: '#333333',
  textLight: '#666666',
};

const styles: Record<string, React.CSSProperties> = {
  tabBarContainer: {
    backgroundColor: '#1e3f6f',
    borderBottom: `1px solid #2b579a`,
    flexShrink: 0,
  },
  tabBar: {
    display: 'flex',
    overflowX: 'auto',
    overflowY: 'hidden',
    gap: '1px',
    padding: '4px 4px 0 4px',
    scrollbarWidth: 'thin',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 6px 6px 10px',
    backgroundColor: '#d8d8d8',
    border: `1px solid ${colors.border}`,
    borderBottom: 'none',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
    fontSize: '12px',
    color: colors.textLight,
    maxWidth: '200px',
    minWidth: '100px',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
    position: 'relative' as const,
    marginBottom: '-1px',
  },
  activeTab: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderBottomColor: colors.surface,
    fontWeight: 500,
  },
  tabHover: {
    backgroundColor: '#e0e0e0',
  },
  tabTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    userSelect: 'none' as const,
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textLight,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    borderRadius: '3px',
    flexShrink: 0,
    lineHeight: 1,
    opacity: 0,
    transition: 'opacity 0.15s ease, background-color 0.15s ease',
  },
  closeButtonVisible: {
    opacity: 0.6,
  },
  closeButtonHover: {
    opacity: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
};
