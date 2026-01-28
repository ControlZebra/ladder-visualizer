# Rung Layout Algorithm

This document describes the algorithm for calculating positions and dimensions of ladder logic rungs, including nested branches.

---

## Overview

The layout algorithm uses a **two-phase approach**:
1. **Phase 1: Dimension Calculation** - Calculate widths/heights bottom-up (innermost branches first)
2. **Phase 2: Position Calculation** - Calculate positions using right-to-left back-calculation

This ensures that:
- Nested branches know their full dimensions before parent branches are sized
- Elements can be positioned correctly with proper alignment
- Operations remain right-aligned against the right rail

---

## Key Concepts

### Element Types
- **Instruction**: A single ladder logic instruction (XIC, OTE, TON, etc.)
- **BranchGroup**: A set of parallel paths, each containing elements
- **RungElement**: Either an Instruction or a BranchGroup

### Categories
- **Conditions**: Input elements (XIC, XIO) and compare instructions (EQU, GEQ, etc.)
- **Operations**: Output elements (OTE, OTL, OTU), timers, counters, math

### Constants
```
BRANCH_CONNECTOR_OFFSET = 10px   // Gap between connector and first/last element
INSTRUCTION_GAP = 0px            // Gap between instructions (can be adjusted)
MIN_RUNG_HEIGHT = 80px           // Minimum height for a rung/leg
BRANCH_VERTICAL_GAP = 5px        // Vertical gap between branch legs
LINE_SPACING = 20px              // Vertical gap between wrapped lines
```

---

## Phase 1: Dimension Calculation (Bottom-Up)

Calculate dimensions recursively, starting from leaf elements and working up to the root.

### Step 1.1: Calculate Instruction Dimensions

For each instruction:
```
if instruction is contact/coil:
    width = max(SYMBOL_WIDTH, textWidth(label) + padding)
    height = SYMBOL_HEIGHT
else:  // box instruction (timer, counter, math, compare)
    width = calculateBoxWidth(mnemonic, operands)
    height = calculateBoxHeight(operands.length)

centerY = height / 2
```

### Step 1.2: Calculate Branch Dimensions (Recursive, Inside-Out)

For a BranchGroup with multiple legs:

```
function calculateBranchDimensions(branch):
    legDimensions = []
    
    for each leg in branch.legs:
        legWidth = 0
        legHeight = MIN_RUNG_HEIGHT
        
        for each element in leg:
            if element is BranchGroup:
                // RECURSE FIRST - calculate inner branch dimensions
                dims = calculateBranchDimensions(element)
            else:
                dims = calculateInstructionDimensions(element)
            
            legWidth += dims.width
            legHeight = max(legHeight, dims.height)
        
        // Add gaps between elements
        legWidth += (leg.length - 1) * INSTRUCTION_GAP
        
        legDimensions.push({ width: legWidth, height: legHeight })
    
    // Branch width = longest leg + 2 * connector offset
    maxLegWidth = max(legDimensions.map(d => d.width))
    branchWidth = maxLegWidth + 2 * BRANCH_CONNECTOR_OFFSET
    
    // Branch height = sum of all leg heights + gaps
    branchHeight = sum(legDimensions.map(d => d.height))
    branchHeight += (legs.length - 1) * BRANCH_VERTICAL_GAP
    
    // centerY = center of first leg (main wire continues through first leg)
    centerY = legDimensions[0].height / 2
    
    return { width: branchWidth, height: branchHeight, centerY: centerY }
```

### Step 1.3: Separate Conditions from Operations

Before positioning, split rung elements into two groups:
```
conditions = []
operations = []

for each element in rung.elements:
    if element is BranchGroup:
        if branchContainsOnlyOperations(element):
            operations.push(element)
        else:
            conditions.push(element)
    else:
        if isOperation(element):
            operations.push(element)
        else:
            conditions.push(element)
```

---

## Phase 2: Position Calculation (Right-to-Left Back-Calculation)

### Step 2.1: Calculate Total Widths

```
conditionsWidth = sum of condition element widths + gaps
operationsWidth = sum of operation element widths + gaps
totalContentWidth = conditionsWidth + minGap + operationsWidth
```

### Step 2.2: Handle Line Wrapping

If content exceeds available width, split into multiple lines:

```
availableWidth = diagramWidth - rungNumberWidth - 2 * railWidth

function splitIntoLines(conditions, operations, availableWidth):
    lines = []
    currentLine = { conditions: [], operations: [] }
    currentWidth = 0
    
    // Reserve space for operations on the last line
    lastLineReserved = operationsWidth + MIN_CONDITION_OPERATION_GAP
    
    for each condition in conditions:
        elementWidth = getDimensions(condition).width + gap
        
        isLastCondition = (condition is last in list)
        
        if isLastCondition:
            // This will be on the last line with operations
            maxWidth = availableWidth - lastLineReserved
        else:
            maxWidth = availableWidth
        
        if currentWidth + elementWidth > maxWidth AND currentLine.conditions.length > 0:
            // Wrap to new line
            lines.push(currentLine)
            currentLine = { conditions: [], operations: [] }
            currentWidth = 0
        
        currentLine.conditions.push(condition)
        currentWidth += elementWidth
    
    // Add operations to the last line
    currentLine.operations = operations
    lines.push(currentLine)
    
    return lines
```

### Step 2.3: Calculate Line Heights and Wire Y Positions

```
function calculateLineMetrics(lines, rungYOffset):
    currentY = rungYOffset
    
    for each line in lines:
        // Find tallest element in line
        maxHeight = MIN_RUNG_HEIGHT
        maxWireOffset = MIN_RUNG_HEIGHT / 2
        
        for each element in [...line.conditions, ...line.operations]:
            dims = getDimensions(element)
            labelSpace = hasLabel(element) ? LABEL_OFFSET : 0
            
            wireOffset = dims.centerY + labelSpace + RUNG_PADDING
            totalHeight = dims.height + labelSpace + 2 * RUNG_PADDING
            
            maxHeight = max(maxHeight, totalHeight)
            maxWireOffset = max(maxWireOffset, wireOffset)
        
        line.height = maxHeight
        line.wireY = currentY + maxWireOffset
        line.yOffset = currentY - rungYOffset
        
        currentY += maxHeight + LINE_SPACING
    
    // Remove trailing line spacing
    totalRungHeight = currentY - LINE_SPACING - rungYOffset
    return totalRungHeight
```

### Step 2.4: Position Operations (Right-Aligned)

Start from the right rail and work backwards:

```
function positionOperations(operations, line, rightRailX):
    currentX = rightRailX - INSTRUCTION_GAP  // Start from right rail
    
    // Position from right to left (reverse order)
    for i = operations.length - 1 down to 0:
        element = operations[i]
        dims = getDimensions(element)
        
        elementX = currentX - dims.width
        
        if element is BranchGroup:
            positionBranch(element, elementX, line.wireY)
        else:
            positionInstruction(element, elementX, line.wireY)
        
        currentX = elementX - INSTRUCTION_GAP
    
    return currentX  // Returns operationsStartX
```

### Step 2.5: Position Conditions (Left-Aligned)

Start from the left rail:

```
function positionConditions(conditions, line, leftRailX):
    currentX = leftRailX + INSTRUCTION_GAP  // Start after left rail
    
    for each element in conditions:
        dims = getDimensions(element)
        
        if element is BranchGroup:
            positionBranch(element, currentX, line.wireY)
        else:
            positionInstruction(element, currentX, line.wireY)
        
        currentX += dims.width + INSTRUCTION_GAP
    
    return currentX  // Returns conditionsEndX
```

### Step 2.6: Position Branch Elements (The Core Algorithm)

This is where the right-to-left back-calculation happens for branch internals:

```
function positionBranch(branch, branchStartX, mainWireY):
    dims = getDimensions(branch)  // Already calculated in Phase 1
    
    connectorLeftX = branchStartX
    connectorRightX = branchStartX + dims.width
    
    // Calculate Y position for each leg
    legYPositions = []
    currentY = mainWireY  // First leg is on the main wire
    
    for i = 0 to branch.legs.length - 1:
        legDims = calculateLegDimensions(branch.legs[i])
        
        if i == 0:
            legYPositions.push(mainWireY)
        else:
            prevLegDims = calculateLegDimensions(branch.legs[i-1])
            currentY += prevLegDims.height / 2 + BRANCH_VERTICAL_GAP + legDims.height / 2
            legYPositions.push(currentY)
    
    // Position elements within each leg
    for i = 0 to branch.legs.length - 1:
        leg = branch.legs[i]
        legWireY = legYPositions[i]
        
        positionLegElements(leg, connectorLeftX, connectorRightX, legWireY)
    
    return {
        connectorLeftX: connectorLeftX,
        connectorRightX: connectorRightX,
        legs: legLayouts
    }
```

### Step 2.7: Position Leg Elements (Right-to-Left Back-Calculation)

**This is the key insight**: We know the branch's total width from Phase 1. We position elements left-to-right, but the branch's right connector is pre-determined to align with the longest leg.

```
function positionLegElements(leg, connectorLeftX, connectorRightX, wireY):
    contentStartX = connectorLeftX + BRANCH_CONNECTOR_OFFSET
    currentX = contentStartX
    
    elementLayouts = []
    
    for each element in leg:
        dims = getDimensions(element)
        
        if element is BranchGroup:
            // RECURSE: position inner branch
            layout = positionBranch(element, currentX, wireY)
        else:
            layout = positionInstruction(element, currentX, wireY)
        
        elementLayouts.push(layout)
        currentX += dims.width + INSTRUCTION_GAP
    
    // The connectorRightX was already determined by the longest leg
    // Shorter legs will have a horizontal wire extending to connectorRightX
    
    return {
        wireY: wireY,
        elements: elementLayouts,
        contentEndX: currentX - INSTRUCTION_GAP  // Last element's end
    }
```

---

## Complete Algorithm: Calculate Rung Layout

```
function calculateRungLayout(rung, rungIndex, yOffset, availableWidth):
    elements = rung.elements
    
    // ========================================
    // PHASE 1: Calculate all dimensions first
    // ========================================
    
    // This recursively calculates dimensions for all elements,
    // processing innermost branches before outer ones
    for each element in elements:
        calculateDimensions(element)  // Caches dimensions
    
    // Separate into conditions and operations
    { conditions, operations } = separateElements(elements)
    
    conditionsWidth = calculateTotalWidth(conditions)
    operationsWidth = calculateTotalWidth(operations)
    
    // ========================================
    // PHASE 2: Split into lines if needed
    // ========================================
    
    lines = splitIntoLines(conditions, operations, availableWidth)
    
    // ========================================
    // PHASE 3: Calculate line metrics
    // ========================================
    
    rungHeight = calculateLineMetrics(lines, yOffset)
    
    // ========================================
    // PHASE 4: Position elements
    // ========================================
    
    leftRailX = RUNG_NUMBER_WIDTH + RAIL_WIDTH + RAIL_VISUAL_WIDTH
    rightRailX = DIAGRAM_WIDTH - RAIL_WIDTH - RAIL_VISUAL_WIDTH
    
    lineLayouts = []
    
    for each line in lines:
        // Position operations from right
        operationsStartX = positionOperations(
            line.operations, 
            line, 
            rightRailX
        )
        
        // Position conditions from left
        conditionsEndX = positionConditions(
            line.conditions, 
            line, 
            leftRailX
        )
        
        lineLayouts.push({
            lineIndex: line.index,
            yOffset: line.yOffset,
            height: line.height,
            wireY: line.wireY,
            conditions: line.conditionLayouts,
            operations: line.operationLayouts,
            conditionsStartX: leftRailX + INSTRUCTION_GAP,
            operationsStartX: operationsStartX,
            isLastLine: line.isLastLine
        })
    
    return {
        rungIndex: rungIndex,
        yOffset: yOffset,
        height: rungHeight,
        lines: lineLayouts,
        hasBranches: containsBranches(elements)
    }
```

---

## Complete Algorithm: Calculate Diagram Layout

```
function calculateDiagramLayout(rungs):
    rungLayouts = []
    currentY = 0
    
    for i = 0 to rungs.length - 1:
        rungLayout = calculateRungLayout(
            rungs[i], 
            i, 
            currentY, 
            CONTENT_WIDTH
        )
        rungLayouts.push(rungLayout)
        currentY += rungLayout.height
    
    totalHeight = max(currentY, MIN_RUNG_HEIGHT)
    
    return {
        width: DIAGRAM_WIDTH,
        height: totalHeight,
        rungs: rungLayouts,
        powerRails: {
            leftX: RUNG_NUMBER_WIDTH,
            rightX: DIAGRAM_WIDTH - RAIL_VISUAL_WIDTH,
            width: RAIL_VISUAL_WIDTH,
            height: totalHeight
        },
        rungNumberWidth: RUNG_NUMBER_WIDTH,
        contentWidth: CONTENT_WIDTH
    }
```

---

## Visual Example

### Input Structure
```
Rung: [XIC_A] [Branch_1] [OTE_Z]
              ├── Leg_0: [XIC_B] [Branch_2] [XIC_E]
              │                  ├── Leg_0: [XIC_C]
              │                  └── Leg_1: [XIC_D]
              └── Leg_1: [XIC_F]
```

### Phase 1: Dimension Calculation Order

1. Calculate `XIC_C` dimensions: `{ width: 40, height: 20 }`
2. Calculate `XIC_D` dimensions: `{ width: 40, height: 20 }`
3. Calculate `Branch_2` dimensions:
   - Leg_0 width: 40 (XIC_C)
   - Leg_1 width: 40 (XIC_D)
   - Max leg width: 40
   - Branch_2 width: 40 + 2*10 = **60**
   - Branch_2 height: 20 + 5 + 20 = **45**
4. Calculate `XIC_B` dimensions: `{ width: 40, height: 20 }`
5. Calculate `XIC_E` dimensions: `{ width: 40, height: 20 }`
6. Calculate `Branch_1` Leg_0 dimensions:
   - Width: 40 + 60 + 40 = **140**
   - Height: max(20, 45, 20) = **45**
7. Calculate `XIC_F` dimensions: `{ width: 40, height: 20 }`
8. Calculate `Branch_1` Leg_1 dimensions:
   - Width: 40
   - Height: 20
9. Calculate `Branch_1` dimensions:
   - Max leg width: 140
   - Branch_1 width: 140 + 2*10 = **160**
   - Branch_1 height: 45 + 5 + 20 = **70**

### Phase 2: Position Calculation

```
Available width: 800 - 30 - 16 = 754

1. Position OTE_Z (right-aligned):
   OTE_Z.x = 754 - 30 = 724

2. Position XIC_A (left-aligned):
   XIC_A.x = 46

3. Position Branch_1:
   Branch_1.connectorLeftX = 46 + 40 + 0 = 86
   Branch_1.connectorRightX = 86 + 160 = 246
   
   Leg_0 (wireY = main wire):
     XIC_B.x = 96
     Branch_2.connectorLeftX = 96 + 40 = 136
     Branch_2.connectorRightX = 136 + 60 = 196
       Leg_0: XIC_C.x = 146
       Leg_1: XIC_D.x = 146
     XIC_E.x = 196 + 10 = 206
   
   Leg_1 (wireY = main wire + offset):
     XIC_F.x = 96
     (horizontal wire extends from XIC_F.endX to connectorRightX)
```

### Rendered Output (Conceptual)
```
     ┌───────────────────────────────────────────────────────────────────┐
  0  │──┤XIC_A├──┬──┤XIC_B├──┬──┤XIC_C├──┬────────────────────────( OTE_Z )──│
     │          │            │          │                                    │
     │          │            └──┤XIC_D├──┘                                    │
     │          │                                                            │
     │          └──┤XIC_F├──────────────────┘                                │
     └───────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

### Empty Branch Leg
- Use `MIN_RUNG_HEIGHT` for height
- Draw horizontal wire from `connectorLeftX + offset` to `connectorRightX - offset`

### Single Leg Branch
- Still draw left and right connectors (no vertical line)
- Position elements normally within the leg

### Branch with Only Operations
- Treat as operations, position right-aligned

### Deeply Nested Branches
- Recursion naturally handles any depth
- Each level calculates its dimensions before parent

---

## Data Structures

### InstructionLayout
```typescript
{
  type: 'instruction',
  instruction: Instruction,
  position: { x: number, y: number },
  dimensions: { width: number, height: number, centerY: number },
  symbolOffset: number,
  label?: string,
  address?: string
}
```

### BranchGroupLayout
```typescript
{
  type: 'branch',
  branchGroup: BranchGroup,
  position: { x: number, y: number },
  dimensions: { width: number, height: number, centerY: number },
  legs: BranchLegLayout[],
  connectorLeftX: number,
  connectorRightX: number
}
```

### BranchLegLayout
```typescript
{
  wireY: number,
  elements: RungElementLayout[],
  contentWidth: number,
  contentEndX: number  // For drawing extending wire
}
```

---

## Summary

| Phase | Direction | Purpose |
|-------|-----------|---------|
| **1. Dimensions** | Bottom-up (innermost first) | Know sizes before positioning |
| **2. Positions** | Left-to-right (conditions), Right-to-left (operations) | Align correctly |

The key insight is that **branch width is determined by the longest leg**, so all legs' right connectors align. Shorter legs have horizontal wires extending to meet the connector.
