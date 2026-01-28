import { useState, useCallback, useMemo } from 'react';
import { Tab, TabData, generateTabId } from './TabBar';

export interface UseTabsResult {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (data: TabData, title: string) => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  getActiveTabData: () => TabData | null;
  findTab: (tabId: string) => Tab | undefined;
}

export function useTabs(): UseTabsResult {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  /**
   * Open a new tab or switch to an existing one
   */
  const openTab = useCallback((data: TabData, title: string) => {
    const id = generateTabId(data);
    
    setTabs((prevTabs) => {
      const existingTab = prevTabs.find(t => t.id === id);
      if (existingTab) {
        // Tab already exists, just activate it
        return prevTabs;
      }
      
      // Create new tab
      const newTab: Tab = {
        id,
        type: data.type,
        title,
        data,
      };
      
      return [...prevTabs, newTab];
    });
    
    // Always activate the tab
    setActiveTabId(id);
  }, []);

  /**
   * Close a tab
   */
  const closeTab = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const tabIndex = prevTabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prevTabs;
      
      const newTabs = prevTabs.filter(t => t.id !== tabId);
      
      // If we're closing the active tab, activate an adjacent tab
      if (tabId === activeTabId && newTabs.length > 0) {
        // Try to activate the tab to the right, or the one to the left
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  /**
   * Select/activate a tab
   */
  const selectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  /**
   * Close all tabs
   */
  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  /**
   * Close all tabs except the specified one
   */
  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const tab = prevTabs.find(t => t.id === tabId);
      if (!tab) return prevTabs;
      return [tab];
    });
    setActiveTabId(tabId);
  }, []);

  /**
   * Get the data of the currently active tab
   */
  const getActiveTabData = useCallback((): TabData | null => {
    if (!activeTabId) return null;
    const activeTab = tabs.find(t => t.id === activeTabId);
    return activeTab?.data || null;
  }, [activeTabId, tabs]);

  /**
   * Find a tab by ID
   */
  const findTab = useCallback((tabId: string): Tab | undefined => {
    return tabs.find(t => t.id === tabId);
  }, [tabs]);

  return useMemo(() => ({
    tabs,
    activeTabId,
    openTab,
    closeTab,
    selectTab,
    closeAllTabs,
    closeOtherTabs,
    getActiveTabData,
    findTab,
  }), [tabs, activeTabId, openTab, closeTab, selectTab, closeAllTabs, closeOtherTabs, getActiveTabData, findTab]);
}
