// Timing Gen 3 - Cycle Management Module
// Version 3.5.0
// Handles cycle insertion and deletion operations

class TimingGenCycle {
    /**
     * Insert cycles globally for all signals
     * @param {TimingGenApp} app - Main application instance
     * @param {number} startCycle - Cycle after which to insert
     * @param {number} numCycles - Number of cycles to insert
     */
    static insertCyclesGlobal(app, startCycle, numCycles) {
        // Insert cycles for all signals after startCycle
        const signals = app.getSignals();
        signals.forEach(signal => {
            TimingGenCycle.insertCyclesForSignal(signal, startCycle, numCycles);
        });
        
        // Update measure cycle references
        TimingGenCycle.updateMeasureCyclesAfterInsertion(app, startCycle, numCycles);
        
        // Update arrow cycle references
        TimingGenCycle.updateArrowCyclesAfterInsertion(app, startCycle, numCycles);
        
        // Update cycle count
        app.config.cycles += numCycles;
        document.getElementById('cycles-input').value = app.config.cycles;
        app.initializeCanvas();
        app.render();
    }
    
    /**
     * Delete cycles globally for all signals
     * @param {TimingGenApp} app - Main application instance
     * @param {number} startCycle - First cycle to delete
     * @param {number} numCycles - Number of cycles to delete
     */
    static deleteCyclesGlobal(app, startCycle, numCycles) {
        // Delete cycles for all signals starting from startCycle
        const signals = app.getSignals();
        signals.forEach(signal => {
            TimingGenCycle.deleteCyclesForSignal(signal, startCycle, numCycles);
        });
        
        // Update measure cycle references
        TimingGenCycle.updateMeasureCyclesAfterDeletion(app, startCycle, numCycles);
        
        // Update arrow cycle references
        TimingGenCycle.updateArrowCyclesAfterDeletion(app, startCycle, numCycles);
        
        // Keep cycle count unchanged - the deleted cycles are replaced with steady cycles at the end
        // (steady cycles extend the last state automatically without explicit values)
        app.render();
    }
    
    /**
     * Insert cycles for a specific signal only
     * @param {TimingGenApp} app - Main application instance
     * @param {number} signalIndex - Index of the signal
     * @param {number} startCycle - Cycle after which to insert
     * @param {number} numCycles - Number of cycles to insert
     */
    static insertCyclesSignal(app, signalIndex, startCycle, numCycles) {
        const signal = app.getSignalByIndex(signalIndex);
        TimingGenCycle.insertCyclesForSignal(signal, startCycle, numCycles);
        app.render();
    }
    
    /**
     * Delete cycles for a specific signal only
     * @param {TimingGenApp} app - Main application instance
     * @param {number} signalIndex - Index of the signal
     * @param {number} startCycle - First cycle to delete
     * @param {number} numCycles - Number of cycles to delete
     */
    static deleteCyclesSignal(app, signalIndex, startCycle, numCycles) {
        const signal = app.getSignalByIndex(signalIndex);
        TimingGenCycle.deleteCyclesForSignal(signal, startCycle, numCycles);
        app.render();
    }
    
    /**
     * Insert cycles for a signal (internal helper)
     * @param {Object} signal - Signal object
     * @param {number} startCycle - Cycle after which to insert
     * @param {number} numCycles - Number of cycles to insert
     */
    static insertCyclesForSignal(signal, startCycle, numCycles) {
        // Shift all values and cycleOptions that are at or after startCycle+1
        const newValues = {};
        const newCycleOptions = {};
        
        // Copy values, shifting those after startCycle
        for (const [cycleStr, value] of Object.entries(signal.values)) {
            const cycle = parseInt(cycleStr, 10);
            if (cycle <= startCycle) {
                newValues[cycle] = value;
            } else {
                // Shift right by numCycles
                newValues[cycle + numCycles] = value;
            }
        }
        
        // Copy cycleOptions, shifting those after startCycle
        if (signal.cycleOptions) {
            for (const [cycleStr, options] of Object.entries(signal.cycleOptions)) {
                const cycle = parseInt(cycleStr, 10);
                if (cycle <= startCycle) {
                    newCycleOptions[cycle] = options;
                } else {
                    // Shift right by numCycles
                    newCycleOptions[cycle + numCycles] = options;
                }
            }
            signal.cycleOptions = newCycleOptions;
        }
        
        signal.values = newValues;
        // The inserted cycles will "extend" the current state (no explicit value needed)
    }
    
    /**
     * Delete cycles for a signal (internal helper)
     * @param {Object} signal - Signal object
     * @param {number} startCycle - First cycle to delete
     * @param {number} numCycles - Number of cycles to delete
     */
    static deleteCyclesForSignal(signal, startCycle, numCycles) {
        // Delete cycles and shift remaining ones left
        const newValues = {};
        const newCycleOptions = {};
        
        // Copy values, skipping deleted cycles and shifting remaining ones
        for (const [cycleStr, value] of Object.entries(signal.values)) {
            const cycle = parseInt(cycleStr, 10);
            if (cycle < startCycle) {
                // Keep as-is
                newValues[cycle] = value;
            } else if (cycle >= startCycle + numCycles) {
                // Shift left by numCycles
                newValues[cycle - numCycles] = value;
            }
            // Skip cycles in [startCycle, startCycle + numCycles)
        }
        
        // Copy cycleOptions, skipping deleted cycles and shifting remaining ones
        if (signal.cycleOptions) {
            for (const [cycleStr, options] of Object.entries(signal.cycleOptions)) {
                const cycle = parseInt(cycleStr, 10);
                if (cycle < startCycle) {
                    // Keep as-is
                    newCycleOptions[cycle] = options;
                } else if (cycle >= startCycle + numCycles) {
                    // Shift left by numCycles
                    newCycleOptions[cycle - numCycles] = options;
                }
                // Skip cycles in [startCycle, startCycle + numCycles)
            }
            signal.cycleOptions = newCycleOptions;
        }
        
        signal.values = newValues;
        // Add steady cycles at the end if needed (they extend the last state automatically)
    }
    
    /**
     * Update measure cycle references after insertion
     * @param {TimingGenApp} app - Main application instance
     * @param {number} startCycle - Cycle after which cycles were inserted
     * @param {number} numCycles - Number of cycles inserted
     */
    static updateMeasureCyclesAfterInsertion(app, startCycle, numCycles) {
        // Update cycle references in all measures after cycles are inserted
        const measures = app.getMeasures();
        measures.forEach(measure => {
            // Update cycle1 if it's after the insertion point
            if (measure.cycle1 !== undefined && measure.cycle1 > startCycle) {
                measure.cycle1 += numCycles;
            }
            
            // Update cycle2 if it's after the insertion point
            if (measure.cycle2 !== undefined && measure.cycle2 > startCycle) {
                measure.cycle2 += numCycles;
            }
        });
    }
    
    /**
     * Update measure cycle references after deletion
     * @param {TimingGenApp} app - Main application instance
     * @param {number} startCycle - First cycle that was deleted
     * @param {number} numCycles - Number of cycles deleted
     */
    static updateMeasureCyclesAfterDeletion(app, startCycle, numCycles) {
        // Update cycle references in all measures after cycles are deleted
        const measures = app.getMeasures();
        const measuresToDelete = [];
        
        measures.forEach(measure => {
            // Update cycle1 if it's after the deletion point
            if (measure.cycle1 !== undefined) {
                if (measure.cycle1 >= startCycle && measure.cycle1 < startCycle + numCycles) {
                    // Cycle was deleted - mark for deletion
                    measuresToDelete.push(measure.name);
                } else if (measure.cycle1 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    measure.cycle1 -= numCycles;
                }
            }
            
            // Update cycle2 if it's after the deletion point
            if (measure.cycle2 !== undefined) {
                if (measure.cycle2 >= startCycle && measure.cycle2 < startCycle + numCycles) {
                    // Cycle was deleted - mark for deletion
                    if (!measuresToDelete.includes(measure.name)) {
                        measuresToDelete.push(measure.name);
                    }
                } else if (measure.cycle2 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    measure.cycle2 -= numCycles;
                }
            }
        });
        
        // Remove invalid measures from Map and rows
        measuresToDelete.forEach(measureName => {
            app.measuresData.delete(measureName);
            const rowIndex = app.rows.findIndex(row => row.type === 'measure' && row.name === measureName);
            if (rowIndex >= 0) {
                app.rows.splice(rowIndex, 1);
            }
        });
    }
    
    /**
     * Update arrow cycle references after insertion
     * @param {TimingGenApp} app - Main application instance
     * @param {number} startCycle - Cycle after which cycles were inserted
     * @param {number} numCycles - Number of cycles inserted
     */
    static updateArrowCyclesAfterInsertion(app, startCycle, numCycles) {
        // Update cycle references in all arrows after cycles are inserted
        for (const [name, arrow] of app.arrowsData.entries()) {
            // Update cycle1 if it's after the insertion point
            if (arrow.cycle1 !== undefined && arrow.cycle1 > startCycle) {
                arrow.cycle1 += numCycles;
            }
            
            // Update cycle2 if it's after the insertion point
            if (arrow.cycle2 !== undefined && arrow.cycle2 > startCycle) {
                arrow.cycle2 += numCycles;
            }
        }
        
        // Recalculate arrow positions after cycle shift
        app.recalculateArrowPositions();
    }
    
    /**
     * Update arrow cycle references after deletion
     * @param {TimingGenApp} app - Main application instance
     * @param {number} startCycle - First cycle that was deleted
     * @param {number} numCycles - Number of cycles deleted
     */
    static updateArrowCyclesAfterDeletion(app, startCycle, numCycles) {
        // Update cycle references in all arrows after cycles are deleted
        const arrowsToDelete = [];
        
        for (const [name, arrow] of app.arrowsData.entries()) {
            let shouldDelete = false;
            
            // Check if cycle1 is in the deleted range
            if (arrow.cycle1 !== undefined) {
                if (arrow.cycle1 >= startCycle && arrow.cycle1 < startCycle + numCycles) {
                    // POI was deleted - mark arrow for deletion
                    shouldDelete = true;
                } else if (arrow.cycle1 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    arrow.cycle1 -= numCycles;
                }
            }
            
            // Check if cycle2 is in the deleted range
            if (arrow.cycle2 !== undefined) {
                if (arrow.cycle2 >= startCycle && arrow.cycle2 < startCycle + numCycles) {
                    // POI was deleted - mark arrow for deletion
                    shouldDelete = true;
                } else if (arrow.cycle2 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    arrow.cycle2 -= numCycles;
                }
            }
            
            if (shouldDelete) {
                arrowsToDelete.push(name);
            }
        }
        
        // Remove invalid arrows from Map
        arrowsToDelete.forEach(arrowName => {
            app.arrowsData.delete(arrowName);
        });
        
        // Recalculate arrow positions after cycle shift
        app.recalculateArrowPositions();
    }
    
    /**
     * Handle insert cycles dialog confirmation
     * @param {TimingGenApp} app - Main application instance
     */
    static handleInsertCycles(app) {
        const numCycles = parseInt(document.getElementById('insert-cycles-input').value);
        
        if (!TimingGenCycle.validateCycleCount(numCycles)) {
            return;
        }
        
        TimingGenUI.hideInsertCyclesDialog();
        
        if (app.insertCycleMode === 'global') {
            // Insert cycles for all signals after the current cycle
            TimingGenCycle.insertCyclesGlobal(app, app.currentEditingCycle, numCycles);
        } else if (app.insertCycleMode === 'signal') {
            // Insert cycles for the current signal only
            if (app.currentEditingSignal !== null) {
                TimingGenCycle.insertCyclesSignal(app, app.currentEditingSignal, app.currentEditingCycle, numCycles);
            }
        }
    }
    
    /**
     * Handle delete cycles dialog confirmation
     * @param {TimingGenApp} app - Main application instance
     */
    static handleDeleteCycles(app) {
        const numCycles = parseInt(document.getElementById('delete-cycles-input').value);
        
        if (!TimingGenCycle.validateCycleCount(numCycles)) {
            return;
        }
        
        TimingGenUI.hideDeleteCyclesDialog();
        
        if (app.deleteCycleMode === 'global') {
            // Delete cycles for all signals starting from the current cycle
            TimingGenCycle.deleteCyclesGlobal(app, app.currentEditingCycle, numCycles);
        } else if (app.deleteCycleMode === 'signal') {
            // Delete cycles for the current signal only
            if (app.currentEditingSignal !== null) {
                TimingGenCycle.deleteCyclesSignal(app, app.currentEditingSignal, app.currentEditingCycle, numCycles);
            }
        }
    }
    
    /**
     * Validate cycle count input
     * @param {number} numCycles - Number of cycles to validate
     * @returns {boolean} True if valid, false otherwise
     */
    static validateCycleCount(numCycles) {
        if (isNaN(numCycles) || numCycles < 1 || numCycles > 50) {
            alert('Please enter a valid number of cycles (1-50)');
            return false;
        }
        return true;
    }
}
