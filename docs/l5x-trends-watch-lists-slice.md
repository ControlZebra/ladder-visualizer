# Trends and quick-watch lists slice (#33)

- **Capability:** Controller trends, their pens, quick-watch lists, and watch tags are available from the normalized controller returned by the public L5X parser APIs.
- **Public entry points:** `L5XParser.parse`, `L5XParser.parseDocument`, and `parseString`.
- **Normalized contract:** `NormalizedController.trends` and `NormalizedController.quickWatchLists` are always arrays. Trend, pen, list, and watch-tag order follows the source. Optional attributes remain absent when omitted. Schema-declared trend and pen integer fields normalize only when they are JavaScript safe integers; trend and collection UIds remain exact source strings where exposed.
- **Schemas:** Studio 5000 v33, v34, and v35 expose the same `TrendCollection`, `TrendType`, `ArrayOfPenType`, `PenType`, `ArrayOfQuickWatchType`, `QuickWatchType`, and `WatchTagType` shapes.
- **Envelopes:** Controller/full-project exports. Component exports retain contextual controller trends and watch lists through the same controller envelope when present.
- **Cases:** absent, singleton, and repeated trends, pens, lists, and watch tags; optional descriptions and trigger/capture metadata; Boolean and floating-point pen values; empty collections; preserved source-only metadata; and unsafe integers.
- **Failure policy:** Schema-valid trend or pen integers outside JavaScript's safe range do not discard usable controller data. They produce `UNSUPPORTED_L5X_TREND_NUMERIC_VALUE`, a `partial` result, and a retained source representation. Structurally invalid XML retains the existing failure policy.
- **Non-goals:** Trend rendering or execution, parsing opaque Studio trend templates, data logs, stable cross-document IDs, and validating whether tag specifiers resolve.
- **Completion commands:** focused trend/watch-list tests, parser tests, schema validation, conformance, typecheck, lint, full tests, and build.

The fixture shapes are derived from the public AB-Samples corpus, with names and values minimized and sanitized.
