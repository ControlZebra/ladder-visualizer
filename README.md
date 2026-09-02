# Ladder Visualizer

A React and TypeScript library for parsing, comparing, and rendering
Allen-Bradley/Rockwell PLC controller exports. It provides normalized controller
data, SVG ladder-diagram components, inspection tables, and controller/rung diff
utilities.

## Features

- Parse Rockwell JSON and L5X controller exports into a normalized domain model.
- Render virtualized SVG ladder diagrams, including parallel branches.
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

if (!result.success) {
  throw new Error(result.errors.map((error) => error.message).join('\n'));
}

const routine = result.data.programs[0]?.routines[0];

export function ControllerRoutine() {
  return routine ? <VirtualizedLadderDiagram routine={routine} /> : null;
}
```

Use `parseFile()` for browser file uploads and `parseBuffer()` for an
`ArrayBuffer`. Parsers are registered automatically when importing from the
package root.

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
