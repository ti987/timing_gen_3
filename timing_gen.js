// Timing Gen 3 - Interactive Digital Logic Waveform Editor
// Main JavaScript Application

class TimingGenApp {
    constructor() {
        this.canvas = document.getElementById('waveform-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration
        this.config = {
            cycles: 20,
            nameColumnWidth: 150,
            cycleWidth: 60,
            rowHeight: 80,
            headerHeight: 50,
            slew: 5, // pixels for slew transition
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
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.render();
    }
    
    initializeCanvas() {
        const width = this.config.nameColumnWidth + this.config.cycles * this.config.cycleWidth + 100;
        const height = this.config.headerHeight + 10 * this.config.rowHeight + 100;
        this.canvas.width = width;
        this.canvas.height = height;
    }
    
    setupEventListeners() {
        // Menu buttons
        document.getElementById('add-signal-btn').addEventListener('click', () => this.showAddSignalDialog());
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
        
        // Signal context menu
        document.getElementById('edit-signal-menu').addEventListener('click', () => this.showEditSignalDialog());
        document.getElementById('delete-signal-menu').addEventListener('click', () => this.deleteSignal());
        
        // Canvas events
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
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
            
            // If type changed, reset values
            if (oldType !== type) {
                signal.values = {};
                if (type === 'bit') {
                    signal.values[0] = 0;
                } else if (type === 'bus') {
                    signal.values[0] = 'X';
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
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if click is in signal name area
        if (x < this.config.nameColumnWidth) {
            const signalIndex = this.getSignalIndexAtY(y);
            if (signalIndex !== -1) {
                this.startDragSignal(signalIndex, e);
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
    
    startDragSignal(signalIndex, e) {
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw header with cycle numbers
        this.drawHeader();
        
        // Draw signals
        this.signals.forEach((signal, index) => {
            this.drawSignal(signal, index);
        });
    }
    
    drawGrid() {
        this.ctx.strokeStyle = this.config.gridColor;
        this.ctx.lineWidth = 1;
        
        // Vertical lines (cycle dividers)
        for (let i = 0; i <= this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines (signal dividers)
        for (let i = 0; i <= this.signals.length; i++) {
            const y = this.config.headerHeight + i * this.config.rowHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Name column divider
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.config.nameColumnWidth, 0);
        this.ctx.lineTo(this.config.nameColumnWidth, this.canvas.height);
        this.ctx.stroke();
    }
    
    drawHeader() {
        this.ctx.fillStyle = '#000';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        for (let i = 0; i < this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth + this.config.cycleWidth / 2;
            const y = 30;
            this.ctx.fillText(i.toString(), x, y);
        }
    }
    
    drawSignal(signal, index) {
        const y = this.config.headerHeight + index * this.config.rowHeight;
        
        // Draw signal name
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(signal.name, this.config.nameColumnWidth - 10, y + this.config.rowHeight / 2 + 5);
        
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
        this.ctx.strokeStyle = this.config.signalColor;
        this.ctx.lineWidth = 2;
        
        const highY = baseY + 20;
        const lowY = baseY + this.config.rowHeight - 20;
        const midY = baseY + this.config.rowHeight / 2;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < this.config.cycles; i++) {
            const x1 = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const x2 = x1 + this.config.cycleWidth / 2;
            const x3 = x1 + this.config.cycleWidth;
            
            // Rising edge at start of cycle
            this.ctx.moveTo(x1, lowY);
            this.ctx.lineTo(x1, highY);
            this.ctx.lineTo(x2, highY);
            
            // Falling edge at middle of cycle
            this.ctx.lineTo(x2, lowY);
            this.ctx.lineTo(x3, lowY);
        }
        
        this.ctx.stroke();
    }
    
    drawBitWaveform(signal, baseY) {
        this.ctx.strokeStyle = this.config.signalColor;
        this.ctx.lineWidth = 2;
        
        const highY = baseY + 20;
        const lowY = baseY + this.config.rowHeight - 20;
        const midY = baseY + this.config.rowHeight / 2;
        
        this.ctx.beginPath();
        
        let lastValue = this.getBitValueAtCycle(signal, 0);
        let lastY = (lastValue === 1) ? highY : (lastValue === 'Z') ? midY : lowY;
        
        for (let i = 0; i <= this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const value = (i < this.config.cycles) ? this.getBitValueAtCycle(signal, i) : lastValue;
            const currentY = (value === 1) ? highY : (value === 'Z') ? midY : lowY;
            
            if (i === 0) {
                this.ctx.moveTo(x, currentY);
            } else {
                // Check if value changed at this cycle
                if (signal.values[i] !== undefined && value !== lastValue) {
                    // Draw transition
                    if (lastValue === 'X' || value === 'X') {
                        // Draw X pattern
                        this.ctx.stroke();
                        this.drawXPattern(x - this.config.cycleWidth, x, baseY, highY, lowY);
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, currentY);
                    } else {
                        // Normal transition
                        this.ctx.lineTo(x, lastY);
                        this.ctx.lineTo(x, currentY);
                    }
                } else {
                    this.ctx.lineTo(x, currentY);
                }
            }
            
            lastValue = value;
            lastY = currentY;
        }
        
        this.ctx.stroke();
        
        // Draw X patterns for cycles with X value
        for (let i = 0; i < this.config.cycles; i++) {
            const value = this.getBitValueAtCycle(signal, i);
            if (value === 'X') {
                const x1 = this.config.nameColumnWidth + i * this.config.cycleWidth;
                const x2 = x1 + this.config.cycleWidth;
                this.drawXPattern(x1, x2, baseY, highY, lowY);
            }
        }
    }
    
    drawBusWaveform(signal, baseY) {
        this.ctx.lineWidth = 2;
        
        const topY = baseY + 20;
        const bottomY = baseY + this.config.rowHeight - 20;
        const slew = this.config.slew;
        
        for (let i = 0; i < this.config.cycles; i++) {
            const x1 = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const x2 = x1 + this.config.cycleWidth;
            
            const value = this.getBusValueAtCycle(signal, i);
            const nextValue = (i < this.config.cycles - 1) ? this.getBusValueAtCycle(signal, i + 1) : value;
            const valueChanged = (signal.values[i + 1] !== undefined);
            
            if (value === 'Z') {
                // High-Z state - draw middle line
                this.ctx.strokeStyle = this.config.signalColor;
                const midY = baseY + this.config.rowHeight / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x1, midY);
                this.ctx.lineTo(x2, midY);
                this.ctx.stroke();
            } else if (value === 'X') {
                // Unknown state - draw X pattern
                this.drawXPattern(x1, x2, baseY, topY, bottomY);
            } else {
                // Valid value - draw bus shape
                this.ctx.strokeStyle = this.config.signalColor;
                this.ctx.fillStyle = '#e8f4f8';
                
                this.ctx.beginPath();
                this.ctx.moveTo(x1 + slew, topY);
                
                if (valueChanged) {
                    // Transition at end
                    this.ctx.lineTo(x2 - slew, topY);
                    this.ctx.lineTo(x2, topY + (bottomY - topY) / 2);
                    this.ctx.lineTo(x2 - slew, bottomY);
                } else {
                    this.ctx.lineTo(x2, topY);
                    this.ctx.lineTo(x2, bottomY);
                }
                
                this.ctx.lineTo(x1 + slew, bottomY);
                this.ctx.lineTo(x1, bottomY + (topY - bottomY) / 2);
                this.ctx.closePath();
                
                this.ctx.fill();
                this.ctx.stroke();
                
                // Draw value text
                this.ctx.fillStyle = '#000';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value, (x1 + x2) / 2, baseY + this.config.rowHeight / 2 + 4);
            }
        }
    }
    
    drawXPattern(x1, x2, baseY, topY, bottomY) {
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        
        // Draw light gray background
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(x1, topY, x2 - x1, bottomY - topY);
        
        // Draw X pattern
        this.ctx.beginPath();
        this.ctx.moveTo(x1, topY);
        this.ctx.lineTo(x2, bottomY);
        this.ctx.moveTo(x1, bottomY);
        this.ctx.lineTo(x2, topY);
        this.ctx.stroke();
        
        this.ctx.lineWidth = 2;
    }
    
    saveToJSON() {
        const data = {
            version: '3.0',
            config: {
                cycles: this.config.cycles
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
                
                if (data.config && data.config.cycles) {
                    this.config.cycles = data.config.cycles;
                    document.getElementById('cycles-input').value = this.config.cycles;
                }
                
                if (data.signals) {
                    this.signals = data.signals;
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
        // Create SVG string from current canvas state
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvas.width}" height="${this.canvas.height}" viewBox="0 0 ${this.canvas.width} ${this.canvas.height}">
<rect width="100%" height="100%" fill="white"/>
`;
        
        // Draw header
        for (let i = 0; i < this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth + this.config.cycleWidth / 2;
            const y = 30;
            svg += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-size="12">${i}</text>\n`;
        }
        
        // Draw signals
        this.signals.forEach((signal, index) => {
            const y = this.config.headerHeight + index * this.config.rowHeight;
            
            // Signal name
            svg += `<text x="${this.config.nameColumnWidth - 10}" y="${y + this.config.rowHeight / 2 + 5}" text-anchor="end" font-family="Arial" font-size="14" font-weight="bold">${signal.name}</text>\n`;
            
            // Waveform
            if (signal.type === 'clock') {
                svg += this.getClockSVG(signal, y);
            } else if (signal.type === 'bit') {
                svg += this.getBitSVG(signal, y);
            } else if (signal.type === 'bus') {
                svg += this.getBusSVG(signal, y);
            }
        });
        
        svg += '</svg>';
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timing_diagram.svg';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    getClockSVG(signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + this.config.rowHeight - 20;
        let path = '';
        
        for (let i = 0; i < this.config.cycles; i++) {
            const x1 = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const x2 = x1 + this.config.cycleWidth / 2;
            const x3 = x1 + this.config.cycleWidth;
            
            if (i === 0) {
                path += `M ${x1} ${lowY} `;
            }
            path += `L ${x1} ${highY} L ${x2} ${highY} L ${x2} ${lowY} L ${x3} ${lowY} `;
        }
        
        return `<path d="${path}" stroke="black" stroke-width="2" fill="none"/>\n`;
    }
    
    getBitSVG(signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + this.config.rowHeight - 20;
        const midY = baseY + this.config.rowHeight / 2;
        let path = '';
        
        let lastValue = this.getBitValueAtCycle(signal, 0);
        let lastY = (lastValue === 1) ? highY : (lastValue === 'Z') ? midY : lowY;
        
        for (let i = 0; i <= this.config.cycles; i++) {
            const x = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const value = (i < this.config.cycles) ? this.getBitValueAtCycle(signal, i) : lastValue;
            const currentY = (value === 1) ? highY : (value === 'Z') ? midY : lowY;
            
            if (i === 0) {
                path += `M ${x} ${currentY} `;
            } else {
                if (signal.values[i] !== undefined && value !== lastValue) {
                    path += `L ${x} ${lastY} L ${x} ${currentY} `;
                } else {
                    path += `L ${x} ${currentY} `;
                }
            }
            
            lastValue = value;
            lastY = currentY;
        }
        
        return `<path d="${path}" stroke="black" stroke-width="2" fill="none"/>\n`;
    }
    
    getBusSVG(signal, baseY) {
        const topY = baseY + 20;
        const bottomY = baseY + this.config.rowHeight - 20;
        const slew = this.config.slew;
        let svg = '';
        
        for (let i = 0; i < this.config.cycles; i++) {
            const x1 = this.config.nameColumnWidth + i * this.config.cycleWidth;
            const x2 = x1 + this.config.cycleWidth;
            
            const value = this.getBusValueAtCycle(signal, i);
            const valueChanged = (signal.values[i + 1] !== undefined);
            
            if (value !== 'Z' && value !== 'X') {
                let path = `M ${x1 + slew} ${topY} `;
                
                if (valueChanged) {
                    path += `L ${x2 - slew} ${topY} L ${x2} ${topY + (bottomY - topY) / 2} L ${x2 - slew} ${bottomY} `;
                } else {
                    path += `L ${x2} ${topY} L ${x2} ${bottomY} `;
                }
                
                path += `L ${x1 + slew} ${bottomY} L ${x1} ${bottomY + (topY - bottomY) / 2} Z`;
                
                svg += `<path d="${path}" stroke="black" stroke-width="2" fill="#e8f4f8"/>\n`;
                svg += `<text x="${(x1 + x2) / 2}" y="${baseY + this.config.rowHeight / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="12">${value}</text>\n`;
            }
        }
        
        return svg;
    }
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new TimingGenApp();
});
