# Unvisualized JSON Areas

This historical audit was produced from the former `controller_output.json` sample, which is no longer stored in the repository. The current demo and real-world integration coverage use `Cooker_1_AutoLogic_Program.L5X`; focused inline fixtures retain JSON parser coverage.

## Overview

The visualizer currently parses and displays the following from the JSON export:
- ✅ Serial Number
- ✅ Created/Modified Dates
- ✅ SFC Execution Control
- ✅ Data Types (all categories)
- ✅ Controller Tags
- ✅ Programs and Routines (Ladder Logic)
- ✅ Program Tags
- ✅ I/O Configuration (partial)

---

## 1. Controller Metadata - Not Visualized

### `comm_path`
- **JSON Field:** `comm_path`
- **Current Value:** `""` (empty string in sample)
- **Description:** Communication path to the controller (e.g., Ethernet/IP address or serial route)
- **Status:** ❌ Not displayed anywhere in the UI

### `sfc_restart_position`
- **JSON Field:** `sfc_restart_position`
- **Current Value:** `"MostRecent"`
- **Description:** Determines where SFC (Sequential Function Chart) execution resumes after restart
- **Possible Values:** `MostRecent`, `InitialStep`
- **Status:** ❌ Not displayed in Controller Info panel

### `sfc_last_scan`
- **JSON Field:** `sfc_last_scan`
- **Current Value:** `"DontScan"`
- **Description:** Controls SFC behavior on last scan
- **Possible Values:** `DontScan`, `ProgrammaticReset`
- **Status:** ❌ Not displayed in Controller Info panel

---

## 2. Add-On Instructions (AOIs) - Partially Visualized

### Current State
- AOIs are shown in the navigation tree with a count badge
- AOI names can be listed in the tree

### Missing Visualization
- **JSON Field:** `aois[]`
- **Status:** ⚠️ Only shows empty list placeholder in UI
- **Not Visualized:**
  - AOI source code/logic
  - AOI parameters (input/output/in-out parameters)
  - AOI local tags
  - AOI descriptions
  - AOI version information
  - AOI scan mode options

---

## 3. I/O Configuration (Map Devices) - Partially Visualized

### Current State
- I/O modules are listed in the tree as "Slot X - Module Y"

### Missing Visualization
The following fields from `map_devices[]` are **not displayed**:

| Field | Sample Value | Description |
|-------|-------------|-------------|
| `parent_module` | `1` | Parent module in the hierarchy |
| `vendor_id` | `1` | Vendor identifier (e.g., 1 = Rockwell) |
| `product_type` | `10` | Product type code |
| `product_code` | `35` | Product-specific code |
| `comments` | `[]` | Array of module comments/annotations |

### Recommended Enhancement
Create an I/O Device detail panel showing:
- Module identification (vendor, product type, product code)
- Module hierarchy (parent relationship)
- Associated comments
- Slot configuration details

---

## 4. Routine Types - Partially Visualized

### Current State
- Only **RLL (Relay Ladder Logic)** routines are fully visualized
- Routine type badge is displayed

### Missing Visualization for Other Routine Types:

| Type | Status | Description |
|------|--------|-------------|
| `RLL` | ✅ Fully visualized | Relay Ladder Logic |
| `FBD` | ❌ Not rendered | Function Block Diagram |
| `ST` | ❌ Not rendered | Structured Text |
| `SFC` | ❌ Not rendered | Sequential Function Chart |

---

## 5. Tag Extended Properties - Not Visualized

### Current State
- Tags display: name, type, data_type, radix, external_access

### Potentially Missing (if present in source):
- Tag descriptions/comments
- Tag aliases (for Alias type tags)
- Tag scope (Produced/Consumed connection info)
- Default/initial values
- Engineering units

---

## 6. Data Type Extended Properties - Not Visualized

### Current State
- Data types display: name, family, class, members

### Not Visualized:
- Data type descriptions (if available)
- Data type version info (if available)
- Default values for members
- Member descriptions/comments

---

## Summary Table

| Category | Field/Feature | Status |
|----------|--------------|--------|
| Controller | `comm_path` | ❌ Not visualized |
| Controller | `sfc_restart_position` | ❌ Not visualized |
| Controller | `sfc_last_scan` | ❌ Not visualized |
| AOIs | AOI details & logic | ⚠️ Placeholder only |
| I/O Devices | `vendor_id`, `product_type`, `product_code` | ❌ Not visualized |
| I/O Devices | `parent_module` hierarchy | ❌ Not visualized |
| I/O Devices | `comments` | ❌ Not visualized |
| Routines | FBD rendering | ❌ Not supported |
| Routines | ST rendering | ❌ Not supported |
| Routines | SFC rendering | ❌ Not supported |

---

## Recommendations for Future Development

1. **Add Controller Details Panel Enhancement**
   - Display `comm_path`, `sfc_restart_position`, `sfc_last_scan` in the Controller Info view

2. **Implement I/O Device Detail View**
   - Create a dedicated panel when selecting an I/O module
   - Show all device properties including vendor info and comments

3. **Add Support for Other Routine Types**
   - Consider implementing FBD (Function Block Diagram) renderer
   - Consider implementing ST (Structured Text) viewer
   - Consider implementing SFC (Sequential Function Chart) viewer

4. **Enhance AOI Visualization**
   - When AOIs are populated, display their parameters and local tags
   - Consider a code viewer for AOI implementation
