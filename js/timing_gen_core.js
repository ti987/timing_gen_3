// Timing Gen 3 - Interactive Digital Logic Waveform Editor
// Version 3.3.1
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
//
// IMPORTANT DESIGN RULE:
// Measure data format: Measure points are defined by signal NAMES, not row numbers.
// This ensures measures remain valid when signals are reordered or rows are rearranged.
// Row indices (signal1Row, signal2Row, measureRow) are maintained for the unified row
// system but signal names (signal1Name, signal2Name) are the primary identifiers.

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
        
        // Data model v3.3.0 - Extended with text and counter widgets
        // rows: defines order only - Array of {type: 'signal'|'measure'|'text'|'counter', name: string}
        // signalsData: Map<name, signalObject> - actual signal data
        // measuresData: Map<name, measureObject> - actual measure data
        // textData: Map<name, textObject> - actual text data
        // counterData: Map<name, counterObject> - actual counter data
        this.rows = [];
        this.signalsData = new Map();  // Key: signal name, Value: signal object
        this.measuresData = new Map(); // Key: measure name (auto-generated), Value: measure object
        this.textData = new Map();     // Key: text name (auto-generated), Value: text object
        this.counterData = new Map();  // Key: counter name (auto-generated), Value: counter object
        
        // Counter for auto-generating unique measure names
        this.measureCounter = 0;
        this.textCounter = 0;
        this.counterCounter = 0;
        
        // Row manager for unified row system
        this.rowManager = new RowManager(this);
        
        this.currentEditingSignal = null;
        this.currentEditingCycle = null;
        this.currentEditingText = null; // Current text row being edited
        this.currentEditingCounter = null; // Current counter row being edited {name, cycle}
        this.textDragState = null; // For tracking text dragging {textName, startX}
        
        // Measure mode state
        this.measureMode = false;
        this.measureState = null; // null, 'first-point', 'second-point', 'placing-text', 'rechoose-point-1', 'rechoose-point-2'
        this.currentMeasure = null; // Current measure being created
        this.currentEditingMeasure = null; // Index of measure being edited
        this.tempMeasureGraphics = null; // Temporary graphics for measure creation
        this.isDraggingMeasureText = false; // For dragging measure text
        this.dragStartX = null; // Starting X position for text drag
        this.originalTextX = null; // Original text X position
        this.rechoosingPointIndex = null; // Which point is being rechosen (1 or 2)
        this.isMovingMeasureRow = false; // Flag for moving measure to another row
        this.movingMeasureRowIndex = null; // Row index of measure being moved
        this.isMeasureTextContext = false; // Flag for measure text context menu
        
        // Insert/Delete cycle mode tracking
        this.insertCycleMode = null; // 'global' or 'signal'
        this.deleteCycleMode = null; // 'global' or 'signal'
        
        // Drag and drop state
        this.draggedSignal = null;
        this.draggedMeasureRow = null;
        this.dragIndicator = null;
        
        // Selection state
        this.selectedSignals = new Set(); // Set of signal indices
        this.selectedMeasureRows = new Set(); // Set of measure row indices
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
            // Close other submenus
            document.getElementById('help-submenu').style.display = 'none';
        });
        document.getElementById('add-measure-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.startMeasureMode();
        });
        document.getElementById('add-text-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.showAddTextDialog();
        });
        document.getElementById('add-counter-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.showAddCounterDialog();
        });
        
        // Help menu and submenu
        document.getElementById('help-menu-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const submenu = document.getElementById('help-submenu');
            submenu.style.display = submenu.style.display === 'none' ? 'block' : 'none';
            // Close other submenus
            document.getElementById('add-submenu').style.display = 'none';
        });
        document.getElementById('about-menu').addEventListener('click', () => {
            document.getElementById('help-submenu').style.display = 'none';
            this.showAboutDialog();
        });
        
        // Close submenus when clicking outside
        document.addEventListener('click', (e) => {
            const addSubmenu = document.getElementById('add-submenu');
            const addBtn = document.getElementById('add-menu-btn');
            const helpSubmenu = document.getElementById('help-submenu');
            const helpBtn = document.getElementById('help-menu-btn');
            
            if (!addBtn.contains(e.target) && !addSubmenu.contains(e.target)) {
                addSubmenu.style.display = 'none';
            }
            if (!helpBtn.contains(e.target) && !helpSubmenu.contains(e.target)) {
                helpSubmenu.style.display = 'none';
            }
        });
        
        // About dialog
        document.getElementById('about-ok-btn').addEventListener('click', () => this.hideAboutDialog());
        
        // Measure text dialog
        document.getElementById('measure-text-ok-btn').addEventListener('click', () => this.finalizeMeasure());
        document.getElementById('measure-text-cancel-btn').addEventListener('click', () => this.cancelMeasure());
        
        // Text row dialog
        document.getElementById('text-dialog-ok-btn').addEventListener('click', () => this.addTextRow());
        document.getElementById('text-dialog-cancel-btn').addEventListener('click', () => this.hideAddTextDialog());
        
        // Edit text dialog
        document.getElementById('edit-text-ok-btn').addEventListener('click', () => this.updateTextRow());
        document.getElementById('edit-text-cancel-btn').addEventListener('click', () => this.hideEditTextDialog());
        
        // Font dialog
        document.getElementById('font-ok-btn').addEventListener('click', () => this.updateTextFont());
        document.getElementById('font-cancel-btn').addEventListener('click', () => this.hideFontDialog());
        
        // Color dialog
        document.getElementById('color-ok-btn').addEventListener('click', () => this.updateTextColor());
        document.getElementById('color-cancel-btn').addEventListener('click', () => this.hideColorDialog());
        
        // Counter row dialog
        document.getElementById('counter-dialog-ok-btn').addEventListener('click', () => this.addCounterRow());
        document.getElementById('counter-dialog-cancel-btn').addEventListener('click', () => this.hideAddCounterDialog());
        
        // Edit counter dialog
        document.getElementById('edit-counter-ok-btn').addEventListener('click', () => this.updateCounterValue());
        document.getElementById('edit-counter-cancel-btn').addEventListener('click', () => this.hideEditCounterDialog());
        
        // Measure context menu
        document.getElementById('delete-measure-menu').addEventListener('click', () => this.deleteMeasure());
        document.getElementById('cancel-measure-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Text context menu
        document.getElementById('edit-text-menu').addEventListener('click', () => this.showEditTextDialog());
        document.getElementById('font-text-menu').addEventListener('click', () => this.showFontDialog());
        document.getElementById('color-text-menu').addEventListener('click', () => this.showColorDialog());
        document.getElementById('cancel-text-menu').addEventListener('click', () => this.hideAllMenus());
        
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
        this.tool.onMouseDrag = (event) => this.handleCanvasMouseDrag(event);
        this.tool.onMouseUp = (event) => this.handleCanvasMouseUp(event);
        
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
                // Cancel measure mode if active
                if (this.measureMode) {
                    this.cancelMeasure();
                }
            }
        });
    }
    
    // ========================================
    // Data Access Helpers (v3.2.0)
    // ========================================
    
    /**
     * Get all signals in row order
     * @returns {Array} Array of signal objects
     */
    getSignals() {
        return this.rows
            .filter(row => row.type === 'signal')
            .map(row => this.signalsData.get(row.name))
            .filter(signal => signal !== undefined);
    }
    
    /**
     * Get all measures in row order
     * @returns {Array} Array of measure objects  
     */
    getMeasures() {
        return this.rows
            .filter(row => row.type === 'measure')
            .map(row => this.measuresData.get(row.name))
            .filter(measure => measure !== undefined);
    }
    
    /**
     * Get signal by name
     * @param {string} name Signal name
     * @returns {Object|undefined} Signal object or undefined
     */
    getSignalByName(name) {
        return this.signalsData.get(name);
    }
    
    /**
     * Get measure by name
     * @param {string} name Measure name
     * @returns {Object|undefined} Measure object or undefined
     */
    getMeasureByName(name) {
        return this.measuresData.get(name);
    }
    
    /**
     * Find signal index in row order
     * @param {string} name Signal name
     * @returns {number} Index in signals list or -1
     */
    getSignalIndex(name) {
        const signals = this.getSignals();
        return signals.findIndex(s => s.name === name);
    }
    
    /**
     * Get signal by index in row order
     * @param {number} index Signal index in row order
     * @returns {Object|undefined} Signal object or undefined
     */
    getSignalByIndex(index) {
        const signals = this.getSignals();
        return signals[index];
    }
    
    /**
     * Get measure by index in row order
     * @param {number} index Measure index in row order
     * @returns {Object|undefined} Measure object or undefined
     */
    getMeasureByIndex(index) {
        const measures = this.getMeasures();
        return measures[index];
    }
    
    hideAllMenus() {
        document.getElementById('signal-context-menu').style.display = 'none';
        document.getElementById('bit-cycle-context-menu').style.display = 'none';
        document.getElementById('bus-cycle-context-menu').style.display = 'none';
        document.getElementById('cycle-context-menu').style.display = 'none';
        document.getElementById('measure-context-menu').style.display = 'none';
        document.getElementById('text-context-menu').style.display = 'none';
        
        // Reset measure text context flag
        this.isMeasureTextContext = false;
    }
    
    showAboutDialog() {
        document.getElementById('about-dialog').style.display = 'flex';
    }
    
    hideAboutDialog() {
        document.getElementById('about-dialog').style.display = 'none';
    }
    
    showAddTextDialog() {
        document.getElementById('text-row-input').value = '';
        document.getElementById('add-text-dialog').style.display = 'flex';
    }
    
    hideAddTextDialog() {
        document.getElementById('add-text-dialog').style.display = 'none';
    }
    
    showEditTextDialog() {
        if (this.isMeasureTextContext) {
            // Handle measure text editing
            const measures = this.getMeasures();
            if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
                const measure = measures[this.currentEditingMeasure];
                document.getElementById('edit-text-input').value = measure.text || '';
                document.getElementById('edit-text-dialog').style.display = 'flex';
            }
        } else if (this.currentEditingText) {
            const textData = this.textData.get(this.currentEditingText);
            if (textData) {
                document.getElementById('edit-text-input').value = textData.text || '';
                document.getElementById('edit-text-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    hideEditTextDialog() {
        document.getElementById('edit-text-dialog').style.display = 'none';
    }
    
    showFontDialog() {
        if (this.isMeasureTextContext) {
            // Handle measure text font
            const measures = this.getMeasures();
            if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
                const measure = measures[this.currentEditingMeasure];
                document.getElementById('font-family-select').value = measure.textFont || 'Arial';
                document.getElementById('font-size-input').value = measure.textSize || 12;
                document.getElementById('font-dialog').style.display = 'flex';
            }
        } else if (this.currentEditingText) {
            const textData = this.textData.get(this.currentEditingText);
            if (textData) {
                document.getElementById('font-family-select').value = textData.fontFamily || 'Arial';
                document.getElementById('font-size-input').value = textData.fontSize || 14;
                document.getElementById('font-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    hideFontDialog() {
        document.getElementById('font-dialog').style.display = 'none';
    }
    
    showColorDialog() {
        if (this.isMeasureTextContext) {
            // Handle measure text color
            const measures = this.getMeasures();
            if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
                const measure = measures[this.currentEditingMeasure];
                document.getElementById('text-color-input').value = measure.textColor || '#FF0000';
                document.getElementById('color-dialog').style.display = 'flex';
            }
        } else if (this.currentEditingText) {
            const textData = this.textData.get(this.currentEditingText);
            if (textData) {
                document.getElementById('text-color-input').value = textData.color || '#000000';
                document.getElementById('color-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    hideColorDialog() {
        document.getElementById('color-dialog').style.display = 'none';
    }
    
    updateTextRow() {
        if (this.isMeasureTextContext) {
            // Update measure text
            const measures = this.getMeasures();
            if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
                const measure = measures[this.currentEditingMeasure];
                measure.text = document.getElementById('edit-text-input').value;
                this.hideEditTextDialog();
                this.isMeasureTextContext = false;
                this.render();
            }
        } else if (this.currentEditingText) {
            const textData = this.textData.get(this.currentEditingText);
            if (textData) {
                textData.text = document.getElementById('edit-text-input').value;
                this.hideEditTextDialog();
                this.render();
            }
        }
    }
    
    updateTextFont() {
        if (this.isMeasureTextContext) {
            // Update measure text font
            const measures = this.getMeasures();
            if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
                const measure = measures[this.currentEditingMeasure];
                measure.textFont = document.getElementById('font-family-select').value;
                const fontSize = parseInt(document.getElementById('font-size-input').value);
                if (!isNaN(fontSize) && fontSize >= 8 && fontSize <= 72) {
                    measure.textSize = fontSize;
                } else {
                    measure.textSize = 12; // Default fallback
                }
                this.hideFontDialog();
                this.isMeasureTextContext = false;
                this.render();
            }
        } else if (this.currentEditingText) {
            const textData = this.textData.get(this.currentEditingText);
            if (textData) {
                textData.fontFamily = document.getElementById('font-family-select').value;
                const fontSize = parseInt(document.getElementById('font-size-input').value);
                // Validate fontSize is a valid number within range
                if (!isNaN(fontSize) && fontSize >= 8 && fontSize <= 72) {
                    textData.fontSize = fontSize;
                } else {
                    textData.fontSize = 14; // Default fallback
                }
                this.hideFontDialog();
                this.render();
            }
        }
    }
    
    updateTextColor() {
        if (this.isMeasureTextContext) {
            // Update measure text color
            const measures = this.getMeasures();
            if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
                const measure = measures[this.currentEditingMeasure];
                measure.textColor = document.getElementById('text-color-input').value;
                this.hideColorDialog();
                this.isMeasureTextContext = false;
                this.render();
            }
        } else if (this.currentEditingText) {
            const textData = this.textData.get(this.currentEditingText);
            if (textData) {
                textData.color = document.getElementById('text-color-input').value;
                this.hideColorDialog();
                this.render();
            }
        }
    }
    
    showAddCounterDialog() {
        document.getElementById('counter-start-value-input').value = '1';
        document.getElementById('counter-start-cycle-input').value = '0';
        document.getElementById('add-counter-dialog').style.display = 'flex';
    }
    
    hideAddCounterDialog() {
        document.getElementById('add-counter-dialog').style.display = 'none';
    }
    
    showEditCounterDialog(counterName, cycle) {
        this.currentEditingCounter = { name: counterName, cycle: cycle };
        document.getElementById('edit-counter-value-input').value = '';
        document.getElementById('edit-counter-dialog').style.display = 'flex';
    }
    
    hideEditCounterDialog() {
        document.getElementById('edit-counter-dialog').style.display = 'none';
        this.currentEditingCounter = null;
    }
    
    updateCounterValue() {
        if (this.currentEditingCounter) {
            const counterData = this.counterData.get(this.currentEditingCounter.name);
            if (counterData) {
                const newValue = document.getElementById('edit-counter-value-input').value.trim();
                const cycle = this.currentEditingCounter.cycle;
                
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
                
                this.hideEditCounterDialog();
                this.render();
            }
        }
    }
    
    addTextRow() {
        const text = document.getElementById('text-row-input').value;
        
        // Generate unique name
        const name = `T${this.textCounter}`;
        this.textCounter++;
        
        // Create text data object with default properties
        const textData = {
            text: text,
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#000000',
            xOffset: 10  // Default x offset from left edge of waveform area
        };
        
        // Add to data store
        this.textData.set(name, textData);
        
        // Add to rows array at the top (row 0) for better visibility
        this.rows.unshift({
            type: 'text',
            name: name
        });
        
        this.hideAddTextDialog();
        this.render();
    }
    
    addCounterRow() {
        const startValue = document.getElementById('counter-start-value-input').value.trim();
        const startCycle = parseInt(document.getElementById('counter-start-cycle-input').value);
        
        if (startValue === '') {
            alert('Please enter a start value');
            return;
        }
        
        // Generate unique name
        const name = `C${this.counterCounter}`;
        this.counterCounter++;
        
        // Create counter data object
        // Format: [{cycle: N, value: "label"}]
        const counterData = {
            values: [{
                cycle: startCycle,
                value: startValue
            }]
        };
        
        // Add to data store
        this.counterData.set(name, counterData);
        
        // Add to rows array at the top (row 0) for better visibility
        this.rows.unshift({
            type: 'counter',
            name: name
        });
        
        this.hideAddCounterDialog();
        this.render();
    }
    
    addSignal() {
        const name = document.getElementById('signal-name-input').value.trim();
        const type = document.getElementById('signal-type-select').value;
        
        if (!name) {
            alert('Please enter a signal name');
            return;
        }
        
        // Check if signal name already exists
        if (this.signalsData.has(name)) {
            alert(`Signal "${name}" already exists`);
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
            const signals = this.getSignals();
            const clockSignal = signals.find(sg => sg.type === 'clock');
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
        
        // Add to data store
        this.signalsData.set(name, signal);
        
        // Add to rows array
        this.rows.push({
            type: 'signal',
            name: name
        });
        
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
            
            const signal = this.getSignalByIndex(this.currentEditingSignal);
            const oldType = signal.type;
            signal.name = name;
            signal.type = type;
            
            // If type changed, reset values and update base_clock
            if (oldType !== type) {
                signal.values = {};
                if (type === 'bit') {
                    signal.values[0] = 0;
                    // Add base_clock for bit signals
                    const clockSignal = this.getSignals().find(sg => sg.type === 'clock');
                    signal.base_clock = clockSignal ? clockSignal.name : 'clk';
                } else if (type === 'bus') {
                    signal.values[0] = 'X';
                    // Add base_clock for bus signals
                    const clockSignal = this.getSignals().find(sg => sg.type === 'clock');
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
            const signal = this.getSignalByIndex(this.currentEditingSignal);
            if (signal && confirm(`Delete signal "${signal.name}"?`)) {
                // Delete from Maps
                this.signalsData.delete(signal.name);
                
                // Delete from rows array
                const rowIndex = this.rows.findIndex(row => row.type === 'signal' && row.name === signal.name);
                if (rowIndex >= 0) {
                    this.rows.splice(rowIndex, 1);
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
            
            const signal = this.getSignalByIndex(this.currentEditingSignal);
            
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
                    // DESIGN RULE: Store signal NAME as primary identifier
                    // Signal names ensure measures remain valid when signals are reordered
                    const signal = this.getSignalByIndex(transition.signalIndex);
                    this.currentMeasure.signal1Name = signal.name;  // Primary identifier
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
                    // DESIGN RULE: Store signal NAME as primary identifier
                    // Signal names ensure measures remain valid when signals are reordered
                    const signal = this.getSignalByIndex(transition.signalIndex);
                    this.currentMeasure.signal2Name = signal.name;  // Primary identifier
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
                // Third click: finalize row and create measure with proper placement
                // Calculate placement Y and determine insertion index
                const placementY = this.getMeasurePlacementY(yPos);
                
                // Calculate row index for insertion based on placement Y
                // If placementY is at a row boundary, we need to determine which index to use
                const relativeY = placementY - this.config.headerHeight;
                let insertIndex = Math.round(relativeY / this.config.rowHeight);
                
                // Clamp to valid range
                const totalRows = this.rowManager.getTotalRows();
                insertIndex = Math.max(0, Math.min(insertIndex, totalRows));
                
                this.currentMeasure.measureRow = insertIndex;
                
                // Finalize measure with actual blank row insertion
                this.finalizeMeasureWithBlankRow();
                return;
            } else if (this.measureState === 'rechoose-point-1') {
                // Re-choosing first point
                const transition = this.findNearestTransition(xPos, yPos);
                
                if (transition) {
                    const measures = this.getMeasures();
                    const measure = measures[this.currentEditingMeasure];
                    const signal = this.getSignalByIndex(transition.signalIndex);
                    measure.signal1Name = signal.name;
                    measure.cycle1 = transition.cycle;
                    
                    // Exit re-choose mode
                    this.measureMode = false;
                    this.measureState = null;
                    this.rechoosingPointIndex = null;
                    this.canvas.style.cursor = 'default';
                    this.hideInstruction();
                    this.render();
                }
                return;
            } else if (this.measureState === 'rechoose-point-2') {
                // Re-choosing second point
                const transition = this.findNearestTransition(xPos, yPos);
                
                if (transition) {
                    const measures = this.getMeasures();
                    const measure = measures[this.currentEditingMeasure];
                    const signal = this.getSignalByIndex(transition.signalIndex);
                    measure.signal2Name = signal.name;
                    measure.cycle2 = transition.cycle;
                    
                    // Exit re-choose mode
                    this.measureMode = false;
                    this.measureState = null;
                    this.rechoosingPointIndex = null;
                    this.canvas.style.cursor = 'default';
                    this.hideInstruction();
                    this.render();
                }
                return;
            }
        }
        
        // Handle moving measure to another row
        if (this.isMovingMeasureRow) {
            const row = this.getRowAtY(yPos);
            if (row) {
                const measures = this.getMeasures();
                const measure = measures[this.currentEditingMeasure];
                const measureName = measure.name;
                
                // Remove from old position
                const oldRowIndex = this.rows.findIndex(r => r.type === 'measure' && r.name === measureName);
                if (oldRowIndex >= 0) {
                    this.rows.splice(oldRowIndex, 1);
                }
                
                // Calculate new insertion index
                let newRowIndex = row.index;
                if (oldRowIndex < newRowIndex) {
                    newRowIndex--; // Adjust for removal
                }
                
                // Insert at new position
                this.rows.splice(newRowIndex, 0, {
                    type: 'measure',
                    name: measureName
                });
                
                // Update measure row reference
                measure.measureRow = newRowIndex;
                
                // Exit moving mode
                this.isMovingMeasureRow = false;
                this.movingMeasureRowIndex = null;
                this.canvas.style.cursor = 'default';
                this.hideInstruction();
                this.render();
            }
            return;
        }
        
        // Check if click is in name area
        if (xPos < this.config.nameColumnWidth) {
            // Try to get row at this Y position
            const row = this.getRowAtY(yPos);
            
            if (row && row.type === 'signal') {
                // Handle signal selection
                const signalIndex = this.rowManager.rowIndexToSignalIndex(row.index);
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
                            this.selectedMeasureRows.clear();
                            this.selectedSignals.add(signalIndex);
                            this.render();
                        }
                        this.startDragSignal(signalIndex, event);
                    }
                }
            } else if (row && row.type === 'measure') {
                // Handle measure row selection
                if (!this.selectedMeasureRows.has(row.index)) {
                    // If not already selected, make it the only selection
                    this.selectedSignals.clear();
                    this.selectedMeasureRows.clear();
                    this.selectedMeasureRows.add(row.index);
                    this.render();
                }
                this.startDragMeasureRow(row.index, event);
            } else if (row && (row.type === 'text' || row.type === 'counter')) {
                // Handle text/counter row selection - reuse measure selection logic
                // Text and counter rows use selectedMeasureRows for dragging (non-signal widgets)
                if (!this.selectedMeasureRows.has(row.index)) {
                    this.selectedSignals.clear();
                    this.selectedMeasureRows.clear();
                    this.selectedMeasureRows.add(row.index);
                    this.render();
                }
                this.startDragMeasureRow(row.index, event);
            }
            return;
        }
        
        // Check if click is in waveform area
        // First check for text rows to enable dragging
        if (xPos >= this.config.nameColumnWidth) {
            const clickedRow = this.getRowAtY(yPos);
            
            if (clickedRow && clickedRow.type === 'text') {
                // Start text drag mode
                const textData = this.textData.get(clickedRow.name);
                if (textData && textData.text) {
                    this.textDragState = {
                        textName: clickedRow.name,
                        startX: xPos,
                        originalOffset: textData.xOffset || 10
                    };
                    this.canvas.style.cursor = 'move';
                    return;
                }
            } else if (clickedRow && clickedRow.type === 'counter') {
                // Left-click on counter to edit value at this cycle
                const cycle = Math.floor((xPos - this.config.nameColumnWidth) / this.config.cycleWidth);
                if (cycle >= 0 && cycle < this.config.cycles) {
                    this.showEditCounterDialog(clickedRow.name, cycle);
                    return;
                }
            }
        }
        
        // Check signal interaction - clear selection if clicking waveform
        const cycle = Math.floor((xPos - this.config.nameColumnWidth) / this.config.cycleWidth);
        const signalIndex = this.getSignalIndexAtY(yPos);
        
        if (signalIndex !== -1 && cycle >= 0 && cycle < this.config.cycles) {
            const signal = this.getSignalByIndex(signalIndex);
            
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
            const row = this.getRowAtY(yPos);
            if (row) {
                if (row.type === 'signal') {
                    const signalIndex = this.getSignalIndexAtY(yPos);
                    if (signalIndex !== -1) {
                        this.currentEditingSignal = signalIndex;
                        TimingGenUI.showContextMenu('signal-context-menu', ev.clientX, ev.clientY);
                    }
                }
            }
            return;
        }
        
        // Check if right-click is in waveform area
        const cycle = Math.floor((xPos - this.config.nameColumnWidth) / this.config.cycleWidth);
        const row = this.getRowAtY(yPos);
        
        if (row) {
            if (row.type === 'text') {
                // Right-click on text row - show text context menu
                this.currentEditingText = row.name;
                TimingGenUI.showContextMenu('text-context-menu', ev.clientX, ev.clientY);
                return;
            } else if (row.type === 'signal') {
                const signalIndex = this.getSignalIndexAtY(yPos);
                
                if (signalIndex !== -1 && cycle >= 0 && cycle < this.config.cycles) {
                    const signal = this.getSignalByIndex(signalIndex);
                    
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
        }
    }
    
    handleCanvasMouseDrag(event) {
        // Handle text dragging
        if (this.textDragState) {
            const xPos = event.point.x;
            const textData = this.textData.get(this.textDragState.textName);
            if (textData) {
                // Calculate new offset based on drag distance
                const deltaX = xPos - this.textDragState.startX;
                textData.xOffset = Math.max(0, this.textDragState.originalOffset + deltaX);
                
                // Throttle rendering using requestAnimationFrame
                if (!this.textDragState.renderScheduled) {
                    this.textDragState.renderScheduled = true;
                    requestAnimationFrame(() => {
                        this.render();
                        if (this.textDragState) {
                            this.textDragState.renderScheduled = false;
                        }
                    });
                }
            }
        }
    }
    
    handleCanvasMouseUp(event) {
        // End text dragging
        if (this.textDragState) {
            this.textDragState = null;
            this.canvas.style.cursor = 'default';
        }
    }
    
    toggleBitSignal(signalIndex, cycle) {
        const signal = this.getSignalByIndex(signalIndex);
        const currentValue = this.getBitValueAtCycle(signal, cycle);
        const newValue = (currentValue === 0 || currentValue === 'X' || currentValue === 'Z') ? 1 : 0;
        signal.values[cycle] = newValue;
        this.render();
    }
    
    setBitValue(signalIndex, cycle, value) {
        if (signalIndex !== null && cycle !== null) {
            const signal = this.getSignalByIndex(signalIndex);
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
            const signal = this.getSignalByIndex(this.currentEditingSignal);
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
            const signal = this.getSignalByIndex(this.currentEditingSignal);
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
        
        // Apply global level settings
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
        
        // Apply signal level overrides
        if (signal.delayMin !== undefined) {
            delayMinInTime = signal.delayMin;
        }
        if (signal.delayMax !== undefined) {
            delayMaxInTime = signal.delayMax;
        }
        if (signal.delayColor !== undefined) {
            delayColor = signal.delayColor;
        }
        
        // Apply cycle level overrides
        if (signal.cycleOptions && signal.cycleOptions[cycle]) {
            const cycleOpts = signal.cycleOptions[cycle];
            
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
        // Use unified row system
        if (this.rowManager && this.rowManager.isUsingNewSystem()) {
            const rowIndex = this.rowManager.getRowIndexAtY(yPos);
            if (rowIndex < 0) return -1;
            
            // Convert row index to signal index
            return this.rowManager.rowIndexToSignalIndex(rowIndex);
        }
        
        return -1;
    }
    
    getRowAtY(yPos) {
        // Get row index and type at Y position
        if (!this.rowManager || !this.rowManager.isUsingNewSystem()) {
            return null;
        }
        
        const rowIndex = this.rowManager.getRowIndexAtY(yPos);
        if (rowIndex < 0 || rowIndex >= this.rows.length) {
            return null;
        }
        
        return {
            index: rowIndex,
            type: this.rows[rowIndex].type,
            name: this.rows[rowIndex].name
        };
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
        const signals = this.getSignals();
        
        for (let i = start; i <= end; i++) {
            if (i < signals.length) {
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
    
    startDragMeasureRow(rowIndex, event) {
        this.draggedMeasureRow = rowIndex;
        this.isDragging = true;
        
        const rect = this.canvas.getBoundingClientRect();
        
        const onMouseMove = (moveEvent) => {
            const yPos = moveEvent.clientY - rect.top;
            this.updateDragIndicator(yPos);
        };
        
        const onMouseUp = (upEvent) => {
            const yPos = upEvent.clientY - rect.top;
            this.dropMeasureRow(yPos);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.draggedMeasureRow = null;
            this.isDragging = false;
            this.removeDragIndicator();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    dropMeasureRow(yPos) {
        const targetRow = this.getRowAtY(yPos);
        
        if (!targetRow || targetRow.index === this.draggedMeasureRow) {
            return; // Invalid drop location or same position
        }
        
        // Extract the measure row being moved
        const measureRow = this.rows[this.draggedMeasureRow];
        
        // Remove from old position
        this.rows.splice(this.draggedMeasureRow, 1);
        
        // Calculate new insertion index
        let newIndex = targetRow.index;
        if (this.draggedMeasureRow < targetRow.index) {
            // Moved down, adjust for removal
            newIndex--;
        }
        
        // Determine if we should insert above or below target
        const targetYStart = this.rowManager.getRowYPosition(newIndex);
        const targetYMid = targetYStart + this.config.rowHeight / 2;
        if (yPos >= targetYMid) {
            newIndex++; // Insert below
        }
        
        // Insert at new position
        this.rows.splice(newIndex, 0, measureRow);
        
        // Update all row indices in measures and rebuild
        this.rebuildAfterMeasureRowMove();
        
        // Update selection
        this.selectedMeasureRows.clear();
        this.selectedMeasureRows.add(newIndex);
        
        this.render();
    }
    
    rebuildAfterMeasureRowMove() {
        // After moving a measure row, update measureRow field in measures Map
        this.rows.forEach((row, rowIndex) => {
            if (row.type === 'measure') {
                const measure = this.measuresData.get(row.name);
                if (measure) {
                    measure.measureRow = rowIndex;
                }
            }
        });
    }
    
    updateDragIndicator(yPos) {
        // For unified row system, use row-based indicator
        if (this.rowManager && this.rowManager.isUsingNewSystem()) {
            const rowIndex = this.rowManager.getRowIndexAtY(yPos);
            const totalRows = this.rowManager.getTotalRows();
            
            // Allow dropping at any position from 0 to totalRows
            if (rowIndex >= 0 && rowIndex <= totalRows) {
                let indicatorY;
                
                if (rowIndex >= totalRows) {
                    // Drop at the end
                    indicatorY = this.config.headerHeight + totalRows * this.config.rowHeight;
                } else {
                    // Determine if we should show indicator above or below the target row
                    const targetYStart = this.config.headerHeight + rowIndex * this.config.rowHeight;
                    const targetYMid = targetYStart + this.config.rowHeight / 2;
                    
                    if (yPos < targetYMid) {
                        // Drop above target
                        indicatorY = targetYStart;
                    } else {
                        // Drop below target
                        indicatorY = targetYStart + this.config.rowHeight;
                    }
                }
                
                if (!this.dragIndicator) {
                    this.dragIndicator = document.createElement('div');
                    this.dragIndicator.className = 'drag-indicator';
                    document.getElementById('drawing-area').appendChild(this.dragIndicator);
                }
                
                this.dragIndicator.style.top = indicatorY + 'px';
                this.dragIndicator.style.display = 'block';
                return;
            }
        } else {
            // Old system - use signal-based indicator
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
                return;
            }
        }
        
        // Hide indicator if invalid position
        if (this.dragIndicator) {
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
        // For unified row system, use row-based drop logic
        if (this.rowManager && this.rowManager.isUsingNewSystem()) {
            const targetRowIndex = this.rowManager.getRowIndexAtY(yPos);
            const totalRows = this.rowManager.getTotalRows();
            
            if (targetRowIndex < 0) {
                return; // Invalid drop location (above header)
            }
            
            // Get all selected signals (sorted by their current index)
            const selectedIndices = Array.from(this.selectedSignals).sort((a, b) => a - b);
            
            if (selectedIndices.length === 0) {
                return;
            }
            
            // Determine insertion row index
            let insertRowIndex = targetRowIndex;
            if (targetRowIndex < totalRows) {
                const targetYStart = this.config.headerHeight + targetRowIndex * this.config.rowHeight;
                const targetYMid = targetYStart + this.config.rowHeight / 2;
                if (yPos >= targetYMid) {
                    insertRowIndex++; // Insert below
                }
            } else {
                insertRowIndex = totalRows; // Insert at end
            }
            
            // Get the row indices of selected signals
            const selectedSignalRows = selectedIndices.map(idx => 
                this.rowManager.signalIndexToRowIndex(idx)
            );
            
            // Extract selected signals data
            const selectedSignalsData = selectedIndices.map(idx => this.getSignalByIndex(idx));
            
            // Remove selected signal rows from rows array
            for (let i = selectedIndices.length - 1; i >= 0; i--) {
                this.rows.splice(selectedSignalRows[i], 1);
                
                // Adjust insert position if we removed rows before it
                if (selectedSignalRows[i] < insertRowIndex) {
                    insertRowIndex--;
                }
            }
            
            // Insert signals back at new position in rows array
            for (let i = 0; i < selectedSignalsData.length; i++) {
                this.rows.splice(insertRowIndex + i, 0, {
                    type: 'signal',
                    name: selectedSignalsData[i].name
                });
            }
            
            // Update measure references after the move
            this.rebuildAfterSignalRowMove();
            
            // Update selection to reflect new signal indices
            this.selectedSignals.clear();
            // Find new signal indices after the move
            let signalCount = 0;
            for (let i = 0; i < this.rows.length; i++) {
                if (this.rows[i].type === 'signal') {
                    if (i >= insertRowIndex && i < insertRowIndex + selectedSignalsData.length) {
                        this.selectedSignals.add(signalCount);
                    }
                    signalCount++;
                }
            }
            
            this.render();
            return;
        }
        
        // Old system - use signal-based drop logic
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
        const selectedSignalsData = selectedIndices.map(idx => this.getSignalByIndex(idx));
        
        // Determine insertion point
        const targetYStart = this.config.headerHeight + targetIndex * this.config.rowHeight;
        const targetYMid = targetYStart + this.config.rowHeight / 2;
        let insertIndex = (yPos < targetYMid) ? targetIndex : targetIndex + 1;
        
        // Find row indices for selected signals
        const selectedRowIndices = selectedIndices.map(signalIdx => {
            const signal = this.getSignalByIndex(signalIdx);
            return this.rows.findIndex(row => row.type === 'signal' && row.name === signal.name);
        }).filter(idx => idx >= 0).sort((a, b) => a - b);
        
        // Remove selected signal rows from rows array (in reverse order)
        for (let i = selectedRowIndices.length - 1; i >= 0; i--) {
            this.rows.splice(selectedRowIndices[i], 1);
            // Adjust insertIndex if we removed rows before it
            if (selectedRowIndices[i] < insertIndex) {
                insertIndex--;
            }
        }
        
        // Insert signal rows back at new position
        for (let i = 0; i < selectedSignalsData.length; i++) {
            this.rows.splice(insertIndex + i, 0, {
                type: 'signal',
                name: selectedSignalsData[i].name
            });
        }
        
        // Update selection indices to reflect new positions
        this.selectedSignals.clear();
        for (let i = 0; i < selectedSignalsData.length; i++) {
            this.selectedSignals.add(insertIndex + i);
        }
        
        this.render();
    }
    
    rebuildAfterSignalRowMove() {
        // After moving signals in the unified row system, update measureRow references
        // Signal names remain valid since they're the primary identifiers
        
        // Rebuild measure row indices
        this.rows.forEach((row, rowIndex) => {
            if (row.type === 'measure') {
                const measure = this.measuresData.get(row.name);
                if (measure) {
                    measure.measureRow = rowIndex;
                }
            }
        });
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
        
        // Build signal rows array first
        const signalRows = [];
        const newSignalDataToRow = new Map();
        const signals = this.getSignals();
        
        signals.forEach((signal, idx) => {
            signalRows.push({
                type: 'signal',
                name: signal.name
            });
            newSignalDataToRow.set(signal, idx);
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
                            
                            // Find the new signal index for this signal
                            if (newSignalDataToRow.has(signal1Data)) {
                                const newSignalIndex = newSignalDataToRow.get(signal1Data);
                                measure.signal1Row = newSignalIndex;
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
                            
                            // Find the new signal index for this signal
                            if (newSignalDataToRow.has(signal2Data)) {
                                const newSignalIndex = newSignalDataToRow.get(signal2Data);
                                measure.signal2Row = newSignalIndex;
                            }
                        }
                    }
                }
            });
        });
        
        // Now build the final rows array with measures inserted at appropriate positions
        const newRows = [];
        let signalRowIndex = 0;
        
        // Helper function to check if a measure should be inserted after a given signal row
        const getMeasuresForPosition = (afterSignalIndex) => {
            const measuresAtPosition = [];
            measureRows.forEach(measureRow => {
                measureRow.data.forEach(measure => {
                    if (measure.signal1Row !== undefined && measure.signal2Row !== undefined) {
                        const minRow = Math.min(measure.signal1Row, measure.signal2Row);
                        const maxRow = Math.max(measure.signal1Row, measure.signal2Row);
                        
                        // Insert measure row after the higher of the two signals
                        // or between them if there's space
                        if (maxRow === afterSignalIndex) {
                            // Update the measureRow field to reflect actual position
                            measure.measureRow = newRows.length + 1;
                            measuresAtPosition.push(measure);
                        }
                    }
                });
            });
            return measuresAtPosition;
        };
        
        // Build rows array: signals with measures inserted after appropriate positions
        for (let i = 0; i < signalRows.length; i++) {
            // Add signal row
            newRows.push(signalRows[i]);
            
            // Check if any measures should be inserted after this signal
            const measuresHere = getMeasuresForPosition(i);
            if (measuresHere.length > 0) {
                // Group all measures at this position into one measure row
                newRows.push({
                    type: 'measure',
                    data: measuresHere
                });
            }
        }
        
        // Update row indices now that we know final positions
        newRows.forEach((row, finalRowIndex) => {
            if (row.type === 'signal') {
                newSignalDataToRow.set(row.data, finalRowIndex);
            } else if (row.type === 'measure') {
                row.data.forEach(measure => {
                    measure.measureRow = finalRowIndex;
                });
            }
        });
        
        // Update measure signal row references to final positions
        newRows.forEach(row => {
            if (row.type === 'measure') {
                row.data.forEach(measure => {
                    if (measure.signal1Row !== undefined) {
                        // Find the signal in signalRows and get its final position
                        const signal1Data = signalRows[measure.signal1Row]?.data;
                        if (signal1Data && newSignalDataToRow.has(signal1Data)) {
                            measure.signal1Row = newSignalDataToRow.get(signal1Data);
                        }
                    }
                    if (measure.signal2Row !== undefined) {
                        const signal2Data = signalRows[measure.signal2Row]?.data;
                        if (signal2Data && newSignalDataToRow.has(signal2Data)) {
                            measure.signal2Row = newSignalDataToRow.get(signal2Data);
                        }
                    }
                });
            }
        });
        
        this.rows = newRows;
    }
    
    insertCyclesGlobal(startCycle, numCycles) {
        // Insert cycles for all signals after startCycle
        const signals = this.getSignals();
        signals.forEach(signal => {
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
        const signals = this.getSignals();
        signals.forEach(signal => {
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
        const signal = this.getSignalByIndex(signalIndex);
        this.insertCyclesForSignal(signal, startCycle, numCycles);
        this.render();
    }
    
    deleteCyclesSignal(signalIndex, startCycle, numCycles) {
        // Delete cycles for a specific signal only
        const signal = this.getSignalByIndex(signalIndex);
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
        const measures = this.getMeasures();
        measures.forEach(measure => {
            // Update cycle1 if it's after the insertion point
            if (measure.cycle1 !== undefined && measure.cycle1 > startCycle) {
                measure.cycle1 += numCycles;
            }
            
            // Update cycle2 if it's after the insertion point
            if (measure.cycle2 !== undefined && measure.cycle2 > startCycle) {
                measure.cycle2 += numCycles;
            }
        });
    }
    
    updateMeasureCyclesAfterDeletion(startCycle, numCycles) {
        // Update cycle references in all measures after cycles are deleted
        const measures = this.getMeasures();
        const measuresToDelete = [];
        
        measures.forEach(measure => {
            // Update cycle1 if it's after the deletion point
            if (measure.cycle1 !== undefined) {
                if (measure.cycle1 >= startCycle && measure.cycle1 < startCycle + numCycles) {
                    // Cycle was deleted - mark for deletion
                    measuresToDelete.push(measure.name);
                } else if (measure.cycle1 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    measure.cycle1 -= numCycles;
                }
            }
            
            // Update cycle2 if it's after the deletion point
            if (measure.cycle2 !== undefined) {
                if (measure.cycle2 >= startCycle && measure.cycle2 < startCycle + numCycles) {
                    // Cycle was deleted - mark for deletion
                    if (!measuresToDelete.includes(measure.name)) {
                        measuresToDelete.push(measure.name);
                    }
                } else if (measure.cycle2 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    measure.cycle2 -= numCycles;
                }
            }
        });
        
        // Remove invalid measures from Map and rows
        measuresToDelete.forEach(measureName => {
            this.measuresData.delete(measureName);
            const rowIndex = this.rows.findIndex(row => row.type === 'measure' && row.name === measureName);
            if (rowIndex >= 0) {
                this.rows.splice(rowIndex, 1);
            }
        });
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
        // Generate unique measure name
        const measureName = `M${this.measureCounter}`;
        this.measureCounter++;
        
        this.currentMeasure = {
            name: measureName,
            signal1Row: null,  // Changed from signal1Index to signal1Row
            cycle1: null,
            signal2Row: null,  // Changed from signal2Index to signal2Row
            cycle2: null,
            measureRow: null,  // Row index where measure will be placed
            text: '',
            textX: null,       // X position of text (relative to arrow)
            textFont: 'Arial', // Font family for text
            textSize: 12,      // Font size for text
            textColor: '#FF0000' // Text color
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
        // Convert measure data (signal names + cycles) to screen coordinates
        // This allows measures to stay aligned with signals even when rows change
        //
        // DESIGN RULE: Measures are identified by signal NAMES (signal1Name, signal2Name).
        // Signal names are the primary identifiers. Row indices are computed on-the-fly.
        // This ensures measures survive signal reordering and row rearrangement.
        
        // Find signals by name and get their current row indices
        const signal1 = this.getSignalByName(measure.signal1Name);
        const signal2 = this.getSignalByName(measure.signal2Name);
        
        if (!signal1 || !signal2) {
            console.error('Signal not found for measure:', measure);
            // Return default coordinates
            return {
                x1: this.config.nameColumnWidth,
                y1: this.config.headerHeight,
                x2: this.config.nameColumnWidth,
                y2: this.config.headerHeight,
                signal1Index: -1,
                signal2Index: -1
            };
        }
        
        // Get signal indices
        const signals = this.getSignals();
        const signal1Index = signals.indexOf(signal1);
        const signal2Index = signals.indexOf(signal2);
        
        // Get current row indices for the signals
        const signal1Row = this.rowManager.signalIndexToRowIndex(signal1Index);
        const signal2Row = this.rowManager.signalIndexToRowIndex(signal2Index);
        
        // Calculate X positions accounting for signal transitions, delay, and slew
        const x1 = this.getTransitionMidpointX(signal1Index, measure.cycle1);
        const x2 = this.getTransitionMidpointX(signal2Index, measure.cycle2);
        
        // Get Y positions from computed row indices
        const y1 = this.rowManager.getRowYPosition(signal1Row) + this.config.rowHeight / 2;
        const y2 = this.rowManager.getRowYPosition(signal2Row) + this.config.rowHeight / 2;
        
        return { x1, y1, x2, y2, signal1Index, signal2Index };
    }
    
    getTransitionMidpointX(signalIndex, cycle) {
        // Calculate the X coordinate for the middle of a transition at the given cycle
        // Accounts for delay and slew
        // For clock signals, negative cycle numbers represent falling edges
        const signals = this.getSignals();
        
        if (signalIndex < 0 || signalIndex >= signals.length) {
            // Invalid signal, fall back to cycle boundary
            const absCycle = Math.abs(cycle);
            return this.config.nameColumnWidth + absCycle * this.config.cycleWidth;
        }
        
        const signal = this.getSignalByIndex(signalIndex);
        
        // Safety check: if signal is undefined, fall back to cycle boundary
        if (!signal) {
            const absCycle = Math.abs(cycle);
            return this.config.nameColumnWidth + absCycle * this.config.cycleWidth;
        }
        
        // Handle clock falling edges (negative cycle numbers)
        if (signal.type === 'clock' && cycle < 0) {
            const absCycle = Math.abs(cycle + 1); // Convert -1 to 0, -2 to 1, etc.
            // Falling edge is at mid-cycle
            return this.config.nameColumnWidth + absCycle * this.config.cycleWidth + this.config.cycleWidth / 2;
        }
        
        // Base X position at grid line
        const baseX = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
        
        // For clock rising edges, return exact cycle boundary
        if (signal.type === 'clock') {
            return baseX;
        }
        
        // Get delay info for this cycle
        const delayInfo = this.getEffectiveDelay(signal, cycle);
        
        // Get slew for this cycle
        const slew = this.getEffectiveSlew(signal, cycle);
        
        // Check if there's actually a transition at this cycle for bit signals
        if (cycle > 0 && signal.type === 'bit') {
            const currentValue = this.getBitValueAtCycle(signal, cycle);
            const prevValue = this.getBitValueAtCycle(signal, cycle - 1);
            
            if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                // There's a real transition here
                // Midpoint is at: baseX + delayMin + slew/2
                return baseX + delayInfo.min + slew / 2;
            }
        } else if (cycle > 0 && signal.type === 'bus') {
            // For bus signals, check if there's a value change
            const currentValue = this.getBusValueAtCycle(signal, cycle);
            const prevValue = this.getBusValueAtCycle(signal, cycle - 1);
            
            if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                // There's a transition - midpoint is at baseX + delayMin + slew/2
                return baseX + delayInfo.min + slew / 2;
            }
        }
        
        // No transition or first cycle - use baseX + delayMin for most signals
        if (signal.type === 'bus') {
            return baseX + delayInfo.min + slew / 2;
        }
        return baseX + delayInfo.min;
    }
    
    findNearestTransition(xPos, yPos) {
        // Find the nearest signal transition to the click position
        // Returns { signalIndex, cycle }
        const signals = this.getSignals();
        
        // First, check if we have any signals at all
        if (!signals || signals.length === 0) {
            // No signals loaded - can't create measure
            console.warn('Cannot create measure: no signals loaded');
            return null;
        }
        
        const signalIndex = this.getSignalIndexAtY(yPos);
        if (signalIndex === -1 || signalIndex >= signals.length) {
            // No valid signal at this Y position, just use the clicked cycle
            const cycle = this.getCycleAtX(xPos);
            // Return default to first signal or cycle 0 if no signals
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        const signal = this.getSignalByIndex(signalIndex);
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
        
        // For clock signals, find the nearest clock edge (both rising and falling)
        if (signal.type === 'clock') {
            let nearestCycle = clickedCycle;
            let nearestEdge = 'rising'; // 'rising' or 'falling'
            let minDistance = Infinity;
            
            // Clock has two edges per cycle: rising and falling
            // Rising edge is at cycle boundary, falling edge is at mid-cycle
            for (let cycle = Math.max(0, clickedCycle - 1); cycle <= Math.min(this.config.cycles, clickedCycle + 1); cycle++) {
                // Rising edge (at cycle boundary)
                const risingEdgeX = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
                const risingDistance = Math.abs(risingEdgeX - xPos);
                
                if (risingDistance < minDistance) {
                    minDistance = risingDistance;
                    nearestCycle = cycle;
                    nearestEdge = 'rising';
                }
                
                // Falling edge (at mid-cycle)
                if (cycle < this.config.cycles) {
                    const fallingEdgeX = this.config.nameColumnWidth + cycle * this.config.cycleWidth + this.config.cycleWidth / 2;
                    const fallingDistance = Math.abs(fallingEdgeX - xPos);
                    
                    if (fallingDistance < minDistance) {
                        minDistance = fallingDistance;
                        nearestCycle = cycle;
                        nearestEdge = 'falling';
                    }
                }
            }
            
            // Store edge type in the cycle value
            // Use negative cycle numbers for falling edges: -1 means cycle 0 falling, -2 means cycle 1 falling, etc.
            if (nearestEdge === 'falling') {
                nearestCycle = -(nearestCycle + 1);
            }
            
            return { signalIndex, cycle: nearestCycle };
        }
        
        // For bus signals, find the nearest transition
        if (signal.type === 'bus') {
            let nearestCycle = clickedCycle;
            let minDistance = Infinity;
            
            // Search nearby cycles for transitions
            for (let cycle = Math.max(1, clickedCycle - 2); cycle <= Math.min(this.config.cycles - 1, clickedCycle + 2); cycle++) {
                const currentValue = this.getBusValueAtCycle(signal, cycle);
                const prevValue = this.getBusValueAtCycle(signal, cycle - 1);
                
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
        
        // Default: just return the clicked cycle
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
        
        // Show snap-to indicator during first and second point selection
        if (this.measureState === 'first-point' || this.measureState === 'second-point') {
            // Find snap-to point
            const snapPoint = this.findNearestTransition(xPos, yPos);
            if (snapPoint) {
                const snapX = this.getTransitionMidpointX(snapPoint.signalIndex, snapPoint.cycle);
                const snapY = this.rowManager.getRowYPosition(this.rowManager.signalIndexToRowIndex(snapPoint.signalIndex)) + this.config.rowHeight / 2;
                
                // Draw snap-to indicator (small circle)
                const snapIndicator = new paper.Path.Circle({
                    center: [snapX, snapY],
                    radius: 8,
                    strokeColor: '#FF0000',
                    strokeWidth: 2,
                    fillColor: new paper.Color(1, 0, 0, 0.2) // Semi-transparent red
                });
                this.tempMeasureGraphics.push(snapIndicator);
            }
        }
        
        if (this.measureState === 'second-point' && this.currentMeasure.signal1Name) {
            // After first click: show first line + cross, and dynamic line to mouse
            const coords = this.getMeasureCoordinates({
                signal1Name: this.currentMeasure.signal1Name,
                cycle1: this.currentMeasure.cycle1,
                signal2Name: this.currentMeasure.signal1Name,
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
        } else if (this.measureState === 'placing-row' && this.currentMeasure.signal1Name && this.currentMeasure.signal2Name) {
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
            // For measure placement, we want to snap to row boundaries:
            // - Above top row
            // - Below bottom row
            // - Between rows
            // - Middle of measure rows (if there are multiple measures)
            const placementY = this.getMeasurePlacementY(yPos);
            
            // Draw the double-headed arrow at the placement position
            const arrows = this.drawMeasureArrows(
                coords.x1,
                coords.x2,
                placementY
            );
            this.tempMeasureGraphics.push(...arrows);
            
            // Draw dashed row indicator
            this.drawRowIndicator(rowIndex);
        }
        
        
        paper.view.draw();
    }
    
    drawMeasureBar(xPos, color) {
        const signals = this.getSignals();
        const bar = new paper.Path.Line({
            from: [xPos, 0],
            to: [xPos, this.config.headerHeight + signals.length * this.config.rowHeight],
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
    
    getMeasurePlacementY(yPos) {
        // Calculates Y position for measure placement based on mouse position
        // Snaps to:
        // - Above top row (y = headerHeight)
        // - Below bottom row
        // - Between adjacent rows (at row boundaries)
        // - Middle of measure rows (if clicking within a measure row area)
        
        const totalRows = this.rowManager.getTotalRows();
        
        if (yPos < this.config.headerHeight) {
            // Above header - place above top row
            return this.config.headerHeight;
        }
        
        const relativeY = yPos - this.config.headerHeight;
        const rowIndex = Math.floor(relativeY / this.config.rowHeight);
        
        if (rowIndex >= totalRows) {
            // Below all rows - place below bottom row
            return this.config.headerHeight + totalRows * this.config.rowHeight;
        }
        
        // Check if mouse is in a measure row
        const row = this.rows[rowIndex];
        if (row && row.type === 'measure') {
            // In a measure row - place in the middle
            return this.config.headerHeight + (rowIndex + 0.5) * this.config.rowHeight;
        }
        
        // In a signal, text, or counter row
        // Determine if closer to top or bottom of the row
        const rowStartY = this.config.headerHeight + rowIndex * this.config.rowHeight;
        const posInRow = yPos - rowStartY;
        
        if (posInRow < this.config.rowHeight / 2) {
            // Closer to top - snap to top boundary (above current row)
            return rowStartY;
        } else {
            // Closer to bottom - snap to bottom boundary (below current row)
            return rowStartY + this.config.rowHeight;
        }
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
            signal1Name: this.currentMeasure.signal1Name,
            cycle1: this.currentMeasure.cycle1,
            signal2Name: this.currentMeasure.signal1Name,
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
        
        // Draw double-headed arrow at a default position (middle between the two signal rows)
        const coords2 = this.getMeasureCoordinates(this.currentMeasure);
        const arrowY = (coords.y1 + coords.y2) / 2;  // Midpoint between the two signals
        const arrows = this.drawMeasureArrows(
            coords.x1,
            coords.x2,
            arrowY
        );
        this.tempMeasureGraphics.push(...arrows);
        
        paper.view.draw();
    }
    
    finalizeMeasureWithBlankRow() {
        // After selecting row, show text dialog to enter measure text
        const measureRowIndex = this.currentMeasure.measureRow;
        
        // Insert new measure row immediately
        this.rows.splice(measureRowIndex, 0, {
            type: 'measure',
            name: this.currentMeasure.name
        });
        
        // Clean up temporary graphics
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
        
        // Render the measure row
        this.render();
        
        // Show text dialog to enter measure label
        this.hideInstruction();
        document.getElementById('measure-text-input').value = '';
        document.getElementById('measure-text-dialog').style.display = 'block';
        setTimeout(() => {
            document.getElementById('measure-text-input').focus();
        }, 0);
    }
    
    finalizeMeasure() {
        const text = document.getElementById('measure-text-input').value.trim();
        if (!text) {
            alert('Please enter a label for the measure');
            return;
        }
        
        this.currentMeasure.text = text;
        
        const measureName = this.currentMeasure.name;
        
        // Store measure in Map
        this.measuresData.set(measureName, this.currentMeasure);
        
        document.getElementById('measure-text-dialog').style.display = 'none';
        
        // Clean up measure mode state
        this.measureMode = false;
        this.measureState = null;
        this.currentMeasure = null;
        this.canvas.style.cursor = 'default';
        
        // Restore original onMouseMove
        this.tool.onMouseMove = this.originalOnMouseMove;
        
        this.render();
    }
    
    cancelMeasure() {
        document.getElementById('measure-text-dialog').style.display = 'none';
        this.hideInstruction();
        
        // If currentMeasure exists and was added to rows, remove it
        if (this.currentMeasure) {
            const measureName = this.currentMeasure.name;
            const rowIndex = this.rows.findIndex(row => row.type === 'measure' && row.name === measureName);
            if (rowIndex >= 0) {
                this.rows.splice(rowIndex, 1);
            }
        }
        
        this.measureMode = false;
        this.measureState = null;
        this.currentMeasure = null;
        this.canvas.style.cursor = 'default';
        
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
    
    showMeasureContextMenu(event, measureIndex) {
        // Store the measure index being edited
        this.currentEditingMeasure = measureIndex;
        
        // Get the context menu element
        const menu = document.getElementById('measure-context-menu');
        
        // Position the menu at the mouse location
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.display = 'block';
        
        // Prevent default context menu
        event.preventDefault();
    }
    
    deleteMeasure() {
        // Delete measure based on currentEditingMeasure (measure index)
        const measures = this.getMeasures();
        if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
            const measureToDelete = measures[this.currentEditingMeasure];
            const measureName = measureToDelete.name;
            
            // Remove from Map
            this.measuresData.delete(measureName);
            
            // Remove from rows array
            const rowIndex = this.rows.findIndex(row => row.type === 'measure' && row.name === measureName);
            if (rowIndex >= 0) {
                this.rows.splice(rowIndex, 1);
            }
            
            this.currentEditingMeasure = null;
            this.hideAllMenus();
            this.render();
        }
    }
    
    startDragMeasureText(measureIndex, event) {
        // Start dragging measure text in X direction
        const measures = this.getMeasures();
        if (measureIndex < 0 || measureIndex >= measures.length) return;
        
        const measure = measures[measureIndex];
        const startX = event.point.x;
        
        this.isDraggingMeasureText = true;
        this.currentEditingMeasure = measureIndex;
        this.dragStartX = startX;
        this.originalTextX = measure.textX ?? null;
        
        const mouseMoveHandler = (e) => {
            if (!this.isDraggingMeasureText) return;
            
            const deltaX = e.point.x - this.dragStartX;
            measure.textX = (this.originalTextX ?? 0) + deltaX;
            this.render();
        };
        
        const mouseUpHandler = () => {
            this.isDraggingMeasureText = false;
            this.tool.onMouseMove = this.originalOnMouseMove;
            this.tool.onMouseUp = null;
        };
        
        this.tool.onMouseMove = mouseMoveHandler;
        this.tool.onMouseUp = mouseUpHandler;
    }
    
    showMeasureTextContextMenu(event, measureIndex) {
        // Show context menu for measure text
        this.currentEditingMeasure = measureIndex;
        
        const menu = document.getElementById('text-context-menu');
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.display = 'block';
        
        event.preventDefault();
        
        // Update menu handlers to work with measure text
        this.isMeasureTextContext = true;
    }
    
    startRechooseMeasurePoint(measureIndex, pointIndex) {
        // Allow user to re-choose a measure point
        const measures = this.getMeasures();
        if (measureIndex < 0 || measureIndex >= measures.length) return;
        
        const measure = measures[measureIndex];
        this.currentEditingMeasure = measureIndex;
        this.rechoosingPointIndex = pointIndex;
        
        // Enter re-choose mode
        this.measureMode = true;
        this.measureState = pointIndex === 1 ? 'rechoose-point-1' : 'rechoose-point-2';
        this.canvas.style.cursor = 'crosshair';
        
        this.showInstruction(`Click to re-choose point ${pointIndex}`);
    }
    
    startMovingMeasureRow(measureIndex, event) {
        // Start moving measure to another row
        const measures = this.getMeasures();
        if (measureIndex < 0 || measureIndex >= measures.length) return;
        
        const measure = measures[measureIndex];
        const measureName = measure.name;
        
        // Find the row index for this measure
        const rowIndex = this.rows.findIndex(row => row.type === 'measure' && row.name === measureName);
        if (rowIndex < 0) return;
        
        this.currentEditingMeasure = measureIndex;
        this.movingMeasureRowIndex = rowIndex;
        this.canvas.style.cursor = 'move';
        
        this.showInstruction('Click on a row to move the measure there');
        
        // Set up click handler for selecting new row
        this.isMovingMeasureRow = true;
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
            version: '3.2.0',
            config: {
                cycles: app.config.cycles,
                clockPeriod: app.config.clockPeriod,
                clockPeriodUnit: app.config.clockPeriodUnit,
                slew: app.config.slew,
                delayMin: app.config.delayMin,
                delayMax: app.config.delayMax,
                delayColor: app.config.delayColor
            },
            signals: app.getSignals(),
            measures: app.getMeasures()
        };
        console.log(data);
    }
