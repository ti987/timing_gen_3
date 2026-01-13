// Timing Gen 3 - Interactive Digital Logic Waveform Editor
// Version 3.1.0
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
// - Unified row system for signals and measures

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
        
        // Data model (unified row system)
        this.rows = []; // Array of row objects: {type: 'signal'|'measure', data: ...}
        
        // Legacy data model (for backward compatibility during migration)
        this.signals = [];
        this.measures = []; // Array of measure objects
        this.blankRows = []; // Array of blank row indices for measures
        
        // Row manager for unified row system
        this.rowManager = new RowManager(this);
        
        this.currentEditingSignal = null;
        this.currentEditingCycle = null;
        
        // Measure mode state
        this.measureMode = false;
        this.measureState = null; // null, 'first-point', 'second-point', 'placing-text'
        this.currentMeasure = null; // Current measure being created
        this.currentEditingMeasure = null; // Index of measure being edited
        this.tempMeasureGraphics = null; // Temporary graphics for measure creation
        
        // Insert/Delete cycle mode tracking
        this.insertCycleMode = null; // 'global' or 'signal'
        this.deleteCycleMode = null; // 'global' or 'signal'
        
        // Drag and drop state
        this.draggedSignal = null;
        this.dragIndicator = null;
        
        // Selection state
        this.selectedSignals = new Set(); // Set of signal indices
        this.isDragging = false;
        
        // Paper.js layers
        this.backgroundLayer = new paper.Layer();
        this.gridLayer = new paper.Layer();
        this.signalLayer = new paper.Layer();
        this.measureLayer = new paper.Layer(); // Layer for measures
        
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
        
        // Add menu and submenu
        document.getElementById('add-menu-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const submenu = document.getElementById('add-submenu');
            submenu.style.display = submenu.style.display === 'none' ? 'block' : 'none';
        });
        document.getElementById('add-measure-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.startMeasureMode();
        });
        
        // Close submenu when clicking outside
        document.addEventListener('click', (e) => {
            const submenu = document.getElementById('add-submenu');
            const addBtn = document.getElementById('add-menu-btn');
            if (!addBtn.contains(e.target) && !submenu.contains(e.target)) {
                submenu.style.display = 'none';
            }
        });
        
        // Measure text dialog
        document.getElementById('measure-text-ok-btn').addEventListener('click', () => this.finalizeMeasure());
        document.getElementById('measure-text-cancel-btn').addEventListener('click', () => this.cancelMeasure());
        
        // Measure context menu
        document.getElementById('delete-measure-menu').addEventListener('click', () => this.deleteMeasure());
        document.getElementById('cancel-measure-menu').addEventListener('click', () => this.hideAllMenus());
        
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
        this.tool = new paper.Tool();
        this.tool.onMouseDown = (event) => this.handleCanvasClick(event);
        
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
                // Cancel selection and dragging
                this.cancelSelection();
            }
        });
    }
    
    hideAllMenus() {
        document.getElementById('signal-context-menu').style.display = 'none';
        document.getElementById('bit-cycle-context-menu').style.display = 'none';
        document.getElementById('bus-cycle-context-menu').style.display = 'none';
        document.getElementById('cycle-context-menu').style.display = 'none';
        document.getElementById('measure-context-menu').style.display = 'none';
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
        
        // Add to legacy signals array for backward compatibility
        this.signals.push(signal);
        
        // Add to unified row system
        if (this.rowManager && this.rowManager.isUsingNewSystem()) {
            this.rowManager.insertRow(this.rows.length, {
                type: 'signal',
                data: signal
            });
        } else {
            // Initialize rows array if not present
            if (!this.rows) {
                this.rows = [];
            }
            this.rows.push({
                type: 'signal',
                data: signal
            });
        }
        
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
                // Delete from legacy signals array
                this.signals.splice(this.currentEditingSignal, 1);
                
                // Delete from unified row system
                if (this.rowManager && this.rowManager.isUsingNewSystem()) {
                    const rowIndex = this.rowManager.signalIndexToRowIndex(this.currentEditingSignal);
                    if (rowIndex >= 0) {
                        this.rowManager.deleteRow(rowIndex);
                    }
                }
                
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
        const nativeEvent = event.event;
        
        // Handle measure mode clicks
        if (this.measureMode) {
            if (this.measureState === 'first-point') {
                // First click: select first point at nearest transition
                const transition = this.findNearestTransition(xPos, yPos);
                
                if (transition) {
                    // Convert signal index to row index
                    const signalRow = this.rowManager.signalIndexToRowIndex(transition.signalIndex);
                    this.currentMeasure.signal1Row = signalRow;
                    this.currentMeasure.cycle1 = transition.cycle;
                    this.measureState = 'second-point';
                    this.hideInstruction();
                    this.showInstruction("Click the second point");
                    
                    // Draw first vertical line immediately
                    this.drawFirstPointVisuals();
                } else {
                    // Show error message - no signals loaded
                    alert('Please load or add signals before creating measures');
                    this.cancelMeasure();
                }
                return;
            } else if (this.measureState === 'second-point') {
                // Second click: select second point at nearest transition
                const transition = this.findNearestTransition(xPos, yPos);
                
                if (transition) {
                    // Convert signal index to row index
                    const signalRow = this.rowManager.signalIndexToRowIndex(transition.signalIndex);
                    this.currentMeasure.signal2Row = signalRow;
                    this.currentMeasure.cycle2 = transition.cycle;
                    this.measureState = 'placing-row';
                    this.hideInstruction();
                    this.showInstruction("Pick a row for the measure");
                    
                    // Draw second point visuals immediately (both lines + arrow)
                    this.drawSecondPointVisuals();
                } else {
                    // Unexpected - signals were removed during measure creation
                    alert('Signals were removed. Cancelling measure creation.');
                    this.cancelMeasure();
                }
                return;
            } else if (this.measureState === 'placing-row') {
                // Third click: finalize row and create measure with blank row insertion
                const rowIndex = this.getRowIndexAtY(yPos);
                this.currentMeasure.measureRow = rowIndex;
                
                // Finalize measure with actual blank row insertion
                this.finalizeMeasureWithBlankRow();
                return;
            }
        }
        
        // Check if click is in signal name area
        if (xPos < this.config.nameColumnWidth) {
            const signalIndex = this.getSignalIndexAtY(yPos);
            if (signalIndex !== -1) {
                // Handle selection with modifier keys
                if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
                    // Ctrl-click: toggle selection
                    this.toggleSignalSelection(signalIndex);
                    this.render();
                } else if (nativeEvent.shiftKey) {
                    // Shift-click: select range
                    this.selectSignalRange(signalIndex);
                    this.render();
                } else if (nativeEvent.altKey) {
                    // Alt-click: deselect
                    this.deselectSignal(signalIndex);
                    this.render();
                } else {
                    // Regular click: select and start drag
                    if (!this.selectedSignals.has(signalIndex)) {
                        // If not already selected, make it the only selection
                        this.selectedSignals.clear();
                        this.selectedSignals.add(signalIndex);
                        this.render();
                    }
                    this.startDragSignal(signalIndex, event);
                }
            }
            return;
        }
        
        // Check if click is in waveform area - clear selection if clicking waveform
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
        // Safety check: if signal is undefined or null, return global default
        if (!signal) {
            return this.config.slew || 0;
        }
        
        // Check cycle-level override
        if (signal.cycleOptions && signal.cycleOptions[cycle] && signal.cycleOptions[cycle].slew !== undefined) {
            return signal.cycleOptions[cycle].slew;
        }
        // Check signal-level override
        if (signal.slew !== undefined) {
            return signal.slew;
        }
        // Use global default
        return this.config.slew || 0;
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
        
        // Safety check: if signal is undefined or null, return global defaults
        if (!signal) {
            const delayMinInPixels = (delayMinInTime * this.config.cycleWidth) / this.config.cycleTime;
            const delayMaxInPixels = (delayMaxInTime * this.config.cycleWidth) / this.config.cycleTime;
            return { min: delayMinInPixels, max: delayMaxInPixels, color: delayColor };
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
        // Use unified row system if available
        if (this.rowManager && this.rowManager.isUsingNewSystem()) {
            const rowIndex = this.rowManager.getRowIndexAtY(yPos);
            if (rowIndex < 0) return -1;
            
            // Convert row index to signal index
            return this.rowManager.rowIndexToSignalIndex(rowIndex);
        }
        
        // Fallback to old system
        const relY = yPos - this.config.headerHeight;
        if (relY < 0) return -1;
        
        const visualRow = Math.floor(relY / this.config.rowHeight);
        
        // Account for blank rows - we need to map visual row to signal index
        if (!this.blankRows || this.blankRows.length === 0) {
            // No blank rows, direct mapping
            return (visualRow >= 0 && visualRow < this.signals.length) ? visualRow : -1;
        }
        
        // Count how many blank rows are before this visual row
        let blankRowsBeforeThis = 0;
        for (const blankRowIndex of this.blankRows) {
            if (blankRowIndex <= visualRow) {
                blankRowsBeforeThis++;
            } else {
                break;
            }
        }
        
        // The actual signal index is visual row minus blank rows before it
        const signalIndex = visualRow - blankRowsBeforeThis;
        return (signalIndex >= 0 && signalIndex < this.signals.length) ? signalIndex : -1;
    }
    
    toggleSignalSelection(signalIndex) {
        if (this.selectedSignals.has(signalIndex)) {
            this.selectedSignals.delete(signalIndex);
        } else {
            this.selectedSignals.add(signalIndex);
        }
    }
    
    selectSignalRange(signalIndex) {
        // Find the last selected signal to determine range
        if (this.selectedSignals.size === 0) {
            this.selectedSignals.add(signalIndex);
            return;
        }
        
        // Get the min and max of currently selected signals
        const selectedArray = Array.from(this.selectedSignals);
        const minSelected = Math.min(...selectedArray);
        const maxSelected = Math.max(...selectedArray);
        
        // Select all signals between minSelected and signalIndex or maxSelected and signalIndex
        const start = Math.min(minSelected, signalIndex);
        const end = Math.max(maxSelected, signalIndex);
        
        for (let i = start; i <= end; i++) {
            if (i < this.signals.length) {
                this.selectedSignals.add(i);
            }
        }
    }
    
    deselectSignal(signalIndex) {
        this.selectedSignals.delete(signalIndex);
    }
    
    cancelSelection() {
        this.selectedSignals.clear();
        this.isDragging = false;
        this.draggedSignal = null;
        this.removeDragIndicator();
        this.render();
    }
    
    startDragSignal(signalIndex, event) {
        this.draggedSignal = signalIndex;
        this.isDragging = true;
        
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
            this.isDragging = false;
            this.removeDragIndicator();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    updateDragIndicator(yPos) {
        const targetIndex = this.getSignalIndexAtY(yPos);
        
        // Check if target is valid and not one of the selected signals being dragged
        if (targetIndex !== -1 && !this.selectedSignals.has(targetIndex)) {
            // Calculate valid drop positions (between signals or at edges)
            // The indicator shows where the selected signals will be inserted
            let indicatorY;
            
            // Determine if we should show indicator above or below the target
            const targetYStart = this.config.headerHeight + targetIndex * this.config.rowHeight;
            const targetYMid = targetYStart + this.config.rowHeight / 2;
            
            if (yPos < targetYMid) {
                // Drop above target
                indicatorY = targetYStart;
            } else {
                // Drop below target
                indicatorY = targetYStart + this.config.rowHeight;
            }
            
            if (!this.dragIndicator) {
                this.dragIndicator = document.createElement('div');
                this.dragIndicator.className = 'drag-indicator';
                document.getElementById('drawing-area').appendChild(this.dragIndicator);
            }
            
            this.dragIndicator.style.top = indicatorY + 'px';
            this.dragIndicator.style.display = 'block';
        } else if (this.dragIndicator) {
            this.dragIndicator.style.display = 'none';
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
        
        if (targetIndex === -1 || this.selectedSignals.has(targetIndex)) {
            return; // Invalid drop location
        }
        
        // Get all selected signals (sorted by their current index)
        const selectedIndices = Array.from(this.selectedSignals).sort((a, b) => a - b);
        
        if (selectedIndices.length === 0) {
            return;
        }
        
        // Extract selected signals
        const selectedSignalsData = selectedIndices.map(idx => this.signals[idx]);
        
        // Determine insertion point
        const targetYStart = this.config.headerHeight + targetIndex * this.config.rowHeight;
        const targetYMid = targetYStart + this.config.rowHeight / 2;
        let insertIndex = (yPos < targetYMid) ? targetIndex : targetIndex + 1;
        
        // Remove selected signals from the array (in reverse order to preserve indices)
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
            this.signals.splice(selectedIndices[i], 1);
            // Adjust insertIndex if we removed signals before it
            if (selectedIndices[i] < insertIndex) {
                insertIndex--;
            }
        }
        
        // Insert all selected signals at the new position
        this.signals.splice(insertIndex, 0, ...selectedSignalsData);
        
        // Update unified row system
        if (this.rowManager && this.rowManager.isUsingNewSystem()) {
            // Rebuild rows array from signals and measures
            this.rebuildRowsAfterSignalMove(selectedIndices, insertIndex);
        }
        
        // Update selection indices to reflect new positions
        this.selectedSignals.clear();
        for (let i = 0; i < selectedSignalsData.length; i++) {
            this.selectedSignals.add(insertIndex + i);
        }
        
        this.render();
    }
    
    rebuildRowsAfterSignalMove(movedIndices, insertIndex) {
        // This function rebuilds the rows array after signals have been moved
        // and updates measure row references to track the moved signals
        
        // Extract all measure rows
        const measureRows = [];
        this.rows.forEach(row => {
            if (row.type === 'measure') {
                measureRows.push(row);
            }
        });
        
        // Build new rows array from current signals array
        const newRows = [];
        const newSignalDataToRow = new Map();
        
        this.signals.forEach((signal, idx) => {
            const newRowIdx = newRows.length;
            newRows.push({
                type: 'signal',
                data: signal
            });
            newSignalDataToRow.set(signal, newRowIdx);
        });
        
        // Update measure references based on signal data objects
        measureRows.forEach(measureRow => {
            measureRow.data.forEach(measure => {
                // Find the signal data object for signal1 using direct access
                if (measure.signal1Row !== undefined) {
                    // Validate row index
                    if (measure.signal1Row >= 0 && measure.signal1Row < this.rows.length) {
                        const oldRow = this.rows[measure.signal1Row];
                        if (oldRow && oldRow.type === 'signal') {
                            const signal1Data = oldRow.data;
                            
                            // Find the new row for this signal
                            if (newSignalDataToRow.has(signal1Data)) {
                                measure.signal1Row = newSignalDataToRow.get(signal1Data);
                            }
                        }
                    }
                }
                
                // Same for signal2
                if (measure.signal2Row !== undefined) {
                    // Validate row index
                    if (measure.signal2Row >= 0 && measure.signal2Row < this.rows.length) {
                        const oldRow = this.rows[measure.signal2Row];
                        if (oldRow && oldRow.type === 'signal') {
                            const signal2Data = oldRow.data;
                            
                            // Find the new row for this signal
                            if (newSignalDataToRow.has(signal2Data)) {
                                measure.signal2Row = newSignalDataToRow.get(signal2Data);
                            }
                        }
                    }
                }
                
                // Update measureRow to be between signal1Row and signal2Row
                if (measure.signal1Row !== undefined && measure.signal2Row !== undefined) {
                    // Place measure row between or after the two signals
                    const minRow = Math.min(measure.signal1Row, measure.signal2Row);
                    const maxRow = Math.max(measure.signal1Row, measure.signal2Row);
                    // Place it between them (will be appended as measure row later)
                    measure.measureRow = maxRow + 1;
                }
            });
            
            // Re-add measure rows at the end
            newRows.push(measureRow);
        });
        
        this.rows = newRows;
        
        // Also rebuild the legacy measures array
        this.measures = [];
        measureRows.forEach(measureRow => {
            if (Array.isArray(measureRow.data)) {
                this.measures.push(...measureRow.data);
            }
        });
    }
    
    insertCyclesGlobal(startCycle, numCycles) {
        // Insert cycles for all signals after startCycle
        this.signals.forEach(signal => {
            this.insertCyclesForSignal(signal, startCycle, numCycles);
        });
        
        // Update measure cycle references
        this.updateMeasureCyclesAfterInsertion(startCycle, numCycles);
        
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
        
        // Update measure cycle references
        this.updateMeasureCyclesAfterDeletion(startCycle, numCycles);
        
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
    
    deleteCyclesForSignal(signal, startCycle, numCycles) {
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
    
    updateMeasureCyclesAfterInsertion(startCycle, numCycles) {
        // Update cycle references in all measures after cycles are inserted
        this.measures.forEach(measure => {
            // Update cycle1 if it's after the insertion point
            if (measure.cycle1 !== undefined && measure.cycle1 > startCycle) {
                measure.cycle1 += numCycles;
            }
            
            // Update cycle2 if it's after the insertion point
            if (measure.cycle2 !== undefined && measure.cycle2 > startCycle) {
                measure.cycle2 += numCycles;
            }
        });
        
        // Also update in the rows array
        if (this.rows) {
            this.rows.forEach(row => {
                if (row.type === 'measure' && Array.isArray(row.data)) {
                    row.data.forEach(measure => {
                        if (measure.cycle1 !== undefined && measure.cycle1 > startCycle) {
                            measure.cycle1 += numCycles;
                        }
                        if (measure.cycle2 !== undefined && measure.cycle2 > startCycle) {
                            measure.cycle2 += numCycles;
                        }
                    });
                }
            });
        }
    }
    
    updateMeasureCyclesAfterDeletion(startCycle, numCycles) {
        // Update cycle references in all measures after cycles are deleted
        this.measures.forEach(measure => {
            // Update cycle1 if it's after the deletion point
            if (measure.cycle1 !== undefined) {
                if (measure.cycle1 >= startCycle && measure.cycle1 < startCycle + numCycles) {
                    // Cycle was deleted - mark measure as invalid
                    measure.invalid = true;
                } else if (measure.cycle1 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    measure.cycle1 -= numCycles;
                }
            }
            
            // Update cycle2 if it's after the deletion point
            if (measure.cycle2 !== undefined) {
                if (measure.cycle2 >= startCycle && measure.cycle2 < startCycle + numCycles) {
                    // Cycle was deleted - mark measure as invalid
                    measure.invalid = true;
                } else if (measure.cycle2 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    measure.cycle2 -= numCycles;
                }
            }
        });
        
        // Remove invalid measures
        this.measures = this.measures.filter(m => !m.invalid);
        
        // Also update in the rows array
        if (this.rows) {
            this.rows.forEach(row => {
                if (row.type === 'measure' && Array.isArray(row.data)) {
                    row.data.forEach(measure => {
                        if (measure.cycle1 !== undefined) {
                            if (measure.cycle1 >= startCycle && measure.cycle1 < startCycle + numCycles) {
                                measure.invalid = true;
                            } else if (measure.cycle1 >= startCycle + numCycles) {
                                measure.cycle1 -= numCycles;
                            }
                        }
                        if (measure.cycle2 !== undefined) {
                            if (measure.cycle2 >= startCycle && measure.cycle2 < startCycle + numCycles) {
                                measure.invalid = true;
                            } else if (measure.cycle2 >= startCycle + numCycles) {
                                measure.cycle2 -= numCycles;
                            }
                        }
                    });
                    
                    // Remove invalid measures from this row
                    row.data = row.data.filter(m => !m.invalid);
                }
            });
            
            // Remove empty measure rows
            this.rows = this.rows.filter(row => {
                if (row.type === 'measure') {
                    return row.data && row.data.length > 0;
                }
                return true;
            });
        }
    }
    
    handleInsertCycles() {
        const numCycles = parseInt(document.getElementById('insert-cycles-input').value);
        
        if (!this.validateCycleCount(numCycles)) {
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
        
        if (!this.validateCycleCount(numCycles)) {
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
    
    validateCycleCount(numCycles) {
        if (isNaN(numCycles) || numCycles < 1 || numCycles > 50) {
            alert('Please enter a valid number of cycles (1-50)');
            return false;
        }
        return true;
    }
    
    // Measure-related methods
    startMeasureMode() {
        this.measureMode = true;
        this.measureState = 'first-point';
        this.currentMeasure = {
            signal1Row: null,  // Changed from signal1Index to signal1Row
            cycle1: null,
            signal2Row: null,  // Changed from signal2Index to signal2Row
            cycle2: null,
            measureRow: null,  // Row index where measure will be placed
            text: ''
        };
        this.canvas.style.cursor = 'crosshair';
        
        // Show instruction
        this.showInstruction("Click at the first point");
        
        // Add onMouseMove handler for visual feedback
        this.originalOnMouseMove = this.tool.onMouseMove;
        this.tool.onMouseMove = (event) => this.handleMeasureMouseMove(event);
    }
    
    getCycleAtX(xPos) {
        // Convert X position to cycle number
        const relativeX = xPos - this.config.nameColumnWidth;
        if (relativeX < 0) return null;
        
        const cycle = Math.round(relativeX / this.config.cycleWidth);
        if (cycle < 0 || cycle > this.config.cycles) {
            return null;
        }
        return cycle;
    }
    
    getMeasureCoordinates(measure) {
        // Convert measure data (signal row indices + cycles) to screen coordinates
        // This allows measures to stay aligned with signals even when rows change
        
        // Convert row indices back to signal indices for transition calculation
        const signal1Index = this.rowManager.rowIndexToSignalIndex(measure.signal1Row);
        const signal2Index = this.rowManager.rowIndexToSignalIndex(measure.signal2Row);
        
        // Validate signal indices
        if (signal1Index < 0 || signal2Index < 0) {
            console.error('Invalid signal row indices in measure:', measure);
            // Return default coordinates
            return {
                x1: this.config.nameColumnWidth,
                y1: this.config.headerHeight,
                x2: this.config.nameColumnWidth,
                y2: this.config.headerHeight
            };
        }
        
        // Calculate X positions accounting for signal transitions, delay, and slew
        const x1 = this.getTransitionMidpointX(signal1Index, measure.cycle1);
        const x2 = this.getTransitionMidpointX(signal2Index, measure.cycle2);
        
        // Get Y positions directly from row indices
        const y1 = this.rowManager.getRowYPosition(measure.signal1Row) + this.config.rowHeight / 2;
        const y2 = this.rowManager.getRowYPosition(measure.signal2Row) + this.config.rowHeight / 2;
        
        return { x1, y1, x2, y2 };
    }
    
    getTransitionMidpointX(signalIndex, cycle) {
        // Calculate the X coordinate for the middle of a transition at the given cycle
        // Accounts for delay and slew
        
        if (signalIndex < 0 || signalIndex >= this.signals.length) {
            // Invalid signal, fall back to cycle boundary
            return this.config.nameColumnWidth + cycle * this.config.cycleWidth;
        }
        
        const signal = this.signals[signalIndex];
        
        // Safety check: if signal is undefined, fall back to cycle boundary
        if (!signal) {
            return this.config.nameColumnWidth + cycle * this.config.cycleWidth;
        }
        
        // Base X position at grid line
        const baseX = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
        
        // Get delay info for this cycle
        const delayInfo = this.getEffectiveDelay(signal, cycle);
        
        // Get slew for this cycle
        const slew = this.getEffectiveSlew(signal, cycle);
        
        // Handle clock signals - they have transitions at every cycle
        if (signal.type === 'clock') {
            // Clock has rising edge at cycle boundary and falling edge at mid-cycle
            // For measures, we typically want the rising edge (cycle boundary)
            // Midpoint of rising edge is at: baseX + delayMin + slew/2
            return baseX + delayInfo.min + slew / 2;
        }
        
        // Check if there's actually a transition at this cycle for bit signals
        if (cycle > 0 && signal.type === 'bit') {
            const currentValue = this.getBitValueAtCycle(signal, cycle);
            const prevValue = this.getBitValueAtCycle(signal, cycle - 1);
            
            if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                // There's a real transition here
                // Midpoint is at: baseX + delayMin + slew/2
                return baseX + delayInfo.min + slew / 2;
            }
        }
        
        // No transition or bus signal - use baseX + delayMin
        return baseX + delayInfo.min;
    }
    
    findNearestTransition(xPos, yPos) {
        // Find the nearest signal transition to the click position
        // Returns { signalIndex, cycle }
        
        // First, check if we have any signals at all
        if (!this.signals || this.signals.length === 0) {
            // No signals loaded - can't create measure
            console.warn('Cannot create measure: no signals loaded');
            return null;
        }
        
        const signalIndex = this.getSignalIndexAtY(yPos);
        if (signalIndex === -1 || signalIndex >= this.signals.length) {
            // No valid signal at this Y position, just use the clicked cycle
            const cycle = this.getCycleAtX(xPos);
            // Return default to first signal or cycle 0 if no signals
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        const signal = this.signals[signalIndex];
        if (!signal) {
            // Signal doesn't exist, use fallback
            const cycle = this.getCycleAtX(xPos);
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        // Convert X to cycle
        const clickedCycle = this.getCycleAtX(xPos);
        if (clickedCycle === null) {
            // Fallback to cycle 0 if click is outside bounds
            return { signalIndex, cycle: 0 };
        }
        
        // For bit signals, find the nearest transition
        if (signal.type === 'bit') {
            let nearestCycle = clickedCycle;
            let minDistance = Infinity;
            
            // Search nearby cycles for transitions
            for (let cycle = Math.max(1, clickedCycle - 2); cycle <= Math.min(this.config.cycles - 1, clickedCycle + 2); cycle++) {
                const currentValue = this.getBitValueAtCycle(signal, cycle);
                const prevValue = this.getBitValueAtCycle(signal, cycle - 1);
                
                if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                    // Found a transition
                    const transitionX = this.getTransitionMidpointX(signalIndex, cycle);
                    const distance = Math.abs(transitionX - xPos);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCycle = cycle;
                    }
                }
            }
            
            return { signalIndex, cycle: nearestCycle };
        }
        
        // For bus signals, just return the clicked cycle
        return { signalIndex, cycle: clickedCycle };
    }
    
    showInstruction(text) {
        const instructionBox = document.getElementById('instruction-box');
        const instructionText = document.getElementById('instruction-text');
        instructionText.textContent = text;
        instructionBox.style.display = 'block';
    }
    
    hideInstruction() {
        document.getElementById('instruction-box').style.display = 'none';
    }
    
    handleMeasureMouseMove(event) {
        if (!this.measureMode) return;
        
        const xPos = event.point.x;
        const yPos = event.point.y;
        
        // Clear temporary graphics
        if (this.tempMeasureGraphics) {
            if (Array.isArray(this.tempMeasureGraphics)) {
                this.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (this.tempMeasureGraphics.remove) {
                this.tempMeasureGraphics.remove();
            }
            this.tempMeasureGraphics = null;
        }
        
        this.measureLayer.activate();
        this.tempMeasureGraphics = [];
        
        if (this.measureState === 'second-point' && this.currentMeasure.signal1Row !== null) {
            // After first click: show first line + cross, and dynamic line to mouse
            const coords = this.getMeasureCoordinates({
                signal1Row: this.currentMeasure.signal1Row,
                cycle1: this.currentMeasure.cycle1,
                signal2Row: this.currentMeasure.signal1Row,
                cycle2: this.currentMeasure.cycle1
            });
            
            const cross1 = this.drawSmallCross(coords.x1, coords.y1);
            this.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
            
            // Draw first vertical line
            const line1 = this.drawFullVerticalLine(
                coords.x1,
                coords.y1,
                coords.y1
            );
            this.tempMeasureGraphics.push(line1);
            
            // Draw dynamic vertical line from first point to current mouse position
            const dynamicLine = this.drawDynamicVerticalLine(
                coords.x1,
                coords.y1,
                yPos
            );
            this.tempMeasureGraphics.push(dynamicLine);
        } else if (this.measureState === 'placing-row' && this.currentMeasure.signal1Row !== null && this.currentMeasure.signal2Row !== null) {
            // After second click: show both lines + crosses, and drag arrow to mouse position
            const coords = this.getMeasureCoordinates(this.currentMeasure);
            
            const cross1 = this.drawSmallCross(coords.x1, coords.y1);
            this.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
            
            // Draw full vertical line at first point
            const line1 = this.drawFullVerticalLine(
                coords.x1,
                coords.y1,
                coords.y2
            );
            this.tempMeasureGraphics.push(line1);
            
            // Draw small cross at second point
            const cross2 = this.drawSmallCross(coords.x2, coords.y2);
            this.tempMeasureGraphics.push(cross2.hLine, cross2.vLine);
            
            // Draw full vertical line at second point
            const line2 = this.drawFullVerticalLine(
                coords.x2,
                coords.y1,
                coords.y2
            );
            this.tempMeasureGraphics.push(line2);
            
            // Determine row from mouse position and draw arrow at that position
            const rowIndex = this.getRowIndexAtY(yPos);
            const arrowY = this.config.headerHeight + (rowIndex + 0.5) * this.config.rowHeight;
            
            // Draw the double-headed arrow at the current mouse row
            const arrows = this.drawMeasureArrows(
                coords.x1,
                coords.x2,
                arrowY
            );
            this.tempMeasureGraphics.push(...arrows);
            
            // Draw dashed row indicator
            this.drawRowIndicator(rowIndex);
        }
        
        
        paper.view.draw();
    }
    
    drawMeasureBar(xPos, color) {
        const bar = new paper.Path.Line({
            from: [xPos, 0],
            to: [xPos, this.config.headerHeight + this.signals.length * this.config.rowHeight],
            strokeColor: color,
            strokeWidth: 2
        });
        return bar;
    }
    
    drawMeasureArrows(x1, x2, yPos) {
        const arrowSize = 8;
        const spacing = Math.abs(x2 - x1);
        // Default to outward arrows, only use inward if spacing is too small (< 30px for arrow heads)
        const isInward = spacing < 30;
        const elements = [];
        
        // Horizontal line between bars
        const line = new paper.Path.Line({
            from: [Math.min(x1, x2), yPos],
            to: [Math.max(x1, x2), yPos],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        elements.push(line);
        
        // Arrows at both ends
        if (isInward) {
            // Inward pointing arrows (when spacing is too small)
            // Left arrow (pointing right)
            const leftArrow = new paper.Path([
                [Math.min(x1, x2), yPos],
                [Math.min(x1, x2) + arrowSize, yPos - arrowSize/2],
                [Math.min(x1, x2) + arrowSize, yPos + arrowSize/2]
            ]);
            leftArrow.closed = true;
            leftArrow.fillColor = '#FF0000';
            elements.push(leftArrow);
            
            // Right arrow (pointing left)
            const rightArrow = new paper.Path([
                [Math.max(x1, x2), yPos],
                [Math.max(x1, x2) - arrowSize, yPos - arrowSize/2],
                [Math.max(x1, x2) - arrowSize, yPos + arrowSize/2]
            ]);
            rightArrow.closed = true;
            rightArrow.fillColor = '#FF0000';
            elements.push(rightArrow);
        } else {
            // Outward pointing arrows
            // Left arrow (pointing left)
            const leftArrow = new paper.Path([
                [Math.min(x1, x2), yPos],
                [Math.min(x1, x2) - arrowSize, yPos - arrowSize/2],
                [Math.min(x1, x2) - arrowSize, yPos + arrowSize/2]
            ]);
            leftArrow.closed = true;
            leftArrow.fillColor = '#FF0000';
            elements.push(leftArrow);
            
            // Right arrow (pointing right)
            const rightArrow = new paper.Path([
                [Math.max(x1, x2), yPos],
                [Math.max(x1, x2) + arrowSize, yPos - arrowSize/2],
                [Math.max(x1, x2) + arrowSize, yPos + arrowSize/2]
            ]);
            rightArrow.closed = true;
            rightArrow.fillColor = '#FF0000';
            elements.push(rightArrow);
        }
        
        return elements;
    }
    
    getRowIndexAtY(yPos) {
        // Returns row index, including -1 for above first signal and signals.length for below last signal
        if (yPos < this.config.headerHeight) {
            return -1; // Above signals
        }
        const relativeY = yPos - this.config.headerHeight;
        const rowIndex = Math.floor(relativeY / this.config.rowHeight);
        return rowIndex;
    }
    
    // New drawing helper methods for measure feature
    drawSmallCross(xPos, yPos) {
        const crossSize = 6;
        
        // Horizontal line of cross
        const hLine = new paper.Path.Line({
            from: [xPos - crossSize, yPos],
            to: [xPos + crossSize, yPos],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        // Vertical line of cross
        const vLine = new paper.Path.Line({
            from: [xPos, yPos - crossSize],
            to: [xPos, yPos + crossSize],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        // Return object with both lines so they can be added to the array
        return { hLine, vLine };
    }
    
    drawDynamicVerticalLine(xPos, startY, currentY) {
        // Draw vertical line extending from start row to current mouse position
        const rowHeight = this.config.rowHeight;
        const startRowTop = Math.floor((startY - this.config.headerHeight) / rowHeight) * rowHeight + this.config.headerHeight;
        const startRowBottom = startRowTop + rowHeight;
        
        let lineStart, lineEnd;
        
        if (currentY < startRowTop) {
            // Extending upward
            lineStart = currentY;
            lineEnd = startRowBottom;
        } else if (currentY > startRowBottom) {
            // Extending downward
            lineStart = startRowTop;
            lineEnd = currentY;
        } else {
            // Within same row
            lineStart = startRowTop;
            lineEnd = startRowBottom;
        }
        
        const line = new paper.Path.Line({
            from: [xPos, lineStart],
            to: [xPos, lineEnd],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        return line;
    }
    
    drawFullVerticalLine(xPos, startY, endY) {
        // Draw full vertical line from first point row to second point row
        const rowHeight = this.config.rowHeight;
        const startRowTop = Math.floor((startY - this.config.headerHeight) / rowHeight) * rowHeight + this.config.headerHeight;
        const startRowBottom = startRowTop + rowHeight;
        const endRowTop = Math.floor((endY - this.config.headerHeight) / rowHeight) * rowHeight + this.config.headerHeight;
        const endRowBottom = endRowTop + rowHeight;
        
        const lineStart = Math.min(startRowTop, endRowTop);
        const lineEnd = Math.max(startRowBottom, endRowBottom);
        
        const line = new paper.Path.Line({
            from: [xPos, lineStart],
            to: [xPos, lineEnd],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        return line;
    }
    
    drawRowIndicator(rowIndex) {
        // Draw horizontal line indicator for row selection
        const yPos = this.config.headerHeight + (rowIndex + 0.5) * this.config.rowHeight;
        const indicator = new paper.Path.Line({
            from: [0, yPos],
            to: [this.config.nameColumnWidth + this.config.cycles * this.config.cycleWidth, yPos],
            strokeColor: '#FF0000',
            strokeWidth: 1,
            dashArray: [5, 3]
        });
        
        if (this.tempMeasureGraphics && Array.isArray(this.tempMeasureGraphics)) {
            this.tempMeasureGraphics.push(indicator);
        }
    }
    
    drawArrowHead(x, y, direction, size = 8) {
        // direction: 'left', 'right', 'up', 'down'
        let path;
        
        switch(direction) {
            case 'left':
                path = new paper.Path([
                    [x, y],
                    [x + size, y - size/2],
                    [x + size, y + size/2]
                ]);
                break;
            case 'right':
                path = new paper.Path([
                    [x, y],
                    [x - size, y - size/2],
                    [x - size, y + size/2]
                ]);
                break;
            case 'up':
                path = new paper.Path([
                    [x, y],
                    [x - size/2, y + size],
                    [x + size/2, y + size]
                ]);
                break;
            case 'down':
                path = new paper.Path([
                    [x, y],
                    [x - size/2, y - size],
                    [x + size/2, y - size]
                ]);
                break;
        }
        
        path.closed = true;
        path.fillColor = '#FF0000';
        
        return path;
    }
    
    // Draw visuals immediately after first click
    drawFirstPointVisuals() {
        // Clear any existing temp graphics
        if (this.tempMeasureGraphics) {
            if (Array.isArray(this.tempMeasureGraphics)) {
                this.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (this.tempMeasureGraphics.remove) {
                this.tempMeasureGraphics.remove();
            }
            this.tempMeasureGraphics = null;
        }
        
        this.measureLayer.activate();
        this.tempMeasureGraphics = [];
        
        // Get coordinates for first point
        const coords = this.getMeasureCoordinates({
            signal1Row: this.currentMeasure.signal1Row,
            cycle1: this.currentMeasure.cycle1,
            signal2Row: this.currentMeasure.signal1Row,
            cycle2: this.currentMeasure.cycle1
        });
        
        // Draw small cross at first point
        const cross1 = this.drawSmallCross(coords.x1, coords.y1);
        this.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
        
        // Draw first vertical line
        const line1 = this.drawFullVerticalLine(
            coords.x1,
            coords.y1,
            coords.y1
        );
        this.tempMeasureGraphics.push(line1);
        
        paper.view.draw();
    }
    
    // Draw visuals immediately after second click
    drawSecondPointVisuals() {
        // Clear any existing temp graphics
        if (this.tempMeasureGraphics) {
            if (Array.isArray(this.tempMeasureGraphics)) {
                this.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (this.tempMeasureGraphics.remove) {
                this.tempMeasureGraphics.remove();
            }
            this.tempMeasureGraphics = null;
        }
        
        this.measureLayer.activate();
        this.tempMeasureGraphics = [];
        
        // Get coordinates for both points
        const coords = this.getMeasureCoordinates(this.currentMeasure);
        
        // Draw small cross at first point
        const cross1 = this.drawSmallCross(coords.x1, coords.y1);
        this.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
        
        // Draw full vertical line at first point
        const line1 = this.drawFullVerticalLine(
            coords.x1,
            coords.y1,
            coords.y2
        );
        this.tempMeasureGraphics.push(line1);
        
        // Draw small cross at second point
        const cross2 = this.drawSmallCross(coords.x2, coords.y2);
        this.tempMeasureGraphics.push(cross2.hLine, cross2.vLine);
        
        // Draw full vertical line at second point
        const line2 = this.drawFullVerticalLine(
            coords.x2,
            coords.y1,
            coords.y2
        );
        this.tempMeasureGraphics.push(line2);
        
        // Draw double-headed arrow at a default position (middle row between the two points)
        const defaultRow = Math.floor((this.currentMeasure.signal1Row + this.currentMeasure.signal2Row) / 2);
        const arrowY = this.rowManager.getRowYPosition(defaultRow) + this.config.rowHeight / 2;
        const arrows = this.drawMeasureArrows(
            coords.x1,
            coords.x2,
            arrowY
        );
        this.tempMeasureGraphics.push(...arrows);
        
        paper.view.draw();
    }
    
    finalizeMeasureWithBlankRow() {
        // Finalize measure with actual blank row insertion
        this.currentMeasure.text = ''; // No text for now
        
        // Add measure to unified row system
        const measureRowIndex = this.currentMeasure.measureRow;
        
        // Check if a measure row already exists at this position
        if (measureRowIndex < this.rows.length && this.rows[measureRowIndex].type === 'measure') {
            // Add to existing measure row
            this.rows[measureRowIndex].data.push(this.currentMeasure);
        } else {
            // Insert new measure row
            this.rowManager.insertRow(measureRowIndex, {
                type: 'measure',
                data: [this.currentMeasure]
            });
        }
        
        // Also add to legacy measures array for backward compatibility
        this.measures.push(this.currentMeasure);
        
        // Clean up
        this.hideInstruction();
        this.measureMode = false;
        this.measureState = null;
        this.currentMeasure = null;
        this.canvas.style.cursor = 'crosshair';
        
        if (this.tempMeasureGraphics) {
            if (Array.isArray(this.tempMeasureGraphics)) {
                this.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (this.tempMeasureGraphics.remove) {
                this.tempMeasureGraphics.remove();
            }
            this.tempMeasureGraphics = null;
        }
        
        // Restore original onMouseMove
        this.tool.onMouseMove = this.originalOnMouseMove;
        
        this.render();
    }
    
    insertBlankRowAtPosition(rowIndex) {
        // Insert a blank row by shifting signals down
        // rowIndex can be negative (above all signals), between signals, or after all signals
        
        if (rowIndex < 0) {
            // Insert above all signals - no signal moving needed
            return;
        }
        
        if (rowIndex >= this.signals.length) {
            // Insert below all signals - no signal moving needed
            return;
        }
        
        // Insert between signals - shift signals at rowIndex and below down by one row
        // We do this by adjusting the rendering, not by actually moving signal data
        // The measure will be drawn in the blank space
        
        // For now, we'll mark that a blank row exists at this position
        // The rendering will handle spacing appropriately
        if (!this.blankRows) {
            this.blankRows = [];
        }
        this.blankRows.push(rowIndex);
        this.blankRows.sort((a, b) => a - b);
    }
    
    finalizeMeasureWithoutText() {
        // Finalize measure without text input (as requested - text is separate operation)
        this.currentMeasure.text = ''; // No text for now
        
        // Insert blank row if needed at the selected row
        this.insertBlankRowForMeasure(this.currentMeasure.measureRow);
        
        // Add measure to list
        this.measures.push(this.currentMeasure);
        
        // Clean up
        this.hideInstruction();
        this.measureMode = false;
        this.measureState = null;
        this.currentMeasure = null;
        this.canvas.style.cursor = 'crosshair';
        
        if (this.tempMeasureGraphics) {
            this.tempMeasureGraphics.remove();
            this.tempMeasureGraphics = null;
        }
        
        // Restore original onMouseMove
        this.tool.onMouseMove = this.originalOnMouseMove;
        
        this.render();
    }
    
    insertBlankRowForMeasure(rowIndex) {
        // Insert a blank row at the specified index if needed
        // For now, we'll just note the row - actual row insertion would require
        // moving signals down which is complex. This is a placeholder.
        // The rendering will handle drawing measures between existing rows.
        
        // TODO: Implement actual signal moving to create blank rows
        // This would involve:
        // 1. Shifting all signals at rowIndex and below down by one row
        // 2. Updating the canvas height
        // 3. Re-rendering everything
    }
    
    finalizeMeasure() {
        const text = document.getElementById('measure-text-input').value.trim();
        if (!text) {
            alert('Please enter a label for the measure');
            return;
        }
        
        this.currentMeasure.text = text;
        this.measures.push(this.currentMeasure);
        
        document.getElementById('measure-text-dialog').style.display = 'none';
        this.hideInstruction();
        this.measureMode = false;
        this.measureState = null;
        this.currentMeasure = null;
        this.canvas.style.cursor = 'crosshair';
        
        if (this.tempMeasureGraphics) {
            if (Array.isArray(this.tempMeasureGraphics)) {
                this.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (this.tempMeasureGraphics.remove) {
                this.tempMeasureGraphics.remove();
            }
            this.tempMeasureGraphics = null;
        }
        
        // Restore original onMouseMove
        this.tool.onMouseMove = this.originalOnMouseMove;
        
        this.render();
    }
    
    cancelMeasure() {
        document.getElementById('measure-text-dialog').style.display = 'none';
        this.hideInstruction();
        this.measureMode = false;
        this.measureState = null;
        this.currentMeasure = null;
        this.canvas.style.cursor = 'crosshair';
        
        if (this.tempMeasureGraphics) {
            if (Array.isArray(this.tempMeasureGraphics)) {
                this.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (this.tempMeasureGraphics.remove) {
                this.tempMeasureGraphics.remove();
            }
            this.tempMeasureGraphics = null;
        }
        
        // Restore original onMouseMove
        this.tool.onMouseMove = this.originalOnMouseMove;
        
        this.render();
    }
    
    deleteMeasure() {
        // Delete measure based on currentEditingMeasure
        if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < this.measures.length) {
            this.measures.splice(this.currentEditingMeasure, 1);
            this.currentEditingMeasure = null;
            this.hideAllMenus();
            this.render();
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
