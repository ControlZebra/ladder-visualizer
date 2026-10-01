import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FBDDiffDiagram } from '../../src/components';
import { parseString } from '../../src/parsers';
import { DARK_THEME, DEFAULT_THEME } from '../../src/types';
import { changedFBDRevision } from '../fixtures/fbdDiff';
import fixture from '../fixtures/l5x/fbd-level-control-v35.L5X?raw';
import '../../src/styles/index.css';

const query = new URLSearchParams(window.location.search);
const parsed = parseString(fixture, 'l5x');
const original = parsed.data?.programs[0].routines[0].fbd;
if (!original) throw new Error('Expected export-derived FBD body');
const revised = query.has('unchanged') ? structuredClone(original) : changedFBDRevision(original);
if (query.has('ambiguous')) revised.sheets[1].number = { ...revised.sheets[0].number };
if (query.has('reordered')) revised.sheets.reverse();
if (query.has('added')) revised.sheets[1].number.value = '3';
if (query.has('degraded'))
  revised.sheets[0].elements.push({
    kind: 'placeholder',
    id: '999',
    ports: [],
    position: { x: '40', y: '570' },
    sourceKind: 'Unsupported block',
    reasonCodes: ['unsupported-kind'],
  });
if (query.has('wide-label')) {
  for (const revision of [original, revised]) {
    const block = revision.sheets[0].elements.find((element) => element.id === '2');
    if (block?.kind === 'block')
      block.operand = revision === original ? 'WWWWWWWWWW' : 'MMMMMMMMMM';
  }
}
const theme = query.get('theme') === 'dark' ? DARK_THEME : DEFAULT_THEME;
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div id="stage" style={{ background: theme.bgPrimary }}>
      <FBDDiffDiagram
        oldBody={query.has('new-only') ? undefined : original}
        newBody={query.has('old-only') ? undefined : revised}
        theme={theme}
        height="100%"
      />
    </div>
  </StrictMode>
);
