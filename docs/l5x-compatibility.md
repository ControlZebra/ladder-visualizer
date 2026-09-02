# L5X compatibility profiles and conformance corpus

This document defines the compatibility claims that Ladder Visualizer may make for Rockwell L5X input. A profile is a named promise about specific source constructs, not a percentage of a project that happened to parse.

The corpus is intentionally small, synthetic, and sanitized. It establishes stable regression coverage and a fixture schema; it is not evidence that every Studio 5000 release or vendor extension is supported. Add anonymized real-world exports only after confirming that they are safe to commit.

## Profiles

| Profile | Current claim | Included constructs | Explicit exclusions |
| --- | --- | --- | --- |
| `rockwell-controller-rll` | Baseline supported | Controller metadata, controller/program tags, UDTs, AOIs, modules, and RLL routines/rungs | Full controller configuration, structured/decorated values, FBD/SFC bodies |
| `rockwell-program-rll` | Baseline supported | Program exports, program tags, and RLL routines/rungs | Component export identity and program parameters |
| `rockwell-routine-rll` | Baseline supported | RLL routine exports represented in the current controller-shaped result | Canonical component documents and stable identities |
| `rockwell-rung-rll` | Baseline supported | RLL rungs, comments, branch structure, and common instructions | Formal grammar diagnostics and all expression syntax |
| `rockwell-tags` | Baseline supported | Scalar base tags, aliases, program/controller scopes, and UDT member headers | Arrays, decorated structures, constants, forces, alarms, and OPC UA metadata |
| `rockwell-full-project` | Not yet supported | Tracks FBD, SFC, protected content, tasks, and remaining configuration families | Any complete-project claim |

“Baseline supported” means the synthetic fixture has a deterministic normalized output and must remain green. It does not remove the limits documented in the exclusions column.

## Fixture corpus

The manifest at `tests/fixtures/l5x/manifest.ts` is the source of truth. Every fixture must declare:

- Studio 5000 software version and L5X export target;
- profiles and construct coverage;
- expected production status (`complete`, `partial`, or `failed`);
- expected legacy parser outcome while the production result API is introduced; and
- exact normalized entity counts or the expected error code.

The executable conformance suite checks exact counts for successful legacy parses and the error code for rejected input. Fixtures expected to be `partial` or `failed` are deliberately retained in the suite now when the legacy boolean API cannot express the desired result. Their current behavior documents an existing safety or loss boundary rather than turning it into an implied compatibility claim. Issue #5 will apply the entity policy; issue #7 will replace the legacy expectation with a direct production-status assertion; issue #8 will require preserved fragments and diagnostics for lossy cases.

| Fixture | Studio 5000 | Export target | Production status | Coverage |
| --- | --- | --- | --- | --- |
| `controller-rll-v35` | 35.01 | Controller | complete | Controller, RLL, tags, UDT, AOI, module |
| `program-rll-v34` | 34.01 | Program | complete | Program export, program tag, RLL |
| `routine-rll-v33` | 33.00 | Routine | complete | Routine export, RLL |
| `rung-rll-v33` | 33.00 | Routine | complete | Isolated rung and branch structure |
| `tag-v34` | 34.01 | Controller | complete | Scalar and alias tags |
| `udt-v35` | 35.01 | Controller | complete | UDT and members |
| `aoi-v35` | 35.01 | AddOnInstructionDefinition | complete | AOI metadata, locals, parameters, RLL |
| `module-v35` | 35.01 | Controller | complete | Module and port headers |
| `fbd-v35` | 35.01 | Program | partial | Unsupported FBD body |
| `sfc-v35` | 35.01 | Program | partial | Unsupported SFC body |
| `protected-routine-v35` | 35.01 | Program | partial | Protected routine marker |
| `malformed-truncated-v35` | 35.01 | Controller | failed | Truncated XML |
| `malformed-entity-v35` | 35.01 | Controller | failed | Undeclared entity input |

## Adding a fixture

1. Prefer a minimal synthetic fixture. For a real export, remove customer names, serial numbers, addresses, credentials, and proprietary process details before committing it.
2. Add its file and one manifest entry in the same change. Do not loosen an existing fixture's counts to make a parser regression pass.
3. Record the source version, target type, profile, exact counts, and expected production status. Use `partial` or `failed` whenever any content cannot be preserved and diagnosed.
4. Extend `tests/parsers/l5x-conformance.test.ts` only when the generic count checks cannot express the regression.
5. Run `npm run test:run` and `npm run typecheck` before opening a pull request.

## Corpus reporting

Report pass rates per profile and source version, with fixture IDs and status counts. Do not publish an overall L5X compatibility percentage: a project with hundreds of RLL rungs can still lose a critical FBD or SFC routine.
