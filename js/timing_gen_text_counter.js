// Timing Gen 3 - Text and Counter Module
// Version 3.5.0
// Handles text rows and counter rows functionality

class TimingGenTextCounter {
    /**
     * Show dialog to add a new text row
     * @param {TimingGenApp} app - Main application instance
     */
    static showAddTextDialog(app) {
        document.getElementById('text-row-input').value = '';
        document.getElementById('add-text-dialog').style.display = 'flex';
    }
    
    /**
     * Hide the add text dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideAddTextDialog(app) {
        document.getElementById('add-text-dialog').style.display = 'none';
    }
    
    /**
     * Show dialog to edit text (text row, measure text, or AC table note)
     * @param {TimingGenApp} app - Main application instance
     */
    static showEditTextDialog(app) {
        if (app.currentEditingNote) {
            // Editing AC table note text
            const { tableName, noteNum } = app.currentEditingNote;
            const tableData = app.acTablesData.get(tableName);
            if (tableData) {
                const noteData = tableData.notes.find(n => n.number === noteNum);
                const currentValue = noteData ? noteData.text : '';
                document.getElementById('edit-text-input').value = currentValue;
                document.getElementById('edit-text-dialog').style.display = 'flex';
            }
        } else if (app.currentEditingText) {
            const textData = app.textData.get(app.currentEditingText);
            if (textData) {
                document.getElementById('edit-text-input').value = textData.text || '';
                document.getElementById('edit-text-dialog').style.display = 'flex';
            }
        }
        app.hideAllMenus();
    }
    
    /**
     * Hide the edit text dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideEditTextDialog(app) {
        document.getElementById('edit-text-dialog').style.display = 'none';
    }
    
    /**
     * Show font dialog for text (text row, measure text, or AC table note)
     * @param {TimingGenApp} app - Main application instance
     */
    static showFontDialog(app) {
        if (app.currentEditingNote) {
            // Editing AC table note text font
            const { tableName, noteNum } = app.currentEditingNote;
            const tableData = app.acTablesData.get(tableName);
            if (tableData) {
                const noteData = tableData.notes.find(n => n.number === noteNum);
                document.getElementById('font-family-select').value = (noteData && noteData.fontFamily) || 'Arial';
                document.getElementById('font-size-input').value = (noteData && noteData.fontSize) || 11;
                document.getElementById('font-dialog').style.display = 'flex';
            }
        } else if (app.currentEditingText) {
            const textData = app.textData.get(app.currentEditingText);
            if (textData) {
                document.getElementById('font-family-select').value = textData.fontFamily || 'Arial';
                document.getElementById('font-size-input').value = textData.fontSize || 14;
                document.getElementById('font-dialog').style.display = 'flex';
            }
        }
        app.hideAllMenus();
    }
    
    /**
     * Hide the font dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideFontDialog(app) {
        document.getElementById('font-dialog').style.display = 'none';
    }
    
    /**
     * Show color dialog for text
     * @param {TimingGenApp} app - Main application instance
     */
    static showColorDialog(app) {
        if (app.currentEditingNote) {
            // Editing AC table note text color
            const { tableName, noteNum } = app.currentEditingNote;
            const tableData = app.acTablesData.get(tableName);
            if (tableData) {
                const noteData = tableData.notes.find(n => n.number === noteNum);
                document.getElementById('text-color-input').value = (noteData && noteData.color) || '#000000';
                document.getElementById('color-dialog').style.display = 'flex';
            }
        } else if (app.currentEditingText) {
            const textData = app.textData.get(app.currentEditingText);
            if (textData) {
                document.getElementById('text-color-input').value = textData.color || '#000000';
                document.getElementById('color-dialog').style.display = 'flex';
            }
        }
        app.hideAllMenus();
    }
    
    /**
     * Hide the color dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideColorDialog(app) {
        document.getElementById('color-dialog').style.display = 'none';
    }
    
    /**
     * Update text content from edit dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static updateTextRow(app) {
        if (app.currentEditingNote) {
            // Update AC table note text
            const { tableName, noteNum } = app.currentEditingNote;
            const tableData = app.acTablesData.get(tableName);
            if (tableData) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                const newValue = document.getElementById('edit-text-input').value;
                let noteData = tableData.notes.find(n => n.number === noteNum);
                if (noteData) {
                    noteData.text = newValue;
                } else {
                    tableData.notes.push({ number: noteNum, text: newValue });
                }
                TimingGenTextCounter.hideEditTextDialog(app);
                app.currentEditingNote = null;
                app.render();
            }
        } else {
            // Check if we're editing a measure's text (currentEditingMeasure is set)
            const measures = app.getMeasures();
            if (app.currentEditingMeasure !== null && app.currentEditingMeasure >= 0 && app.currentEditingMeasure < measures.length) {
                // Update measure text
                // Capture state before action
                app.undoRedoManager.captureState();
                
                const measure = measures[app.currentEditingMeasure];
                measure.text = document.getElementById('edit-text-input').value;
                TimingGenTextCounter.hideEditTextDialog(app);
                app.currentEditingMeasure = null;
                app.render();
            } else if (app.currentEditingText) {
                const textData = app.textData.get(app.currentEditingText);
                if (textData) {
                    // Capture state before action
                    app.undoRedoManager.captureState();
                    
                    textData.text = document.getElementById('edit-text-input').value;
                    TimingGenTextCounter.hideEditTextDialog(app);
                    app.render();
                }
            }
        }
    }
    
    /**
     * Update text font settings
     * @param {TimingGenApp} app - Main application instance
     */
    static updateTextFont(app) {
        const fontFamily = document.getElementById('font-family-select').value;
        const fontSizeInput = parseInt(document.getElementById('font-size-input').value);
        const fontSize = isNaN(fontSizeInput) ? 14 : fontSizeInput;
        
        if (isNaN(fontSize) || fontSize < 8 || fontSize > 72) {
            alert('Font size must be between 8 and 72');
            return;
        }
        
        if (app.currentEditingNote) {
            // Update AC table note text font
            const { tableName, noteNum } = app.currentEditingNote;
            const tableData = app.acTablesData.get(tableName);
            if (tableData) {
                let noteData = tableData.notes.find(n => n.number === noteNum);
                if (!noteData) {
                    noteData = { number: noteNum, text: '' };
                    tableData.notes.push(noteData);
                }
                
                // Capture state before action
                app.undoRedoManager.captureState();
                
                noteData.fontFamily = fontFamily;
                noteData.fontSize = fontSize;
                
                TimingGenTextCounter.hideFontDialog(app);
                app.currentEditingNote = null;
                app.render();
            }
        } else if (app.currentEditingSignal !== null && app.currentEditingSignal !== undefined) {
            // Update signal name font (handled for completeness)
            const signal = app.getSignalByIndex(app.currentEditingSignal);
            if (signal) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                signal.nameFontFamily = fontFamily;
                signal.nameFontSize = fontSize;
                
                TimingGenTextCounter.hideFontDialog(app);
                app.render();
            }
        } else if (app.currentEditingBusValue) {
            // Update bus value font (handled for completeness)
            const signal = app.getSignalByIndex(app.currentEditingBusValue.signalIndex);
            if (signal) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                signal.valueFontFamily = fontFamily;
                signal.valueFontSize = fontSize;
                
                TimingGenTextCounter.hideFontDialog(app);
                app.render();
            }
        } else if (app.currentEditingMeasure !== null && app.currentEditingMeasure >= 0 && app.currentEditingMeasure < app.getMeasures().length) {
            // Update measure text font
            const measures = app.getMeasures();
            const measure = measures[app.currentEditingMeasure];
            
            // Capture state before action
            app.undoRedoManager.captureState();
            
            measure.fontFamily = fontFamily;
            measure.fontSize = fontSize;
            
            TimingGenTextCounter.hideFontDialog(app);
            app.render();
        } else if (app.currentEditingText) {
            const textData = app.textData.get(app.currentEditingText);
            if (textData) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                textData.fontFamily = fontFamily;
                textData.fontSize = fontSize;
                
                TimingGenTextCounter.hideFontDialog(app);
                app.render();
            }
        }
    }
    
    /**
     * Update text color
     * @param {TimingGenApp} app - Main application instance
     */
    static updateTextColor(app) {
        if (app.currentEditingNote) {
            // Update AC table note text color
            const { tableName, noteNum } = app.currentEditingNote;
            const tableData = app.acTablesData.get(tableName);
            if (tableData) {
                let noteData = tableData.notes.find(n => n.number === noteNum);
                if (!noteData) {
                    noteData = { number: noteNum, text: '' };
                    tableData.notes.push(noteData);
                }
                
                // Capture state before action
                app.undoRedoManager.captureState();
                
                noteData.color = document.getElementById('text-color-input').value;
                
                TimingGenTextCounter.hideColorDialog(app);
                app.currentEditingNote = null;
                app.render();
            }
        } else if (app.currentEditingMeasure !== null && app.currentEditingMeasure >= 0 && app.currentEditingMeasure < app.getMeasures().length) {
            // Update measure text color
            const measures = app.getMeasures();
            const measure = measures[app.currentEditingMeasure];
            
            // Capture state before action
            app.undoRedoManager.captureState();
            
            measure.color = document.getElementById('text-color-input').value;
            
            TimingGenTextCounter.hideColorDialog(app);
            app.render();
        } else if (app.currentEditingText) {
            const textData = app.textData.get(app.currentEditingText);
            if (textData) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                textData.color = document.getElementById('text-color-input').value;
                
                TimingGenTextCounter.hideColorDialog(app);
                app.render();
            }
        }
    }
    
    /**
     * Add a new text row
     * @param {TimingGenApp} app - Main application instance
     */
    static addTextRow(app) {
        const text = document.getElementById('text-row-input').value;
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        // Generate unique name
        const name = `T${app.textCounter}`;
        app.textCounter++;
        
        // Create text data object with default properties
        const textData = {
            text: text,
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#000000',
            xOffset: 10  // Default x offset from left edge of waveform area
        };
        
        // Add to data store
        app.textData.set(name, textData);
        
        // Add to rows array at the top (row 0) for better visibility
        app.rows.unshift({
            type: 'text',
            name: name
        });
        
        TimingGenTextCounter.hideAddTextDialog(app);
        app.render();
    }
    
    /**
     * Delete a text row
     * @param {TimingGenApp} app - Main application instance
     */
    static deleteTextRow(app) {
        if (app.currentEditingText) {
            // Confirm deletion
            if (!confirm('Delete this text row?')) {
                app.hideAllMenus();
                return;
            }
            
            // Capture state before action
            app.undoRedoManager.captureState();
            
            // Find row index
            const rowIndex = app.rows.findIndex(row => row.type === 'text' && row.name === app.currentEditingText);
            if (rowIndex >= 0) {
                // Remove from rows array
                app.rows.splice(rowIndex, 1);
                // Remove from text data
                app.textData.delete(app.currentEditingText);
                
                app.currentEditingText = null;
                app.hideAllMenus();
                app.render();
            }
        }
    }
    
    // ========================================
    // Counter Methods
    // ========================================
    
    /**
     * Show dialog to add a new counter row
     * @param {TimingGenApp} app - Main application instance
     */
    static showAddCounterDialog(app) {
        document.getElementById('counter-start-value-input').value = '1';
        document.getElementById('counter-start-cycle-input').value = '0';
        document.getElementById('add-counter-dialog').style.display = 'flex';
    }
    
    /**
     * Hide the add counter dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideAddCounterDialog(app) {
        document.getElementById('add-counter-dialog').style.display = 'none';
    }
    
    /**
     * Show dialog to edit counter value at a specific cycle
     * @param {TimingGenApp} app - Main application instance
     * @param {string} counterName - Name of the counter
     * @param {number} cycle - Cycle number to edit
     */
    static showEditCounterDialog(app, counterName, cycle) {
        app.currentEditingCounter = { name: counterName, cycle: cycle };
        document.getElementById('edit-counter-value-input').value = '';
        document.getElementById('edit-counter-dialog').style.display = 'flex';
    }
    
    /**
     * Hide the edit counter dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideEditCounterDialog(app) {
        document.getElementById('edit-counter-dialog').style.display = 'none';
        app.currentEditingCounter = null;
    }
    
    /**
     * Update counter value at the current editing cycle
     * @param {TimingGenApp} app - Main application instance
     */
    static updateCounterValue(app) {
        if (app.currentEditingCounter) {
            const counterData = app.counterData.get(app.currentEditingCounter.name);
            if (counterData) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                const newValue = document.getElementById('edit-counter-value-input').value.trim();
                const cycle = app.currentEditingCounter.cycle;
                
                if (newValue === '') {
                    // Empty value means go back to default counting
                    // Remove any existing value at this cycle and let it auto-increment
                    counterData.values = counterData.values.filter(v => v.cycle !== cycle);
                    
                    // If there are no more values, add a default starting point
                    if (counterData.values.length === 0) {
                        counterData.values.push({ cycle: 0, value: '1' });
                    }
                } else {
                    // Add or update value at this cycle
                    const existingIndex = counterData.values.findIndex(v => v.cycle === cycle);
                    if (existingIndex >= 0) {
                        counterData.values[existingIndex].value = newValue;
                    } else {
                        counterData.values.push({ cycle: cycle, value: newValue });
                        // Sort by cycle
                        counterData.values.sort((a, b) => a.cycle - b.cycle);
                    }
                }
                
                TimingGenTextCounter.hideEditCounterDialog(app);
                app.render();
            }
        }
    }
    
    /**
     * Continue counter (remove custom value at cycle to resume auto-increment)
     * @param {TimingGenApp} app - Main application instance
     */
    static continueCounter(app) {
        // "Continue" means remove any value entry at this cycle to let auto-increment continue
        if (app.currentEditingCounter) {
            const counterData = app.counterData.get(app.currentEditingCounter.name);
            if (counterData) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                const cycle = app.currentEditingCounter.cycle;
                
                // Remove any existing value at this cycle
                counterData.values = counterData.values.filter(v => v.cycle !== cycle);
                
                // If there are no more values, add a default starting point
                if (counterData.values.length === 0) {
                    counterData.values.push({ cycle: 0, value: '1' });
                }
                
                app.hideAllMenus();
                app.render();
            }
        }
    }
    
    /**
     * Show dialog to restart counter with a new value
     * @param {TimingGenApp} app - Main application instance
     */
    static showRestartCounterDialog(app) {
        // Show dialog to restart counter with a new value
        if (app.currentEditingCounter) {
            app.hideAllMenus();
            
            // Pre-populate with current counter value at this cycle (if any)
            const counterData = app.counterData.get(app.currentEditingCounter.name);
            const cycle = app.currentEditingCounter.cycle;
            let currentValue = '';
            
            if (counterData) {
                // Generate labels to see what's currently displayed
                const labels = TimingGenRendering.generateCounterLabels(counterData, app.config.cycles, app.tears);
                if (labels[cycle]) {
                    currentValue = labels[cycle];
                }
            }
            
            document.getElementById('edit-counter-value-input').value = currentValue;
            document.getElementById('edit-counter-dialog').style.display = 'flex';
        }
    }
    
    /**
     * Blank counter at current cycle (stop counting)
     * @param {TimingGenApp} app - Main application instance
     */
    static blankCounter(app) {
        // "Blank" means add a null/blank entry to stop counting from this cycle forward
        if (app.currentEditingCounter) {
            const counterData = app.counterData.get(app.currentEditingCounter.name);
            if (counterData) {
                // Capture state before action
                app.undoRedoManager.captureState();
                
                const cycle = app.currentEditingCounter.cycle;
                
                // Add or update value at this cycle with null (blank)
                const existingIndex = counterData.values.findIndex(v => v.cycle === cycle);
                if (existingIndex >= 0) {
                    counterData.values[existingIndex].value = null;
                } else {
                    counterData.values.push({ cycle: cycle, value: null });
                    // Sort by cycle
                    counterData.values.sort((a, b) => a.cycle - b.cycle);
                }
                
                app.hideAllMenus();
                app.render();
            }
        }
    }
    
    /**
     * Add a new counter row
     * @param {TimingGenApp} app - Main application instance
     */
    static addCounterRow(app) {
        const startValue = document.getElementById('counter-start-value-input').value.trim();
        const startCycle = parseInt(document.getElementById('counter-start-cycle-input').value);
        
        if (startValue === '') {
            alert('Please enter a start value');
            return;
        }
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        // Generate unique name
        const name = `C${app.counterCounter}`;
        app.counterCounter++;
        
        // Create counter data object
        // Format: [{cycle: N, value: "label"}]
        const counterData = {
            values: [{
                cycle: startCycle,
                value: startValue
            }]
        };
        
        // Add to data store
        app.counterData.set(name, counterData);
        
        // Add to rows array at the top (row 0) for better visibility
        app.rows.unshift({
            type: 'counter',
            name: name
        });
        
        TimingGenTextCounter.hideAddCounterDialog(app);
        app.render();
    }
}
