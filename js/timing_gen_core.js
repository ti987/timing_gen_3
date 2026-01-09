// Timing Gen 3 - Interactive Digital Logic Waveform Editor
// Version 3.0.2
// Main JavaScript Application using Paper.js
//
// Key Features:
// - Multiple signal types: Clock, Bit, and Bus signals
// - Interactive waveform editing with click and right-click menus
// - Global options: Clock period, slew rate, and propagation delay
// - Signal reordering via drag-and-drop
// - JSON save/load with version control
// - SVG export for documentation
// - Configurable cycles and timing parameters

class TimingGenApp {
    constructor() {
        this.canvas = document.getElementById('waveform-canvas');
        
        // Setup Paper.js
        paper.setup(this.canvas);
        
        // Configuration
        this.config = {
            cycles: 20,
            nameColumnWidth: 150,
            cycleWidth: 60,
            rowHeight: 80,
            headerHeight: 50,
            slew: 4, // pixels for slew transition (default: 4)
            clockPeriod: 10, // default clock period value
            clockPeriodUnit: 'ns', // default time unit
            delayMin: 0, // minimum delay value in clock period units
            delayMax: 0, // maximum delay value in clock period units
            delayColor: '#0000FF', // color for delay uncertainty region (default: blue)
            gridColor: '#e0e0e0',
            signalColor: '#000000',
            backgroundColor: '#ffffff'
        };
        
        // Data model
        this.signals = [];
        this.currentEditingSignal = null;
        this.currentEditingCycle = null;
        
        // Insert/Delete cycle mode tracking
        this.insertCycleMode = null; // 'global' or 'signal'
        this.deleteCycleMode = null; // 'global' or 'signal'
        
        // Drag and drop state
        this.draggedSignal = null;
        this.dragIndicator = null;
        
        // Paper.js layers
        this.backgroundLayer = new paper.Layer();
        this.gridLayer = new paper.Layer();
        this.signalLayer = new paper.Layer();
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.render();
    }
    
    initializeCanvas() {
        const width = this.config.nameColumnWidth + this.config.cycles * this.config.cycleWidth + 100;
        const height = this.config.headerHeight + 10 * this.config.rowHeight + 100;
        this.canvas.width = width;
        this.canvas.height = height;
        paper.view.viewSize = new paper.Size(width, height);
    }
    
    setupEventListeners() {
        // Menu buttons
        document.getElementById('add-signal-btn').addEventListener('click', () => TimingGenUI.showAddSignalDialog(this));
        document.getElementById('global-option-btn').addEventListener('click', () => TimingGenUI.showGlobalOptionDialog(this));
        document.getElementById('save-btn').addEventListener('click', () => TimingGenData.saveToJSON(this));
        document.getElementById('load-btn').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('export-svg-btn').addEventListener('click', () => TimingGenData.exportToSVG(this));
        document.getElementById('file-input').addEventListener('change', (ev) => TimingGenData.loadFromJSON(this, ev));
        document.getElementById('cycles-input').addEventListener('change', (ev) => this.updateCycles(ev.target.value));
        
        // Add signal dialog
        document.getElementById('dialog-ok-btn').addEventListener('click', () => this.addSignal());
        document.getElementById('dialog-cancel-btn').addEventListener('click', () => TimingGenUI.hideAddSignalDialog());
        
        // Edit signal dialog
        document.getElementById('edit-dialog-ok-btn').addEventListener('click', () => this.updateSignal());
        document.getElementById('edit-dialog-cancel-btn').addEventListener('click', () => TimingGenUI.hideEditSignalDialog());
        
        // Bus value dialog
        document.getElementById('bus-dialog-ok-btn').addEventListener('click', () => this.setBusValue());
        document.getElementById('bus-dialog-cancel-btn').addEventListener('click', () => TimingGenUI.hideBusValueDialog(this));
        
        // Global option dialog
        document.getElementById('global-option-ok-btn').addEventListener('click', () => TimingGenUI.saveGlobalOptions(this));
        document.getElementById('global-option-cancel-btn').addEventListener('click', () => TimingGenUI.hideGlobalOptionDialog());
        
        // Signal options dialog
        document.getElementById('signal-options-ok-btn').addEventListener('click', () => TimingGenUI.saveSignalOptions(this));
        document.getElementById('signal-options-cancel-btn').addEventListener('click', () => TimingGenUI.hideSignalOptionsDialog());
        
        // Cycle options dialog
        document.getElementById('cycle-options-ok-btn').addEventListener('click', () => TimingGenUI.saveCycleOptions(this));
        document.getElementById('cycle-options-cancel-btn').addEventListener('click', () => TimingGenUI.hideCycleOptionsDialog());
        
        // Insert cycles dialog
        document.getElementById('insert-cycles-ok-btn').addEventListener('click', () => this.handleInsertCycles());
        document.getElementById('insert-cycles-cancel-btn').addEventListener('click', () => TimingGenUI.hideInsertCyclesDialog());
        
        // Delete cycles dialog
        document.getElementById('delete-cycles-ok-btn').addEventListener('click', () => this.handleDeleteCycles());
        document.getElementById('delete-cycles-cancel-btn').addEventListener('click', () => TimingGenUI.hideDeleteCyclesDialog());
        
        // Signal context menu
        document.getElementById('edit-signal-menu').addEventListener('click', () => TimingGenUI.showEditSignalDialog(this));
        document.getElementById('signal-options-menu').addEventListener('click', () => TimingGenUI.showSignalOptionsDialog(this));
        document.getElementById('delete-signal-menu').addEventListener('click', () => this.deleteSignal());
        document.getElementById('cancel-signal-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Bus cycle context menu handlers
        document.getElementById('set-bus-value-menu').addEventListener('click', () => {
            this.hideAllMenus();
            TimingGenUI.showBusValueDialog(this, this.currentEditingSignal, this.currentEditingCycle);
        });
        document.getElementById('bus-cycle-options-menu').addEventListener('click', () => {
            this.hideAllMenus();
            TimingGenUI.showCycleOptionsDialog(this);
        });
        document.getElementById('remove-bus-change-menu').addEventListener('click', () => this.removeBusChange());
        document.getElementById('insert-cycles-bus-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.insertCycleMode = 'signal';
            TimingGenUI.showInsertCyclesDialog(this);
        });
        document.getElementById('delete-cycles-bus-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.deleteCycleMode = 'signal';
            TimingGenUI.showDeleteCyclesDialog(this);
        });
        document.getElementById('cancel-bus-cycle-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Bit cycle context menu - add cycle options and cancel handlers
        document.getElementById('bit-cycle-options-menu').addEventListener('click', () => {
            this.hideAllMenus();
            TimingGenUI.showCycleOptionsDialog(this);
        });
        document.getElementById('remove-bit-change-menu').addEventListener('click', () => this.removeBitChange());
        document.getElementById('insert-cycles-bit-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.insertCycleMode = 'signal';
            TimingGenUI.showInsertCyclesDialog(this);
        });
        document.getElementById('delete-cycles-bit-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.deleteCycleMode = 'signal';
            TimingGenUI.showDeleteCyclesDialog(this);
        });
        document.getElementById('cancel-bit-cycle-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Cycle context menu handlers (for cycle header)
        document.getElementById('insert-cycles-global-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.insertCycleMode = 'global';
            TimingGenUI.showInsertCyclesDialog(this);
        });
        document.getElementById('delete-cycles-global-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.deleteCycleMode = 'global';
            TimingGenUI.showDeleteCyclesDialog(this);
        });
        document.getElementById('cancel-cycle-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Canvas events using Paper.js tool
        const tool = new paper.Tool();
        tool.onMouseDown = (event) => this.handleCanvasClick(event);
        
        // Context menu
        this.canvas.addEventListener('contextmenu', (ev) => this.handleCanvasRightClick(ev));
        
        // Close dialogs and menus on outside click
        document.addEventListener('click', (ev) => {
            if (!ev.target.closest('.context-menu') && !ev.target.closest('canvas')) {
                this.hideAllMenus();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape') {
                TimingGenUI.hideAllDialogs(this);
                this.hideAllMenus();
            }
        });
    }
    
    hideAllMenus() {
        document.getElementById('signal-context-menu').style.display = 'none';
        document.getElementById('bit-cycle-context-menu').style.display = 'none';
        document.getElementById('bus-cycle-context-menu').style.display = 'none';
        document.getElementById('cycle-context-menu').style.display = 'none';
    }
    
    addSignal() {
        const name = document.getElementById('signal-name-input').value.trim();
        const type = document.getElementById('signal-type-select').value;
        
        if (!name) {
            alert('Please enter a signal name');
            return;
        }
        
        const signal = {
            name: name,
            type: type,
            values: {}
        };
        
        // Add base_clock for bit and bus signals
        if (type === 'bit' || type === 'bus') {
            // Find the first clock signal, or use 'clk' as default
            const clockSignal = this.signals.find(sg => sg.type === 'clock');
            signal.base_clock = clockSignal ? clockSignal.name : 'clk';
        }
        
        // Initialize default values
        if (type === 'clock') {
            // Clock signal - no need for values array
        } else if (type === 'bit') {
            // Bit signal starts at 0 (low)
            signal.values[0] = 0;
        } else if (type === 'bus') {
            // Bus signal starts with 'X' (unknown)
            signal.values[0] = 'X';
        }
        
        this.signals.push(signal);
        TimingGenUI.hideAddSignalDialog();
        this.render();
    }
    
    updateSignal() {
        if (this.currentEditingSignal !== null) {
            const name = document.getElementById('edit-signal-name-input').value.trim();
            const type = document.getElementById('edit-signal-type-select').value;
            
            if (!name) {
                alert('Please enter a signal name');
                return;
            }
            
            const signal = this.signals[this.currentEditingSignal];
            const oldType = signal.type;
            signal.name = name;
            signal.type = type;
            
            // If type changed, reset values and update base_clock
            if (oldType !== type) {
                signal.values = {};
                if (type === 'bit') {
                    signal.values[0] = 0;
                    // Add base_clock for bit signals
                    const clockSignal = this.signals.find(sg => sg.type === 'clock');
                    signal.base_clock = clockSignal ? clockSignal.name : 'clk';
                } else if (type === 'bus') {
                    signal.values[0] = 'X';
                    // Add base_clock for bus signals
                    const clockSignal = this.signals.find(sg => sg.type === 'clock');
                    signal.base_clock = clockSignal ? clockSignal.name : 'clk';
                } else if (type === 'clock') {
                    // Remove base_clock for clock signals
                    delete signal.base_clock;
                }
            }
            
            TimingGenUI.hideEditSignalDialog();
            this.render();
        }
    }
    
    deleteSignal() {
        this.hideAllMenus();
        if (this.currentEditingSignal !== null) {
            if (confirm(`Delete signal "${this.signals[this.currentEditingSignal].name}"?`)) {
                this.signals.splice(this.currentEditingSignal, 1);
                this.currentEditingSignal = null;
                this.render();
            }
        }
    }
    
    setBusValue() {
        if (this.currentEditingSignal !== null && this.currentEditingCycle !== null) {
            const radix = document.getElementById('bus-radix-select').value;
            const value = document.getElementById('bus-value-input').value.trim();
            
            const signal = this.signals[this.currentEditingSignal];
            
            if (radix === 'X' || radix === 'Z') {
                signal.values[this.currentEditingCycle] = radix;
            } else if (value) {
                signal.values[this.currentEditingCycle] = value;
            }
            
            TimingGenUI.hideBusValueDialog(this);
            this.render();
        }
    }
    
    updateCycles(newCycles) {
        this.config.cycles = parseInt(newCycles);
        this.initializeCanvas();
        this.render();
    }
    
    handleCanvasClick(event) {
        // Only handle left mouse button clicks (button 0)
        // Right clicks are handled by handleCanvasRightClick
        if (event.event && event.event.button !== 0) {
            return;
        }
        
        const xPos = event.point.x;
        const yPos = event.point.y;
        
        // Check if click is in signal name area
        if (xPos < this.config.nameColumnWidth) {
            const signalIndex = this.getSignalIndexAtY(yPos);
            if (signalIndex !== -1) {
                this.startDragSignal(signalIndex, event);
            }
            return;
        }
        
        // Check if click is in waveform area
        const cycle = Math.floor((xPos - this.config.nameColumnWidth) / this.config.cycleWidth);
        const signalIndex = this.getSignalIndexAtY(yPos);
        
        if (signalIndex !== -1 && cycle >= 0 && cycle < this.config.cycles) {
            const signal = this.signals[signalIndex];
            
            if (signal.type === 'bit') {
                this.toggleBitSignal(signalIndex, cycle);
            } else if (signal.type === 'bus') {
                TimingGenUI.showBusValueDialog(this, signalIndex, cycle);
            }
        }
    }
    
    handleCanvasRightClick(ev) {
        ev.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const xPos = ev.clientX - rect.left;
        const yPos = ev.clientY - rect.top;
        
        this.hideAllMenus();
        
        // Check if right-click is in cycle header area (top row with cycle numbers)
        if (yPos < this.config.headerHeight && xPos >= this.config.nameColumnWidth) {
            const cycle = Math.floor((xPos - this.config.nameColumnWidth) / this.config.cycleWidth);
            if (cycle >= 0 && cycle < this.config.cycles) {
                this.currentEditingCycle = cycle;
                TimingGenUI.showContextMenu('cycle-context-menu', ev.clientX, ev.clientY);
            }
            return;
        }
        
        // Check if right-click is in signal name area
        if (xPos < this.config.nameColumnWidth) {
            const signalIndex = this.getSignalIndexAtY(yPos);
            if (signalIndex !== -1) {
                this.currentEditingSignal = signalIndex;
                TimingGenUI.showContextMenu('signal-context-menu', ev.clientX, ev.clientY);
            }
            return;
        }
        
        // Check if right-click is in waveform area
        const cycle = Math.floor((xPos - this.config.nameColumnWidth) / this.config.cycleWidth);
        const signalIndex = this.getSignalIndexAtY(yPos);
        
        if (signalIndex !== -1 && cycle >= 0 && cycle < this.config.cycles) {
            const signal = this.signals[signalIndex];
            
            // Show appropriate cycle context menu based on signal type
            if (signal.type === 'bit') {
                this.currentEditingSignal = signalIndex;
                this.currentEditingCycle = cycle;
                TimingGenUI.showBitCycleContextMenu(this, ev.clientX, ev.clientY);
            } else if (signal.type === 'bus') {
                this.currentEditingSignal = signalIndex;
                this.currentEditingCycle = cycle;
                TimingGenUI.showBusCycleContextMenu(this, ev.clientX, ev.clientY);
            }
        }
    }
    
    toggleBitSignal(signalIndex, cycle) {
        const signal = this.signals[signalIndex];
        const currentValue = this.getBitValueAtCycle(signal, cycle);
        const newValue = (currentValue === 0 || currentValue === 'X' || currentValue === 'Z') ? 1 : 0;
        signal.values[cycle] = newValue;
        this.render();
    }
    
    setBitValue(signalIndex, cycle, value) {
        if (signalIndex !== null && cycle !== null) {
            const signal = this.signals[signalIndex];
            if (value === 'X' || value === 'Z') {
                signal.values[cycle] = value;
            } else {
                signal.values[cycle] = parseInt(value);
            }
            this.render();
        }
    }
    
    removeBitChange() {
        if (this.currentEditingSignal !== null && this.currentEditingCycle !== null) {
            const signal = this.signals[this.currentEditingSignal];
            delete signal.values[this.currentEditingCycle];
            // Also remove cycle options if they exist
            if (signal.cycleOptions && signal.cycleOptions[this.currentEditingCycle]) {
                delete signal.cycleOptions[this.currentEditingCycle];
                if (Object.keys(signal.cycleOptions).length === 0) {
                    delete signal.cycleOptions;
                }
            }
            this.hideAllMenus();
            this.render();
        }
    }
    
    removeBusChange() {
        if (this.currentEditingSignal !== null && this.currentEditingCycle !== null) {
            const signal = this.signals[this.currentEditingSignal];
            delete signal.values[this.currentEditingCycle];
            // Also remove cycle options if they exist
            if (signal.cycleOptions && signal.cycleOptions[this.currentEditingCycle]) {
                delete signal.cycleOptions[this.currentEditingCycle];
                if (Object.keys(signal.cycleOptions).length === 0) {
                    delete signal.cycleOptions;
                }
            }
            this.hideAllMenus();
            this.render();
        }
    }
    
    getBitValueAtCycle(signal, cycle) {
        // Find the last defined value before or at this cycle
        let value = 0; // default
        for (let cy = 0; cy <= cycle; cy++) {
            if (signal.values[cy] !== undefined) {
                value = signal.values[cy];
                // Convert null to 0
                if (value === null) {
                    value = 0;
                }
            }
        }
        return value;
    }
    
    getBusValueAtCycle(signal, cycle) {
        // Find the last defined value before or at this cycle
        let value = 'X'; // default
        for (let cy = 0; cy <= cycle; cy++) {
            if (signal.values[cy] !== undefined) {
                value = signal.values[cy];
                // Convert null to 'X' for bus signals
                if (value === null) {
                    value = 'X';
                }
            }
        }
        return value;
    }
    
    // Get effective slew value with priority: cycle > signal > global
    getEffectiveSlew(signal, cycle) {
        // Check cycle-level override
        if (signal.cycleOptions && signal.cycleOptions[cycle] && signal.cycleOptions[cycle].slew !== undefined) {
            return signal.cycleOptions[cycle].slew;
        }
        // Check signal-level override
        if (signal.slew !== undefined) {
            return signal.slew;
        }
        // Use global default
        return this.config.slew;
    }
    
    // Get effective delay value with cascading priority: cycle > signal > global
    // Each attribute (delayMin, delayMax, delayColor) is resolved independently
    // Returns object with {min, max, color} delay in pixels
    getEffectiveDelay(signal, cycle) {
        // Start with defaults from code (0 for delays, config color for color)
        let delayMinInTime = 0;
        let delayMaxInTime = 0;
        let delayColor = this.config.delayColor || '#0000FF'; // Ensure we always have a color
        
        // Backward compatibility: handle old single delay field at global level (only if new fields not set)
        if (this.config.delay !== undefined && this.config.delayMin === undefined && this.config.delayMax === undefined) {
            delayMinInTime = this.config.delay;
            delayMaxInTime = this.config.delay;
        }
        
        // Apply global level overrides (if defined)
        if (this.config.delayMin !== undefined) {
            delayMinInTime = this.config.delayMin;
        }
        if (this.config.delayMax !== undefined) {
            delayMaxInTime = this.config.delayMax;
        }
        if (this.config.delayColor !== undefined) {
            delayColor = this.config.delayColor;
        }
        
        // Backward compatibility: handle old single delay field at signal level (only if new fields not set)
        if (signal.delay !== undefined && signal.delayMin === undefined && signal.delayMax === undefined) {
            delayMinInTime = signal.delay;
            delayMaxInTime = signal.delay;
        }
        
        // Apply signal level overrides (if defined)
        if (signal.delayMin !== undefined) {
            delayMinInTime = signal.delayMin;
        }
        if (signal.delayMax !== undefined) {
            delayMaxInTime = signal.delayMax;
        }
        if (signal.delayColor !== undefined) {
            delayColor = signal.delayColor;
        }
        
        // Apply cycle level overrides (if defined)
        if (signal.cycleOptions && signal.cycleOptions[cycle]) {
            const cycleOpts = signal.cycleOptions[cycle];
            
            // Backward compatibility: handle old single delay field at cycle level (only if new fields not set)
            if (cycleOpts.delay !== undefined && cycleOpts.delayMin === undefined && cycleOpts.delayMax === undefined) {
                delayMinInTime = cycleOpts.delay;
                delayMaxInTime = cycleOpts.delay;
            }
            
            if (cycleOpts.delayMin !== undefined) {
                delayMinInTime = cycleOpts.delayMin;
            }
            if (cycleOpts.delayMax !== undefined) {
                delayMaxInTime = cycleOpts.delayMax;
            }
            if (cycleOpts.delayColor !== undefined) {
                delayColor = cycleOpts.delayColor;
            }
        }
        
        // Convert delay time to fraction of clock period, then to pixels
        // delay is in same unit as clock period (e.g., both in ns)
        // delayFraction = delayInTime / clockPeriod
        // delayPixels = delayFraction * cycleWidth
        if (this.config.clockPeriod > 0) {
            const delayMinFraction = delayMinInTime / this.config.clockPeriod;
            const delayMaxFraction = delayMaxInTime / this.config.clockPeriod;
            return {
                min: delayMinFraction * this.config.cycleWidth,
                max: delayMaxFraction * this.config.cycleWidth,
                color: delayColor
            };
        }
        return { min: 0, max: 0, color: delayColor };
    }
    
    getSignalIndexAtY(yPos) {
        const relY = yPos - this.config.headerHeight;
        if (relY < 0) return -1;
        
        const index = Math.floor(relY / this.config.rowHeight);
        return (index >= 0 && index < this.signals.length) ? index : -1;
    }
    
    startDragSignal(signalIndex, event) {
        this.draggedSignal = signalIndex;
        
        const rect = this.canvas.getBoundingClientRect();
        
        const onMouseMove = (moveEvent) => {
            const yPos = moveEvent.clientY - rect.top;
            this.updateDragIndicator(yPos);
        };
        
        const onMouseUp = (upEvent) => {
            const yPos = upEvent.clientY - rect.top;
            this.dropSignal(yPos);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.draggedSignal = null;
            this.removeDragIndicator();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    updateDragIndicator(yPos) {
        const targetIndex = this.getSignalIndexAtY(yPos);
        if (targetIndex !== -1 && targetIndex !== this.draggedSignal) {
            // Show indicator line
            const indicatorY = this.config.headerHeight + targetIndex * this.config.rowHeight;
            
            if (!this.dragIndicator) {
                this.dragIndicator = document.createElement('div');
                this.dragIndicator.className = 'drag-indicator';
                document.getElementById('drawing-area').appendChild(this.dragIndicator);
            }
            
            this.dragIndicator.style.top = indicatorY + 'px';
        }
    }
    
    removeDragIndicator() {
        if (this.dragIndicator) {
            this.dragIndicator.remove();
            this.dragIndicator = null;
        }
    }
    
    dropSignal(yPos) {
        const targetIndex = this.getSignalIndexAtY(yPos);
        if (targetIndex !== -1 && targetIndex !== this.draggedSignal) {
            // Move signal
            const signal = this.signals.splice(this.draggedSignal, 1)[0];
            this.signals.splice(targetIndex, 0, signal);
            this.render();
        }
    }
    
    insertCyclesGlobal(startCycle, numCycles) {
        // Insert cycles for all signals after startCycle
        this.signals.forEach(signal => {
            this.insertCyclesForSignal(signal, startCycle, numCycles);
        });
        
        // Update cycle count
        this.config.cycles += numCycles;
        document.getElementById('cycles-input').value = this.config.cycles;
        this.initializeCanvas();
        this.render();
    }
    
    deleteCyclesGlobal(startCycle, numCycles) {
        // Delete cycles for all signals starting from startCycle
        this.signals.forEach(signal => {
            this.deleteCyclesForSignal(signal, startCycle, numCycles);
        });
        
        // Keep cycle count unchanged - the deleted cycles are replaced with steady cycles at the end
        // (steady cycles extend the last state automatically without explicit values)
        this.render();
    }
    
    insertCyclesSignal(signalIndex, startCycle, numCycles) {
        // Insert cycles for a specific signal only
        const signal = this.signals[signalIndex];
        this.insertCyclesForSignal(signal, startCycle, numCycles);
        this.render();
    }
    
    deleteCyclesSignal(signalIndex, startCycle, numCycles) {
        // Delete cycles for a specific signal only
        const signal = this.signals[signalIndex];
        this.deleteCyclesForSignal(signal, startCycle, numCycles);
        this.render();
    }
    
    insertCyclesForSignal(signal, startCycle, numCycles) {
        // Shift all values and cycleOptions that are at or after startCycle+1
        const newValues = {};
        const newCycleOptions = {};
        
        // Copy values, shifting those after startCycle
        Object.keys(signal.values).forEach(cycleStr => {
            const cycle = parseInt(cycleStr);
            if (cycle <= startCycle) {
                newValues[cycle] = signal.values[cycle];
            } else {
                // Shift right by numCycles
                newValues[cycle + numCycles] = signal.values[cycle];
            }
        });
        
        // Copy cycleOptions, shifting those after startCycle
        if (signal.cycleOptions) {
            Object.keys(signal.cycleOptions).forEach(cycleStr => {
                const cycle = parseInt(cycleStr);
                if (cycle <= startCycle) {
                    newCycleOptions[cycle] = signal.cycleOptions[cycle];
                } else {
                    // Shift right by numCycles
                    newCycleOptions[cycle + numCycles] = signal.cycleOptions[cycle];
                }
            });
            signal.cycleOptions = newCycleOptions;
        }
        
        signal.values = newValues;
        // The inserted cycles will "extend" the current state (no explicit value needed)
    }
    
    deleteCyclesForSignal(signal, startCycle, numCycles) {
        // Delete cycles and shift remaining ones left
        const newValues = {};
        const newCycleOptions = {};
        
        // Copy values, skipping deleted cycles and shifting remaining ones
        Object.keys(signal.values).forEach(cycleStr => {
            const cycle = parseInt(cycleStr);
            if (cycle < startCycle) {
                // Keep as-is
                newValues[cycle] = signal.values[cycle];
            } else if (cycle >= startCycle + numCycles) {
                // Shift left by numCycles
                newValues[cycle - numCycles] = signal.values[cycle];
            }
            // Skip cycles in [startCycle, startCycle + numCycles)
        });
        
        // Copy cycleOptions, skipping deleted cycles and shifting remaining ones
        if (signal.cycleOptions) {
            Object.keys(signal.cycleOptions).forEach(cycleStr => {
                const cycle = parseInt(cycleStr);
                if (cycle < startCycle) {
                    // Keep as-is
                    newCycleOptions[cycle] = signal.cycleOptions[cycle];
                } else if (cycle >= startCycle + numCycles) {
                    // Shift left by numCycles
                    newCycleOptions[cycle - numCycles] = signal.cycleOptions[cycle];
                }
                // Skip cycles in [startCycle, startCycle + numCycles)
            });
            signal.cycleOptions = newCycleOptions;
        }
        
        signal.values = newValues;
        // Add steady cycles at the end if needed (they extend the last state automatically)
    }
    
    handleInsertCycles() {
        const numCycles = parseInt(document.getElementById('insert-cycles-input').value);
        
        if (isNaN(numCycles) || numCycles < 1) {
            alert('Please enter a valid number of cycles');
            return;
        }
        
        TimingGenUI.hideInsertCyclesDialog();
        
        if (this.insertCycleMode === 'global') {
            // Insert cycles for all signals after the current cycle
            this.insertCyclesGlobal(this.currentEditingCycle, numCycles);
        } else if (this.insertCycleMode === 'signal') {
            // Insert cycles for the current signal only
            if (this.currentEditingSignal !== null) {
                this.insertCyclesSignal(this.currentEditingSignal, this.currentEditingCycle, numCycles);
            }
        }
    }
    
    handleDeleteCycles() {
        const numCycles = parseInt(document.getElementById('delete-cycles-input').value);
        
        if (isNaN(numCycles) || numCycles < 1) {
            alert('Please enter a valid number of cycles');
            return;
        }
        
        TimingGenUI.hideDeleteCyclesDialog();
        
        if (this.deleteCycleMode === 'global') {
            // Delete cycles for all signals starting from the current cycle
            this.deleteCyclesGlobal(this.currentEditingCycle, numCycles);
        } else if (this.deleteCycleMode === 'signal') {
            // Delete cycles for the current signal only
            if (this.currentEditingSignal !== null) {
                this.deleteCyclesSignal(this.currentEditingSignal, this.currentEditingCycle, numCycles);
            }
        }
    }
    
    render() {
        TimingGenRendering.render(this);
    }
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const app = new TimingGenApp();
    // Store reference for debugging/testing
    window.timingGenApp = app;
    document.getElementById('waveform-canvas').__timingGenApp = app;
});

    printData = function() {
        const app = window.timingGenApp;
        const data = {
            version: '3.0.1',
            config: {
                cycles: app.config.cycles,
                clockPeriod: app.config.clockPeriod,
                clockPeriodUnit: app.config.clockPeriodUnit,
                slew: app.config.slew,
                delayMin: app.config.delayMin,
                delayMax: app.config.delayMax,
                delayColor: app.config.delayColor
            },
            signals: app.signals
        };
        console.log(data);
    }
