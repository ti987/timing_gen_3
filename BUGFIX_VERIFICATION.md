# Bug Fix Verification Guide

This document describes how to manually verify the 4 bug fixes in this PR.

## Bug 1: Arrow positions update when measures are moved

**Steps to test:**
1. Open the timing diagram editor
2. Add at least 2 signals (e.g., clk, data)
3. Add an arrow between two signal transitions
4. Add a measure (this creates a new row)
5. Drag the measure row to a different position

**Expected behavior:**
- The arrow should remain attached to the signal transitions
- Arrow positions should update correctly as the layout changes

**Code changed:**
- `rebuildAfterMeasureRowMove()` now calls `recalculateArrowPositions()`

## Bug 2: AC Table stays at bottom when signals/measures are added

**Steps to test:**
1. Open the timing diagram editor
2. Add an AC Table via "Add widget" → "AC Table"
3. Note that the AC Table appears at the bottom
4. Add a new signal via "Add Signal"
5. Add a new measure

**Expected behavior:**
- The AC Table should remain at the bottom of the diagram
- New signals and measures should be inserted above the AC Table

**Code changed:**
- `addSignal()` now checks for AC tables and inserts before them
- `finalizeMeasureWithBlankRow()` now checks for AC tables and inserts before them

## Bug 3: AC Table cells are editable via double-click

**Steps to test:**
1. Open the timing diagram editor
2. Add at least one measure (to populate the AC Table)
3. Add an AC Table via "Add widget" → "AC Table"
4. Double-click on a populated cell (e.g., Symbol column)
5. Double-click on an empty cell (e.g., Parameter column)

**Expected behavior:**
- Double-clicking any cell (populated or empty) should open the edit dialog
- You should be able to enter/edit text in any cell
- Changes should be saved and displayed in the table

**Code changed:**
- Added `handleCanvasDoubleClick()` event handler
- Detects double-clicks on both `ac-table-cell` and `ac-table-row-border` items
- Opens edit dialog for the clicked cell

## Bug 4: Measure text context menu works correctly

**Steps to test:**
1. Open the timing diagram editor
2. Add a measure (this will have a text label like "t1")
3. Right-click on the measure's text label
4. Verify the context menu shows "Edit Text", "Font", "Color", "Cancel"
5. Click "Edit Text" and verify you can change the text
6. Click "Font" and verify you can change the font
7. Click "Color" and verify you can change the color

**Expected behavior:**
- Right-clicking measure text shows a dedicated measure text context menu
- The menu operations (Edit, Font, Color) should work correctly
- No conflicts with general text row operations
- The menu should not trigger underlying operations

**Code changed:**
- Created new `measure-text-context-menu` in HTML
- Added dedicated event handlers: `showEditMeasureTextDialog()`, `showMeasureTextFontDialog()`, `showMeasureTextColorDialog()`
- Updated right-click handler to show the dedicated menu instead of the general text menu
- Removed `isMeasureTextContext` flag and updated all related functions
- Updated `updateTextRow()`, `updateTextFont()`, `updateTextColor()` to check `currentEditingMeasure` directly
