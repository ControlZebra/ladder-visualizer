# Remaining controller configuration slice (#34)

- **Capability:** The public L5X parser exposes clear controller identity/communication metadata and explicitly accounts for every remaining supported-schema controller attribute and configuration family.
- **Public entry points:** `L5XParser.parse`, `L5XParser.parseDocument`, `parseString`, and `parseDocumentString`.
- **Normalized contract:** `NormalizedController.processorType` and the existing `commPath` field retain the unambiguous source values. Existing name, description, serial number, and project dates remain canonical. Rockwell-specific configuration remains in complete `PlcDocument.fragments` subtrees.
- **Invariants:** Each present preserved family produces one stable family-level warning in schema/source order and makes the parse `partial`. Repeated serial and Ethernet ports remain ordered inside their family fragment. Absent families produce neither synthetic values nor warnings.
- **Schemas:** The pinned Studio 5000 v33, v34, and v35 XSDs define identical `ControllerType`, `RedundancyInfoType`, `SecurityInfoType`, `SafetyInfoType`, `ArrayOfSerialPortType`, `CSTType`, `WallClockTimeType`, `TimeSynchronizeType`, `InternetProtocolType`, `ArrayOfEthernetLinkType`, and `EthernetNetworkType` shapes. `DataLogs` is intentionally unconstrained in all three.
- **Envelopes:** Controller/full-project exports. Component exports retain the same context-controller configuration when it is present in the containing envelope.
- **Cases:** Present and absent metadata/families; repeated serial and Ethernet port children; safety child content; opaque nested data-log content; Boolean, integer, float, enum, and string source representations across v33-v35.
- **Failure policy:** Schema-valid but unnormalized controller configuration is preserved with stable warnings and `partial` status. Structurally invalid XML and resource limits retain the existing failure policy.
- **Non-goals:** Interpreting Rockwell redundancy, security, safety, CST, wall-clock, serial-driver, data-log, PTP, IP, or Ethernet settings as portable PLC semantics; module topology; live controller state; and formal source-version policy.
- **Completion commands:** focused configuration tests, parser tests, schema validation, conformance, typecheck, lint, full tests, and build.

## Disposition inventory

The normalized controller already owns `Name`, `Description`, `ProjectSN`, `ProjectCreationDate`, and `LastModifiedDate`; existing Rockwell metadata retains firmware revision and SFC execution attributes. This slice adds canonical `ProcessorType` and maps `CommPath`. `Use` remains document resource-role evidence. All other `ControllerType` attributes are retained as source-representation fragments and reported once under `PRESERVED_L5X_CONTROLLER_ATTRIBUTES` when present.

The already delivered collections (`DataTypes`, `Modules`, `AddOnInstructionDefinitions`, `Tags`, `Programs`, `Tasks`, `Trends`, and `QuickWatchLists`) continue through their typed normalizers. The remaining top-level families are preserved and reported individually: `RedundancyInfo`, `Security`, `SafetyInfo`, `CommPorts`, `CST`, `WallClockTime`, `DataLogs`, `TimeSynchronize`, `InternetProtocol`, `EthernetPorts`, and `EthernetNetwork`.
