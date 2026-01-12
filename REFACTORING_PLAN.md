# Row System Refactoring Plan

## Current State Analysis

### Current Architecture (Gap-Based System)
The current implementation uses a **gap-based indexing system**:

- **Gap indices** represent spaces between signals (Gap 0, Gap 1, Gap 2, ...)
- `measureRows` is a Set tracking which gaps contain measure rows
- Signal positions are calculated based on signal index + accumulated measure rows
- Complex calculations to map Y coordinates to gap indices

**Example with 3 signals + 1 measure:**
```
Header
------- (Gap -1)
Signal 0
------- (Gap 0) ← measure row here
Signal 1
------- (Gap 1)
Signal 2
------- (Gap 2)
```

### Problems with Current System

1. **Complex Y Position Calculations**
   - Need to count measure rows before each position
   - Multiple helper functions: `getGapYPosition()`, `getRowIndicatorY()`, `getGapIndexAtY()`
   - Error-prone when adding/removing rows

2. **Inconsistent Abstractions**
   - Signals use array indices (0, 1, 2, ...)
   - Measures use gap indices (0, 1, 2, ...)
   - Different mental models for same UI concept

3. **Limited Extensibility**
   - Hard to add new widget types (annotations, markers, etc.)
   - Each new type would need gap-based logic
   - Drag-and-drop between different widget types is complex

4. **Data Migration Complexity**
   - Measures stored with `measureRow` (gap index)
   - Changing system requires migrating all saved files
   - Backward compatibility concerns

## Proposed Architecture (Unified Row System)

### New Row Model
Every visual element occupies exactly **one row**:

```
Row 0: Signal (clk)
Row 1: Signal (sig1)
Row 2: Measure (M1, M2)  ← multiple measures can share a row
Row 3: Signal (sig2)
Row 4: Measure (M3)
```

### Core Changes

#### 1. Data Model Changes

**Before:**
```javascript
{
    signals: [
        { name: "clk", type: "clock", ... },
        { name: "sig1", type: "bit", ... },
        { name: "sig2", type: "bit", ... }
    ],
    measures: [
        { signal1: 0, signal2: 1, measureRow: 0, ... },
        { signal1: 1, signal2: 2, measureRow: 1, ... }
    ],
    measureRows: Set([0, 1])  // gap indices
}
```

**After:**
```javascript
{
    rows: [
        { type: "signal", data: { name: "clk", type: "clock", ... } },
        { type: "signal", data: { name: "sig1", type: "bit", ... } },
        { type: "measure", data: [
            { signal1: 0, signal2: 1, ... },  // M1
            { signal1: 0, signal2: 1, ... }   // M2
        ]},
        { type: "signal", data: { name: "sig2", type: "bit", ... } },
        { type: "measure", data: [
            { signal1: 1, signal2: 3, ... }   // M3
        ]}
    ]
}
```

#### 2. API Changes

**Row Position Calculation:**
```javascript
// Before (complex)
getGapYPosition(gapIndex) {
    let measureRowsBefore = countMeasureRowsBefore(gapIndex);
    return headerHeight + (gapIndex + 1 + measureRowsBefore) * rowHeight;
}

// After (simple)
getRowYPosition(rowIndex) {
    return headerHeight + rowIndex * rowHeight;
}
```

**Row Index from Y Coordinate:**
```javascript
// Before (complex iteration)
getGapIndexAtY(y) {
    // Iterate through signals and measure rows...
    // Complex logic to account for measure rows
}

// After (simple arithmetic)
getRowIndexAtY(y) {
    return Math.floor((y - headerHeight) / rowHeight);
}
```

**Signal Reference in Measures:**
```javascript
// Before: signal1 is signal array index
{ signal1: 0, signal2: 2 }  // What if measure row is between?

// After: signal1 is row index
{ signal1Row: 0, signal2Row: 3 }  // Clear and unambiguous
```

#### 3. Drag and Drop Changes

**Before:**
- Signals: move within signals array, update measure signal indices
- Measures: change gap index, complex position calculations

**After:**
- All widgets: move to target row index
- Simpler reordering logic: array splice operation
- Automatic index updates for all references

### Migration Strategy

#### Phase 1: Add Row Abstraction Layer (Non-Breaking)
1. Create `RowManager` class to abstract row operations
2. Implement conversion functions between old/new models
3. Keep existing API surface, add new APIs alongside

```javascript
class RowManager {
    constructor(app) {
        this.app = app;
    }
    
    // New API
    getRowYPosition(rowIndex) { ... }
    getRowIndexAtY(y) { ... }
    getRowAt(index) { ... }
    moveRow(from, to) { ... }
    
    // Conversion helpers (for migration)
    signalIndexToRowIndex(signalIndex) { ... }
    rowIndexToSignalIndex(rowIndex) { ... }
    gapIndexToRowIndex(gapIndex) { ... }
}
```

#### Phase 2: Migrate Core Functions
1. Update rendering to use row-based positions
2. Migrate Y coordinate calculations
3. Update mouse event handlers
4. Test thoroughly with existing files

#### Phase 3: Update Data Model
1. Add migration function for file loading
2. Convert measures to use row indices
3. Remove gap-based logic
4. Update file save format (with version increment)

#### Phase 4: Cleanup
1. Remove deprecated functions
2. Remove `measureRows` Set
3. Simplify codebase
4. Update documentation

### File Format Migration

**Version Detection:**
```javascript
function loadData(data) {
    if (data.version === "3.0.3") {
        // Old gap-based format
        return migrateFrom303(data);
    } else if (data.version === "3.1.0") {
        // New row-based format
        return data;
    }
}

function migrateFrom303(oldData) {
    const rows = [];
    let currentRow = 0;
    
    // Convert signals and measures to rows
    for (let i = 0; i < oldData.signals.length; i++) {
        rows.push({ type: "signal", data: oldData.signals[i] });
        currentRow++;
        
        // Check if gap i has measures
        const measuresAtGap = oldData.measures.filter(m => m.measureRow === i);
        if (measuresAtGap.length > 0) {
            rows.push({ type: "measure", data: measuresAtGap });
            currentRow++;
        }
    }
    
    return { version: "3.1.0", rows };
}
```

### Benefits

1. **Simplicity**
   - Single mental model for all widgets
   - Simple arithmetic for position calculations
   - Easier to understand and maintain

2. **Extensibility**
   - Easy to add new widget types (annotations, spacers, etc.)
   - Uniform handling for drag-and-drop
   - Future-proof architecture

3. **Consistency**
   - Same indexing for all elements
   - Predictable behavior
   - Less error-prone

4. **Performance**
   - Faster position calculations (no iteration)
   - O(1) lookups instead of O(n) scans
   - Better for large diagrams

### Implementation Estimate

- **Phase 1** (Abstraction Layer): 8-12 hours
- **Phase 2** (Core Migration): 16-24 hours
- **Phase 3** (Data Model): 8-12 hours
- **Phase 4** (Cleanup): 4-6 hours
- **Testing & Bug Fixes**: 12-16 hours

**Total Estimate**: 48-70 hours (6-9 working days)

### Risks and Mitigation

1. **Breaking existing files**
   - Mitigation: Robust migration function with version detection
   - Keep backward compatibility for several versions

2. **Complex measure references**
   - Mitigation: Clear signal row references, validate on load
   - Add row index update logic when rows are moved

3. **Regression in existing functionality**
   - Mitigation: Comprehensive test cases before migration
   - Incremental approach with parallel APIs

4. **User disruption**
   - Mitigation: Seamless migration on file load
   - Clear version bumping and release notes

### Next Steps

1. Get stakeholder approval for refactoring plan
2. Create new branch for refactoring work
3. Implement Phase 1 (abstraction layer)
4. Test thoroughly with existing functionality
5. Proceed with phases 2-4
6. Release as version 3.1.0

### Alternative: Quick Fix for Current Issue

If full refactoring is deferred, the immediate issue (red line positioning after adding measure) can be fixed by:

1. Ensuring `getRowIndicatorY()` is called consistently in all places
2. Fixing any remaining references to old calculation methods
3. Adding comprehensive logging to debug Y position calculations

This would be a 2-4 hour fix but wouldn't address the underlying complexity.
