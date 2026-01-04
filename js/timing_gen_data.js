// Timing Gen 3 - Data Management Module
// Version 3.0.1
// Handles save/load functionality and data import/export

class TimingGenData {
    static saveToJSON(app) {
        const data = {
            version: '3.0.1',
            config: {
                cycles: app.config.cycles,
                clockPeriod: app.config.clockPeriod,
                clockPeriodUnit: app.config.clockPeriodUnit,
                slew: app.config.slew,
                delay: app.config.delay
            },
            signals: app.signals
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timing_diagram.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    static loadFromJSON(app, e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
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
                    if (data.config.delay !== undefined) {
                        app.config.delay = data.config.delay;
                    }
                    // Ignore old delayUnit field for backward compatibility
                }
                
                if (data.signals) {
                    app.signals = data.signals;
                    // Ensure all bit and bus signals have base_clock
                    app.signals.forEach(signal => {
                        if ((signal.type === 'bit' || signal.type === 'bus') && !signal.base_clock) {
                            const clockSignal = app.signals.find(s => s.type === 'clock');
                            signal.base_clock = clockSignal ? clockSignal.name : 'clk';
                        }
                    });
                }
                
                app.initializeCanvas();
                app.render();
            } catch (err) {
                alert('Error loading file: ' + err.message);
            }
        };
        
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    }
    
    static exportToSVG(app) {
        // Export using Paper.js
        const svg = paper.project.exportSVG({ asString: true });
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timing_diagram.svg';
        a.click();
        
        URL.revokeObjectURL(url);
    }
}
