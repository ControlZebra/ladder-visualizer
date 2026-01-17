import React, { useState, useEffect, useMemo } from 'react';
import {
  parseControllerExport,
  parseRoutine,
  LadderDiagram,
  VirtualizedLadderDiagram,
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
  const [useVirtualized, setUseVirtualized] = useState(true);
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
      {/* Header - Studio 5000 style compact toolbar */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={styles.title}>Ladder Logic Visualizer</h1>
          <span style={styles.subtitle}>│ Allen-Bradley/Rockwell</span>
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          {controller.modified_date && `Last Modified: ${controller.modified_date}`}
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={styles.nav}>
        <button
          style={activeTab === 'ladder' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('ladder')}
        >
          📊 Ladder Diagram
        </button>
        <button
          style={activeTab === 'tags' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('tags')}
        >
          🏷️ Tags ({controller.tags.length})
        </button>
        <button
          style={activeTab === 'info' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('info')}
        >
          ⚙️ Controller Info
        </button>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {activeTab === 'ladder' && (
          <div style={styles.ladderLayout}>
            {/* Sidebar */}
            <aside style={styles.sidebar}>
              <ProgramNavigator
                controller={controller}
                programs={controller.programs}
                selectedRoutine={selectedRoutine ?? undefined}
                onRoutineSelect={handleRoutineSelect}
              />
            </aside>

            {/* Diagram */}
            <div style={styles.diagramContainer}>
              {parsedRoutine ? (
                <>
                  <div style={styles.routineTitle}>
                    <span style={{ fontWeight: 600 }}>{parsedRoutine.name}</span>
                    <span style={styles.routineBadge}>{parsedRoutine.type}</span>
                    <span style={styles.routineCount}>{parsedRoutine.rungs.length} rungs</span>
                    <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={useVirtualized}
                        onChange={(e) => setUseVirtualized(e.target.checked)}
                      />
                      Use Virtualized (React SVG)
                    </label>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', padding: '0' }}>
                    {useVirtualized ? (
                      <VirtualizedLadderDiagram
                        routine={parsedRoutine}
                        width={900}
                        height={500}
                        style={{ minHeight: '100%' }}
                      />
                    ) : (
                      <div style={{ overflow: 'auto', height: '100%' }}>
                        <LadderDiagram
                          routine={parsedRoutine}
                          width={900}
                          style={{ minHeight: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p style={styles.noSelection}>Select a routine from the Controller Organizer</p>
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

// Studio 5000-inspired color scheme
const colors = {
  primary: '#2b579a',        // Deep blue (Studio 5000 accent)
  primaryDark: '#1e3f6f',    // Darker blue for header
  secondary: '#4a7c59',      // Green accent (for controller icon)
  background: '#e8e8e8',     // Light gray background
  surface: '#ffffff',        // White surface
  border: '#c0c0c0',         // Gray border
  text: '#333333',           // Dark text
  textLight: '#666666',      // Light text
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: colors.background,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    backgroundColor: colors.primaryDark,
    color: 'white',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `2px solid ${colors.primary}`,
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  subtitle: {
    margin: '0 0 0 12px',
    fontSize: '12px',
    opacity: 0.8,
  },
  nav: {
    display: 'flex',
    gap: '0',
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    padding: '0 8px',
  },
  tab: {
    padding: '8px 16px',
    border: 'none',
    background: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    color: colors.textLight,
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    padding: '8px 16px',
    border: 'none',
    background: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    color: colors.primary,
    fontWeight: 600,
    borderBottom: `2px solid ${colors.primary}`,
  },
  main: {
    padding: '8px',
    height: 'calc(100vh - 90px)',
    overflow: 'hidden',
  },
  ladderLayout: {
    display: 'flex',
    gap: '8px',
    height: '100%',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    overflow: 'auto',
  },
  diagramContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  routineTitle: {
    margin: 0,
    padding: '8px 12px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f5f5f5',
    borderBottom: `1px solid ${colors.border}`,
  },
  routineBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: colors.primary,
    color: 'white',
    borderRadius: '2px',
  },
  routineCount: {
    fontSize: '11px',
    color: colors.textLight,
    marginLeft: 'auto',
  },
  noSelection: {
    color: colors.textLight,
    textAlign: 'center',
    padding: '40px',
    fontSize: '13px',
  },
  contentPanel: {
    backgroundColor: colors.surface,
    padding: '16px',
    border: `1px solid ${colors.border}`,
    height: '100%',
    overflow: 'auto',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: 600,
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
  },
};
