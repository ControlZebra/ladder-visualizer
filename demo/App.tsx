import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  parseFile,
  VirtualizedLadderDiagram,
  TagTable,
  ControllerInfo,
  ProgramNavigator,
  jsonToNormalized,
  AOIParameterTable,
  AOILocalTagTable,
  StructuredTextViewer,
  ModuleInfoTable,
  registerAOIsFromController,
  clearAOIs,
} from '../src';
import type { 
  NormalizedController,
  NormalizedRoutine,
  NormalizedDataType,
  NormalizedAOI,
  NormalizedModule,
} from '../src';
import { DataTypeTable } from './DataTypeTable';
import { TabBar, TabData } from './TabBar';
import { useTabs } from './useTabs';

// Import the sample data
import controllerData from '../examples/controller_output.json';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [controller, setController] = useState<NormalizedController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab management
  const { tabs, activeTabId, openTab, closeTab, selectTab, closeAllTabs } = useTabs();

  // Load demo data on mount
  useEffect(() => {
    try {
      const normalized = jsonToNormalized(controllerData);
      // Register AOIs from the parsed controller for proper parameter label display
      clearAOIs();
      registerAOIsFromController(normalized);
      setController(normalized);
      setFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse controller data');
    }
  }, []);

  /**
   * Handle file upload - supports both JSON and L5X formats
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await parseFile(file);
      
      if (result.success && result.data) {
        setController(result.data);
        setFileName(file.name);
        closeAllTabs();
      } else {
        const errorMsg = result.errors?.map(e => e.message).join(', ') || 'Failed to parse file';
        setError(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
      // Reset file input to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [closeAllTabs, openTab]);

  /**
   * Load demo data (reset to default)
   */
  const handleLoadDemo = useCallback(() => {
    try {
      const normalized = jsonToNormalized(controllerData);
      // Register AOIs from the parsed controller for proper parameter label display
      clearAOIs();
      registerAOIsFromController(normalized);
      setController(normalized);
      setFileName(null);
      setError(null);
      closeAllTabs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data');
    }
  }, [closeAllTabs, openTab]);

  // Get active tab data for navigator highlight
  const activeTabData = useMemo(() => {
    if (!activeTabId) return null;
    const tab = tabs.find(t => t.id === activeTabId);
    return tab?.data || null;
  }, [activeTabId, tabs]);

  // Derive selected routine from active tab for navigator
  const selectedRoutine = useMemo(() => {
    if (activeTabData?.type === 'routine') {
      return { programIndex: activeTabData.programIndex, routineIndex: activeTabData.routineIndex };
    }
    return null;
  }, [activeTabData]);

  // Derive selected AOI routine from active tab for navigator
  const selectedAOIRoutine = useMemo(() => {
    if (activeTabData?.type === 'aoi-routine') {
      return { aoiName: activeTabData.aoiName, routineIndex: activeTabData.routineIndex };
    }
    return null;
  }, [activeTabData]);

  // Get all data types for DataTypeTable
  const allDataTypes = useMemo(() => {
    if (!controller) return [];
    return controller.dataTypes;
  }, [controller]);

  /**
   * Render content for a specific tab
   */
  const renderTabContent = useCallback((tabData: TabData, isActive: boolean) => {
    if (!controller) return null;

    // Use visibility to keep inactive tabs mounted but hidden
    const containerStyle: React.CSSProperties = {
      display: isActive ? 'flex' : 'none',
      flex: 1,
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
    };

    switch (tabData.type) {
      case 'controller-tags':
        return (
          <div key="controller-tags" style={containerStyle}>
            <div style={styles.infoPanelContent}>
              <TagTable tags={controller.tags} />
            </div>
          </div>
        );
      case 'program-tags': {
        const program = controller.programs[tabData.programIndex];
        const tags = program?.tags ?? [];
        return (
          <div key={`program-tags-${tabData.programIndex}`} style={containerStyle}>
            <div style={styles.infoPanelContent}>
              {tags.length > 0 ? (
                <TagTable tags={tags} />
              ) : (
                <p style={styles.noSelection}>No program-specific tags defined</p>
              )}
            </div>
          </div>
        );
      }
      case 'controller-info':
        return (
          <div key="controller-info" style={containerStyle}>
            <div style={styles.infoPanelContent}>
              <ControllerInfo controller={controller} />
            </div>
          </div>
        );
      case 'data-type': {
        const dataType = controller.dataTypes.find(dt => dt.name === tabData.dataTypeName);
        if (dataType) {
          return (
            <div key={`data-type-${tabData.dataTypeName}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <DataTypeTable dataType={dataType} allDataTypes={allDataTypes} />
              </div>
            </div>
          );
        }
        return (
          <div key={`data-type-${tabData.dataTypeName}`} style={containerStyle}>
            <p style={styles.noSelection}>Data type not found</p>
          </div>
        );
      }
      case 'aoi-parameters': {
        const aoi = controller.aois.find(a => a.name === tabData.aoiName);
        if (aoi) {
          return (
            <div key={`aoi-parameters-${tabData.aoiName}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <AOIParameterTable parameters={aoi.parameters} />
              </div>
            </div>
          );
        }
        return (
          <div key={`aoi-parameters-${tabData.aoiName}`} style={containerStyle}>
            <p style={styles.noSelection}>AOI not found</p>
          </div>
        );
      }
      case 'aoi-local-tags': {
        const aoi = controller.aois.find(a => a.name === tabData.aoiName);
        if (aoi) {
          return (
            <div key={`aoi-local-tags-${tabData.aoiName}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <AOILocalTagTable localTags={aoi.localTags} />
              </div>
            </div>
          );
        }
        return (
          <div key={`aoi-local-tags-${tabData.aoiName}`} style={containerStyle}>
            <p style={styles.noSelection}>AOI not found</p>
          </div>
        );
      }
      case 'aoi-routine': {
        const aoi = controller.aois.find(a => a.name === tabData.aoiName);
        const routine = aoi?.routines[tabData.routineIndex];
        if (aoi && routine) {
          const isSTRoutine = routine.type === 'ST';
          const isRLLRoutine = routine.type === 'RLL';
          
          // Show unsupported format notice for FBD, SFC, and other non-supported types
          if (!isSTRoutine && !isRLLRoutine) {
            return (
              <div key={`aoi-routine-${tabData.aoiName}-${tabData.routineIndex}`} style={containerStyle}>
                <div style={styles.emptyState}>
                  <p style={styles.emptyStateTitle}>{routine.type} Visualization Not Supported</p>
                  <p style={styles.emptyStateText}>
                    {routine.type === 'FBD' 
                      ? 'Function Block Diagram (FBD) visualization is not yet supported'
                      : routine.type === 'SFC'
                        ? 'Sequential Function Chart (SFC) visualization is not yet supported'
                        : `${routine.type} routine visualization is not yet supported`
                    }
                  </p>
                </div>
              </div>
            );
          }
          
          return (
            <div key={`aoi-routine-${tabData.aoiName}-${tabData.routineIndex}`} style={containerStyle}>
              <div style={styles.ladderContent}>
                {isSTRoutine ? (
                  <StructuredTextViewer
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <VirtualizedLadderDiagram
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </div>
          );
        }
        return (
          <div key={`aoi-routine-${tabData.aoiName}-${tabData.routineIndex}`} style={containerStyle}>
            <p style={styles.noSelection}>AOI routine not found</p>
          </div>
        );
      }
      case 'routine': {
        const routine = controller.programs[tabData.programIndex]?.routines[tabData.routineIndex];
        if (routine) {
          const isSTRoutine = routine.type === 'ST';
          const isRLLRoutine = routine.type === 'RLL';
          
          // Show unsupported format notice for FBD, SFC, and other non-supported types
          if (!isSTRoutine && !isRLLRoutine) {
            return (
              <div key={`routine-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
                <div style={styles.emptyState}>
                  <p style={styles.emptyStateTitle}>{routine.type} Visualization Not Supported</p>
                  <p style={styles.emptyStateText}>
                    {routine.type === 'FBD' 
                      ? 'Function Block Diagram (FBD) visualization is not yet supported'
                      : routine.type === 'SFC'
                        ? 'Sequential Function Chart (SFC) visualization is not yet supported'
                        : `${routine.type} routine visualization is not yet supported`
                    }
                  </p>
                </div>
              </div>
            );
          }
          
          return (
            <div key={`routine-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
              <div style={styles.ladderContent}>
                {isSTRoutine ? (
                  <StructuredTextViewer
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <VirtualizedLadderDiagram
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </div>
          );
        }
        return (
          <div key={`routine-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
            <p style={styles.noSelection}>Routine not found</p>
          </div>
        );
      }
      case 'module': {
        const module = controller.modules.find(m => m.id === tabData.moduleId);
        if (module) {
          return (
            <div key={`module-${tabData.moduleId}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <ModuleInfoTable module={module} />
              </div>
            </div>
          );
        }
        return (
          <div key={`module-${tabData.moduleId}`} style={containerStyle}>
            <p style={styles.noSelection}>Module not found</p>
          </div>
        );
      }
      default:
        return null;
    }
  }, [controller, allDataTypes]);

  // Render main content based on active tab
  const renderMainContent = () => {
    if (!controller) return null;

    if (tabs.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateTitle}>No Content Selected</p>
          <p style={styles.emptyStateText}>Select an item from the navigation panel to view its contents</p>
        </div>
      );
    }

    // Render all tabs (keeping inactive ones mounted but hidden for performance)
    return (
      <>
        {tabs.map(tab => renderTabContent(tab.data, tab.id === activeTabId))}
      </>
    );
  };

  // Event handlers for navigator selections
  const handleRoutineSelect = useCallback((programIndex: number, routineIndex: number, routine: NormalizedRoutine) => {
    openTab(
      { type: 'routine', programIndex, routineIndex },
      routine.name
    );
  }, [openTab]);

  const handleControllerTagsSelect = useCallback(() => {
    openTab({ type: 'controller-tags' }, 'Controller Tags');
  }, [openTab]);

  const handleProgramTagsSelect = useCallback((programIndex: number) => {
    if (!controller) return;
    const program = controller.programs[programIndex];
    openTab(
      { type: 'program-tags', programIndex, programName: program.name },
      `${program.name} Tags`
    );
  }, [controller, openTab]);

  const handleControllerInfoSelect = useCallback(() => {
    openTab({ type: 'controller-info' }, 'Controller Info');
  }, [openTab]);

  const handleDataTypeSelect = useCallback((dataType: NormalizedDataType) => {
    openTab(
      { type: 'data-type', dataTypeName: dataType.name },
      dataType.name
    );
  }, [openTab]);

  const handleAOIParametersSelect = useCallback((aoi: NormalizedAOI) => {
    openTab(
      { type: 'aoi-parameters', aoiName: aoi.name },
      `${aoi.name} Parameters`
    );
  }, [openTab]);

  const handleAOILocalTagsSelect = useCallback((aoi: NormalizedAOI) => {
    openTab(
      { type: 'aoi-local-tags', aoiName: aoi.name },
      `${aoi.name} Local Tags`
    );
  }, [openTab]);

  const handleAOIRoutineSelect = useCallback((aoi: NormalizedAOI, routineIndex: number, routine: NormalizedRoutine) => {
    openTab(
      { type: 'aoi-routine', aoiName: aoi.name, routineIndex },
      `${aoi.name}:${routine.name}`
    );
  }, [openTab]);

  const handleModuleSelect = useCallback((module: NormalizedModule) => {
    openTab(
      { type: 'module', moduleId: module.id, moduleName: module.name },
      module.catalogNumber ? `${module.name} (${module.catalogNumber})` : module.name
    );
  }, [openTab]);

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h1 style={styles.errorTitle}>Error Loading Controller Data</h1>
        <p style={styles.errorMessage}>{error}</p>
        <div style={styles.errorActions}>
          <button style={styles.button} onClick={handleLoadDemo}>
            Load Demo Data
          </button>
          <label style={styles.buttonLabel}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.l5x,.L5X"
              style={{ display: 'none' }}
            />
            <span style={styles.button}>Upload File</span>
          </label>
        </div>
      </div>
    );
  }

  if (!controller || isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <p>{isLoading ? 'Parsing file...' : 'Loading controller data...'}</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* Header with file controls */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Ladder Logic Visualizer</h1>
          {fileName ? (
            <span style={styles.fileName}>{fileName}</span>
          ) : (
            <span style={styles.fileName}>Demo Data</span>
          )}
        </div>
        <div style={styles.headerRight}>
          <button style={styles.headerButton} onClick={handleLoadDemo}>
            Load Demo
          </button>
          <label style={styles.uploadLabel}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.l5x,.L5X"
              style={{ display: 'none' }}
            />
            <span style={styles.headerButton}>Upload File</span>
          </label>
          <span style={styles.formatHint}>.json, .l5x</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.ladderLayout}>
          {/* Sidebar */}
          <aside style={styles.sidebar}>
            <ProgramNavigator
              controller={controller}
              programs={controller.programs}
              selectedRoutine={selectedRoutine ?? undefined}
              selectedAOIRoutine={selectedAOIRoutine ?? undefined}
              onRoutineSelect={handleRoutineSelect}
              onControllerTagsSelect={handleControllerTagsSelect}
              onProgramTagsSelect={handleProgramTagsSelect}
              onControllerInfoSelect={handleControllerInfoSelect}
              onDataTypeSelect={handleDataTypeSelect}
              onModuleSelect={handleModuleSelect}
              onAOIParametersSelect={handleAOIParametersSelect}
              onAOILocalTagsSelect={handleAOILocalTagsSelect}
              onAOIRoutineSelect={handleAOIRoutineSelect}
            />
          </aside>

          {/* Main Content Area */}
          <div style={styles.diagramContainer}>
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={selectTab}
              onTabClose={closeTab}
            />
            <div style={styles.tabContent}>
              {renderMainContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Studio 5000-inspired color scheme
const colors = {
  primary: '#2b579a',
  primaryDark: '#1e3f6f',
  secondary: '#4a7c59',
  background: '#e8e8e8',
  surface: '#ffffff',
  border: '#c0c0c0',
  text: '#333333',
  textLight: '#666666',
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    height: '100%',
    backgroundColor: colors.background,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.primaryDark,
    color: 'white',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `2px solid ${colors.primary}`,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  fileName: {
    fontSize: '12px',
    opacity: 0.9,
    padding: '2px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '3px',
  },
  headerButton: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  },
  uploadLabel: {
    display: 'inline-block',
    cursor: 'pointer',
  },
  formatHint: {
    fontSize: '11px',
    opacity: 0.7,
    marginLeft: '4px',
  },
  main: {
    flex: 1,
    padding: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  ladderLayout: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  diagramContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
  },
  tabContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    position: 'relative' as const,
  },
  ladderContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },
  noSelection: {
    color: colors.textLight,
    textAlign: 'center',
    padding: '40px',
    fontSize: '13px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
    backgroundColor: '#f5f5f5',
  },
  emptyStateTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#666666',
    marginBottom: '8px',
  },
  emptyStateText: {
    fontSize: '13px',
    color: '#999999',
    textAlign: 'center',
    maxWidth: '300px',
    lineHeight: 1.5,
  },
  infoPanelContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '12px',
    minHeight: 0,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '14px',
    color: colors.textLight,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '24px',
  },
  errorTitle: {
    color: '#d32f2f',
    marginBottom: '16px',
  },
  errorMessage: {
    color: colors.textLight,
    maxWidth: '600px',
    textAlign: 'center',
    fontSize: '13px',
    marginBottom: '20px',
  },
  errorActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  buttonLabel: {
    display: 'inline-block',
    cursor: 'pointer',
  },
};
