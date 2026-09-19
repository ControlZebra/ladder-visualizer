import { describe, expect, it } from 'vitest';
import { buildFBDFlowModel } from '../../src/components/fbd/FBDDiagram';
import { buildFBDSheetLayout } from '../../src/layout';
import { DEFAULT_THEME } from '../../src/types';
import { createFBDBenchmarkBody } from '../fixtures/fbdBenchmark';

describe('FBD production workload', () => {
  it('builds the 150-element/600-port layout and flow model within 200 ms', () => {
    const sheet = createFBDBenchmarkBody().sheets[0];
    const portCount = sheet.elements.reduce(
      (count, element) => count + ('ports' in element ? element.ports.length : 0),
      0,
    );
    const startedAt = performance.now();
    const layout = buildFBDSheetLayout(sheet);
    const model = buildFBDFlowModel(layout, DEFAULT_THEME);
    const elapsed = performance.now() - startedAt;

    expect(sheet.elements).toHaveLength(150);
    expect(portCount).toBe(600);
    expect(model.nodes).toHaveLength(150);
    expect(model.edges).toHaveLength(149);
    expect(elapsed).toBeLessThan(200);
  });
});
