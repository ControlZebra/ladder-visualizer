# Target-aware document slice (#11 + #8)

- Capability: public document parsing for Controller, Program, Routine, Rung, Tag, DataType, AddOnInstructionDefinition, and Module exports, including dependencies.
- Entry points: L5XParser.parseDocument; parseDocumentString/Buffer/File. Existing controller APIs adapt the same L5X document pipeline.
- Contract: source format/schema/software revision and target metadata; typed resource union; document-local XML-path IDs, owner IDs, target IDs, explicit target/context/reference roles; inspectable vendor fragments with path, subtree, and reason.
- Roles: explicit resource Use overrides collection Use; infer export targets from matching names, target containers, or a uniquely identified export set. Fail rather than choose between ambiguous candidates. Descendants belong to their selected owner's role unless explicitly overridden.
- Versions: v33, v34, v35 only. Local schemas match CI commit 441573b4f96493a0fa31627a51b8a4ecb857e980.
- XSD: RSLogix5000ContentType has optional Controller and export metadata; implementation retains existing required root/target/controller validation. Resource collections repeat; RoutineType allows repeated language bodies; RLLContent carries Use/Start/Count. UseEnum includes more than the three document roles: other values remain preserved, without inventing import-operation semantics. Module Use and collection Use from real exports remain accepted by the existing permissive runtime parser even where the pinned XSD does not declare them.
- Preservation: keep unmodeled elements and attributes as parsed fragments, including decorated values, task/configuration families, protected/encoded bodies, and unknown extensions. Preserve source representations when the existing normalization is lossy. XML comments, byte-perfect formatting/spans and interleaved heterogeneous XML order are outside the parsed-subtree contract.
- Cases: all eight envelopes across three versions; absent/singleton/repeated collections and bodies; explicit/inherited/inferred roles; repeated names under different owners; multi-target sets; missing/ambiguous targets; malformed/entity input; public string/buffer/file guards; isolated AOI context; real-export regression; fragment values/paths.
- Non-goals: full tag/configuration/FBD/SFC normalization, RLL grammar replacement, stable cross-document identity, full runtime XSD validation, new JSON document conversion, formal complete/partial result protocol.
- Gates: schema validation; document semantic and conformance tests; existing L5X parser and integration tests; typecheck; lint; full tests; build.


## Verification record

- The first red run failed on the absent document API, the four rejected target families, and repeated-body conformance changes. Two initial exact-value expectations were corrected against the existing v33/v34 fixture text; source fixtures were not weakened.
- Encoded target fixtures were separately schema-validated and observed red before header extraction was added.
- Source accounting is conservative: it preserves representations whenever a normalized fallback would otherwise consume an unknown source value.
- Program envelopes without a Program element return `MISSING_L5X_TARGET` through direct parser, string, buffer, and file entry points. The old synthetic Program fallback was removed because it represented data absent from the source.
- The two legacy tests were corrected to use semantically consistent Controller and DataType envelopes. A focused public-entry test covers the strict missing-Program contract.
- The document and conformance suites, schema validation, typecheck, lint, full suite, and build pass.
