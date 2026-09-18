# Task scheduling slice (#30)

- **Capability:** Controller tasks and ordered scheduled-program relationships are available from the normalized controller returned by the public L5X parser APIs.
- **Public entry points:** `L5XParser.parse`, `L5XParser.parseDocument`, and `parseString`.
- **Normalized contract:** `NormalizedController.tasks` is always an array. Each task has a name, normalized type, optional description and execution attributes, optional event metadata, and ordered `scheduledProgramNames`. `NormalizedProgram.executingTaskName` retains the inverse relationship when present. Program names are the relationship keys; stable IDs remain issue #12.
- **Invariants:** Source task order and scheduled-program order are preserved. Optional booleans remain absent when omitted. A named scheduled program must resolve uniquely, and program-side task metadata must agree with task-side scheduling.
- **Schemas:** Studio 5000 v33, v34, and v35 expose the same `TaskCollection`, `TaskType`, `TaskEventInfoType`, `ArrayOfScheduledProgramType`, and `ScheduledProgramType` shapes.
- **Envelopes:** Controller/full-project exports. Component exports retain contextual tasks through the same controller envelope when present.
- **Cases:** absent, singleton, and repeated tasks/program references; all schema-valid task Boolean encodings; continuous, periodic, and event tasks; optional event data; preserved schema-valid metadata outside the canonical model; missing, within-task duplicate, cross-task duplicate, and contradictory relationships.
- **Failure policy:** Relationship problems and schema-valid task integers outside JavaScript's safe range do not discard usable controller data. They produce stable warnings and `partial` status while preserving the source representation. Structurally invalid XML retains the existing failure policy.
- **Non-goals:** Stable entity IDs, program parameters, child-program/equipment hierarchy, trends, watch lists, module topology, and task execution simulation.
- **Completion commands:** focused task tests, parser tests, schema validation, conformance, typecheck, lint, full tests, and build.

The realistic task shapes are derived from the public AB-Samples corpus, including continuous and periodic tasks and the motion-event task pattern used by `Delta_4_axis_PICK_PLACE_with_Orient.L5X`. Committed fixtures are minimized and sanitized.
