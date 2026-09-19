// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { NormalizedFBDBody } from '../../src/types';
import { parseString } from '../../src/parsers';

let flowProps: Record<string, unknown> = {};
let controlsProps: Record<string, unknown> = {};

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  return {
    ...actual,
    ReactFlow: ({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) => {
      flowProps = props;
      return <div data-flow>{children}</div>;
    },
    Background: () => <div data-background />,
    Controls: (props: Record<string, unknown>) => {
      controlsProps = props;
      return <div data-controls />;
    },
    MiniMap: () => <div data-minimap />,
  };
});

import { FBDDiagram } from '../../src/components/fbd/FBDDiagram';

function levelControlBody(): NormalizedFBDBody {
  const source = readFileSync(
    join(__dirname, '../fixtures/l5x/fbd-level-control-v35.L5X'),
    'utf8',
  );
  const result = parseString(source, 'l5x');
  const body = result.data?.programs[0]?.routines.find(
    (routine) => routine.name === 'MainFBD',
  )?.fbd;
  if (!body) throw new Error('expected normalized level-control FBD body');
  return body;
}

describe('FBDDiagram React Flow interaction configuration', () => {
  beforeEach(() => {
    flowProps = {};
    controlsProps = {};
  });

  it('uses bounded native pan, zoom, pinch, double-click, and fit behavior', () => {
    renderToStaticMarkup(<FBDDiagram body={levelControlBody()} />);

    expect(flowProps).toMatchObject({
      fitView: true,
      fitViewOptions: { padding: 0.08, minZoom: 0.15, maxZoom: 1.5 },
      minZoom: 0.1,
      maxZoom: 4,
      panOnDrag: true,
      panOnScroll: true,
      zoomOnScroll: true,
      zoomOnPinch: true,
      zoomOnDoubleClick: true,
      preventScrolling: true,
      onlyRenderVisibleElements: false,
      nodesDraggable: false,
      nodesConnectable: false,
      nodesFocusable: false,
      edgesFocusable: false,
      edgesReconnectable: false,
      elementsSelectable: false,
      disableKeyboardA11y: true,
    });
    const translateExtent = flowProps.translateExtent as [[number, number], [number, number]];
    expect(translateExtent).toHaveLength(2);
    expect(translateExtent[0][0]).toBeLessThan(0);
    expect(translateExtent[0][1]).toBeLessThan(0);
    expect(translateExtent[1][0]).toBeGreaterThan(0);
    expect(translateExtent[1][1]).toBeGreaterThan(0);
    expect(flowProps).not.toHaveProperty('viewport');
    expect(flowProps).not.toHaveProperty('onViewportChange');
    expect(controlsProps).toEqual({ showInteractive: false });
  });

  it('can disable all native gestures without making elements editable', () => {
    renderToStaticMarkup(<FBDDiagram body={levelControlBody()} interactive={false} />);

    expect(flowProps).toMatchObject({
      panOnDrag: false,
      panOnScroll: false,
      zoomOnScroll: false,
      zoomOnPinch: false,
      zoomOnDoubleClick: false,
      preventScrolling: false,
      nodesDraggable: false,
      elementsSelectable: false,
    });
  });

  it('keeps visible-element culling opt-in for benchmarked workloads', () => {
    renderToStaticMarkup(
      <FBDDiagram body={levelControlBody()} onlyRenderVisibleElements />,
    );

    expect(flowProps.onlyRenderVisibleElements).toBe(true);
  });
});
