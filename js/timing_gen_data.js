// Timing Gen 3 - Data Management Module
// Version 3.3.0
// Handles save/load functionality and data import/export

class TimingGenData {
    static saveToJSON(app) {
        // Save in unified row-based format (v3.3.0)
        // Embed actual data from Maps into rows for serialization
        const rowsWithData = app.rows.map(row => {
            if (row.type === 'signal') {
                const signalData = app.signalsData.get(row.name);
                return {
                    type: 'signal',
                    name: row.name,
                    data: signalData
                };
            } else if (row.type === 'measure') {
                const measureData = app.measuresData.get(row.name);
                return {
                    type: 'measure',
                    name: row.name,
                    data: measureData
                };
            } else if (row.type === 'text') {
                const textData = app.textData.get(row.name);
                return {
                    type: 'text',
                    name: row.name,
                    data: textData
                };
            } else if (row.type === 'counter') {
                const counterData = app.counterData.get(row.name);
                return {
                    type: 'counter',
                    name: row.name,
                    data: counterData
                };
            }
            return row;
        });
        
        const data = {
            version: '3.3.0',
            config: {
                cycles: app.config.cycles,
                clockPeriod: app.config.clockPeriod,
                clockPeriodUnit: app.config.clockPeriodUnit,
                slew: app.config.slew,
                delayMin: app.config.delayMin,
                delayMax: app.config.delayMax,
                delayColor: app.config.delayColor
            },
            rows: rowsWithData
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'timing_diagram.td3';
        anchor.click();
        
        URL.revokeObjectURL(url);
    }
    
    static loadFromJSON(app, ev) {
        const file = ev.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Load configuration
                if (data.config) {
                    if (data.config.cycles) {
                        app.config.cycles = data.config.cycles;
                        document.getElementById('cycles-input').value = app.config.cycles;
                    }
                    // Load global options if available
                    if (data.config.clockPeriod !== undefined) {
                        app.config.clockPeriod = data.config.clockPeriod;
                    }
                    if (data.config.clockPeriodUnit !== undefined) {
                        app.config.clockPeriodUnit = data.config.clockPeriodUnit;
                    }
                    if (data.config.slew !== undefined) {
                        app.config.slew = data.config.slew;
                    }
                    if (data.config.delayMin !== undefined) {
                        app.config.delayMin = data.config.delayMin;
                    }
                    if (data.config.delayMax !== undefined) {
                        app.config.delayMax = data.config.delayMax;
                    }
                    if (data.config.delayColor !== undefined) {
                        app.config.delayColor = data.config.delayColor;
                    }
                }
                
                // Load unified row data (v3.2.0+ format)
                if (data.rows) {
                    // Clear existing data
                    app.rows = [];
                    app.signalsData.clear();
                    app.measuresData.clear();
                    app.textData.clear();
                    app.counterData.clear();
                    app.measureCounter = 0;
                    app.textCounter = 0;
                    app.counterCounter = 0;
                    
                    // Populate Maps and rows array from saved data
                    data.rows.forEach(row => {
                        if (row.type === 'signal' && row.data) {
                            // Store signal data in Map
                            app.signalsData.set(row.name, row.data);
                            // Add to rows array (ordering only)
                            app.rows.push({
                                type: 'signal',
                                name: row.name
                            });
                        } else if (row.type === 'measure' && row.data) {
                            // Store measure data in Map
                            app.measuresData.set(row.name, row.data);
                            // Add to rows array (ordering only)
                            app.rows.push({
                                type: 'measure',
                                name: row.name
                            });
                            // Update measure counter for future measures
                            const measureNum = parseInt(row.name.replace('M', ''));
                            if (!isNaN(measureNum) && measureNum >= app.measureCounter) {
                                app.measureCounter = measureNum + 1;
                            }
                        } else if (row.type === 'text' && row.data) {
                            // Store text data in Map
                            app.textData.set(row.name, row.data);
                            // Add to rows array (ordering only)
                            app.rows.push({
                                type: 'text',
                                name: row.name
                            });
                            // Update text counter for future text rows
                            const textNum = parseInt(row.name.replace('T', ''));
                            if (!isNaN(textNum) && textNum >= app.textCounter) {
                                app.textCounter = textNum + 1;
                            }
                        } else if (row.type === 'counter' && row.data) {
                            // Store counter data in Map
                            app.counterData.set(row.name, row.data);
                            // Add to rows array (ordering only)
                            app.rows.push({
                                type: 'counter',
                                name: row.name
                            });
                            // Update counter counter for future counter rows
                            const counterNum = parseInt(row.name.replace('C', ''));
                            if (!isNaN(counterNum) && counterNum >= app.counterCounter) {
                                app.counterCounter = counterNum + 1;
                            }
                        }
                    });
                } else {
                    alert('Old file format not supported. This version requires v3.2.x format.');
                    return;
                }
                
                app.initializeCanvas();
                app.render();
            } catch (err) {
                alert('Error loading file: ' + err.message);
                console.error('Load error:', err);
            }
        };
        
        reader.readAsText(file);
        ev.target.value = ''; // Reset file input
    }
    
    static exportToSVG(app) {
        // Store current selection state
        const savedSelection = new Set(app.selectedSignals);
        const savedMeasureSelection = new Set(app.selectedMeasureRows);
        const savedHideHeader = app.hideHeader;
        
        try {
            // Clear selections to turn off signal highlight
            app.selectedSignals.clear();
            app.selectedMeasureRows.clear();
            
            // Set flag to hide header (cycle reference counter)
            app.hideHeader = true;
            
            // Re-render with hidden header and no highlights
            app.render();
            
            // Export using Paper.js
            const svg = paper.project.exportSVG({ asString: true });
            
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'timing_diagram.svg';
            anchor.click();
            
            URL.revokeObjectURL(url);
        } finally {
            // Restore selections and header state
            app.selectedSignals = savedSelection;
            app.selectedMeasureRows = savedMeasureSelection;
            app.hideHeader = savedHideHeader;
            
            // Re-render to restore state
            app.render();
        }
    }
}

