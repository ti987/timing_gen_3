# AC Table Y Coordinate Fix - Verification Guide

## What Was Fixed

### Critical Bug: Wrong Table Name When Clicking Lower Rows

**Problem:** When clicking on the 2nd data row (t2) or notes section of an AC table, the system used the wrong table name, causing:
- Context menus to fail
- Wrong data to be edited
- Apparent "Y coordinate mismatch"

**Root Cause:** The code used `row.name` from `getRowAtY()`, but AC tables are taller than one row. Clicking lower parts returns a different row (the one after the AC table in the rows array).

**Solution:** Now uses `item.data.tableName` from Paper.js hit testing, which correctly identifies the clicked AC table element regardless of visual row position.

## How to Verify the Fix

### Test Case 1: Two Data Rows (t1 and t2)

1. **Setup:**
   - Create an AC table with 2 measure rows (t1 and t2)
   - Each row should have some filled cells and some empty cells

2. **Test t1 Row (First Data Row):**
   - Right-click on empty Min cell in t1 row
   - ✅ Expected: Context menu appears with "Edit", "Font", "Cancel"
   - ✅ Expected: When you edit, it modifies t1's Min value

3. **Test t2 Row (Second Data Row):**
   - Right-click on empty Min cell in t2 row
   - ✅ Expected: Context menu appears
   - ✅ Expected: When you edit, it modifies t2's Min value (NOT t1!)
   - ⚠️ Before fix: This would fail or edit wrong row

4. **Verify No Confusion:**
   - Edit t1 Min to "10.0"
   - Edit t2 Min to "20.0"
   - ✅ Expected: Each row shows its correct value
   - ⚠️ Before fix: Values might get mixed up

### Test Case 2: Notes Section

1. **Setup:**
   - Add note references to AC table rows (e.g., "1,2")
   - Leave some note descriptions empty

2. **Test Note 1:**
   - Right-click on note 1 description
   - ✅ Expected: Context menu appears
   - Edit to add text "First note"
   - ✅ Expected: Text appears in note 1

3. **Test Note 2:**
   - Right-click on note 2 description (even if empty)
   - ✅ Expected: Context menu appears
   - Edit to add text "Second note"
   - ✅ Expected: Text appears in note 2
   - ⚠️ Before fix: This would fail because notes are below t2

### Test Case 3: Multiple AC Tables

1. **Setup:**
   - Create 2 AC tables in the diagram
   - Name them "Read Cycle" and "Write Cycle"

2. **Test:**
   - Click on 2nd row of first table
   - ✅ Expected: Edits go to first table
   - Click on 2nd row of second table
   - ✅ Expected: Edits go to second table (not first!)
   - ⚠️ Before fix: Table names could get confused

## Technical Details

### The Row System vs Visual Height

```
Unified Rows Array:
[0] Signal "clk"
[1] Signal "data"
[2] AC Table "Table1"  ← One entry in rows array
[3] Signal "addr"

Visual Rendering of AC Table at Row 2:
Y=100: Title (30px)
Y=130: Header (25px)
Y=155: Data Row 0 - t1 (25px)  ← First visual row
Y=180: Data Row 1 - t2 (25px)  ← Second visual row
Y=205: Data Row 2 - t3 (25px)  ← Third visual row
Y=230: Notes (100px)

Problem: Clicking at Y=190 (in t2):
- getRowAtY(190) calculates row index based on Y/rowHeight
- Returns row 3 (the Signal "addr"), NOT row 2 (the AC table)!
- Using row.name gives "addr" instead of "Table1"

Solution: Use item.data.tableName from hit test
- Paper.js knows which element was clicked
- Element has correct tableName in its data
- Works regardless of Y position
```

### What Changed in Code

**Before:**
```javascript
if (row.type === 'ac-table') {
    // Only works if getRowAtY returns the AC table row
    if (hitResults) {
        if (item.data.tableName === row.name) {
            this.currentEditingACCell = {
                tableName: row.name,  // ❌ Wrong when clicking lower
                ...
            };
        }
    }
}
```

**After:**
```javascript
// Check hit results FIRST, regardless of which row getRowAtY returns
if (hitResults) {
    if (item.data && item.data.tableName) {
        const acTableRow = this.rows.find(r => 
            r.type === 'ac-table' && r.name === item.data.tableName
        );
        if (acTableRow) {
            this.currentEditingACCell = {
                tableName: item.data.tableName,  // ✅ Always correct
                ...
            };
        }
    }
}
```

## Browser Cache Note

If the fix doesn't seem to work after pulling the latest code:
1. Clear browser cache: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Or disable cache in DevTools and refresh

## Success Criteria

All of these should work correctly:
- ✅ Right-click on any row of AC table (t1, t2, t3, etc.)
- ✅ Right-click on note descriptions
- ✅ Double-click to edit cells in any row
- ✅ Correct table name used for all operations
- ✅ No confusion between different AC tables
- ✅ No confusion between different data rows (t1 vs t2)

## Files Modified

- `js/timing_gen_core.js` - Fixed 4 instances of wrong tableName reference
  - Line 2244: ac-table-cell handler
  - Line 2261: note text/num handler
  - Line 2268: row-border handler
  - Line 2310: title/border handler
  - Restructured logic to check hit results before row type
