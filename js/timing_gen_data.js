// Timing Gen 3 - Data Management Module
// Version 3.1.0
// Handles save/load functionality and data import/export

class TimingGenData {
    static saveToJSON(app) {
        // Save in new row-based format (v3.1.0)
        const data = {
            version: '3.1.0',
            config: {
                cycles: app.config.cycles,
                clockPeriod: app.config.clockPeriod,
                clockPeriodUnit: app.config.clockPeriodUnit,
                slew: app.config.slew,
                delayMin: app.config.delayMin,
                delayMax: app.config.delayMax,
                delayColor: app.config.delayColor
            }
        };
        
        // Use new row-based format if available
        if (app.rowManager && app.rowManager.isUsingNewSystem()) {
            data.rows = app.rows;
        } else {
            // Fallback to old format for backward compatibility
            data.signals = app.signals;
            data.measures = app.measures;
        }
        
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
                    // Backward compatibility: support old single delay format
                    if (data.config.delay !== undefined) {
                        app.config.delayMin = data.config.delay;
                        app.config.delayMax = data.config.delay;
                    }
                    // New format: support min/max delay
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
                
                // Check version and load data accordingly
                if (data.version === '3.1.0' && data.rows) {
                    // New row-based format
                    app.rows = data.rows;
                    // Extract signals and measures for backward compatibility
                    TimingGenData.extractLegacyData(app);
                } else {
                    // Old format (3.0.2 or earlier) - migrate to new system
                    TimingGenData.loadLegacyFormat(app, data);
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
    
    /**
     * Load data from old format (v3.0.2 and earlier)
     * Migrates to new row-based system
     */
    static loadLegacyFormat(app, data) {
        // Load signals
        if (data.signals) {
            app.signals = data.signals;
            // Ensure all bit and bus signals have base_clock
            app.signals.forEach(signal => {
                if ((signal.type === 'bit' || signal.type === 'bus') && !signal.base_clock) {
                    const clockSignal = app.signals.find(sg => sg.type === 'clock');
                    signal.base_clock = clockSignal ? clockSignal.name : 'clk';
                }
            });
        }
        
        // Load measures
        if (data.measures) {
            app.measures = data.measures;
        } else {
            app.measures = [];
        }
        
        // Load blank rows if present
        if (data.blankRows) {
            app.blankRows = data.blankRows;
        } else {
            app.blankRows = [];
        }
        
        // Migrate to new system
        app.rowManager.migrateToNewSystem();
    }
    
    /**
     * Extract legacy signals and measures arrays from rows
     * For backward compatibility with code that still uses these arrays
     */
    static extractLegacyData(app) {
        app.signals = [];
        app.measures = [];
        
        if (!app.rows) return;
        
        app.rows.forEach(row => {
            if (row.type === 'signal') {
                app.signals.push(row.data);
            } else if (row.type === 'measure' && Array.isArray(row.data)) {
                app.measures.push(...row.data);
            }
        });
        
        // Clear blank rows as they're not used in new system
        app.blankRows = [];
    }
    
    static exportToSVG(app) {
        // Export using Paper.js
        const svg = paper.project.exportSVG({ asString: true });
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'timing_diagram.svg';
        anchor.click();
        
        URL.revokeObjectURL(url);
    }
}

