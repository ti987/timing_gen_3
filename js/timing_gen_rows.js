// Timing Gen 3 - Row Management Module
// Version 3.1.0
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
    // Conversion Helpers (for migration)
    // ========================================
    
    /**
     * Convert signal index to row index (old system → new system)
     * During migration, this accounts for blank rows
     * @param {number} signalIndex - Signal array index
     * @returns {number} Row index in unified system
     */
    signalIndexToRowIndex(signalIndex) {
        // During migration phase, we need to check if using old or new system
        if (this.app.rows) {
            // New system: find the row where signal is located
            for (let i = 0; i < this.app.rows.length; i++) {
                if (this.app.rows[i].type === 'signal') {
                    if (signalIndex === 0) return i;
                    signalIndex--;
                }
            }
            return -1;
        } else {
            // Old system: account for blank rows
            if (!this.app.blankRows || this.app.blankRows.length === 0) {
                return signalIndex;
            }
            
            let rowIndex = signalIndex;
            for (const blankRowIndex of this.app.blankRows) {
                if (blankRowIndex <= signalIndex) {
                    rowIndex++;
                } else {
                    break;
                }
            }
            return rowIndex;
        }
    }
    
    /**
     * Convert row index to signal index (new system → old system)
     * @param {number} rowIndex - Row index in unified system
     * @returns {number} Signal array index (-1 if not a signal row)
     */
    rowIndexToSignalIndex(rowIndex) {
        if (this.app.rows) {
            // New system: count signals before this row
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
        } else {
            // Old system: account for blank rows
            if (!this.app.blankRows || this.app.blankRows.length === 0) {
                return rowIndex;
            }
            
            let signalIndex = rowIndex;
            for (const blankRowIndex of this.app.blankRows) {
                if (blankRowIndex <= rowIndex) {
                    signalIndex--;
                } else {
                    break;
                }
            }
            return signalIndex >= 0 ? signalIndex : -1;
        }
    }
    
    /**
     * Get signal data by signal index
     * Works with both old and new systems
     * @param {number} signalIndex - Signal array index
     * @returns {Object|null} Signal data
     */
    getSignalByIndex(signalIndex) {
        if (this.app.rows) {
            // New system: find in rows array
            const rowIndex = this.signalIndexToRowIndex(signalIndex);
            if (rowIndex >= 0) {
                const row = this.app.rows[rowIndex];
                return row && row.type === 'signal' ? row.data : null;
            }
            return null;
        } else {
            // Old system: direct access
            return this.app.signals[signalIndex] || null;
        }
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
                    if (measure.signal1Row !== undefined && measure.signal1Row >= insertIndex) {
                        measure.signal1Row++;
                    }
                    if (measure.signal2Row !== undefined && measure.signal2Row >= insertIndex) {
                        measure.signal2Row++;
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
                    if (measure.signal1Row !== undefined) {
                        if (measure.signal1Row === deleteIndex) {
                            // Signal was deleted - mark measure as invalid
                            measure.invalid = true;
                        } else if (measure.signal1Row > deleteIndex) {
                            measure.signal1Row--;
                        }
                    }
                    if (measure.signal2Row !== undefined) {
                        if (measure.signal2Row === deleteIndex) {
                            measure.invalid = true;
                        } else if (measure.signal2Row > deleteIndex) {
                            measure.signal2Row--;
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
    
    // ========================================
    // System Detection & Migration
    // ========================================
    
    /**
     * Check if app is using new row-based system
     * @returns {boolean} True if using new system
     */
    isUsingNewSystem() {
        return this.app.rows !== undefined && Array.isArray(this.app.rows);
    }
    
    /**
     * Migrate from old gap-based system to new row-based system
     */
    migrateToNewSystem() {
        if (this.isUsingNewSystem()) {
            return; // Already migrated
        }
        
        const rows = [];
        
        // Convert signals to rows
        for (let i = 0; i < this.app.signals.length; i++) {
            rows.push({
                type: 'signal',
                data: this.app.signals[i]
            });
            
            // Check if there's a blank row (measure row) after this signal
            if (this.app.blankRows && this.app.blankRows.includes(i)) {
                // Find measures at this gap index
                const measuresAtGap = this.app.measures.filter(m => m.measureRow === i);
                
                if (measuresAtGap.length > 0) {
                    // Convert measure signal references to row indices
                    measuresAtGap.forEach(measure => {
                        measure.signal1Row = measure.signal1Index !== undefined 
                            ? this.signalIndexToRowIndex(measure.signal1Index)
                            : rows.length - 1; // Default to previous signal
                        measure.signal2Row = measure.signal2Index !== undefined
                            ? this.signalIndexToRowIndex(measure.signal2Index)
                            : rows.length - 1;
                        
                        // Remove old fields
                        delete measure.measureRow;
                        delete measure.signal1Index;
                        delete measure.signal2Index;
                    });
                    
                    rows.push({
                        type: 'measure',
                        data: measuresAtGap
                    });
                }
            }
        }
        
        // Set new rows array
        this.app.rows = rows;
        
        // Clean up old data structures
        delete this.app.blankRows;
        // Keep signals array for now for backward compatibility
    }
}
