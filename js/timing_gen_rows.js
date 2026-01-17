// Timing Gen 3 - Row Management Module
// Version 3.3.1
// Unified row system for signals, measures, and future widget types
//
// This module provides the abstraction layer for the unified row system
// where every visual element (signal, measure, etc.) occupies exactly one row.

class RowManager {
    constructor(app) {
        this.app = app;
    }
    
    // ========================================
    // New Row-Based API
    // ========================================
    
    /**
     * Get Y position for a row index
     * @param {number} rowIndex - The row index (0-based)
     * @returns {number} Y coordinate in pixels
     */
    getRowYPosition(rowIndex) {
        return this.app.config.headerHeight + rowIndex * this.app.config.rowHeight;
    }
    
    /**
     * Get row index from Y coordinate
     * @param {number} y - Y coordinate in pixels
     * @returns {number} Row index (-1 if before first row)
     */
    getRowIndexAtY(y) {
        const relY = y - this.app.config.headerHeight;
        if (relY < 0) return -1;
        return Math.floor(relY / this.app.config.rowHeight);
    }
    
    /**
     * Get row data at specified index
     * @param {number} rowIndex - The row index
     * @returns {Object|null} Row object or null if invalid
     */
    getRowAt(rowIndex) {
        if (!this.app.rows || rowIndex < 0 || rowIndex >= this.app.rows.length) {
            return null;
        }
        return this.app.rows[rowIndex];
    }
    
    /**
     * Get total number of rows
     * @returns {number} Total row count
     */
    getTotalRows() {
        return this.app.rows ? this.app.rows.length : 0;
    }
    
    /**
     * Move a row from one position to another
     * @param {number} fromIndex - Source row index
     * @param {number} toIndex - Destination row index
     */
    moveRow(fromIndex, toIndex) {
        if (!this.app.rows || fromIndex < 0 || fromIndex >= this.app.rows.length) {
            return;
        }
        
        if (fromIndex === toIndex) {
            return; // No move needed
        }
        
        // Remove row from original position
        const [row] = this.app.rows.splice(fromIndex, 1);
        
        // Calculate insertion index after removal
        // If moving down, toIndex stays the same (element removed shifts indices)
        // If moving up, toIndex stays the same
        this.app.rows.splice(toIndex, 0, row);
        
        // Update any measure references that point to moved rows
        this.updateMeasureReferencesAfterMove(fromIndex, toIndex);
    }
    
    /**
     * Insert a new row at specified position
     * @param {number} index - Position to insert
     * @param {Object} rowData - Row data {type: 'signal'|'measure', data: ...}
     */
    insertRow(index, rowData) {
        if (!this.app.rows) {
            this.app.rows = [];
        }
        
        this.app.rows.splice(index, 0, rowData);
        
        // Update measure references for rows after insertion point
        this.updateMeasureReferencesAfterInsertion(index);
    }
    
    /**
     * Delete a row at specified position
     * @param {number} index - Row index to delete
     */
    deleteRow(index) {
        if (!this.app.rows || index < 0 || index >= this.app.rows.length) {
            return;
        }
        
        this.app.rows.splice(index, 1);
        
        // Update measure references for rows after deletion point
        this.updateMeasureReferencesAfterDeletion(index);
    }
    
    // ========================================
    // Conversion Helpers
    // ========================================
    
    /**
     * Convert signal index to row index
     * @param {number} signalIndex - Signal array index
     * @returns {number} Row index in unified system
     */
    signalIndexToRowIndex(signalIndex) {
        // Find the row where signal is located
        for (let i = 0; i < this.app.rows.length; i++) {
            if (this.app.rows[i].type === 'signal') {
                if (signalIndex === 0) return i;
                signalIndex--;
            }
        }
        return -1;
    }
    
    /**
     * Convert row index to signal index
     * @param {number} rowIndex - Row index in unified system
     * @returns {number} Signal array index (-1 if not a signal row)
     */
    rowIndexToSignalIndex(rowIndex) {
        // Count signals before this row
        let signalCount = 0;
        for (let i = 0; i < rowIndex && i < this.app.rows.length; i++) {
            if (this.app.rows[i].type === 'signal') {
                signalCount++;
            }
        }
        
        // Check if the row at rowIndex is a signal
        if (rowIndex < this.app.rows.length && this.app.rows[rowIndex].type === 'signal') {
            return signalCount;
        }
        return -1;
    }
    
    // ========================================
    // Measure Reference Update Helpers
    // ========================================
    
    /**
     * Update measure references after a row move
     * @param {number} fromIndex - Original position
     * @param {number} toIndex - New position
     */
    updateMeasureReferencesAfterMove(fromIndex, toIndex) {
        if (!this.app.rows) return;
        
        // Find all measure rows and update their signal references
        this.app.rows.forEach(row => {
            if (row.type === 'measure' && Array.isArray(row.data)) {
                row.data.forEach(measure => {
                    // Update signal1Row reference
                    if (measure.signal1Row !== undefined) {
                        measure.signal1Row = this.adjustIndexAfterMove(
                            measure.signal1Row, fromIndex, toIndex
                        );
                    }
                    // Update signal2Row reference
                    if (measure.signal2Row !== undefined) {
                        measure.signal2Row = this.adjustIndexAfterMove(
                            measure.signal2Row, fromIndex, toIndex
                        );
                    }
                });
            }
        });
    }
    
    /**
     * Adjust an index value after a move operation
     * @param {number} index - Index to adjust
     * @param {number} fromIndex - Source of move
     * @param {number} toIndex - Destination of move
     * @returns {number} Adjusted index
     */
    adjustIndexAfterMove(index, fromIndex, toIndex) {
        if (index === fromIndex) {
            return toIndex;
        } else if (fromIndex < toIndex) {
            // Moving down: decrement indices in between
            if (index > fromIndex && index <= toIndex) {
                return index - 1;
            }
        } else {
            // Moving up: increment indices in between
            if (index >= toIndex && index < fromIndex) {
                return index + 1;
            }
        }
        return index;
    }
    
    /**
     * Update measure references after row insertion
     * @param {number} insertIndex - Where row was inserted
     */
    updateMeasureReferencesAfterInsertion(insertIndex) {
        if (!this.app.rows) return;
        
        this.app.rows.forEach(row => {
            if (row.type === 'measure' && Array.isArray(row.data)) {
                row.data.forEach(measure => {
                    // Update measure row reference (row indices are for rendering only)
                    // Signal names are the primary identifiers and don't need updating
                    if (measure.measureRow !== undefined && measure.measureRow >= insertIndex) {
                        measure.measureRow++;
                    }
                });
            }
        });
    }
    
    /**
     * Update measure references after row deletion
     * @param {number} deleteIndex - Where row was deleted
     */
    updateMeasureReferencesAfterDeletion(deleteIndex) {
        if (!this.app.rows) return;
        
        this.app.rows.forEach(row => {
            if (row.type === 'measure' && Array.isArray(row.data)) {
                row.data.forEach(measure => {
                    // Update measure row reference (row indices are for rendering only)
                    // Signal names are the primary identifiers
                    // If measure row was deleted, mark as invalid
                    if (measure.measureRow !== undefined) {
                        if (measure.measureRow === deleteIndex) {
                            measure.invalid = true;
                        } else if (measure.measureRow > deleteIndex) {
                            measure.measureRow--;
                        }
                    }
                });
            }
        });
        
        // Remove invalid measures
        this.app.rows.forEach(row => {
            if (row.type === 'measure' && Array.isArray(row.data)) {
                row.data = row.data.filter(m => !m.invalid);
            }
        });
    }
    
    /**
     * Check if app is using row-based system
     * @returns {boolean} True if using unified row system
     */
    isUsingNewSystem() {
        return this.app.rows !== undefined && Array.isArray(this.app.rows);
    }
}
