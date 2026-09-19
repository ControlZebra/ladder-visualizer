import type {
  NormalizedFBDBlock,
  NormalizedFBDBody,
  NormalizedFBDSheet,
} from '../../src/types';

function benchmarkBlock(index: number): NormalizedFBDBlock {
  const column = index % 15;
  const row = Math.floor(index / 15);
  return {
    kind: 'block',
    id: String(index + 1),
    position: {
      x: String(20 + column * 190),
      y: String(20 + row * 135),
    },
    verified: true,
    instruction: 'ADD',
    operand: `Benchmark_${String(index + 1).padStart(3, '0')}`,
    visiblePins: ['InA', 'InB', 'OutA', 'OutB'],
    ports: [
      { id: 'InA', label: 'Input A', direction: 'input', side: 'left', order: 0, defaultVisible: true, visible: true },
      { id: 'InB', label: 'Input B', direction: 'input', side: 'left', order: 1, defaultVisible: true, visible: true },
      { id: 'OutA', label: 'Output A', direction: 'output', side: 'right', order: 0, defaultVisible: true, visible: true },
      { id: 'OutB', label: 'Output B', direction: 'output', side: 'right', order: 1, defaultVisible: true, visible: true },
    ],
    arrays: [],
    arrayRequirements: [],
  };
}

function benchmarkSheet(): NormalizedFBDSheet {
  const elements = Array.from({ length: 150 }, (_, index) => benchmarkBlock(index));
  return {
    number: { value: '1', source: 'declared' },
    name: { value: '150 elements / 600 ports', source: 'declared' },
    descriptions: ['Production FBD viewport benchmark'],
    elements,
    connections: elements.slice(1).map((element, index) => ({
      kind: 'wire',
      from: { elementId: String(index + 1), port: 'OutA' },
      to: { elementId: element.id, port: 'InA' },
      verified: true,
    })),
    attachments: [],
  };
}

export function createFBDBenchmarkBody(): NormalizedFBDBody {
  return {
    sheetSize: { value: 'Tabloid - 11 x 17 in', source: 'declared' },
    orientation: { value: 'Landscape', source: 'declared' },
    sheets: [
      benchmarkSheet(),
      {
        number: { value: '2', source: 'declared' },
        name: { value: 'Summary', source: 'declared' },
        descriptions: ['Small sheet used to measure cached sheet switching'],
        elements: [benchmarkBlock(150)],
        connections: [],
        attachments: [],
      },
    ],
    diagnostics: [],
  };
}
