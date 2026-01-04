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
        document.getElementById('add-signal-btn').addEventListener('click', () => this.showAddSignalDialog());
        document.getElementById('global-option-btn').addEventListener('click', () => this.showGlobalOptionDialog());
        document.getElementById('save-btn').addEventListener('click', () => this.saveToJSON());
        document.getElementById('load-btn').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('export-svg-btn').addEventListener('click', () => this.exportToSVG());
        document.getElementById('file-input').addEventListener('change', (e) => this.loadFromJSON(e));
        document.getElementById('cycles-input').addEventListener('change', (e) => this.updateCycles(e.target.value));
        
        // Add signal dialog
        document.getElementById('dialog-ok-btn').addEventListener('click', () => this.addSignal());
        document.getElementById('dialog-cancel-btn').addEventListener('click', () => this.hideAddSignalDialog());
        
        // Edit signal dialog
        document.getElementById('edit-dialog-ok-btn').addEventListener('click', () => this.updateSignal());
        document.getElementById('edit-dialog-cancel-btn').addEventListener('click', () => this.hideEditSignalDialog());
        
        // Bus value dialog
        document.getElementById('bus-dialog-ok-btn').addEventListener('click', () => this.setBusValue());
        document.getElementById('bus-dialog-cancel-btn').addEventListener('click', () => this.hideBusValueDialog());
        
        // Global option dialog
        document.getElementById('global-option-ok-btn').addEventListener('click', () => this.saveGlobalOptions());
        document.getElementById('global-option-cancel-btn').addEventListener('click', () => this.hideGlobalOptionDialog());
        
        // Signal context menu
        document.getElementById('edit-signal-menu').addEventListener('click', () => this.showEditSignalDialog());
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
                this.hideAllDialogs();
                this.hideAllMenus();
            }
        });
    }
    
    showAddSignalDialog() {
        document.getElementById('add-signal-dialog').style.display = 'flex';
        document.getElementById('signal-name-input').value = '';
        document.getElementById('signal-name-input').focus();
    }
    
    hideAddSignalDialog() {
        document.getElementById('add-signal-dialog').style.display = 'none';
    }
    
    showEditSignalDialog() {
        this.hideAllMenus();
        if (this.currentEditingSignal !== null) {
            const signal = this.signals[this.currentEditingSignal];
            document.getElementById('edit-signal-name-input').value = signal.name;
            document.getElementById('edit-signal-type-select').value = signal.type;
            document.getElementById('edit-signal-dialog').style.display = 'flex';
            document.getElementById('edit-signal-name-input').focus();
        }
    }
    
    hideEditSignalDialog() {
        document.getElementById('edit-signal-dialog').style.display = 'none';
    }
    
    showBusValueDialog(signalIndex, cycle) {
        this.currentEditingSignal = signalIndex;
        this.currentEditingCycle = cycle;
        const signal = this.signals[signalIndex];
        const currentValue = signal.values[cycle];
        
        document.getElementById('bus-value-input').value = currentValue !== undefined ? currentValue : '';
        document.getElementById('bus-value-dialog').style.display = 'flex';
        document.getElementById('bus-value-input').focus();
    }
    
    hideBusValueDialog() {
        document.getElementById('bus-value-dialog').style.display = 'none';
        this.currentEditingSignal = null;
        this.currentEditingCycle = null;
    }
    
    hideAllDialogs() {
        this.hideAddSignalDialog();
        this.hideEditSignalDialog();
        this.hideBusValueDialog();
        this.hideGlobalOptionDialog();
    }
    
    hideAllMenus() {
        document.getElementById('signal-context-menu').style.display = 'none';
        document.getElementById('bit-cycle-context-menu').style.display = 'none';
    }
    
    showGlobalOptionDialog() {
        // Populate dialog with current values
        document.getElementById('clock-period-input').value = this.config.clockPeriod;
        document.getElementById('clock-period-unit-select').value = this.config.clockPeriodUnit;
        document.getElementById('slew-input').value = this.config.slew;
        document.getElementById('delay-input').value = this.config.delay;
        document.getElementById('delay-unit-select').value = this.config.delayUnit;
        
        document.getElementById('global-option-dialog').style.display = 'flex';
        document.getElementById('clock-period-input').focus();
    }
    
    hideGlobalOptionDialog() {
        document.getElementById('global-option-dialog').style.display = 'none';
    }
    
    saveGlobalOptions() {
        const clockPeriod = parseFloat(document.getElementById('clock-period-input').value);
        const clockPeriodUnit = document.getElementById('clock-period-unit-select').value;
        const slew = parseInt(document.getElementById('slew-input').value);
        const delay = parseFloat(document.getElementById('delay-input').value);
        const delayUnit = document.getElementById('delay-unit-select').value;
        
        if (isNaN(clockPeriod) || clockPeriod <= 0) {
            alert('Please enter a valid clock period');
            return;
        }
        
        if (isNaN(slew) || slew < 0) {
            alert('Please enter a valid slew value');
            return;
        }
        
        if (isNaN(delay) || delay < 0) {
            alert('Please enter a valid delay value');
            return;
        }
        
        this.config.clockPeriod = clockPeriod;
        this.config.clockPeriodUnit = clockPeriodUnit;
        this.config.slew = slew;
        this.config.delay = delay;
        this.config.delayUnit = delayUnit;
        
        this.hideGlobalOptionDialog();
        this.render();
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
        this.hideAddSignalDialog();
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
            
            this.hideEditSignalDialog();
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
            
            this.hideBusValueDialog();
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
                this.showBusValueDialog(signalIndex, cycle);
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
                this.showContextMenu('signal-context-menu', e.clientX, e.clientY);
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
                this.showBitCycleContextMenu(e.clientX, e.clientY);
            }
        }
    }
    
    showContextMenu(menuId, x, y) {
        const menu = document.getElementById(menuId);
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }
    
    showBitCycleContextMenu(x, y) {
        const menu = document.getElementById('bit-cycle-context-menu');
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Add click handlers for menu items
        const items = menu.querySelectorAll('.menu-item');
        items.forEach(item => {
            item.onclick = () => {
                const value = item.getAttribute('data-value');
                this.setBitValue(this.currentEditingSignal, this.currentEditingCycle, value);
                this.hideAllMenus();
            };
        });
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
        // Clear all layers
        this.backgroundLayer.removeChildren();
        this.gridLayer.removeChildren();
        this.signalLayer.removeChildren();
        
        // Activate background layer and draw
        this.backgroundLayer.activate();
        const background = new paper.Path.Rectangle({
            point: [0, 0],
            size: [paper.view.size.width, paper.view.size.height],
            fillColor: this.config.backgroundColor
        });
        
        // Draw grid
        this.gridLayer.activate();
        this.drawGrid();
        
        // Draw header with cycle numbers
        this.drawHeader();
        
        // Draw signals
        this.signalLayer.activate();
        this.signals.forEach((signal, index) => {
            this.drawSignal(signal, index);
        });
        
        paper.view.draw();
    }
    
    drawGrid() {
        const maxHeight = this.config.headerHeight + this.signals.length * this.config.rowHeight;
        
        // Vertical lines (cycle dividers) - draw to max height based on signals
        for (let i = 0; i <= this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const line = new paper.Path.Line({
                from: [x, 0],
                to: [x, maxHeight],
                strokeColor: this.config.gridColor,
                strokeWidth: 1
            });
        }
        
        // Horizontal lines (signal dividers)
        for (let i = 0; i <= this.signals.length; i++) {
            const y = this.config.headerHeight + i * this.config.rowHeight;
            const line = new paper.Path.Line({
                from: [0, y],
                to: [this.config.nameColumnWidth + this.config.cycles * this.config.cycleWidth, y],
                strokeColor: this.config.gridColor,
                strokeWidth: 1
            });
        }
        
        // Name column divider
        const divider = new paper.Path.Line({
            from: [this.config.nameColumnWidth, 0],
            to: [this.config.nameColumnWidth, maxHeight],
            strokeColor: '#999',
            strokeWidth: 2
        });
    }
    
    drawHeader() {
        for (let i = 0; i < this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth + this.config.cycleWidth / 2;
            const y = 30;
            
            const text = new paper.PointText({
                point: [x, y],
                content: i.toString(),
                fillColor: 'black',
                fontFamily: 'Arial',
                fontSize: 12,
                justification: 'center'
            });
        }
    }
    
    drawSignal(signal, index) {
        const y = this.config.headerHeight + index * this.config.rowHeight;
        
        // Draw signal name
        const nameText = new paper.PointText({
            point: [this.config.nameColumnWidth - 10, y + this.config.rowHeight / 2 + 5],
            content: signal.name,
            fillColor: 'black',
            fontFamily: 'Arial',
            fontSize: 14,
            fontWeight: 'bold',
            justification: 'right'
        });
        
        // Draw waveform
        if (signal.type === 'clock') {
            this.drawClockWaveform(signal, y);
        } else if (signal.type === 'bit') {
            this.drawBitWaveform(signal, y);
        } else if (signal.type === 'bus') {
            this.drawBusWaveform(signal, y);
        }
    }
    
    drawClockWaveform(signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + this.config.rowHeight - 20;
        
        const path = new paper.Path();
        path.strokeColor = this.config.signalColor;
        path.strokeWidth = 2;
        
        for (let i = 0; i < this.config.cycles; i++) {
            const x1 = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const x2 = x1 + this.config.cycleWidth / 2;
            const x3 = x1 + this.config.cycleWidth;
            
            // Rising edge at start of cycle
            if (i === 0) {
                path.moveTo(new paper.Point(x1, lowY));
            }
            path.lineTo(new paper.Point(x1, highY));
            path.lineTo(new paper.Point(x2, highY));
            
            // Falling edge at middle of cycle
            path.lineTo(new paper.Point(x2, lowY));
            path.lineTo(new paper.Point(x3, lowY));
        }
    }
    
    drawBitWaveform(signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + this.config.rowHeight - 20;
        const midY = baseY + this.config.rowHeight / 2;
        
        // First, identify all X spans
        const xSpans = [];
        let i = 0;
        while (i < this.config.cycles) {
            const value = this.getBitValueAtCycle(signal, i);
            if (value === 'X') {
                const spanStart = i;
                let spanEnd = i;
                // Find the end of this X span
                for (let j = i + 1; j < this.config.cycles; j++) {
                    const nextValue = this.getBitValueAtCycle(signal, j);
                    if (nextValue !== 'X') {
                        spanEnd = j - 1;
                        break;
                    }
                    if (j === this.config.cycles - 1) {
                        spanEnd = j;
                    }
                }
                xSpans.push({ start: spanStart, end: spanEnd });
                i = spanEnd + 1;
            } else {
                i++;
            }
        }
        
        // Draw the line path, skipping X regions
        const path = new paper.Path();
        path.strokeColor = this.config.signalColor;
        path.strokeWidth = 2;
        
        let pathStarted = false;
        
        for (let i = 0; i <= this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth;
            
            // Check if this cycle is in an X span
            const inXSpan = xSpans.some(span => i >= span.start && i <= span.end);
            
            //if (inXSpan) {
            //    // We're in an X region, skip drawing but note we need to restart path after
            //    pathStarted = false;
            //    continue;
            //}
            
            const value = (i < this.config.cycles) ? this.getBitValueAtCycle(signal, i) : this.getBitValueAtCycle(signal, this.config.cycles - 1);
            const currentY = (value === 1) ? highY : (value === 'Z') ? midY : lowY;
            
            if (!pathStarted) {
                // Start or restart the path
                path.moveTo(new paper.Point(x, currentY));
                pathStarted = true;
            } else {
                // Continue the path
                const prevCycle = i - 1;
                // Skip back over any X spans to find the last non-X cycle
                let lastNonXCycle = prevCycle;
                while (lastNonXCycle >= 0 && xSpans.some(span => lastNonXCycle >= span.start && lastNonXCycle <= span.end)) {
                    lastNonXCycle--;
                }
                
                if (lastNonXCycle >= 0) {
                    const prevValue = this.getBitValueAtCycle(signal, lastNonXCycle);
                    const prevY = (prevValue === 1) ? highY : (prevValue === 'Z') ? midY : lowY;
                    
                    // Check if value actually changed
                    if (value !== prevValue) {
                        // Draw transition
                        path.lineTo(new paper.Point(x, prevY));
                        path.lineTo(new paper.Point(x, currentY));
                    } else {
                        // Same value, just continue
                        path.lineTo(new paper.Point(x, currentY));
                    }
                } else {
                    // No previous non-X cycle, just draw to current
                    path.lineTo(new paper.Point(x, currentY));
                }
            }
        }
        
        // Draw X patterns as continuous spans
        xSpans.forEach(span => {
            const x1 = this.config.nameColumnWidth + span.start * this.config.cycleWidth;
            const x2 = this.config.nameColumnWidth + (span.end + 1) * this.config.cycleWidth;
            this.drawXPattern(x1, x2, baseY, highY, lowY);
        });
    }
    
    drawBusWaveform(signal, baseY) {
        const topY = baseY + 20;
        const bottomY = baseY + this.config.rowHeight - 20;
        const slew = this.config.slew;
        
        // First pass: identify value spans
        let i = 0;
        while (i < this.config.cycles) {
            const value = this.getBusValueAtCycle(signal, i);
            
            // Find where this value span starts and ends
            let spanStart = i;
            let spanEnd = i;
            
            // Find the end of this value span
            for (let j = i + 1; j < this.config.cycles; j++) {
                if (signal.values[j] !== undefined) {
                    spanEnd = j - 1;
                    break;
                }
                if (j === this.config.cycles - 1) {
                    spanEnd = j;
                }
            }
            
            if (spanEnd === i && i < this.config.cycles - 1 && signal.values[i + 1] === undefined) {
                spanEnd = this.config.cycles - 1;
            }
            
            const x1 = this.config.nameColumnWidth + spanStart * this.config.cycleWidth;
            const x2 = this.config.nameColumnWidth + (spanEnd + 1) * this.config.cycleWidth;
            
            if (value === 'Z') {
                // High-Z state - draw middle line
                const midY = baseY + this.config.rowHeight / 2;
                const line = new paper.Path.Line({
                    from: [x1, midY],
                    to: [x2, midY],
                    strokeColor: this.config.signalColor,
                    strokeWidth: 2
                });
            } else if (value === 'X') {
                // Unknown state - draw X pattern for the entire span
                this.drawXPattern(x1, x2, baseY, topY, bottomY);
            } else {
                // Valid value - draw bus shape for the entire span
                const path = new paper.Path();
                path.strokeColor = this.config.signalColor;
                path.strokeWidth = 2;
                path.fillColor = '#e8f4f8';
                
                // Check if there's a transition at the end
                const hasNextValue = (spanEnd + 1 < this.config.cycles && signal.values[spanEnd + 1] !== undefined);
                
                path.moveTo(new paper.Point(x1 + slew, topY));
                
                if (hasNextValue) {
                    // Transition at end
                    path.lineTo(new paper.Point(x2 - slew, topY));
                    path.lineTo(new paper.Point(x2, topY + (bottomY - topY) / 2));
                    path.lineTo(new paper.Point(x2 - slew, bottomY));
                } else {
                    path.lineTo(new paper.Point(x2, topY));
                    path.lineTo(new paper.Point(x2, bottomY));
                }
                
                path.lineTo(new paper.Point(x1 + slew, bottomY));
                path.lineTo(new paper.Point(x1, bottomY + (topY - bottomY) / 2));
                path.closePath();
                
                // Draw value text in the middle of the span
                const textX = (x1 + x2) / 2;
                const text = new paper.PointText({
                    point: [textX, baseY + this.config.rowHeight / 2 + 4],
                    content: value,
                    fillColor: 'black',
                    fontFamily: 'Arial',
                    fontSize: 12,
                    justification: 'center'
                });
            }
            
            // Move to next span
            i = spanEnd + 1;
        }
    }
    
    drawXPattern(x1, x2, baseY, topY, bottomY) {
        // Draw darker solid gray rectangle bounded by high and low state lines
        const rect = new paper.Path.Rectangle({
            point: [x1, topY],
            size: [x2 - x1, bottomY - topY],
            fillColor: '#999999',
            strokeColor: this.config.signalColor,
            strokeWidth: 2
        });
    }
    
    saveToJSON() {
        const data = {
            version: '3.0.1',
            config: {
                cycles: this.config.cycles,
                clockPeriod: this.config.clockPeriod,
                clockPeriodUnit: this.config.clockPeriodUnit,
                slew: this.config.slew,
                delay: this.config.delay,
                delayUnit: this.config.delayUnit
            },
            signals: this.signals
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
    
    loadFromJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data.config) {
                    if (data.config.cycles) {
                        this.config.cycles = data.config.cycles;
                        document.getElementById('cycles-input').value = this.config.cycles;
                    }
                    // Load global options if available
                    if (data.config.clockPeriod !== undefined) {
                        this.config.clockPeriod = data.config.clockPeriod;
                    }
                    if (data.config.clockPeriodUnit !== undefined) {
                        this.config.clockPeriodUnit = data.config.clockPeriodUnit;
                    }
                    if (data.config.slew !== undefined) {
                        this.config.slew = data.config.slew;
                    }
                    if (data.config.delay !== undefined) {
                        this.config.delay = data.config.delay;
                    }
                    if (data.config.delayUnit !== undefined) {
                        this.config.delayUnit = data.config.delayUnit;
                    }
                }
                
                if (data.signals) {
                    this.signals = data.signals;
                    // Ensure all bit and bus signals have base_clock
                    this.signals.forEach(signal => {
                        if ((signal.type === 'bit' || signal.type === 'bus') && !signal.base_clock) {
                            const clockSignal = this.signals.find(s => s.type === 'clock');
                            signal.base_clock = clockSignal ? clockSignal.name : 'clk';
                        }
                    });
                }
                
                this.initializeCanvas();
                this.render();
            } catch (err) {
                alert('Error loading file: ' + err.message);
            }
        };
        
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    }
    
    exportToSVG() {
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

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const app = new TimingGenApp();
    // Store reference for debugging/testing
    window.timingGenApp = app;
    document.getElementById('waveform-canvas').__timingGenApp = app;
});
