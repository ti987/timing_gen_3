// Timing Gen 3 - Interactive Digital Logic Waveform Editor
// Version 3.0.1
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
            delay: 0, // default delay value
            delayUnit: 'ns', // default delay time unit
            gridColor: '#e0e0e0',
            signalColor: '#000000',
            backgroundColor: '#ffffff'
        };
        
        // Data model
        this.signals = [];
        this.currentEditingSignal = null;
        this.currentEditingCycle = null;
        
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
        document.getElementById('file-input').addEventListener('change', (e) => TimingGenData.loadFromJSON(this, e));
        document.getElementById('cycles-input').addEventListener('change', (e) => this.updateCycles(e.target.value));
        
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
        
        // Signal context menu
        document.getElementById('edit-signal-menu').addEventListener('click', () => TimingGenUI.showEditSignalDialog(this));
        document.getElementById('delete-signal-menu').addEventListener('click', () => this.deleteSignal());
        
        // Canvas events using Paper.js tool
        const tool = new paper.Tool();
        tool.onMouseDown = (event) => this.handleCanvasClick(event);
        
        // Context menu
        this.canvas.addEventListener('contextmenu', (e) => this.handleCanvasRightClick(e));
        
        // Close dialogs and menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('canvas')) {
                this.hideAllMenus();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                TimingGenUI.hideAllDialogs(this);
                this.hideAllMenus();
            }
        });
    }
    
    hideAllMenus() {
        document.getElementById('signal-context-menu').style.display = 'none';
        document.getElementById('bit-cycle-context-menu').style.display = 'none';
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
            const clockSignal = this.signals.find(s => s.type === 'clock');
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
                    const clockSignal = this.signals.find(s => s.type === 'clock');
                    signal.base_clock = clockSignal ? clockSignal.name : 'clk';
                } else if (type === 'bus') {
                    signal.values[0] = 'X';
                    // Add base_clock for bus signals
                    const clockSignal = this.signals.find(s => s.type === 'clock');
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
        const x = event.point.x;
        const y = event.point.y;
        
        // Check if click is in signal name area
        if (x < this.config.nameColumnWidth) {
            const signalIndex = this.getSignalIndexAtY(y);
            if (signalIndex !== -1) {
                this.startDragSignal(signalIndex, event);
            }
            return;
        }
        
        // Check if click is in waveform area
        const cycle = Math.floor((x - this.config.nameColumnWidth) / this.config.cycleWidth);
        const signalIndex = this.getSignalIndexAtY(y);
        
        if (signalIndex !== -1 && cycle >= 0 && cycle < this.config.cycles) {
            const signal = this.signals[signalIndex];
            
            if (signal.type === 'bit') {
                this.toggleBitSignal(signalIndex, cycle);
            } else if (signal.type === 'bus') {
                TimingGenUI.showBusValueDialog(this, signalIndex, cycle);
            }
        }
    }
    
    handleCanvasRightClick(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.hideAllMenus();
        
        // Check if right-click is in signal name area
        if (x < this.config.nameColumnWidth) {
            const signalIndex = this.getSignalIndexAtY(y);
            if (signalIndex !== -1) {
                this.currentEditingSignal = signalIndex;
                TimingGenUI.showContextMenu('signal-context-menu', e.clientX, e.clientY);
            }
            return;
        }
        
        // Check if right-click is in waveform area
        const cycle = Math.floor((x - this.config.nameColumnWidth) / this.config.cycleWidth);
        const signalIndex = this.getSignalIndexAtY(y);
        
        if (signalIndex !== -1 && cycle >= 0 && cycle < this.config.cycles) {
            const signal = this.signals[signalIndex];
            
            if (signal.type === 'bit') {
                this.currentEditingSignal = signalIndex;
                this.currentEditingCycle = cycle;
                TimingGenUI.showBitCycleContextMenu(this, e.clientX, e.clientY);
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
    
    getBitValueAtCycle(signal, cycle) {
        // Find the last defined value before or at this cycle
        let value = 0; // default
        for (let c = 0; c <= cycle; c++) {
            if (signal.values[c] !== undefined) {
                value = signal.values[c];
            }
        }
        return value;
    }
    
    getBusValueAtCycle(signal, cycle) {
        // Find the last defined value before or at this cycle
        let value = 'X'; // default
        for (let c = 0; c <= cycle; c++) {
            if (signal.values[c] !== undefined) {
                value = signal.values[c];
            }
        }
        return value;
    }
    
    getSignalIndexAtY(y) {
        const relY = y - this.config.headerHeight;
        if (relY < 0) return -1;
        
        const index = Math.floor(relY / this.config.rowHeight);
        return (index >= 0 && index < this.signals.length) ? index : -1;
    }
    
    startDragSignal(signalIndex, event) {
        this.draggedSignal = signalIndex;
        
        const rect = this.canvas.getBoundingClientRect();
        
        const onMouseMove = (moveEvent) => {
            const y = moveEvent.clientY - rect.top;
            this.updateDragIndicator(y);
        };
        
        const onMouseUp = (upEvent) => {
            const y = upEvent.clientY - rect.top;
            this.dropSignal(y);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.draggedSignal = null;
            this.removeDragIndicator();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    updateDragIndicator(y) {
        const targetIndex = this.getSignalIndexAtY(y);
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
    
    dropSignal(y) {
        const targetIndex = this.getSignalIndexAtY(y);
        if (targetIndex !== -1 && targetIndex !== this.draggedSignal) {
            // Move signal
            const signal = this.signals.splice(this.draggedSignal, 1)[0];
            this.signals.splice(targetIndex, 0, signal);
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
