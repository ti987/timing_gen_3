# Timing Gen 3 – Function Index

All public functions / methods across every JavaScript source file, sorted alphabetically.
Each entry shows the function name, the file it is defined in, and a short description.

| Function | File | Description |
|---|---|---|
| `addACTable` | `timing_gen_ac_table.js` | Creates a new AC characteristics table and adds it to the bottom of the diagram |
| `addACTable` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.addACTable` |
| `addACTableRowForMeasure` | `timing_gen_ac_table.js` | Appends a new row to every existing AC table when a measure is created |
| `addACTableRowForMeasure` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.addACTableRowForMeasure` |
| `addCounterRow` | `timing_gen_text_counter.js` | Reads the counter dialog and inserts a new counter row into the diagram |
| `addCounterRow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.addCounterRow` |
| `addGroup` | `timing_gen_core.js` | Creates a new empty group row and adds it to the diagram |
| `addSignal` | `timing_gen_core.js` | Reads the Add Signal dialog and appends a new signal to the diagram |
| `addTear` | `timing_gen_tear.js` | Reads the tear dialog and adds a tear mark at the specified cycle |
| `addTear` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTear.addTear` |
| `addTearAtCycle` | `timing_gen_tear.js` | Adds a tear mark directly at a given cycle number |
| `addTearAtCycle` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTear.addTearAtCycle` |
| `addTextRow` | `timing_gen_text_counter.js` | Reads the text dialog and inserts a new text annotation row |
| `addTextRow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.addTextRow` |
| `adjustIndexAfterMove` | `timing_gen_rows.js` | Adjusts a row index to account for a previous row move operation |
| `applyArrowOptions` | `timing_gen_arrow.js` | Saves arrow style options (color, width, style) from the options dialog |
| `applyArrowOptions` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.applyArrowOptions` |
| `applyArrowTextOptions` | `timing_gen_arrow.js` | Saves arrow label font and color from the text-options dialog |
| `applyArrowTextOptions` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.applyArrowTextOptions` |
| `applyEditArrowText` | `timing_gen_arrow.js` | Applies the edited label text to an arrow |
| `applyEditArrowText` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.applyEditArrowText` |
| `blankCounter` | `timing_gen_text_counter.js` | Inserts a blank (empty) entry at the current cycle in a counter row |
| `blankCounter` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.blankCounter` |
| `calculateTimeDiff` | `timing_gen_ac_table.js` | Computes the signed time difference between two measure endpoints in config time units, respecting each signal's clock-domain period and clock phase offsets |
| `cancelArrow` | `timing_gen_arrow.js` | Cancels an arrow currently being drawn and cleans up temporary graphics |
| `cancelArrow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.cancelArrow` |
| `cancelMeasure` | `timing_gen_measure.js` | Cancels a measure currently being created and cleans up temporary graphics |
| `cancelMeasure` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.cancelMeasure` |
| `cancelSelection` | `timing_gen_core.js` | Clears all selected signals and cancels any ongoing drag |
| `captureState` | `timing_gen_undo.js` | Captures the current application state onto the undo stack before a user action |
| `clearHistory` | `timing_gen_undo.js` | Clears both the undo and redo stacks (called after loading a new file) |
| `constructor` | `timing_gen_core.js` | Initialises the `TimingGenApp` instance: sets up config, data maps, Paper.js layers, and event listeners |
| `constructor` | `timing_gen_rows.js` | Initialises the `RowManager` with a reference to the parent app |
| `constructor` | `timing_gen_undo.js` | Initialises the `UndoRedoManager` with empty undo/redo stacks |
| `continueCounter` | `timing_gen_text_counter.js` | Marks a counter to resume auto-incrementing from the current cycle |
| `continueCounter` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.continueCounter` |
| `convertPeriodToNs` | `timing_gen_core.js` | Converts a clock period value from any supported time unit to nanoseconds |
| `createACTableRowFromMeasure` | `timing_gen_ac_table.js` | Builds an AC table row object from a measure, computing min/max timing values with delay and phase |
| `createACTableRowFromMeasure` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.createACTableRowFromMeasure` |
| `deleteACTable` | `timing_gen_ac_table.js` | Removes an AC table from the data store and row list |
| `deleteACTable` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.deleteACTable` |
| `deleteACTableRow` | `timing_gen_ac_table.js` | Deletes the currently selected row from its AC table after user confirmation |
| `deleteACTableRow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.deleteACTableRow` |
| `deleteArrow` | `timing_gen_arrow.js` | Deletes the currently selected/editing arrow |
| `deleteArrow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.deleteArrow` |
| `deleteCounter` | `timing_gen_core.js` | Deletes the currently selected counter row |
| `deleteCurrentACTable` | `timing_gen_ac_table.js` | Deletes the AC table that is currently being edited, after user confirmation |
| `deleteCurrentACTable` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.deleteCurrentACTable` |
| `deleteCyclesForSignal` | `timing_gen_cycle.js` | Removes a range of cycles from a single signal's value map |
| `deleteCyclesForSignal` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.deleteCyclesForSignal` |
| `deleteCyclesGlobal` | `timing_gen_cycle.js` | Removes a range of cycles from every signal in the diagram |
| `deleteCyclesGlobal` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.deleteCyclesGlobal` |
| `deleteCyclesSignal` | `timing_gen_cycle.js` | Removes a range of cycles from a single signal by index |
| `deleteCyclesSignal` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.deleteCyclesSignal` |
| `deleteMeasure` | `timing_gen_measure.js` | Deletes the currently selected measure and removes it from all AC tables |
| `deleteMeasure` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.deleteMeasure` |
| `deleteMeasureRow` | `timing_gen_core.js` | Deletes the measure row that is currently being edited |
| `deleteRow` | `timing_gen_rows.js` | Removes the row at the given index and updates all dependent references |
| `deleteSignal` | `timing_gen_core.js` | Removes the currently selected signal and all associated measures |
| `deleteTear` | `timing_gen_tear.js` | Removes a tear mark at the specified cycle |
| `deleteTear` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTear.deleteTear` |
| `deleteTextRow` | `timing_gen_text_counter.js` | Removes the currently selected text annotation row |
| `deleteTextRow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.deleteTextRow` |
| `deselectSignal` | `timing_gen_core.js` | Removes a single signal from the current selection set |
| `disableClockCycle` | `timing_gen_core.js` | Disables (holds low/high/Z) a specific cycle of a clock signal |
| `drawACTable` | `timing_gen_rendering.js` | Renders an AC characteristics table (title, header, data rows, notes) onto the canvas |
| `drawArrow` | `timing_gen_rendering.js` | Renders a curved annotation arrow with an arrowhead and optional label |
| `drawArrowHead` | `timing_gen_measure.js` | Draws a small filled arrowhead triangle for measure arrows |
| `drawArrowHead` | `timing_gen_rendering.js` | Draws a small filled arrowhead in the specified direction |
| `drawBezierArrowHead` | `timing_gen_rendering.js` | Draws an arrowhead tangent to the end of a Bézier curve |
| `drawBitDelayUncertainty` | `timing_gen_rendering.js` | Renders the shaded uncertainty region between min and max delay for a bit-signal transition |
| `drawBitWaveform` | `timing_gen_rendering.js` | Renders the complete waveform for a bit (single-bit) signal including slew and X patterns |
| `drawBusDelayUncertainty` | `timing_gen_rendering.js` | Renders the shaded uncertainty region between min and max delay for a bus-signal transition |
| `drawBusWaveform` | `timing_gen_rendering.js` | Renders the complete waveform for a bus (multi-bit) signal including value labels and X spans |
| `drawClockWaveform` | `timing_gen_rendering.js` | Renders the square-wave for a clock signal, respecting phase delay and primary-clock clipping |
| `drawCounterRow` | `timing_gen_rendering.js` | Renders a counter row showing auto-incremented cycle labels |
| `drawCycleNumberRow` | `timing_gen_rendering.js` | Renders a small cycle-number row for a non-primary clock domain |
| `drawDynamicVerticalLine` | `timing_gen_measure.js` | Draws a temporary vertical guideline that follows the mouse during measure creation |
| `drawDynamicVerticalLine` | `timing_gen_rendering.js` | Draws a temporary vertical guideline during measure or arrow creation |
| `drawFirstPointVisuals` | `timing_gen_measure.js` | Draws the cross and vertical line marking the first selected measure point |
| `drawFullVerticalLine` | `timing_gen_measure.js` | Draws a permanent vertical line spanning two Y positions for measure visuals |
| `drawFullVerticalLine` | `timing_gen_rendering.js` | Draws a full-height vertical line at a given X position |
| `drawGrid` | `timing_gen_rendering.js` | Renders vertical cycle grid lines and horizontal row dividers for all clock domains |
| `drawGroup` | `timing_gen_rendering.js` | Renders all measures belonging to a group row |
| `drawGroupRowName` | `timing_gen_rendering.js` | Renders the name-column label (and bracket) for a group row |
| `drawHeader` | `timing_gen_rendering.js` | Renders the primary cycle-number header row at the top of the diagram |
| `drawMeasure` | `timing_gen_rendering.js` | Renders a single timing measure (arrows, vertical bars, label text) |
| `drawMeasureArrows` | `timing_gen_measure.js` | Draws the double-headed horizontal arrow line for a measure |
| `drawMeasureArrows` | `timing_gen_rendering.js` | Draws the horizontal arrow line portion of a timing measure |
| `drawMeasureBar` | `timing_gen_measure.js` | Draws a temporary colored vertical bar during measure-point selection |
| `drawMeasureRowName` | `timing_gen_rendering.js` | Renders the name-column label for a measure row |
| `drawRotatedArrowHead` | `timing_gen_rendering.js` | Draws an arrowhead rotated to a given angle (used for annotation arrows) |
| `drawRowIndicator` | `timing_gen_measure.js` | Draws a colored horizontal indicator line showing the row the measure will be placed on |
| `drawRowIndicator` | `timing_gen_rendering.js` | Draws a row-placement indicator line during drag-and-drop operations |
| `drawSecondPointVisuals` | `timing_gen_measure.js` | Draws the cross, vertical line, and arrow for the second selected measure point |
| `drawSignal` | `timing_gen_rendering.js` | Renders a single signal row (name label, waveform, selection highlight) |
| `drawSmallCross` | `timing_gen_measure.js` | Draws a small cross (×) marker at a signal transition for measure creation |
| `drawSmallCross` | `timing_gen_rendering.js` | Draws a small cross marker at a coordinate |
| `drawTear` | `timing_gen_rendering.js` | Renders the zigzag tear mark at a specified cycle boundary |
| `drawTextRow` | `timing_gen_rendering.js` | Renders a text annotation row in the waveform area |
| `drawXPattern` | `timing_gen_rendering.js` | Renders a gray filled rectangle representing an unknown (X) bus state |
| `dropGroupRow` | `timing_gen_core.js` | Completes a group-row drag by inserting the group at the drop position |
| `dropMeasureRow` | `timing_gen_core.js` | Completes a measure-row drag by inserting the measure at the drop position |
| `dropSignal` | `timing_gen_core.js` | Completes a signal drag-and-drop by reordering signals to the drop position |
| `enableClockCycle` | `timing_gen_core.js` | Re-enables a previously disabled clock cycle, restoring its normal toggling |
| `exportToSVG` | `timing_gen_data.js` | Exports the current diagram as an SVG file, stripping headers and selection highlights |
| `finalizeArrow` | `timing_gen_arrow.js` | Completes arrow creation, saving it to the data store and triggering a re-render |
| `finalizeArrow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.finalizeArrow` |
| `finalizeMeasure` | `timing_gen_measure.js` | Completes measure creation: saves the measure, adds an AC table row, and re-renders |
| `finalizeMeasure` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.finalizeMeasure` |
| `finalizeMeasureWithBlankRow` | `timing_gen_measure.js` | Finalises measure creation by adding a new blank measure row below the current signals |
| `finalizeMeasureWithBlankRow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.finalizeMeasureWithBlankRow` |
| `findClosestPOI` | `timing_gen_arrow.js` | Returns the point-of-interest from a list that is closest to (x, y) |
| `findClosestPOI` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.findClosestPOI` |
| `findNearestPOI` | `timing_gen_measure.js` | Returns the nearest signal transition point-of-interest to a canvas coordinate |
| `findNearestPOI` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.findNearestPOI` |
| `findNearestTransition` | `timing_gen_measure.js` | Finds the nearest signal transition edge to a given canvas (x, y) position |
| `findNearestTransition` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.findNearestTransition` |
| `flashMeasure` | `timing_gen_ac_table.js` | Briefly highlights a measure row by toggling its row indicator (flash animation) |
| `flashMeasure` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.flashMeasure` |
| `generateCounterLabels` | `timing_gen_rendering.js` | Produces the array of display strings for each cycle of a counter row |
| `getAllClockDomains` | `timing_gen_core.js` | Returns a list of all unique clock-domain names present in the diagram |
| `getAllNearbyPOIs` | `timing_gen_arrow.js` | Returns all point-of-interest candidates for a signal within a small horizontal window |
| `getAllPOIsForSignalCycle` | `timing_gen_arrow.js` | Returns all point-of-interest objects (rising, falling, bit transitions) for a signal at a given cycle |
| `getAllPOIsForSignalCycle` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.getAllPOIsForSignalCycle` |
| `getBitValueAtCycle` | `timing_gen_core.js` | Returns the logical value (0, 1, X, Z) of a bit signal at a specific cycle |
| `getBusValueAtCycle` | `timing_gen_core.js` | Returns the value string of a bus signal at a specific cycle |
| `getClockForSignal` | `timing_gen_core.js` | Returns the clock signal that a bit/bus signal belongs to (its domain clock) |
| `getClockSignals` | `timing_gen_core.js` | Returns an array of all clock-type signals in the diagram |
| `getCycleAtX` | `timing_gen_measure.js` | Converts a canvas X coordinate to the nearest cycle index for a given signal |
| `getCycleAtX` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.getCycleAtX` |
| `getCycleWidthForClock` | `timing_gen_core.js` | Returns the pixel width per cycle for a specific clock signal, scaled relative to the primary clock |
| `getCycleWidthForSignal` | `timing_gen_core.js` | Returns the pixel width per cycle for a signal by looking up its domain clock |
| `getEffectiveDelay` | `timing_gen_core.js` | Returns the resolved delay `{min, max, color}` in pixels for a signal at a cycle, applying the global→signal→cycle cascade and phase offset |
| `getEffectiveDelayInTime` | `timing_gen_core.js` | Returns the resolved delay `{min, max}` in time units for a signal at a cycle, applying the global→signal→cycle cascade and phase offset |
| `getEffectiveSlew` | `timing_gen_core.js` | Returns the resolved slew (transition ramp) in pixels for a signal at a cycle |
| `getHitTestOptions` | `timing_gen_core.js` | Returns a Paper.js hit-test options object used for canvas interaction |
| `getMeasureByIndex` | `timing_gen_core.js` | Returns the measure object at a given index in the ordered measures list |
| `getMeasureByName` | `timing_gen_core.js` | Returns the measure data object identified by name |
| `getMeasureCoordinates` | `timing_gen_measure.js` | Returns the canvas `{x1, y1, x2, y2}` pixel coordinates for a measure's two endpoints |
| `getMeasureCoordinates` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.getMeasureCoordinates` |
| `getMeasurePlacementY` | `timing_gen_measure.js` | Returns the Y coordinate for placing a measure label based on the user's click position |
| `getMeasurePlacementY` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.getMeasurePlacementY` |
| `getMeasures` | `timing_gen_core.js` | Returns an ordered array of all measure data objects |
| `getMaxCyclesForSignal` | `timing_gen_rendering.js` | Returns the maximum number of cycles to draw for a signal, capped at the primary clock's duration |
| `getPhaseDelayForSignal` | `timing_gen_core.js` | Returns the inherited phase delay (in ns) from a bit/bus signal's domain clock |
| `getPointOfInterest` | `timing_gen_arrow.js` | Returns the pixel coordinate of a specific transition point-of-interest on a signal |
| `getPointOfInterest` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.getPointOfInterest` |
| `getPrimaryClockMaxX` | `timing_gen_rendering.js` | Returns the maximum X pixel boundary defined by the primary clock's cycle count and width |
| `getRowAt` | `timing_gen_rows.js` | Returns the row data object at the specified row index |
| `getRowHeight` | `timing_gen_rows.js` | Returns the pixel height for a given row index, based on its row type |
| `getRowIndexAtY` | `timing_gen_rows.js` | Returns the row index that contains the given Y canvas coordinate |
| `getRowAtY` | `timing_gen_core.js` | Returns the row object and index for the row that contains a given Y position |
| `getSignalByIndex` | `timing_gen_core.js` | Returns the signal object at a given index in the ordered signals list |
| `getSignalByName` | `timing_gen_core.js` | Returns the signal data object identified by name |
| `getSignalIndex` | `timing_gen_core.js` | Returns the index of a signal by name in the ordered signals list |
| `getSignalIndexAtY` | `timing_gen_core.js` | Returns the signal index for the signal row that contains a given Y coordinate |
| `getSignalYPosition` | `timing_gen_rendering.js` | Returns the Y pixel position of the top edge of a signal row by signal index |
| `getSignals` | `timing_gen_core.js` | Returns an ordered array of all signal data objects |
| `getSignalsInDomain` | `timing_gen_core.js` | Returns all bit/bus signals that belong to a specific named clock domain |
| `getTotalRows` | `timing_gen_rows.js` | Returns the total number of rows currently in the diagram |
| `getTransitionMidpointX` | `timing_gen_measure.js` | Returns the X pixel position at the midpoint of a signal transition edge at a given cycle |
| `getTransitionMidpointX` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.getTransitionMidpointX` |
| `getTransitionPoint` | `timing_gen_arrow.js` | Returns the canvas (x, y) coordinate of a signal transition for arrow snapping |
| `getTransitionPoint` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.getTransitionPoint` |
| `handleArrowClick` | `timing_gen_arrow.js` | Handles a canvas click during arrow creation: selects the start or end point |
| `handleArrowMouseMove` | `timing_gen_arrow.js` | Updates the temporary arrow preview as the mouse moves during arrow creation |
| `handleArrowMouseMove` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.handleArrowMouseMove` |
| `handleCanvasClick` | `timing_gen_core.js` | Routes a left-click on the canvas to the appropriate handler (signal toggle, measure, arrow, etc.) |
| `handleCanvasDoubleClick` | `timing_gen_core.js` | Routes a double-click on the canvas (opens edit dialogs for text, counter, bus value, etc.) |
| `handleCanvasMouseDrag` | `timing_gen_core.js` | Handles mouse drag events on the canvas for signal/measure/group reordering |
| `handleCanvasMouseUp` | `timing_gen_core.js` | Completes drag operations on mouse-up and finalises row reordering |
| `handleCanvasRightClick` | `timing_gen_core.js` | Routes a right-click on the canvas to the appropriate context menu |
| `handleDeleteCycles` | `timing_gen_cycle.js` | Reads the Delete Cycles dialog and removes cycles globally or per-signal |
| `handleDeleteCycles` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.handleDeleteCycles` |
| `handleInsertCycles` | `timing_gen_cycle.js` | Reads the Insert Cycles dialog and inserts blank cycles globally or per-signal |
| `handleInsertCycles` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.handleInsertCycles` |
| `handleMeasureMouseMove` | `timing_gen_measure.js` | Updates the preview lines and indicator as the mouse moves during measure creation |
| `handleMeasureMouseMove` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.handleMeasureMouseMove` |
| `handleNewDocument` | `timing_gen_core.js` | Resets the entire application to a blank state after user confirmation |
| `hideAboutDialog` | `timing_gen_core.js` | Hides the About dialog |
| `hideACCellFontDialog` | `timing_gen_ac_table.js` | Hides the AC cell font editing dialog |
| `hideACCellFontDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.hideACCellFontDialog` |
| `hideACRowSpanDialog` | `timing_gen_ac_table.js` | Hides the AC row-span editing dialog |
| `hideACRowSpanDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.hideACRowSpanDialog` |
| `hideAddACTableDialog` | `timing_gen_ac_table.js` | Hides the Add AC Table dialog |
| `hideAddACTableDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.hideAddACTableDialog` |
| `hideAddCounterDialog` | `timing_gen_text_counter.js` | Hides the Add Counter dialog |
| `hideAddCounterDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.hideAddCounterDialog` |
| `hideAddSignalDialog` | `timing_gen_ui.js` | Hides the Add Signal dialog |
| `hideAddTearDialog` | `timing_gen_tear.js` | Hides the Add Tear dialog |
| `hideAddTearDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTear.hideAddTearDialog` |
| `hideAddTextDialog` | `timing_gen_text_counter.js` | Hides the Add Text dialog |
| `hideAddTextDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.hideAddTextDialog` |
| `hideAllDialogs` | `timing_gen_ui.js` | Closes all open dialogs at once |
| `hideAllMenus` | `timing_gen_core.js` | Closes all visible context menus |
| `hideArrowOptionsDialog` | `timing_gen_arrow.js` | Hides the Arrow Options dialog |
| `hideArrowOptionsDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.hideArrowOptionsDialog` |
| `hideArrowTextOptionsDialog` | `timing_gen_arrow.js` | Hides the Arrow Text Options dialog |
| `hideArrowTextOptionsDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.hideArrowTextOptionsDialog` |
| `hideBusValueDialog` | `timing_gen_ui.js` | Hides the Bus Value editing dialog |
| `hideColorDialog` | `timing_gen_text_counter.js` | Hides the text-color picker dialog |
| `hideColorDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.hideColorDialog` |
| `hideCycleOptionsDialog` | `timing_gen_ui.js` | Hides the Cycle Options dialog |
| `hideDeleteCyclesDialog` | `timing_gen_ui.js` | Hides the Delete Cycles dialog |
| `hideEditACCellDialog` | `timing_gen_ac_table.js` | Hides the Edit AC Cell dialog |
| `hideEditACCellDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.hideEditACCellDialog` |
| `hideEditArrowTextDialog` | `timing_gen_arrow.js` | Hides the Edit Arrow Text dialog |
| `hideEditArrowTextDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.hideEditArrowTextDialog` |
| `hideEditCounterDialog` | `timing_gen_text_counter.js` | Hides the Edit Counter dialog |
| `hideEditCounterDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.hideEditCounterDialog` |
| `hideEditSignalDialog` | `timing_gen_ui.js` | Hides the Edit Signal dialog |
| `hideEditTextDialog` | `timing_gen_text_counter.js` | Hides the Edit Text dialog |
| `hideEditTextDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.hideEditTextDialog` |
| `hideFontDialog` | `timing_gen_text_counter.js` | Hides the font-picker dialog |
| `hideFontDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.hideFontDialog` |
| `hideGlobalOptionDialog` | `timing_gen_ui.js` | Hides the Global Options dialog |
| `hideInstruction` | `timing_gen_measure.js` | Hides the instruction banner displayed during measure/arrow creation |
| `hideInstruction` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.hideInstruction` |
| `hideInsertCyclesDialog` | `timing_gen_ui.js` | Hides the Insert Cycles dialog |
| `hideSignalOptionsDialog` | `timing_gen_ui.js` | Hides the Signal Options dialog |
| `hideTearDialog` (see `hideAddTearDialog`) | `timing_gen_tear.js` | Hides the Add Tear dialog |
| `hideUsersManualDialog` | `timing_gen_core.js` | Hides the User's Manual dialog |
| `hitTestAllLayers` | `timing_gen_core.js` | Performs a Paper.js hit-test across all rendering layers and returns the first match |
| `initializeACTableRows` | `timing_gen_ac_table.js` | Populates a new AC table with one row per existing measure |
| `initializeACTableRows` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.initializeACTableRows` |
| `initializeCanvas` | `timing_gen_core.js` | Resizes the canvas element and updates the Paper.js view to match the current diagram dimensions |
| `insertCyclesForSignal` | `timing_gen_cycle.js` | Inserts blank cycles into a single signal's value map at the specified start cycle |
| `insertCyclesForSignal` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.insertCyclesForSignal` |
| `insertCyclesGlobal` | `timing_gen_cycle.js` | Inserts blank cycles into every signal in the diagram at the specified start cycle |
| `insertCyclesGlobal` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.insertCyclesGlobal` |
| `insertCyclesSignal` | `timing_gen_cycle.js` | Inserts blank cycles into a single signal by index |
| `insertCyclesSignal` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.insertCyclesSignal` |
| `insertRow` | `timing_gen_rows.js` | Inserts a new row at the given index and updates measure references |
| `isUsingNewSystem` | `timing_gen_rows.js` | Returns `true` if the unified row system is active (always true in v3.2+) |
| `loadFromJSON` | `timing_gen_data.js` | Loads a `.td3` JSON file, restores all signals/measures/config, and re-renders |
| `moveACTableTo` | `timing_gen_ac_table.js` | Moves the currently-editing AC table to the given position (`'top'` or `'bottom'`) |
| `moveACTableTo` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.moveACTableTo` |
| `moveACTableToPosition` | `timing_gen_ac_table.js` | Repositions an AC table to `'top'` or `'bottom'` in the row list |
| `moveACTableToPosition` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.moveACTableToPosition` |
| `moveRow` | `timing_gen_rows.js` | Moves a row from one index to another and updates all measure and arrow references |
| `populateClockDomainDropdown` | `timing_gen_ui.js` | Fills a `<select>` element with all available clock domain options |
| `rebuildAfterGroupRowMove` | `timing_gen_core.js` | Rebuilds row ordering data after a group row drag-and-drop |
| `rebuildAfterMeasureRowMove` | `timing_gen_core.js` | Rebuilds row ordering data after a measure row drag-and-drop |
| `rebuildAfterSignalRowMove` | `timing_gen_core.js` | Rebuilds row ordering data after a signal drag-and-drop |
| `rebuildRowsAfterSignalMove` | `timing_gen_core.js` | Re-inserts moved signal rows at the drop position, preserving relative order of the selection |
| `recalculateArrowPositions` | `timing_gen_arrow.js` | Recomputes the canvas coordinates of all arrow control points after a re-render |
| `recalculateArrowPositions` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.recalculateArrowPositions` |
| `redrawAll` | `timing_gen_core.js` | Forces a full re-render of all layers and recalculates arrow positions |
| `redo` | `timing_gen_undo.js` | Pops the redo stack and restores the application to the next state |
| `removeBitChange` | `timing_gen_core.js` | Removes the bit-value override at the currently-selected cycle |
| `removeBusChange` | `timing_gen_core.js` | Removes the bus-value override at the currently-selected cycle |
| `removeDragIndicator` | `timing_gen_core.js` | Removes the visual row-drop indicator line from the canvas |
| `removeACTableRowForMeasure` | `timing_gen_ac_table.js` | Removes the row linked to a measure from every AC table |
| `removeACTableRowForMeasure` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.removeACTableRowForMeasure` |
| `render` | `timing_gen_rendering.js` | Main render entry point: clears all layers and redraws the entire diagram |
| `render` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenRendering.render`, then syncs arrow graphics |
| `restoreState` | `timing_gen_undo.js` | Deserialises and applies a captured state snapshot to the application |
| `rowIndexToSignalIndex` | `timing_gen_rows.js` | Converts a row index to the corresponding signal index (−1 if not a signal row) |
| `saveCycleOptions` | `timing_gen_ui.js` | Reads the Cycle Options dialog and applies per-cycle delay/slew overrides to the current signal |
| `saveGlobalOptions` | `timing_gen_ui.js` | Reads the Global Options dialog and updates cycle width, periods, slew, and delay configuration |
| `saveSignalOptions` | `timing_gen_ui.js` | Reads the Signal Options dialog and applies per-signal slew, delay, and clock-domain settings |
| `saveToJSON` | `timing_gen_data.js` | Serialises the entire diagram to a `.td3` JSON file and triggers a browser download |
| `selectSignalRange` | `timing_gen_core.js` | Extends the selection from the last selected signal to a target signal (shift-click range) |
| `serializeMap` | `timing_gen_undo.js` | Converts a `Map` to a plain array of `[key, value]` pairs for JSON serialisation |
| `serializeState` | `timing_gen_undo.js` | Serialises the full application state (config, rows, signals, measures, etc.) to a plain object |
| `setBitValue` | `timing_gen_core.js` | Sets a bit signal's value at a specific cycle and triggers a re-render |
| `setBusValue` | `timing_gen_core.js` | Reads the Bus Value dialog and sets the bus signal value at the current cycle |
| `setClockDisableState` | `timing_gen_core.js` | Sets the hold state (0, 1, or Z) for a disabled clock cycle |
| `setupEventListeners` | `timing_gen_core.js` | Wires all DOM event listeners for menus, dialogs, canvas, and keyboard shortcuts |
| `shouldShowHeader` | `timing_gen_rendering.js` | Returns whether the primary cycle-number header row should be visible |
| `showAboutDialog` | `timing_gen_core.js` | Shows the About dialog |
| `showACCellFontDialog` | `timing_gen_ac_table.js` | Shows the font-picker dialog for an AC table cell |
| `showACCellFontDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.showACCellFontDialog` |
| `showACRowSpanDialog` | `timing_gen_ac_table.js` | Shows the row-span picker dialog for an AC table row |
| `showACRowSpanDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.showACRowSpanDialog` |
| `showAddACTableDialog` | `timing_gen_ac_table.js` | Shows the dialog for creating a new AC table |
| `showAddACTableDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.showAddACTableDialog` |
| `showAddCounterDialog` | `timing_gen_text_counter.js` | Shows the dialog for adding a counter row |
| `showAddCounterDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.showAddCounterDialog` |
| `showAddSignalDialog` | `timing_gen_ui.js` | Opens the Add Signal dialog, pre-populating defaults and the clock domain dropdown |
| `showAddTearDialog` | `timing_gen_tear.js` | Shows the dialog for adding a tear mark |
| `showAddTearDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTear.showAddTearDialog` |
| `showAddTextDialog` | `timing_gen_text_counter.js` | Shows the dialog for adding a text annotation row |
| `showAddTextDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.showAddTextDialog` |
| `showArrowContextMenu` | `timing_gen_arrow.js` | Shows the context menu for an annotation arrow |
| `showArrowContextMenu` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.showArrowContextMenu` |
| `showArrowOptionsDialog` | `timing_gen_arrow.js` | Opens the Arrow Options dialog populated with current arrow style settings |
| `showArrowOptionsDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.showArrowOptionsDialog` |
| `showArrowTextContextMenu` | `timing_gen_arrow.js` | Shows the context menu for an arrow label |
| `showArrowTextContextMenu` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.showArrowTextContextMenu` |
| `showArrowTextOptionsDialog` | `timing_gen_arrow.js` | Opens the Arrow Text Options dialog populated with current label font/color settings |
| `showArrowTextOptionsDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.showArrowTextOptionsDialog` |
| `showBitCycleContextMenu` | `timing_gen_ui.js` | Shows the right-click context menu for a bit signal cycle |
| `showBusValueDialog` | `timing_gen_ui.js` | Opens the Bus Value dialog for entering or editing a bus value |
| `showBusCycleContextMenu` | `timing_gen_ui.js` | Shows the right-click context menu for a bus signal cycle |
| `showBusValueFontDialog` | `timing_gen_core.js` | Opens the font-picker for a bus value label |
| `showClockCycleContextMenu` | `timing_gen_ui.js` | Shows the right-click context menu for a clock cycle (enable/disable, insert/delete) |
| `showColorDialog` | `timing_gen_text_counter.js` | Shows the color picker for a text annotation row |
| `showColorDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.showColorDialog` |
| `showContextMenu` | `timing_gen_ui.js` | Positions and displays a named context menu at the given canvas coordinates |
| `showCounterOptionsDialog` | `timing_gen_text_counter.js` | Shows the counter options dialog (format, start value, etc.) |
| `showCycleOptionsDialog` | `timing_gen_ui.js` | Opens the per-cycle signal options dialog (delay min/max, slew, color) |
| `showDeleteCyclesDialog` | `timing_gen_ui.js` | Opens the Delete Cycles dialog |
| `showEditACCellDialog` | `timing_gen_ac_table.js` | Opens the cell-editing dialog for the currently selected AC table cell |
| `showEditACCellDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.showEditACCellDialog` |
| `showEditArrowTextDialog` | `timing_gen_arrow.js` | Opens the dialog for editing an arrow's label text |
| `showEditArrowTextDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.showEditArrowTextDialog` |
| `showEditCounterDialog` | `timing_gen_text_counter.js` | Opens the counter editing dialog for a specific counter row and cycle |
| `showEditCounterDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.showEditCounterDialog` |
| `showEditMeasureTextDialog` | `timing_gen_core.js` | Opens the dialog for editing a measure's label text |
| `showEditSignalDialog` | `timing_gen_ui.js` | Opens the Edit Signal dialog pre-populated with the current signal's settings |
| `showEditTextDialog` | `timing_gen_text_counter.js` | Opens the editing dialog for a text annotation row |
| `showEditTextDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.showEditTextDialog` |
| `showFontDialog` | `timing_gen_text_counter.js` | Shows the font-picker for a text annotation row |
| `showFontDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.showFontDialog` |
| `showGlobalOptionDialog` | `timing_gen_ui.js` | Opens the Global Options dialog pre-populated with current config values |
| `showInsertCyclesDialog` | `timing_gen_ui.js` | Opens the Insert Cycles dialog |
| `showInstruction` | `timing_gen_measure.js` | Shows an instruction banner message during multi-step operations |
| `showInstruction` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.showInstruction` |
| `showMeasureContextMenu` | `timing_gen_measure.js` | Shows the context menu for a timing measure |
| `showMeasureContextMenu` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.showMeasureContextMenu` |
| `showMeasureTextColorDialog` | `timing_gen_core.js` | Opens the color picker for a measure's label text |
| `showMeasureTextContextMenu` | `timing_gen_measure.js` | Shows the context menu for a measure label (move, rechoose point, etc.) |
| `showMeasureTextContextMenu` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.showMeasureTextContextMenu` |
| `showMeasureTextFontDialog` | `timing_gen_core.js` | Opens the font-picker for a measure's label text |
| `showRestartCounterDialog` | `timing_gen_text_counter.js` | Opens the dialog for restarting a counter at a specific value and cycle |
| `showRestartCounterDialog` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.showRestartCounterDialog` |
| `showSignalNameFontDialog` | `timing_gen_core.js` | Opens the font-picker for a signal's name label |
| `showSignalOptionsDialog` | `timing_gen_ui.js` | Opens the per-signal options dialog (slew, delay min/max, clock domain) |
| `showUsersManualDialog` | `timing_gen_core.js` | Shows the User's Manual dialog |
| `signalIndexToRowIndex` | `timing_gen_rows.js` | Converts a signal index to its corresponding row index in the unified row list |
| `startArrowMode` | `timing_gen_arrow.js` | Activates arrow-drawing mode and installs the mouse-move handler |
| `startArrowMode` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.startArrowMode` |
| `startDragGroupRow` | `timing_gen_core.js` | Initiates drag-and-drop for a group row |
| `startDragMeasureRow` | `timing_gen_core.js` | Initiates drag-and-drop for a measure row |
| `startDragMeasureText` | `timing_gen_measure.js` | Initiates dragging of a measure label along its arrow line |
| `startDragMeasureText` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.startDragMeasureText` |
| `startDragSignal` | `timing_gen_core.js` | Initiates drag-and-drop for a signal row |
| `startDraggingArrowPoint` | `timing_gen_arrow.js` | Initiates dragging of an arrow control point (start, end, or Bézier handle) |
| `startDraggingArrowPoint` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.startDraggingArrowPoint` |
| `startEditingArrow` | `timing_gen_arrow.js` | Enters arrow-edit mode for a named arrow, showing control-point handles |
| `startEditingArrow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.startEditingArrow` |
| `startMeasureMode` | `timing_gen_measure.js` | Activates measure-drawing mode and installs the mouse-move handler |
| `startMeasureMode` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.startMeasureMode` |
| `startMovingMeasureRow` | `timing_gen_measure.js` | Initiates moving a measure to a different row |
| `startMovingMeasureRow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.startMovingMeasureRow` |
| `startRechooseMeasurePoint` | `timing_gen_measure.js` | Enters rechoose mode so the user can reselect one endpoint of an existing measure |
| `startRechooseMeasurePoint` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenMeasure.startRechooseMeasurePoint` |
| `stopEditingArrow` | `timing_gen_arrow.js` | Exits arrow-edit mode, hiding control-point handles |
| `stopEditingArrow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.stopEditingArrow` |
| `toggleBitSignal` | `timing_gen_core.js` | Toggles a bit signal between 0 and 1 at the given cycle |
| `toggleSignalSelection` | `timing_gen_core.js` | Adds or removes a signal from the selection set on Ctrl/Cmd-click |
| `undo` | `timing_gen_undo.js` | Pops the undo stack and restores the application to the previous state |
| `updateACCell` | `timing_gen_ac_table.js` | Applies the edited value from the AC cell dialog to the table data |
| `updateACCell` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.updateACCell` |
| `updateACCellFont` | `timing_gen_ac_table.js` | Applies the selected font settings from the AC cell font dialog |
| `updateACCellFont` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.updateACCellFont` |
| `updateACRowSpan` | `timing_gen_ac_table.js` | Updates the row-span value for an AC table row |
| `updateACRowSpan` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.updateACRowSpan` |
| `updateACTableForMeasureChange` | `timing_gen_ac_table.js` | Recalculates AC table rows that reference a changed measure (min/max/symbol/unit) |
| `updateACTableForMeasureChange` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.updateACTableForMeasureChange` |
| `updateACTableValues` | `timing_gen_ac_table.js` | Recalculates all auto-computed rows in an AC table after a global option change |
| `updateACTableValues` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.updateACTableValues` |
| `updateArrowCyclesAfterDeletion` | `timing_gen_cycle.js` | Adjusts all arrow endpoint cycles after cycles are deleted |
| `updateArrowCyclesAfterDeletion` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.updateArrowCyclesAfterDeletion` |
| `updateArrowCyclesAfterInsertion` | `timing_gen_cycle.js` | Adjusts all arrow endpoint cycles after cycles are inserted |
| `updateArrowCyclesAfterInsertion` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.updateArrowCyclesAfterInsertion` |
| `updateArrowPoint` | `timing_gen_arrow.js` | Moves an arrow control point to a new position, snapping to nearby POIs |
| `updateArrowPoint` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenArrow.updateArrowPoint` |
| `updateButtons` | `timing_gen_undo.js` | Enables or disables the Undo/Redo toolbar buttons based on stack state |
| `updateCounterValue` | `timing_gen_text_counter.js` | Applies the edited counter start value from the edit dialog |
| `updateCounterValue` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.updateCounterValue` |
| `updateCurrentACTable` | `timing_gen_ac_table.js` | Applies the title change for the AC table that is currently being edited |
| `updateCurrentACTable` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenACTable.updateCurrentACTable` |
| `updateCycles` | `timing_gen_core.js` | Changes the total cycle count, resizes the canvas, and re-renders |
| `updateDragIndicator` | `timing_gen_core.js` | Repositions the drop-target indicator line as a row is being dragged |
| `updateGroupMeasureRows` | `timing_gen_core.js` | Synchronises the measure-row list inside a group after its group row is moved |
| `updateMeasureCyclesAfterDeletion` | `timing_gen_cycle.js` | Adjusts all measure endpoint cycles after cycles are deleted |
| `updateMeasureCyclesAfterDeletion` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.updateMeasureCyclesAfterDeletion` |
| `updateMeasureCyclesAfterInsertion` | `timing_gen_cycle.js` | Adjusts all measure endpoint cycles after cycles are inserted |
| `updateMeasureCyclesAfterInsertion` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.updateMeasureCyclesAfterInsertion` |
| `updateMeasureReferencesAfterDeletion` | `timing_gen_rows.js` | Updates measure row/signal references when a row is deleted |
| `updateMeasureReferencesAfterInsertion` | `timing_gen_rows.js` | Updates measure row/signal references when a new row is inserted |
| `updateMeasureReferencesAfterMove` | `timing_gen_rows.js` | Updates measure row/signal references after a row is moved |
| `updateSignal` | `timing_gen_core.js` | Reads the Edit Signal dialog and applies name/type changes to the selected signal |
| `updateTextColor` | `timing_gen_text_counter.js` | Applies the chosen color to a text annotation row |
| `updateTextColor` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.updateTextColor` |
| `updateTextFont` | `timing_gen_text_counter.js` | Applies the chosen font settings to a text annotation row |
| `updateTextFont` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.updateTextFont` |
| `updateTextRow` | `timing_gen_text_counter.js` | Reads the edit dialog and saves the new text content for a text row |
| `updateTextRow` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenTextCounter.updateTextRow` |
| `validateCycleCount` | `timing_gen_cycle.js` | Validates that a cycle count is a positive integer within allowed limits |
| `validateCycleCount` (wrapper) | `timing_gen_core.js` | Delegates to `TimingGenCycle.validateCycleCount` |
