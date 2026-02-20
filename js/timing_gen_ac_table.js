// Timing Gen 3 - AC Table Module
// Version 3.5.0
// Handles AC (AC Characteristics) table functionality for timing parameters

class TimingGenACTable {
    /**
     * Show dialog to add a new AC table
     * @param {TimingGenApp} app - Main application instance
     */
    static showAddACTableDialog(app) {
        document.getElementById('ac-table-title-input').value = 'AC Table';
        document.getElementById('add-ac-table-dialog').style.display = 'flex';
    }
    
    /**
     * Hide the add AC table dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideAddACTableDialog(app) {
        document.getElementById('add-ac-table-dialog').style.display = 'none';
    }
    
    /**
     * Add a new AC table with the specified title
     * @param {TimingGenApp} app - Main application instance
     */
    static addACTable(app) {
        const title = document.getElementById('ac-table-title-input').value.trim();
        
        if (!title) {
            alert('Please enter a table title');
            return;
        }
        
        // Generate unique name
        const name = `ACT${app.acTableCounter}`;
        app.acTableCounter++;
        
        // Create AC Table data object
        const acTableData = {
            title: title,
            position: 'bottom', // 'top' or 'bottom'
            columnWidths: [400, 100, 100, 100, 100, 100], // Parameter, Symbol, Min., Max., Unit, Note
            rows: [],
            notes: [], // Array of {number, text}
            titleFont: 'Arial',
            titleSize: 14,
            titleColor: '#000000',
            headerFont: 'Arial',
            headerSize: 12,
            headerColor: '#000000',
            cellFont: 'Arial',
            cellSize: 12,
            cellColor: '#000000'
        };
        
        // Initialize rows from existing measures
        TimingGenACTable.initializeACTableRows(app, acTableData);
        
        // Add to data store
        app.acTablesData.set(name, acTableData);
        
        // Add to rows array at the bottom
        app.rows.push({
            type: 'ac-table',
            name: name
        });
        
        TimingGenACTable.hideAddACTableDialog(app);
        app.render();
    }
    
    /**
     * Initialize AC table rows from existing measures
     * @param {TimingGenApp} app - Main application instance
     * @param {Object} acTableData - AC table data object
     */
    static initializeACTableRows(app, acTableData) {
        // Create a row for each existing measure
        for (const [measureName, measure] of app.measuresData.entries()) {
            const row = TimingGenACTable.createACTableRowFromMeasure(app, measureName, measure);
            acTableData.rows.push(row);
        }
    }
    
    /**
     * Create an AC table row from a measure
     * @param {TimingGenApp} app - Main application instance
     * @param {string} measureName - Name of the measure
     * @param {Object} measure - Measure data object
     * @returns {Object} Row data object
     */
    static createACTableRowFromMeasure(app, measureName, measure) {
        // Calculate min and max from cycle period and delays
        const cyclePeriod = app.config.clockPeriod;
        const unit = app.config.clockPeriodUnit;
        
        // Get both signals for this measure
        const signal1 = app.getSignalByName(measure.signal1Name);
        const signal2 = app.getSignalByName(measure.signal2Name);
        
        // Get effective delays for both signals at their respective cycles
        // This handles the cascade: cycle > signal > global
        const signal1Delays = app.getEffectiveDelayInTime(signal1, measure.cycle1);
        const signal2Delays = app.getEffectiveDelayInTime(signal2, measure.cycle2);
        
        // Calculate cycle difference
        const cycleDiff = Math.abs(measure.cycle2 - measure.cycle1);
        const timeValue = cyclePeriod * cycleDiff;
        
        // Calculate both min-to-min and max-to-max paths
        // Then assign the smaller to min and larger to max
        const minToMin = timeValue - signal1Delays.min + signal2Delays.min;
        const maxToMax = timeValue - signal1Delays.max + signal2Delays.max;
        const minValue = Math.min(minToMin, maxToMax).toFixed(2);
        const maxValue = Math.max(minToMin, maxToMax).toFixed(2);
        
        return {
            measureName: measureName, // Link to measure
            parameter: '',
            symbol: measure.text || '', // Copy from measure text (t1, t2, etc.)
            min: minValue,
            max: maxValue,
            unit: unit,
            note: '',
            rowSpan: 1, // 1 or 2
            manuallyEdited: {
                parameter: false,
                symbol: false,
                min: false,
                max: false,
                unit: false,
                note: false
            },
            fontFamily: 'Arial',
            fontSize: 12,
            color: '#000000'
        };
    }
    
    /**
     * Update AC tables when a measure changes
     * @param {TimingGenApp} app - Main application instance
     * @param {string} measureName - Name of the measure
     * @param {Object} measure - Measure data object
     */
    static updateACTableForMeasureChange(app, measureName, measure) {
        // Update all AC tables when a measure changes
        // NOTE: This method is called automatically when global options (clockPeriod, delays) change
        // or when measures are modified. Currently, measure text editing after creation is not
        // implemented in the UI, but this method is ready for future use.
        for (const [tableName, tableData] of app.acTablesData.entries()) {
            const rowIndex = tableData.rows.findIndex(r => r.measureName === measureName);
            if (rowIndex >= 0) {
                const row = tableData.rows[rowIndex];
                
                // Update symbol if not manually edited
                if (!row.manuallyEdited.symbol && measure.text) {
                    row.symbol = measure.text;
                }
                
                // Recalculate min/max if not manually edited
                if (!row.manuallyEdited.min || !row.manuallyEdited.max) {
                    const cyclePeriod = app.config.clockPeriod;
                    
                    // Get both signals for this measure
                    const signal1 = app.getSignalByName(measure.signal1Name);
                    const signal2 = app.getSignalByName(measure.signal2Name);
                    
                    // Get effective delays for both signals at their respective cycles
                    const signal1Delays = app.getEffectiveDelayInTime(signal1, measure.cycle1);
                    const signal2Delays = app.getEffectiveDelayInTime(signal2, measure.cycle2);
                    
                    const cycleDiff = Math.abs(measure.cycle2 - measure.cycle1);
                    const timeValue = cyclePeriod * cycleDiff;
                    
                    // Calculate both min-to-min and max-to-max paths
                    const minToMin = timeValue - signal1Delays.min + signal2Delays.min;
                    const maxToMax = timeValue - signal1Delays.max + signal2Delays.max;
                    const calculatedMin = Math.min(minToMin, maxToMax).toFixed(2);
                    const calculatedMax = Math.max(minToMin, maxToMax).toFixed(2);
                    
                    if (!row.manuallyEdited.min) {
                        row.min = calculatedMin;
                    }
                    if (!row.manuallyEdited.max) {
                        row.max = calculatedMax;
                    }
                }
                
                // Update unit if not manually edited
                if (!row.manuallyEdited.unit) {
                    row.unit = app.config.clockPeriodUnit;
                }
            }
        }
    }
    
    /**
     * Add a row to all AC tables for a new measure
     * @param {TimingGenApp} app - Main application instance
     * @param {string} measureName - Name of the measure
     * @param {Object} measure - Measure data object
     */
    static addACTableRowForMeasure(app, measureName, measure) {
        // Add a row to all AC tables when a new measure is added
        for (const [tableName, tableData] of app.acTablesData.entries()) {
            const row = TimingGenACTable.createACTableRowFromMeasure(app, measureName, measure);
            tableData.rows.push(row);
        }
    }
    
    /**
     * Remove a row from all AC tables when a measure is deleted
     * @param {TimingGenApp} app - Main application instance
     * @param {string} measureName - Name of the measure
     */
    static removeACTableRowForMeasure(app, measureName) {
        // Remove row from all AC tables when a measure is deleted
        for (const [tableName, tableData] of app.acTablesData.entries()) {
            const rowIndex = tableData.rows.findIndex(r => r.measureName === measureName);
            if (rowIndex >= 0) {
                tableData.rows.splice(rowIndex, 1);
            }
        }
    }
    
    /**
     * Delete an AC table
     * @param {TimingGenApp} app - Main application instance
     * @param {string} tableName - Name of the table to delete
     */
    static deleteACTable(app, tableName) {
        // Remove from data store
        app.acTablesData.delete(tableName);
        
        // Remove from rows
        const rowIndex = app.rows.findIndex(r => r.type === 'ac-table' && r.name === tableName);
        if (rowIndex >= 0) {
            app.rows.splice(rowIndex, 1);
        }
        
        app.render();
    }
    
    /**
     * Move an AC table to a position (top or bottom)
     * @param {TimingGenApp} app - Main application instance
     * @param {string} tableName - Name of the table to move
     * @param {string} position - Position ('top' or 'bottom')
     */
    static moveACTableToPosition(app, tableName, position) {
        const tableData = app.acTablesData.get(tableName);
        if (tableData) {
            tableData.position = position;
            
            // Move row in rows array
            const rowIndex = app.rows.findIndex(r => r.type === 'ac-table' && r.name === tableName);
            if (rowIndex >= 0) {
                const [row] = app.rows.splice(rowIndex, 1);
                if (position === 'top') {
                    app.rows.unshift(row);
                } else {
                    app.rows.push(row);
                }
            }
            
            app.render();
        }
    }
    
    /**
     * Show dialog to edit an AC table cell
     * @param {TimingGenApp} app - Main application instance
     */
    static showEditACCellDialog(app) {
        if (app.currentEditingACCell) {
            const { tableName, cellType, rowIndex, colName } = app.currentEditingACCell;
            const tableData = app.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                let currentValue = '';
                
                if (cellType === 'data') {
                    currentValue = row[colName] || '';
                } else if (cellType === 'note') {
                    const noteData = tableData.notes.find(n => n.number === colName);
                    currentValue = noteData ? noteData.text : '';
                }
                
                document.getElementById('edit-ac-cell-input').value = currentValue;
                document.getElementById('edit-ac-cell-dialog').style.display = 'flex';
            }
        }
        app.hideAllMenus();
    }
    
    /**
     * Hide the edit AC cell dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideEditACCellDialog(app) {
        document.getElementById('edit-ac-cell-dialog').style.display = 'none';
        app.currentEditingACCell = null;
    }
    
    /**
     * Update an AC table cell with the edited value
     * @param {TimingGenApp} app - Main application instance
     */
    static updateACCell(app) {
        if (app.currentEditingACCell) {
            const { tableName, cellType, rowIndex, colName } = app.currentEditingACCell;
            const tableData = app.acTablesData.get(tableName);
            const newValue = document.getElementById('edit-ac-cell-input').value.trim();
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                
                if (cellType === 'data') {
                    // Update cell value
                    row[colName] = newValue;
                    
                    // Mark as manually edited
                    if (row.manuallyEdited) {
                        row.manuallyEdited[colName] = true;
                    }
                    
                    // If symbol changed, update measure text (unless measure text was manually edited)
                    if (colName === 'symbol' && row.measureName) {
                        const measure = app.measuresData.get(row.measureName);
                        if (measure) {
                            measure.text = newValue;
                        }
                    }
                    
                    // If note column, validate it's integers with commas
                    if (colName === 'note' && newValue) {
                        const numbers = newValue.split(',').map(n => n.trim()).filter(n => n);
                        const allValid = numbers.every(n => /^\d+$/.test(n));
                        if (!allValid) {
                            alert('Note column must contain only integers separated by commas');
                            return;
                        }
                        
                        // Update note field - add any new note numbers
                        numbers.forEach(num => {
                            if (!tableData.notes.find(n => n.number === num)) {
                                tableData.notes.push({ number: num, text: '' });
                            }
                        });
                        
                        // Sort notes by number
                        tableData.notes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
                    }
                } else if (cellType === 'note') {
                    // Update note text
                    let noteData = tableData.notes.find(n => n.number === colName);
                    if (noteData) {
                        noteData.text = newValue;
                    } else {
                        tableData.notes.push({ number: colName, text: newValue });
                    }
                }
                
                TimingGenACTable.hideEditACCellDialog(app);
                app.render();
            }
        }
    }
    
    /**
     * Show dialog to edit AC cell font properties
     * @param {TimingGenApp} app - Main application instance
     */
    static showACCellFontDialog(app) {
        if (app.currentEditingACCell) {
            const { tableName, rowIndex } = app.currentEditingACCell;
            const tableData = app.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                document.getElementById('ac-cell-font-family-select').value = row.fontFamily || 'Arial';
                document.getElementById('ac-cell-font-size-input').value = row.fontSize || 12;
                document.getElementById('ac-cell-font-color-input').value = row.color || '#000000';
                document.getElementById('ac-cell-font-dialog').style.display = 'flex';
            }
        }
        app.hideAllMenus();
    }
    
    /**
     * Hide the AC cell font dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideACCellFontDialog(app) {
        document.getElementById('ac-cell-font-dialog').style.display = 'none';
    }
    
    /**
     * Update AC cell font properties
     * @param {TimingGenApp} app - Main application instance
     */
    static updateACCellFont(app) {
        if (app.currentEditingACCell) {
            const { tableName, rowIndex } = app.currentEditingACCell;
            const tableData = app.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                row.fontFamily = document.getElementById('ac-cell-font-family-select').value;
                row.fontSize = parseInt(document.getElementById('ac-cell-font-size-input').value);
                row.color = document.getElementById('ac-cell-font-color-input').value;
                
                TimingGenACTable.hideACCellFontDialog(app);
                app.render();
            }
        }
    }
    
    /**
     * Show dialog to edit AC row span
     * @param {TimingGenApp} app - Main application instance
     */
    static showACRowSpanDialog(app) {
        if (app.currentEditingACCell) {
            const { tableName, rowIndex } = app.currentEditingACCell;
            const tableData = app.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                const currentRowSpan = row.rowSpan || 1;
                
                // Set radio button based on current rowSpan
                const radio1 = document.querySelector('input[name="rowspan"][value="1"]');
                const radio2 = document.querySelector('input[name="rowspan"][value="2"]');
                if (currentRowSpan === 2) {
                    radio2.checked = true;
                } else {
                    radio1.checked = true;
                }
                
                document.getElementById('ac-rowspan-dialog').style.display = 'flex';
            }
        }
        app.hideAllMenus();
    }
    
    /**
     * Hide the AC row span dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideACRowSpanDialog(app) {
        document.getElementById('ac-rowspan-dialog').style.display = 'none';
    }
    
    /**
     * Update AC row span
     * @param {TimingGenApp} app - Main application instance
     */
    static updateACRowSpan(app) {
        if (app.currentEditingACCell) {
            const { tableName, rowIndex } = app.currentEditingACCell;
            const tableData = app.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                const selectedRowSpan = document.querySelector('input[name="rowspan"]:checked').value;
                row.rowSpan = parseInt(selectedRowSpan);
                
                TimingGenACTable.hideACRowSpanDialog(app);
                app.render();
            }
        }
    }
    
    /**
     * Delete an AC table row
     * @param {TimingGenApp} app - Main application instance
     */
    static deleteACTableRow(app) {
        if (app.currentEditingACCell) {
            const { tableName, rowIndex } = app.currentEditingACCell;
            const tableData = app.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                if (confirm('Delete this row from the AC table?')) {
                    tableData.rows.splice(rowIndex, 1);
                    app.hideAllMenus();
                    app.render();
                }
            }
        }
    }
    
    /**
     * Move an AC table to a position (wrapper for menu action)
     * @param {TimingGenApp} app - Main application instance
     * @param {string} position - Position ('top' or 'bottom')
     */
    static moveACTableTo(app, position) {
        if (app.currentEditingACTable) {
            TimingGenACTable.moveACTableToPosition(app, app.currentEditingACTable, position);
            app.hideAllMenus();
        }
    }
    
    /**
     * Delete the currently selected AC table
     * @param {TimingGenApp} app - Main application instance
     */
    static deleteCurrentACTable(app) {
        if (app.currentEditingACTable) {
            if (confirm('Delete this AC table?')) {
                TimingGenACTable.deleteACTable(app, app.currentEditingACTable);
                app.hideAllMenus();
            }
        }
    }
    
    /**
     * Update the currently selected AC table
     * @param {TimingGenApp} app - Main application instance
     */
    static updateCurrentACTable(app) {
        if (app.currentEditingACTable) {
            TimingGenACTable.updateACTableValues(app, app.currentEditingACTable);
            app.hideAllMenus();
        }
    }
    
    /**
     * Update AC table values by recalculating min/max
     * @param {TimingGenApp} app - Main application instance
     * @param {string} tableName - Name of the table to update
     */
    static updateACTableValues(app, tableName) {
        // Update AC table by recalculating min/max values for all rows
        // Respects manually edited cells (won't update those)
        const tableData = app.acTablesData.get(tableName);
        if (!tableData) return;
        
        // Capture state for undo/redo
        app.undoRedoManager.captureState();
        
        // Get current config values
        const cyclePeriod = app.config.clockPeriod;
        const unit = app.config.clockPeriodUnit;
        
        // Update each row that's linked to a measure
        tableData.rows.forEach(row => {
            if (row.measureName) {
                const measure = app.measuresData.get(row.measureName);
                if (measure) {
                    // Update symbol if not manually edited
                    if (!row.manuallyEdited.symbol && measure.text) {
                        row.symbol = measure.text;
                    }
                    
                    // Get both signals for this measure
                    const signal1 = app.getSignalByName(measure.signal1Name);
                    const signal2 = app.getSignalByName(measure.signal2Name);
                    
                    // Get effective delays for both signals at their respective cycles
                    const signal1Delays = app.getEffectiveDelayInTime(signal1, measure.cycle1);
                    const signal2Delays = app.getEffectiveDelayInTime(signal2, measure.cycle2);
                    
                    // Recalculate min/max based on measure cycles
                    const cycleDiff = Math.abs(measure.cycle2 - measure.cycle1);
                    const timeValue = cyclePeriod * cycleDiff;
                    
                    // Calculate both min-to-min and max-to-max paths
                    const minToMin = timeValue - signal1Delays.min + signal2Delays.min;
                    const maxToMax = timeValue - signal1Delays.max + signal2Delays.max;
                    const calculatedMin = Math.min(minToMin, maxToMax).toFixed(2);
                    const calculatedMax = Math.max(minToMin, maxToMax).toFixed(2);
                    
                    // Update min if not manually edited
                    if (!row.manuallyEdited.min) {
                        row.min = calculatedMin;
                    }
                    
                    // Update max if not manually edited
                    if (!row.manuallyEdited.max) {
                        row.max = calculatedMax;
                    }
                    
                    // Update unit if not manually edited
                    if (!row.manuallyEdited.unit) {
                        row.unit = unit;
                    }
                }
            }
        });
        
        app.render();
    }
    
    /**
     * Flash a measure on the diagram
     * @param {TimingGenApp} app - Main application instance
     * @param {string} measureName - Name of the measure to flash
     */
    static flashMeasure(app, measureName) {
        // Flash the measure corresponding to the measureName
        const measure = app.measuresData.get(measureName);
        if (!measure) return;
        
        // Find measure row index
        const rowIndex = app.rows.findIndex(r => r.type === 'measure' && r.name === measureName);
        if (rowIndex < 0) return;
        
        // Create a temporary flashing effect
        // Store original render state
        const originalRender = TimingGenRendering.render;
        let flashCount = 0;
        const maxFlashes = 3;
        
        const flashInterval = setInterval(() => {
            if (flashCount >= maxFlashes * 2) {
                clearInterval(flashInterval);
                app.render(); // Final render to ensure normal state
                return;
            }
            
            // Toggle visibility by re-rendering with different color
            const isVisible = flashCount % 2 === 0;
            
            // Temporarily change measure color for flashing effect
            if (measure) {
                const originalColor = measure.textColor || '#FF0000';
                measure.textColor = isVisible ? '#FFFF00' : originalColor; // Flash yellow
                app.render();
                measure.textColor = originalColor;
            }
            
            flashCount++;
        }, 200);
    }
}
