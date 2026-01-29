# Bug Fix Verification Guide - Updated

This document describes how to manually verify the bug fixes in this PR.

## Bug 1: Arrow positions update when measures are moved

**Steps to test:**
1. Open the timing diagram editor
2. Add at least 2 signals (e.g., clk, data)
3. Add an arrow between two signal transitions
4. Add a measure (this creates a new row)
5. Drag the measure row to a different position
6. Drag a signal to a different position

**Expected behavior:**
- The arrow should remain attached to the signal transitions
- Arrow positions should update correctly as the layout changes when signals are reordered

**Code changed:**
- `rebuildAfterSignalRowMove()` calls `recalculateArrowPositions()` (line 2960)
- `rebuildAfterMeasureRowMove()` calls `recalculateArrowPositions()` (line 2713)

**Status:** Code is in place. If issues persist, more details needed on specific test scenario.

## Bug 2: AC Table stays at bottom - ENHANCED FIX

**Steps to test:**
1. Open the timing diagram editor
2. Add an AC Table via "Add widget" → "AC Table"
3. Note that the AC Table appears at the bottom
4. Add a new signal via "Add Signal"
5. Add a new measure
6. **Try to drag a signal below the AC table** ← NEW TEST
7. **Try to drag a measure below the AC table** ← NEW TEST

**Expected behavior:**
- The AC Table should remain at the bottom of the diagram
- New signals and measures should be inserted above the AC Table
- **Signals cannot be dragged below AC tables** ← FIXED
- **Measures cannot be dragged below AC tables** ← FIXED

**Code changed:**
- `addSignal()` checks for AC tables and inserts before them
- `finalizeMeasureWithBlankRow()` checks for AC tables and inserts before them
- **NEW:** `dropSignal()` caps insertion index at first AC table (line 2828-2831)
- **NEW:** `dropMeasureRow()` caps insertion index at first AC table (line 2643-2647)

## Bug 3: AC Table cells are editable - ENHANCED FIX

**Steps to test:**
1. Open the timing diagram editor
2. Add at least one measure (to populate the AC Table)
3. Add an AC Table via "Add widget" → "AC Table"
4. Double-click on a populated cell (e.g., Symbol column)
5. Double-click on an empty cell (e.g., Parameter column)
6. **Right-click on a populated cell** ← EXISTING
7. **Right-click on an empty cell** ← NEW TEST

**Expected behavior:**
- Double-clicking any cell (populated or empty) should open the edit dialog
- **Right-clicking any cell (populated or empty) should show context menu** ← FIXED
- You should be able to enter/edit text in any cell
- Changes should be saved and displayed in the table

**Code changed:**
- `handleCanvasDoubleClick()` detects double-clicks on both `ac-table-cell` and `ac-table-row-border` items
- **NEW:** `handleCanvasRightClick()` detects right-clicks on `ac-table-row-border` items (line 2079-2123)
- **NEW:** Calculates column position and shows appropriate context menu for empty cells

## Bug 4: Measure text context menu works correctly - FIXED

**Steps to test:**
1. Open the timing diagram editor
2. Add a measure (this will have a text label like "t1")
3. Right-click on the measure's text label
4. Verify the context menu shows "Edit Text", "Font", "Color", "Cancel"
5. **Click "Edit Text" and verify the dialog opens** ← SHOULD NOW WORK
6. **Click "Font" and verify the dialog opens** ← SHOULD NOW WORK
7. **Click "Color" and verify the dialog opens** ← SHOULD NOW WORK

**Expected behavior:**
- Right-clicking measure text shows a dedicated measure text context menu
- The menu operations (Edit, Font, Color) should work correctly
- No conflicts with general text row operations

**Code changed:**
- Created new `measure-text-context-menu` in HTML
- Added dedicated event handlers: `showEditMeasureTextDialog()`, `showMeasureTextFontDialog()`, `showMeasureTextColorDialog()`
- **FIXED:** `showMeasureTextContextMenu()` now shows correct menu ID (`measure-text-context-menu` instead of `text-context-menu`) (line 4496)
- Updated `updateTextRow()`, `updateTextFont()`, `updateTextColor()` to check `currentEditingMeasure` directly

## Version

**Version incremented from 3.4.0 to 3.4.1** in:
- package.json
- index.html (comment on line 3)
