# Ladder Visualizer

A React and TypeScript library for parsing, comparing, and rendering
Allen-Bradley/Rockwell PLC controller exports. It provides normalized controller
data, SVG ladder-diagram components, inspection tables, and controller/rung diff
utilities.

## Features

- Parse Rockwell JSON and L5X controller exports into a normalized domain model.
- Render virtualized SVG ladder diagrams, including parallel branches.
- Render deterministic, read-only SVG Function Block Diagram sheets.
- Browse controller metadata, tags, modules, data types, AOIs, and structured text.
- Compare controllers and render inline, rung-level diffs.
- Customize the UI with CSS custom properties or typed light/dark theme objects.

## Install

```bash
npm install ladder-visualizer react react-dom
```

`react` and `react-dom` are peer dependencies and must be supplied by the host
application.

## Quick start

```tsx
import { parseString, VirtualizedLadderDiagram } from 'ladder-visualizer';
import 'ladder-visualizer/styles';

const result = parseString(l5xSource);

if (!result.success || !result.data) {
  throw new Error(result.errors?.map((error) => error.message).join('\n') ?? 'Parse failed');
}

const routine = result.data.programs[0]?.routines[0];

export function ControllerRoutine() {
  return routine ? (
    <VirtualizedLadderDiagram
      routine={routine}
      instructionContext={result.context}
    />
  ) : null;
}
```

For a normalized FBD routine, render one source-ordered sheet with `FBDDiagram`:

```tsx
import { FBDDiagram } from 'ladder-visualizer';

const fbd = result.data.programs[0]?.routines.find((routine) => routine.type === 'FBD')?.fbd;

export function FunctionBlockRoutine() {
  return fbd ? <FBDDiagram body={fbd} sheetIndex={0} /> : null;
}
```

Use `parseFile()` for browser file uploads and `parseBuffer()` for an
`ArrayBuffer`. Parsers are registered automatically when importing from the
package root.

Each successful parse returns a controller-scoped `context` containing built-in
instruction metadata plus that controller's AOI definitions. Pass it to ladder
renderers so BOX symbols use the correct AOI parameter labels. Parsing never
clears or repopulates `globalInstructionRegistry`, so multiple parsed
controllers remain isolated. Existing integrations that intentionally use the
global registry can continue to call `registerAOIsFromController(controller)`;
that compatibility helper is now an explicit opt-in side effect.
Low-level `l5xToNormalized()` and `jsonToNormalized()` callers can use
`finalizeController(controller)` to obtain the matching context and replace
provisional rung categories before rendering.

## L5X input safety

L5X parsing rejects XML `DOCTYPE` declarations and custom entities. Built-in
XML entities such as `&amp;` remain supported. The default resource guard accepts
at most 10 MiB of UTF-8 source, 100,000 XML elements, and 64 nested elements.
These defaults cover normal controller exports while preventing unbounded input
work; the real example export in this repository is about 2.1 MiB.

Pass controlled overrides for trusted inputs, and use standard cancellation or
timeout controls at any public parsing entry point:

```ts
const result = parseString(l5xSource, 'l5x', {
  resourceLimits: {
    maxSourceBytes: 20 * 1024 * 1024,
    maxXmlNodes: 200_000,
  },
  signal: abortController.signal,
  timeoutMs: 5_000,
});
```

Failures use stable `ParseErrorCodes`, including
`SOURCE_BYTE_LIMIT_EXCEEDED`, `XML_NODE_LIMIT_EXCEEDED`,
`XML_DEPTH_LIMIT_EXCEEDED`, `UNSAFE_XML_ENTITY`, `PARSE_CANCELLED`, and
`PARSE_TIMEOUT`.

## Theming

Import the default stylesheet, or import only the CSS variables when integrating
with an existing design system:

```ts
import 'ladder-visualizer/styles';
// or
import 'ladder-visualizer/styles/variables';
```

For a programmatic theme, pass `DARK_THEME` or a partial `LadderDiagramTheme` to
`VirtualizedLadderDiagram`. Applying the `ladder-visualizer-dark` class also
enables the built-in dark-mode variables.

## Development

```bash
npm install
npm run dev        # start the demo application
npm run build      # type-check and package the library
npm run test:run   # run tests once
npm run test:visual # run Chromium visual baselines
npm run lint       # lint source files
```

## Repository layout

```text
src/
  components/  React and SVG rendering components
  diff/        controller and inline rung comparison
  layout/      ladder-diagram geometry and measurement
  parsers/     JSON and L5X parsing into normalized data
  styles/      CSS variables and default styles
  types/       public TypeScript contracts
demo/          local Vite demonstration app
examples/      small, representative controller exports
tests/         unit and integration tests
```

## License

[MIT](LICENSE)
