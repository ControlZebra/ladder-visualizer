# AOI interface metadata slice (#71)

`parseString` and `parseDocumentString` now expose export-backed AOI parameter `Constant` and operand comments, plus AOI local-tag operand comments. The normalized fields are optional: a missing attribute or `Comments` element stays absent. Comments retain operands, direct/localized text, and source order through the existing `NormalizedTagComment` contract. AOI comparison counts changes to these fields.

## Export evidence

- [`Math_VxSUB_AOI.L5X`](https://github.com/JeremyMedders/LogixLibraries/blob/b27a0e7fdf99f644d3d32fb84d45810db469a8f7/src/Math/Vector/Math_VxSUB_AOI.L5X) is a Studio 5000 `35.00` `AddOnInstructionDefinition` export. Target AOI `Math_VxSUB` has InOut parameters `A` and `B` with `Constant="true"`, and `Val` with `Constant="false"`.
- [`MBTCP_Client_AOI.L5X`](https://github.com/JeremyMedders/LogixLibraries/blob/b27a0e7fdf99f644d3d32fb84d45810db469a8f7/src/ModbusTCP/v1/MBTCP_Client_AOI.L5X) is a Studio 5000 `35.00` `AddOnInstructionDefinition` export. Target AOI local tag `MsgFlags` has six ordered `Comment` elements with bit operands `.0` through `.5` and CDATA text.
- [`TBEN_Lx_8IOL_AOI_V1_0.L5X`](https://github.com/TurckBDMs-Main/IOLinkAOIs/blob/946e7c8df4783e8521ccc8243894f061638a6411/TBEN-8IOL/TBEN_Lx_8IOL_AOI_V1_0.L5X) is a Studio 5000 `32.00` `AddOnInstructionDefinition` export. Parameter `Common_Data` has `Constant="false"` and a `Comments/Comment` with operand `.SENDDATA[1]` and CDATA text. A separate [v35 AOI export](https://github.com/GTMichelli-Dev/northwest-grain-growers/blob/93b59acbcd782ac1611daea43c00284bebfe9bf9/PLC/Wasco/Pump_Scale_Control_AOI.L5X) also contains parameter comments.
- The existing [`aoi-defaults-v17.L5X`](../tests/fixtures/l5x/aoi-defaults-v17.L5X) is a reduced v17 Controller export with no such metadata; it protects absence behavior.

The `aoi-interface-metadata-v33` through `v35` fixtures reduce and sanitize these observed metadata shapes into one small AOI. Their names and comment text are test data, not copied project content. The v33/v34 variants are matching-XSD compatibility probes, not claimed exports from those versions. The real v35 files include `Use="Target"` on `AddOnInstructionDefinition`; the pinned v35 XSD disallows that attribute on the AOI element, so the reduced schema fixture omits it. The parser still handles the real export envelope.

The pinned v33–v35 XSDs define optional `Comments` (`CommentCollection`) and `Constant` (`BoolEnum`) for `AOIParameterType`, and optional `Comments` for `AOILocalTagType`. All three reduced fixtures validate against their matching schemas. The local schema checkout is `441573b4f96493a0fa31627a51b8a4ecb857e980`, matching the CI pin.

## Remaining evidence gate

The checked-in AB-samples corpus at `68a6a4c05552f9837c95d0bb0accc20c98d7f9e5` has only 1D AOI local-tag dimensions and none of these interface fields. A separate scan of 165 Studio 5000 v35 AOI files in `JeremyMedders/LogixLibraries` found parameter `Constant` and local comments, but no parameter/local `Verified` or 2D/3D AOI local-tag dimensions. This scan does not prove Studio never emits those shapes. #71 keeps them gated on actual in-range export evidence.

## Verification

Run `npx vitest run tests/parsers/l5x-aoi-interface-metadata.test.ts`, `npm run test:schema`, `npm run test:conformance`, `npm run typecheck`, `npm run lint`, and `npm run test:run`.
