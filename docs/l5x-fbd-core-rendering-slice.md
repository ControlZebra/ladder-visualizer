# L5X FBD Core Rendering Slice (Issue #42)

- **Capability:** Render one normalized FBD sheet as a deterministic, read-only SVG schematic.
- **Public entry points:** `FBDDiagram`, `buildFBDSheetLayout`, `buildFBDConnectorIndex`, `measureFBDElement`, `placeFBDElementPorts`, and `routeFBDConnection`.
- **Coordinate contract:** One Rockwell FBD grid unit maps to one SVG user unit (`FBD_GRID_TO_SVG_SCALE = 1`). Source X/Y values remain element anchors; the computed view box adds padding without changing those anchors.
- **Core element scope:** IRef, ORef, ICon, OCon, generic Block, block arrays, normal wires, and feedback wires. Connections render below opaque element bodies and ports render above connections.
- **Routing contract:** Forward, backward, crossing, and feedback paths use deterministic orthogonal segments. Feedback paths also use a dash pattern, so their meaning does not depend on color.
- **Connector contract:** Routine-level connector names match exactly and case-sensitively. A valid group has exactly one OCon producer and one or more ICon consumers. Blank, unmatched, case-variant, and multiple-producer groups remain unresolved with diagnostics; no line is drawn across sheets.
- **Invalid endpoint policy:** Connections that reference missing or duplicate element IDs, missing ports, or reversed port directions are omitted with stable layout diagnostics. Valid neighboring topology remains available.
- **Fixture:** `fbd-level-control-v35.L5X` is a sanitized v35 adaptation of the public level-control sample. Across two sheets it contains nine Blocks, two IRefs, two connectors, eleven normal wires, two feedback wires, and one DEDT storage-array binding.
- **Visual contract:** Playwright Chromium baselines cover both sheets in the built-in light and dark themes.
- **Non-goals:** Function/AOI and routine-control artwork, text boxes, attachments, degraded placeholders, interactive navigation, pan/zoom, and ControlZebra integration. Those remain in issues #43-#45.

Run focused verification with:

```bash
npx vitest run tests/layout/fbdLayout.test.ts tests/components/fbdDiagram.test.tsx
npm run test:visual
```
