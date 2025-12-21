import React, { useState, useEffect, useMemo } from 'react';
import {
  parseControllerExport,
  parseRoutine,
  LadderDiagram,
  TagTable,
  ControllerInfo,
  ProgramNavigator,
} from '../src';
import type { ControllerExport, Routine, ParsedRoutine } from '../src';

// Import the sample data
import controllerData from '../examples/controller_output.json';

type Tab = 'ladder' | 'tags' | 'info';

export default function App() {
  const [controller, setController] = useState<ControllerExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('ladder');
  const [selectedRoutine, setSelectedRoutine] = useState<{
    programIndex: number;
    routineIndex: number;
  } | null>(null);

  // Parse controller data on mount
  useEffect(() => {
    try {
      const parsed = parseControllerExport(controllerData);
      setController(parsed);
      // Select first routine by default
      if (parsed.programs.length > 0 && parsed.programs[0].routines.length > 0) {
        setSelectedRoutine({ programIndex: 0, routineIndex: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse controller data');
    }
  }, []);

  // Parse the selected routine
  const parsedRoutine: ParsedRoutine | null = useMemo(() => {
    if (!controller || !selectedRoutine) return null;
    const routine = controller.programs[selectedRoutine.programIndex]?.routines[selectedRoutine.routineIndex];
    if (!routine) return null;
    return parseRoutine(routine);
  }, [controller, selectedRoutine]);

  const handleRoutineSelect = (programIndex: number, routineIndex: number, _routine: Routine) => {
    setSelectedRoutine({ programIndex, routineIndex });
    setActiveTab('ladder');
  };

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h1 style={styles.errorTitle}>Error Loading Controller Data</h1>
        <p style={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  if (!controller) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading controller data...</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>PLC Ladder Logic Visualizer</h1>
        <p style={styles.subtitle}>Allen-Bradley/Rockwell Controller Export Viewer</p>
      </header>

      {/* Tab Navigation */}
      <nav style={styles.nav}>
        <button
          style={activeTab === 'ladder' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('ladder')}
        >
          Ladder Diagram
        </button>
        <button
          style={activeTab === 'tags' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('tags')}
        >
          Tags ({controller.tags.length})
        </button>
        <button
          style={activeTab === 'info' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('info')}
        >
          Controller Info
        </button>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {activeTab === 'ladder' && (
          <div style={styles.ladderLayout}>
            {/* Sidebar */}
            <aside style={styles.sidebar}>
              <ProgramNavigator
                programs={controller.programs}
                selectedRoutine={selectedRoutine ?? undefined}
                onRoutineSelect={handleRoutineSelect}
              />
            </aside>

            {/* Diagram */}
            <div style={styles.diagramContainer}>
              {parsedRoutine ? (
                <>
                  <h2 style={styles.routineTitle}>
                    {parsedRoutine.name}
                    <span style={styles.routineBadge}>{parsedRoutine.type}</span>
                    <span style={styles.routineCount}>{parsedRoutine.rungs.length} rungs</span>
                  </h2>
                  <LadderDiagram
                    routine={parsedRoutine}
                    width={1000}
                    style={{ maxHeight: 'calc(100vh - 250px)' }}
                  />
                </>
              ) : (
                <p style={styles.noSelection}>Select a routine from the sidebar</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div style={styles.contentPanel}>
            <h2 style={styles.sectionTitle}>Controller Tags</h2>
            <TagTable tags={controller.tags} />
          </div>
        )}

        {activeTab === 'info' && (
          <div style={styles.contentPanel}>
            <ControllerInfo controller={controller} />
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976d2',
    color: 'white',
    padding: '16px 24px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  nav: {
    display: 'flex',
    gap: '0',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '0 24px',
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    background: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#666',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    padding: '12px 20px',
    border: 'none',
    background: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#1976d2',
    fontWeight: 600,
    borderBottom: '2px solid #1976d2',
  },
  main: {
    padding: '24px',
  },
  ladderLayout: {
    display: 'flex',
    gap: '24px',
  },
  sidebar: {
    width: '280px',
    flexShrink: 0,
  },
  diagramContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e0e0e0',
  },
  routineTitle: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  routineBadge: {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
  },
  routineCount: {
    fontSize: '12px',
    color: '#666',
  },
  noSelection: {
    color: '#999',
    textAlign: 'center',
    padding: '40px',
  },
  contentPanel: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    border: '1px solid #e0e0e0',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '18px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#666',
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
    color: '#666',
    maxWidth: '600px',
    textAlign: 'center',
  },
};
