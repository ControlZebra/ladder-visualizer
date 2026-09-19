import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FBDDiagram } from '../../src/components';
import { parseString } from '../../src/parsers';
import { DARK_THEME, DEFAULT_THEME } from '../../src/types';
import fixture from '../fixtures/l5x/fbd-level-control-v35.L5X?raw';

const result = parseString(fixture, 'l5x');
const body = result.data?.programs[0]?.routines.find((routine) => routine.name === 'MainFBD')?.fbd;
if (!body) throw new Error('The level-control fixture did not produce an FBD body.');

const query = new URLSearchParams(window.location.search);
const sheetIndex = Number(query.get('sheet') ?? '0');
const dark = query.get('theme') === 'dark';
const theme = dark ? DARK_THEME : DEFAULT_THEME;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div id="stage" style={{ background: theme.bgPrimary }}>
      <FBDDiagram body={body} sheetIndex={sheetIndex} width={1240} height={780} theme={theme} />
    </div>
  </StrictMode>
);
