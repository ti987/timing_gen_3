// Timing Gen 3 - Interactive Digital Logic Waveform Editor
// Version 3.4.0
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
        
        // Data model v3.4.0 - Extended with AC Table widget
        // rows: defines order only - Array of {type: 'signal'|'measure'|'text'|'counter'|'ac-table', name: string}
        // signalsData: Map<name, signalObject> - actual signal data
        // measuresData: Map<name, measureObject> - actual measure data
        // textData: Map<name, textObject> - actual text data
        // counterData: Map<name, counterObject> - actual counter data
        // arrowsData: Map<name, arrowObject> - actual arrow data
        // acTablesData: Map<name, acTableObject> - actual AC table data
        this.rows = [];
        this.signalsData = new Map();  // Key: signal name, Value: signal object
        this.measuresData = new Map(); // Key: measure name (auto-generated), Value: measure object
        this.textData = new Map();     // Key: text name (auto-generated), Value: text object
        this.counterData = new Map();  // Key: counter name (auto-generated), Value: counter object
        this.arrowsData = new Map();   // Key: arrow name (auto-generated), Value: arrow object
        this.acTablesData = new Map(); // Key: table name (auto-generated), Value: AC table object
        
        // Counter for auto-generating unique measure names
        this.measureCounter = 0;
        this.measureTextCounter = 0; // Counter for measure text (t1, t2, t3...)
        this.textCounter = 0;
        this.counterCounter = 0;
        this.arrowCounter = 0;
        this.acTableCounter = 0;
        
        // Row manager for unified row system
        this.rowManager = new RowManager(this);
        
        this.currentEditingSignal = null;
        this.currentEditingCycle = null;
        this.currentEditingText = null; // Current text row being edited
        this.currentEditingCounter = null; // Current counter row being edited {name, cycle}
        this.currentEditingMeasureRow = null; // Current measure row being edited (row index)
        this.textDragState = null; // For tracking text dragging {textName, startX}
        
        // Measure mode state
        this.measureMode = false;
        this.measureState = null; // null, 'first-point', 'second-point', 'placing-text', 'rechoose-point-1', 'rechoose-point-2'
        this.currentMeasure = null; // Current measure being created
        this.currentEditingMeasure = null; // Index of measure being edited (DEPRECATED - use currentEditingMeasureName)
        this.currentEditingMeasureName = null; // Name of measure being edited
        this.tempMeasureGraphics = null; // Temporary graphics for measure creation
        this.isDraggingMeasureText = false; // For dragging measure text
        this.dragStartX = null; // Starting X position for text drag
        this.originalTextX = null; // Original text X position
        this.rechoosingPointIndex = null; // Which point is being rechosen (1 or 2)
        this.isMovingMeasureRow = false; // Flag for moving measure to another row
        this.movingMeasureRowIndex = null; // Row index of measure being moved
        this.isMeasureTextContext = false; // Flag for measure text context menu
        
        // Arrow mode state
        this.arrowMode = false;
        this.arrowState = null; // null, 'first-point', 'second-point'
        this.currentArrow = null; // Current arrow being created
        this.currentEditingArrowName = null; // Name of arrow being edited
        this.tempArrowGraphics = null; // Temporary graphics for arrow creation
        this.isDraggingArrowPoint = false; // For dragging arrow control points
        this.draggingArrowPointIndex = null; // Which point is being dragged (0=start, 1=ctrl1, 2=ctrl2, 3=end)
        this.arrowEditMode = false; // Whether arrow is in edit mode (showing control points)
        
        // AC Table state
        this.currentEditingACTable = null; // Name of AC table being edited
        this.currentEditingACCell = null; // {tableName, cellType, rowIndex, colName}
        this.isDraggingACColumnDivider = false; // For resizing columns
        this.draggingACTableName = null; // Which table's column is being resized
        this.draggingACColumnIndex = null; // Which column divider is being dragged
        this.acColumnDragStartX = null; // Starting X position for column resize
        
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
        
        // Force Paper.js to update its internal coordinate transformation
        // This helps fix coordinate offset issues on some browsers (especially Linux/Chromium)
        paper.view.update();
    }
    
    setupEventListeners() {
        // Menu buttons
        document.getElementById('new-btn').addEventListener('click', () => this.handleNewDocument());
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
        document.getElementById('add-arrow-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.startArrowMode();
        });
        document.getElementById('add-text-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.showAddTextDialog();
        });
        document.getElementById('add-counter-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.showAddCounterDialog();
        });
        document.getElementById('add-ac-table-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.showAddACTableDialog();
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
        
        // AC Table dialog
        document.getElementById('ac-table-dialog-ok-btn').addEventListener('click', () => this.addACTable());
        document.getElementById('ac-table-dialog-cancel-btn').addEventListener('click', () => this.hideAddACTableDialog());
        
        // AC Table cell edit dialog
        document.getElementById('edit-ac-cell-ok-btn').addEventListener('click', () => this.updateACCell());
        document.getElementById('edit-ac-cell-cancel-btn').addEventListener('click', () => this.hideEditACCellDialog());
        
        // AC Table cell font dialog
        document.getElementById('ac-cell-font-ok-btn').addEventListener('click', () => this.updateACCellFont());
        document.getElementById('ac-cell-font-cancel-btn').addEventListener('click', () => this.hideACCellFontDialog());
        
        // AC Table row span dialog
        document.getElementById('ac-rowspan-ok-btn').addEventListener('click', () => this.updateACRowSpan());
        document.getElementById('ac-rowspan-cancel-btn').addEventListener('click', () => this.hideACRowSpanDialog());
        
        // AC Table context menus
        document.getElementById('edit-ac-cell-menu').addEventListener('click', () => this.showEditACCellDialog());
        document.getElementById('font-ac-cell-menu').addEventListener('click', () => this.showACCellFontDialog());
        document.getElementById('cancel-ac-cell-menu').addEventListener('click', () => this.hideAllMenus());
        
        document.getElementById('edit-ac-param-menu').addEventListener('click', () => this.showEditACCellDialog());
        document.getElementById('font-ac-param-menu').addEventListener('click', () => this.showACCellFontDialog());
        document.getElementById('rowspan-ac-param-menu').addEventListener('click', () => this.showACRowSpanDialog());
        document.getElementById('delete-ac-param-menu').addEventListener('click', () => this.deleteACTableRow());
        document.getElementById('cancel-ac-param-menu').addEventListener('click', () => this.hideAllMenus());
        
        document.getElementById('move-ac-table-top-menu').addEventListener('click', () => this.moveACTableTo('top'));
        document.getElementById('move-ac-table-bottom-menu').addEventListener('click', () => this.moveACTableTo('bottom'));
        document.getElementById('delete-ac-table-menu').addEventListener('click', () => this.deleteCurrentACTable());
        document.getElementById('cancel-ac-table-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Measure context menu
        document.getElementById('delete-measure-menu').addEventListener('click', () => this.deleteMeasure());
        document.getElementById('cancel-measure-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Arrow context menu
        document.getElementById('delete-arrow-menu').addEventListener('click', () => this.deleteArrow());
        document.getElementById('arrow-options-menu').addEventListener('click', () => this.showArrowOptionsDialog());
        document.getElementById('cancel-arrow-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Arrow options dialog
        document.getElementById('arrow-options-ok-btn').addEventListener('click', () => this.applyArrowOptions());
        document.getElementById('arrow-options-cancel-btn').addEventListener('click', () => this.hideArrowOptionsDialog());
        
        // Arrow text context menu
        document.getElementById('edit-arrow-text-menu').addEventListener('click', () => this.showEditArrowTextDialog());
        document.getElementById('arrow-text-options-menu').addEventListener('click', () => this.showArrowTextOptionsDialog());
        document.getElementById('cancel-arrow-text-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Edit arrow text dialog
        document.getElementById('edit-arrow-text-ok-btn').addEventListener('click', () => this.applyEditArrowText());
        document.getElementById('edit-arrow-text-cancel-btn').addEventListener('click', () => this.hideEditArrowTextDialog());
        
        // Arrow text options dialog
        document.getElementById('arrow-text-options-ok-btn').addEventListener('click', () => this.applyArrowTextOptions());
        document.getElementById('arrow-text-options-cancel-btn').addEventListener('click', () => this.hideArrowTextOptionsDialog());
        
        // Text context menu
        document.getElementById('edit-text-menu').addEventListener('click', () => this.showEditTextDialog());
        document.getElementById('font-text-menu').addEventListener('click', () => this.showFontDialog());
        document.getElementById('color-text-menu').addEventListener('click', () => this.showColorDialog());
        document.getElementById('cancel-text-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Text row name context menu
        document.getElementById('delete-text-row-menu').addEventListener('click', () => this.deleteTextRow());
        document.getElementById('cancel-text-row-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Measure row name context menu
        document.getElementById('delete-measure-row-menu').addEventListener('click', () => this.deleteMeasureRow());
        document.getElementById('cancel-measure-row-menu').addEventListener('click', () => this.hideAllMenus());
        
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
                // Cancel arrow mode if active
                if (this.arrowMode) {
                    this.cancelArrow();
                }
                // Exit arrow edit mode if active
                if (this.arrowEditMode) {
                    this.stopEditingArrow();
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
        document.getElementById('arrow-context-menu').style.display = 'none';
        document.getElementById('arrow-text-context-menu').style.display = 'none';
        document.getElementById('text-context-menu').style.display = 'none';
        document.getElementById('text-row-name-context-menu').style.display = 'none';
        document.getElementById('measure-row-name-context-menu').style.display = 'none';
        document.getElementById('ac-cell-context-menu').style.display = 'none';
        document.getElementById('ac-param-context-menu').style.display = 'none';
        document.getElementById('ac-table-context-menu').style.display = 'none';
        
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
    
    // ========================================
    // AC Table Methods
    // ========================================
    
    showAddACTableDialog() {
        document.getElementById('ac-table-title-input').value = 'Read Cycle';
        document.getElementById('add-ac-table-dialog').style.display = 'flex';
    }
    
    hideAddACTableDialog() {
        document.getElementById('add-ac-table-dialog').style.display = 'none';
    }
    
    addACTable() {
        const title = document.getElementById('ac-table-title-input').value.trim();
        
        if (!title) {
            alert('Please enter a table title');
            return;
        }
        
        // Generate unique name
        const name = `ACT${this.acTableCounter}`;
        this.acTableCounter++;
        
        // Create AC Table data object
        const acTableData = {
            title: title,
            position: 'bottom', // 'top' or 'bottom'
            columnWidths: [400, 100, 100, 100, 100, 100], // Parameter, Symbol, Min., Max., Unit, Note
            rows: [],
            notes: [], // Array of {number, text}
            titleFont: 'Arial',
            titleSize: 14,
            titleColor: '#000000',
            headerFont: 'Arial',
            headerSize: 12,
            headerColor: '#000000',
            cellFont: 'Arial',
            cellSize: 12,
            cellColor: '#000000'
        };
        
        // Initialize rows from existing measures
        this.initializeACTableRows(acTableData);
        
        // Add to data store
        this.acTablesData.set(name, acTableData);
        
        // Add to rows array at the bottom
        this.rows.push({
            type: 'ac-table',
            name: name
        });
        
        this.hideAddACTableDialog();
        this.render();
    }
    
    initializeACTableRows(acTableData) {
        // Create a row for each existing measure
        for (const [measureName, measure] of this.measuresData.entries()) {
            const row = this.createACTableRowFromMeasure(measureName, measure);
            acTableData.rows.push(row);
        }
    }
    
    createACTableRowFromMeasure(measureName, measure) {
        // Calculate min and max from cycle period and delays
        const cyclePeriod = this.config.clockPeriod;
        const delayMin = this.config.delayMin;
        const delayMax = this.config.delayMax;
        const unit = this.config.clockPeriodUnit;
        
        // Calculate cycle difference
        const cycleDiff = Math.abs(measure.cycle2 - measure.cycle1);
        const timeValue = cyclePeriod * cycleDiff;
        
        // Min = timeValue + delayMin, Max = timeValue + delayMax
        const minValue = delayMin !== 0 ? (timeValue + delayMin).toFixed(2) : '';
        const maxValue = delayMax !== 0 ? (timeValue + delayMax).toFixed(2) : '';
        
        return {
            measureName: measureName, // Link to measure
            parameter: '',
            symbol: measure.text || '', // Copy from measure text (t1, t2, etc.)
            min: minValue,
            max: maxValue,
            unit: unit,
            note: '',
            rowSpan: 1, // 1 or 2
            manuallyEdited: {
                parameter: false,
                symbol: false,
                min: false,
                max: false,
                unit: false,
                note: false
            },
            fontFamily: 'Arial',
            fontSize: 12,
            color: '#000000'
        };
    }
    
    updateACTableForMeasureChange(measureName, measure) {
        // Update all AC tables when a measure changes
        // NOTE: This method is called automatically when global options (clockPeriod, delays) change
        // or when measures are modified. Currently, measure text editing after creation is not
        // implemented in the UI, but this method is ready for future use.
        for (const [tableName, tableData] of this.acTablesData.entries()) {
            const rowIndex = tableData.rows.findIndex(r => r.measureName === measureName);
            if (rowIndex >= 0) {
                const row = tableData.rows[rowIndex];
                
                // Update symbol if not manually edited
                if (!row.manuallyEdited.symbol && measure.text) {
                    row.symbol = measure.text;
                }
                
                // Recalculate min/max if not manually edited
                if (!row.manuallyEdited.min || !row.manuallyEdited.max) {
                    const cyclePeriod = this.config.clockPeriod;
                    const delayMin = this.config.delayMin;
                    const delayMax = this.config.delayMax;
                    
                    const cycleDiff = Math.abs(measure.cycle2 - measure.cycle1);
                    const timeValue = cyclePeriod * cycleDiff;
                    
                    if (!row.manuallyEdited.min) {
                        row.min = delayMin !== 0 ? (timeValue + delayMin).toFixed(2) : '';
                    }
                    if (!row.manuallyEdited.max) {
                        row.max = delayMax !== 0 ? (timeValue + delayMax).toFixed(2) : '';
                    }
                }
                
                // Update unit if not manually edited
                if (!row.manuallyEdited.unit) {
                    row.unit = this.config.clockPeriodUnit;
                }
            }
        }
    }
    
    addACTableRowForMeasure(measureName, measure) {
        // Add a row to all AC tables when a new measure is added
        for (const [tableName, tableData] of this.acTablesData.entries()) {
            const row = this.createACTableRowFromMeasure(measureName, measure);
            tableData.rows.push(row);
        }
    }
    
    removeACTableRowForMeasure(measureName) {
        // Remove row from all AC tables when a measure is deleted
        for (const [tableName, tableData] of this.acTablesData.entries()) {
            const rowIndex = tableData.rows.findIndex(r => r.measureName === measureName);
            if (rowIndex >= 0) {
                tableData.rows.splice(rowIndex, 1);
            }
        }
    }
    
    deleteACTable(tableName) {
        // Remove from data store
        this.acTablesData.delete(tableName);
        
        // Remove from rows
        const rowIndex = this.rows.findIndex(r => r.type === 'ac-table' && r.name === tableName);
        if (rowIndex >= 0) {
            this.rows.splice(rowIndex, 1);
        }
        
        this.render();
    }
    
    moveACTableToPosition(tableName, position) {
        const tableData = this.acTablesData.get(tableName);
        if (tableData) {
            tableData.position = position;
            
            // Move row in rows array
            const rowIndex = this.rows.findIndex(r => r.type === 'ac-table' && r.name === tableName);
            if (rowIndex >= 0) {
                const [row] = this.rows.splice(rowIndex, 1);
                if (position === 'top') {
                    this.rows.unshift(row);
                } else {
                    this.rows.push(row);
                }
            }
            
            this.render();
        }
    }
    
    // AC Table cell editing methods
    
    showEditACCellDialog() {
        if (this.currentEditingACCell) {
            const { tableName, cellType, rowIndex, colName } = this.currentEditingACCell;
            const tableData = this.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                let currentValue = '';
                
                if (cellType === 'data') {
                    currentValue = row[colName] || '';
                } else if (cellType === 'note') {
                    const noteData = tableData.notes.find(n => n.number === colName);
                    currentValue = noteData ? noteData.text : '';
                }
                
                document.getElementById('edit-ac-cell-input').value = currentValue;
                document.getElementById('edit-ac-cell-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    hideEditACCellDialog() {
        document.getElementById('edit-ac-cell-dialog').style.display = 'none';
        this.currentEditingACCell = null;
    }
    
    updateACCell() {
        if (this.currentEditingACCell) {
            const { tableName, cellType, rowIndex, colName } = this.currentEditingACCell;
            const tableData = this.acTablesData.get(tableName);
            const newValue = document.getElementById('edit-ac-cell-input').value.trim();
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                
                if (cellType === 'data') {
                    // Update cell value
                    row[colName] = newValue;
                    
                    // Mark as manually edited
                    if (row.manuallyEdited) {
                        row.manuallyEdited[colName] = true;
                    }
                    
                    // If symbol changed, update measure text (unless measure text was manually edited)
                    if (colName === 'symbol' && row.measureName) {
                        const measure = this.measuresData.get(row.measureName);
                        if (measure) {
                            measure.text = newValue;
                        }
                    }
                    
                    // If note column, validate it's integers with commas
                    if (colName === 'note' && newValue) {
                        const numbers = newValue.split(',').map(n => n.trim()).filter(n => n);
                        const allValid = numbers.every(n => /^\d+$/.test(n));
                        if (!allValid) {
                            alert('Note column must contain only integers separated by commas');
                            return;
                        }
                        
                        // Update note field - add any new note numbers
                        numbers.forEach(num => {
                            if (!tableData.notes.find(n => n.number === num)) {
                                tableData.notes.push({ number: num, text: '' });
                            }
                        });
                        
                        // Sort notes by number
                        tableData.notes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
                    }
                } else if (cellType === 'note') {
                    // Update note text
                    let noteData = tableData.notes.find(n => n.number === colName);
                    if (noteData) {
                        noteData.text = newValue;
                    } else {
                        tableData.notes.push({ number: colName, text: newValue });
                    }
                }
                
                this.hideEditACCellDialog();
                this.render();
            }
        }
    }
    
    showACCellFontDialog() {
        if (this.currentEditingACCell) {
            const { tableName, rowIndex } = this.currentEditingACCell;
            const tableData = this.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                document.getElementById('ac-cell-font-family-select').value = row.fontFamily || 'Arial';
                document.getElementById('ac-cell-font-size-input').value = row.fontSize || 12;
                document.getElementById('ac-cell-font-color-input').value = row.color || '#000000';
                document.getElementById('ac-cell-font-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    hideACCellFontDialog() {
        document.getElementById('ac-cell-font-dialog').style.display = 'none';
    }
    
    updateACCellFont() {
        if (this.currentEditingACCell) {
            const { tableName, rowIndex } = this.currentEditingACCell;
            const tableData = this.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                row.fontFamily = document.getElementById('ac-cell-font-family-select').value;
                row.fontSize = parseInt(document.getElementById('ac-cell-font-size-input').value);
                row.color = document.getElementById('ac-cell-font-color-input').value;
                
                this.hideACCellFontDialog();
                this.render();
            }
        }
    }
    
    showACRowSpanDialog() {
        if (this.currentEditingACCell) {
            const { tableName, rowIndex } = this.currentEditingACCell;
            const tableData = this.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                const currentRowSpan = row.rowSpan || 1;
                
                // Set radio button based on current rowSpan
                const radio1 = document.querySelector('input[name="rowspan"][value="1"]');
                const radio2 = document.querySelector('input[name="rowspan"][value="2"]');
                if (currentRowSpan === 2) {
                    radio2.checked = true;
                } else {
                    radio1.checked = true;
                }
                
                document.getElementById('ac-rowspan-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    hideACRowSpanDialog() {
        document.getElementById('ac-rowspan-dialog').style.display = 'none';
    }
    
    updateACRowSpan() {
        if (this.currentEditingACCell) {
            const { tableName, rowIndex } = this.currentEditingACCell;
            const tableData = this.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                const row = tableData.rows[rowIndex];
                const selectedRowSpan = document.querySelector('input[name="rowspan"]:checked').value;
                row.rowSpan = parseInt(selectedRowSpan);
                
                this.hideACRowSpanDialog();
                this.render();
            }
        }
    }
    
    deleteACTableRow() {
        if (this.currentEditingACCell) {
            const { tableName, rowIndex } = this.currentEditingACCell;
            const tableData = this.acTablesData.get(tableName);
            
            if (tableData && rowIndex !== undefined && rowIndex < tableData.rows.length) {
                if (confirm('Delete this row from the AC table?')) {
                    tableData.rows.splice(rowIndex, 1);
                    this.hideAllMenus();
                    this.render();
                }
            }
        }
    }
    
    moveACTableTo(position) {
        if (this.currentEditingACTable) {
            this.moveACTableToPosition(this.currentEditingACTable, position);
            this.hideAllMenus();
        }
    }
    
    deleteCurrentACTable() {
        if (this.currentEditingACTable) {
            if (confirm('Delete this AC table?')) {
                this.deleteACTable(this.currentEditingACTable);
                this.hideAllMenus();
            }
        }
    }
    
    flashMeasure(measureName) {
        // Flash the measure corresponding to the measureName
        const measure = this.measuresData.get(measureName);
        if (!measure) return;
        
        // Find measure row index
        const rowIndex = this.rows.findIndex(r => r.type === 'measure' && r.name === measureName);
        if (rowIndex < 0) return;
        
        // Create a temporary flashing effect
        // Store original render state
        const originalRender = TimingGenRendering.render;
        let flashCount = 0;
        const maxFlashes = 3;
        
        const flashInterval = setInterval(() => {
            if (flashCount >= maxFlashes * 2) {
                clearInterval(flashInterval);
                this.render(); // Final render to ensure normal state
                return;
            }
            
            // Toggle visibility by re-rendering with different color
            const isVisible = flashCount % 2 === 0;
            
            // Temporarily change measure color for flashing effect
            if (measure) {
                const originalColor = measure.textColor || '#FF0000';
                measure.textColor = isVisible ? '#FFFF00' : originalColor; // Flash yellow
                this.render();
                measure.textColor = originalColor;
            }
            
            flashCount++;
        }, 200);
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
    
    // Helper method for hit testing (used by both click and right-click handlers)
    getHitTestOptions() {
        return {
            segments: true,
            stroke: true,
            fill: true,
            tolerance: 5
        };
    }
    
    handleCanvasClick(event) {
        // Only handle left mouse button clicks (button 0)
        // Right clicks are handled by handleCanvasRightClick
        if (event.event && event.event.button !== 0) {
            return;
        }
        
        // Use Paper.js's event.point for accurate canvas coordinates
        // This is the same approach used by measure handlers which work correctly
        const xPos = event.point.x;
        const yPos = event.point.y;
        
        // Check if clicking on a measure element (Paper.js tool handlers prevent item handlers from firing)
        // Use hitTestAll to get all items at the point, not just the topmost group
        const hitResults = paper.project.hitTestAll(event.point, this.getHitTestOptions());
        
        if (hitResults && hitResults.length > 0) {
            // Look for arrow elements first, prioritizing control points over curves
            // First pass: look for control points specifically
            for (const result of hitResults) {
                const item = result.item;
                
                if (item.data && item.data.arrowName && item.data.type === 'arrow-control-point') {
                    // Found a control point - prioritize this
                    let arrowGroup = item;
                    while (arrowGroup && (!arrowGroup.data || arrowGroup.data.type !== 'arrow')) {
                        arrowGroup = arrowGroup.parent;
                    }
                    
                    if (arrowGroup && arrowGroup.onMouseDown) {
                        const customEvent = {
                            ...event,
                            clickedItem: item,
                            target: item
                        };
                        //arrowGroup.emit('mousedown', customEvent);
                        return;
                    }
                    
                    // Fallback: handle directly
                    this.startDraggingArrowPoint(item.data.arrowName, item.data.pointIndex, event);
                    return;
                }
            }
            
            // Second pass: look for other arrow elements (curves, etc)
            // Track which arrow groups we've already handled to avoid multiple invocations
            const handledArrows = new Set();
            
            for (const result of hitResults) {
                const item = result.item;
                
                // Check if this is an arrow element (but not control point which we handled above)
                if (item.data && item.data.arrowName) {
                    const arrowName = item.data.arrowName;
                    
                    // Skip if we've already handled this arrow in this click
                    if (handledArrows.has(arrowName)) {
                        continue;
                    }
                    
                    // Find the arrow group
                    let arrowGroup = item;
                    while (arrowGroup && (!arrowGroup.data || arrowGroup.data.type !== 'arrow')) {
                        arrowGroup = arrowGroup.parent;
                    }
                    
                    // If we found the arrow group and it has a handler, emit the event to it
                    if (arrowGroup && arrowGroup.onMouseDown) {
                        // Mark this arrow as handled
                        handledArrows.add(arrowName);
                        
                        const customEvent = {
                            ...event,
                            clickedItem: item,
                            target: item
                        };
                        //arrowGroup.emit('mousedown', customEvent);
                        return;
                    }
                    
                    // Fallback: handle directly if group not found or no handler
                    if (item.data.type === 'arrow-curve' || item.data.type === 'arrow-curve-visual' || 
                               item.data.type === 'arrow-start' || item.data.type === 'arrow-head') {
                        // Mark this arrow as handled
                        handledArrows.add(arrowName);
                        
                        // Toggle edit mode for the arrow
                        if (this.arrowEditMode && this.currentEditingArrowName === arrowName) {
                            this.stopEditingArrow();
                        } else {
                            this.startEditingArrow(arrowName);
                        }
                        return;
                    }
                }
            }
            
            // Check for AC Table cell clicks (before measure check)
            for (const result of hitResults) {
                const item = result.item;
                
                if (item.data && item.data.type === 'ac-table-cell' && item.data.measureName) {
                    // Left-click on AC Table cell - flash the corresponding measure
                    this.flashMeasure(item.data.measureName);
                    return;
                }
            }
            
            // Look for the first hit that is a measure child element (text, vbar, arrow)
            // or find a measure group
            let measureGroup = null;
            let hitItem = null;
            
            for (const result of hitResults) {
                const item = result.item;
                
                // Check if this is a measure child element
                if (item.data && (item.data.type === 'text' || item.data.type === 'vbar' || item.data.type === 'arrow')) {
                    hitItem = item;
                    // Find the measure group parent
                    let parent = item.parent;
                    while (parent) {
                        if (parent.data && parent.data.type === 'measure') {
                            measureGroup = parent;
                            break;
                        }
                        parent = parent.parent;
                    }
                    if (measureGroup) break;
                } else if (item.data && item.data.type === 'measure') {
                    // Found the group itself
                    measureGroup = item;
                }
            }
            
            if (measureGroup && hitItem) {
                // Handle based on the specific child element that was clicked
                const measureIndex = measureGroup.data.measureIndex;
                
                // Debug logging to help diagnose click issues
                console.log('[Measure Click] Detected:', hitItem.data.type, 'at measureIndex:', measureIndex);
                
                if (hitItem.data.type === 'text') {
                    // Start dragging text
                    console.log('[Measure Click] Starting text drag');
                    this.startDragMeasureText(measureIndex, event);
                    return;
                } else if (hitItem.data.type === 'vbar') {
                    // Re-choose measure point
                    console.log('[Measure Click] Starting point rechoose, pointIndex:', hitItem.data.pointIndex);
                    this.startRechooseMeasurePoint(measureIndex, hitItem.data.pointIndex);
                    return;
                } else if (hitItem.data.type === 'arrow') {
                    // Start moving measure to another row
                    console.log('[Measure Click] Starting measure row move');
                    this.startMovingMeasureRow(measureIndex, event);
                    return;
                }
            }
        }
        
        // xPos and yPos already calculated above
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
                    const measure = this.measuresData.get(this.currentEditingMeasureName);
                    if (measure) {
                        const signal = this.getSignalByIndex(transition.signalIndex);
                        measure.signal1Name = signal.name;
                        measure.cycle1 = transition.cycle;
                        
                        // Exit re-choose mode
                        this.measureMode = false;
                        this.measureState = null;
                        this.rechoosingPointIndex = null;
                        this.currentEditingMeasureName = null;
                        this.canvas.style.cursor = 'default';
                        this.hideInstruction();
                        
                        // Restore original onMouseMove handler
                        this.tool.onMouseMove = this.originalOnMouseMove;
                        
                        this.render();
                    }
                }
                return;
            } else if (this.measureState === 'rechoose-point-2') {
                // Re-choosing second point
                const transition = this.findNearestTransition(xPos, yPos);
                
                if (transition) {
                    const measure = this.measuresData.get(this.currentEditingMeasureName);
                    if (measure) {
                        const signal = this.getSignalByIndex(transition.signalIndex);
                        measure.signal2Name = signal.name;
                        measure.cycle2 = transition.cycle;
                        
                        // Exit re-choose mode
                        this.measureMode = false;
                        this.measureState = null;
                        this.rechoosingPointIndex = null;
                        this.currentEditingMeasureName = null;
                        this.canvas.style.cursor = 'default';
                        this.hideInstruction();
                        
                        // Restore original onMouseMove handler
                        this.tool.onMouseMove = this.originalOnMouseMove;
                        
                        this.render();
                    }
                }
                return;
            }
        }
        
        // Handle arrow mode clicks
        if (this.arrowMode) {
            if (this.arrowState === 'first-point') {
                // First click: select start point at nearest POI (cycle boundary)
                const mouseX = event.point.x;
                const mouseY = event.point.y;
                const poi = this.findNearestPOI(mouseX, mouseY);
                if (poi) {
                    const signal = this.getSignalByIndex(poi.signalIndex);
                    if (signal) {
                        // Get all POI options and find the closest one
                        const allPOIs = this.getAllPOIsForSignalCycle(signal.name, poi.cycle);
                        const closestPOI = this.findClosestPOI(allPOIs, mouseX, mouseY);
                        
                        if (closestPOI) {
                            this.currentArrow.startX = closestPOI.x;
                            this.currentArrow.startY = closestPOI.y;
                            this.currentArrow.signal1Name = signal.name;
                            this.currentArrow.cycle1 = poi.cycle;
                            this.currentArrow.poi1Type = closestPOI.poiType;
                            
                            this.arrowState = 'second-point';
                            this.showInstruction("Click at the end point (result)");
                        }
                    }
                }
                return;
            } else if (this.arrowState === 'second-point') {
                // Second click: select end point at nearest POI (cycle boundary)
                const mouseX = event.point.x;
                const mouseY = event.point.y;
                const poi = this.findNearestPOI(mouseX, mouseY);
                if (poi) {
                    const signal = this.getSignalByIndex(poi.signalIndex);
                    if (signal) {
                        // Get all POI options and find the closest one
                        const allPOIs = this.getAllPOIsForSignalCycle(signal.name, poi.cycle);
                        const closestPOI = this.findClosestPOI(allPOIs, mouseX, mouseY);
                        
                        if (closestPOI) {
                            this.currentArrow.endX = closestPOI.x;
                            this.currentArrow.endY = closestPOI.y;
                            this.currentArrow.signal2Name = signal.name;
                            this.currentArrow.cycle2 = poi.cycle;
                            this.currentArrow.poi2Type = closestPOI.poiType;
                            
                            // Finalize the arrow
                            this.finalizeArrow();
                        }
                    }
                }
                return;
            }
        }
        
        // Handle moving measure to another row
        if (this.isMovingMeasureRow) {
            const row = this.getRowAtY(yPos);
            if (row) {
                const measure = this.measuresData.get(this.currentEditingMeasureName);
                if (measure) {
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
                    this.currentEditingMeasureName = null;
                    this.measureMode = false;
                    this.measureState = null;
                    this.canvas.style.cursor = 'default';
                    this.hideInstruction();
                    
                    // Restore original onMouseMove handler
                    this.tool.onMouseMove = this.originalOnMouseMove;
                    
                    this.render();
                }
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
                } else if (row.type === 'text') {
                    // Right-click on text row name column - show delete/cancel menu
                    this.currentEditingText = row.name;
                    TimingGenUI.showContextMenu('text-row-name-context-menu', ev.clientX, ev.clientY);
                } else if (row.type === 'measure') {
                    // Right-click on measure row name column - show delete/cancel menu
                    this.currentEditingMeasureRow = row.index;
                    TimingGenUI.showContextMenu('measure-row-name-context-menu', ev.clientX, ev.clientY);
                }
            }
            return;
        }
        
        // Check if right-click is in waveform area
        const cycle = Math.floor((xPos - this.config.nameColumnWidth) / this.config.cycleWidth);
        const row = this.getRowAtY(yPos);
        
        // First check for arrow elements (they overlay signals)
        const point = new paper.Point(xPos, yPos);
        const hitResults = paper.project.hitTestAll(point, this.getHitTestOptions());
        
        if (hitResults && hitResults.length > 0) {
            // Look for arrow elements first
            for (const result of hitResults) {
                const item = result.item;
                
                if (item.data && item.data.arrowName) {
                    const arrowName = item.data.arrowName;
                    
                    if (item.data.type === 'arrow-text') {
                        // Right-click on arrow text
                        this.currentEditingArrowName = arrowName;
                        this.showArrowTextContextMenu(ev, arrowName);
                        return;
                    } else if (item.data.type === 'arrow-curve' || item.data.type === 'arrow-curve-visual' ||
                               item.data.type === 'arrow-start' || item.data.type === 'arrow-head' ||
                               item.data.type === 'arrow-control-point') {
                        // Right-click on arrow
                        this.showArrowContextMenu(ev, arrowName);
                        return;
                    }
                }
            }
        }
        
        if (row) {
            if (row.type === 'text') {
                // Right-click on text row - show text context menu
                this.currentEditingText = row.name;
                TimingGenUI.showContextMenu('text-context-menu', ev.clientX, ev.clientY);
                return;
            } else if (row.type === 'ac-table') {
                // Right-click on AC Table - check what was clicked
                if (hitResults && hitResults.length > 0) {
                    for (const result of hitResults) {
                        const item = result.item;
                        
                        if (item.data && item.data.tableName === row.name) {
                            if (item.data.type === 'ac-table-cell') {
                                // Right-click on a cell
                                this.currentEditingACCell = {
                                    tableName: row.name,
                                    cellType: 'data',
                                    rowIndex: item.data.rowIndex,
                                    colIndex: item.data.colIndex,
                                    colName: ['parameter', 'symbol', 'min', 'max', 'unit', 'note'][item.data.colIndex]
                                };
                                
                                // Show parameter context menu if it's parameter column (index 0)
                                if (item.data.colIndex === 0) {
                                    TimingGenUI.showContextMenu('ac-param-context-menu', ev.clientX, ev.clientY);
                                } else {
                                    TimingGenUI.showContextMenu('ac-cell-context-menu', ev.clientX, ev.clientY);
                                }
                                return;
                            } else if (item.data.type === 'ac-table-note-text') {
                                // Right-click on note field text
                                this.currentEditingACCell = {
                                    tableName: row.name,
                                    cellType: 'note',
                                    colName: item.data.noteNum
                                };
                                TimingGenUI.showContextMenu('ac-cell-context-menu', ev.clientX, ev.clientY);
                                return;
                            } else if (item.data.type === 'ac-table-title' || item.data.type === 'ac-table-border') {
                                // Right-click on table title or border - show table menu
                                this.currentEditingACTable = row.name;
                                TimingGenUI.showContextMenu('ac-table-context-menu', ev.clientX, ev.clientY);
                                return;
                            }
                        }
                    }
                }
                return;
            } else if (row.type === 'measure') {
                // Right-click on measure row - check what element was clicked
                // Use Paper.js hitTestAll to get all items, not just the topmost group
                
                if (hitResults && hitResults.length > 0) {
                    // Look for the first hit that is a measure child element or group
                    let measureGroup = null;
                    let hitItem = null;
                    
                    for (const result of hitResults) {
                        const item = result.item;
                        
                        // Check if this is a measure child element
                        if (item.data && (item.data.type === 'text' || item.data.type === 'vbar' || item.data.type === 'arrow')) {
                            hitItem = item;
                            // Find the measure group parent
                            let parent = item.parent;
                            while (parent) {
                                if (parent.data && parent.data.type === 'measure') {
                                    measureGroup = parent;
                                    break;
                                }
                                parent = parent.parent;
                            }
                            if (measureGroup) break;
                        } else if (item.data && item.data.type === 'measure') {
                            // Found the group itself
                            measureGroup = item;
                        }
                    }
                    
                    if (measureGroup && measureGroup.data) {
                        const measureIndex = measureGroup.data.measureIndex;
                        this.currentEditingMeasure = measureIndex;
                        
                        // Check if clicking on text specifically
                        if (hitItem && hitItem.data && hitItem.data.type === 'text') {
                            this.isMeasureTextContext = true;
                            TimingGenUI.showContextMenu('text-context-menu', ev.clientX, ev.clientY);
                        } else {
                            // General measure context menu
                            this.isMeasureTextContext = false;
                            this.showMeasureContextMenu(ev, measureIndex);
                        }
                        return;
                    }
                }
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
        // Use Paper.js's event.point for accurate canvas coordinates
        const xPos = event.point.x;
        const yPos = event.point.y;
        
        // Handle arrow point dragging
        if (this.isDraggingArrowPoint && this.currentEditingArrowName) {
            this.updateArrowPoint(this.currentEditingArrowName, this.draggingArrowPointIndex, xPos, yPos);
            return;
        }
        
        // Handle text dragging
        if (this.textDragState) {
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
        
        // Handle measure text dragging
        if (this.isDraggingMeasureText && this.draggingMeasure) {
            const deltaX = xPos - this.dragStartX;
            const newTextX = (this.originalTextX ?? 0) + deltaX;
            console.log('[Drag Move] deltaX:', deltaX, 'newTextX:', newTextX);
            this.draggingMeasure.textX = newTextX;
            this.render();
        }
    }
    
    handleCanvasMouseUp(event) {
        // End arrow point dragging
        if (this.isDraggingArrowPoint) {
            this.isDraggingArrowPoint = false;
            this.draggingArrowPointIndex = null;
            this.canvas.style.cursor = 'default';
        }
        
        // End text dragging
        if (this.textDragState) {
            this.textDragState = null;
            this.canvas.style.cursor = 'default';
        }
        
        // End measure text dragging
        if (this.isDraggingMeasureText) {
            console.log('[Drag End] Mouse up detected');
            this.isDraggingMeasureText = false;
            this.draggingMeasure = null;
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
        if (rowIndex < 0 || rowIndex > this.rows.length) {
            return null;
        }
        
        // Allow rowIndex === this.rows.length for "insert at end" position
        if (rowIndex === this.rows.length) {
            return {
                index: rowIndex,
                type: 'end', // Special marker for end position
                name: null
            };
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
        
        // Recalculate arrow positions when signals move
        this.recalculateArrowPositions();
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
        
        // Update arrow cycle references
        this.updateArrowCyclesAfterInsertion(startCycle, numCycles);
        
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
        
        // Update arrow cycle references
        this.updateArrowCyclesAfterDeletion(startCycle, numCycles);
        
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
    
    updateArrowCyclesAfterInsertion(startCycle, numCycles) {
        // Update cycle references in all arrows after cycles are inserted
        for (const [name, arrow] of this.arrowsData.entries()) {
            // Update cycle1 if it's after the insertion point
            if (arrow.cycle1 !== undefined && arrow.cycle1 > startCycle) {
                arrow.cycle1 += numCycles;
            }
            
            // Update cycle2 if it's after the insertion point
            if (arrow.cycle2 !== undefined && arrow.cycle2 > startCycle) {
                arrow.cycle2 += numCycles;
            }
        }
        
        // Recalculate arrow positions after cycle shift
        this.recalculateArrowPositions();
    }
    
    updateArrowCyclesAfterDeletion(startCycle, numCycles) {
        // Update cycle references in all arrows after cycles are deleted
        const arrowsToDelete = [];
        
        for (const [name, arrow] of this.arrowsData.entries()) {
            let shouldDelete = false;
            
            // Check if cycle1 is in the deleted range
            if (arrow.cycle1 !== undefined) {
                if (arrow.cycle1 >= startCycle && arrow.cycle1 < startCycle + numCycles) {
                    // POI was deleted - mark arrow for deletion
                    shouldDelete = true;
                } else if (arrow.cycle1 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    arrow.cycle1 -= numCycles;
                }
            }
            
            // Check if cycle2 is in the deleted range
            if (arrow.cycle2 !== undefined) {
                if (arrow.cycle2 >= startCycle && arrow.cycle2 < startCycle + numCycles) {
                    // POI was deleted - mark arrow for deletion
                    shouldDelete = true;
                } else if (arrow.cycle2 >= startCycle + numCycles) {
                    // Shift left by numCycles
                    arrow.cycle2 -= numCycles;
                }
            }
            
            if (shouldDelete) {
                arrowsToDelete.push(name);
            }
        }
        
        // Remove invalid arrows from Map
        arrowsToDelete.forEach(arrowName => {
            this.arrowsData.delete(arrowName);
        });
        
        // Recalculate arrow positions after cycle shift
        this.recalculateArrowPositions();
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
    
    findNearestPOI(xPos, yPos) {
        // Find the nearest point of interest (POI) to the click position
        // POIs are at cycle boundaries (vertical grid lines) representing the state at cycle beginning
        // Returns { signalIndex, cycle }
        const signals = this.getSignals();
        
        if (!signals || signals.length === 0) {
            console.warn('Cannot find POI: no signals loaded');
            return null;
        }
        
        const signalIndex = this.getSignalIndexAtY(yPos);
        if (signalIndex === -1 || signalIndex >= signals.length) {
            const cycle = this.getCycleAtX(xPos);
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        const signal = this.getSignalByIndex(signalIndex);
        if (!signal) {
            const cycle = this.getCycleAtX(xPos);
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        // Find the nearest cycle boundary (vertical grid line)
        const relativeX = xPos - this.config.nameColumnWidth;
        const nearestCycle = Math.round(relativeX / this.config.cycleWidth);
        
        // Clamp to valid range
        const cycle = Math.max(0, Math.min(this.config.cycles, nearestCycle));
        
        return { signalIndex, cycle };
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
        
        console.log('[handleMeasureMouseMove] Called - measureState:', this.measureState, 'isMovingMeasureRow:', this.isMovingMeasureRow);
        
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
        
        // Show snap-to indicator during rechoose point modes
        if (this.measureState === 'rechoose-point-1' || this.measureState === 'rechoose-point-2') {
            console.log('[handleMeasureMouseMove] Drawing orange snap indicator for rechoose mode');
            // Find snap-to point
            const snapPoint = this.findNearestTransition(xPos, yPos);
            if (snapPoint) {
                const snapX = this.getTransitionMidpointX(snapPoint.signalIndex, snapPoint.cycle);
                const snapY = this.rowManager.getRowYPosition(this.rowManager.signalIndexToRowIndex(snapPoint.signalIndex)) + this.config.rowHeight / 2;
                
                console.log('[handleMeasureMouseMove] Snap point found at:', snapX, snapY);
                
                // Draw snap-to indicator with different color (orange)
                const snapIndicator = new paper.Path.Circle({
                    center: [snapX, snapY],
                    radius: 8,
                    strokeColor: '#FFA500',
                    strokeWidth: 2,
                    fillColor: new paper.Color(1, 0.65, 0, 0.2) // Semi-transparent orange
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
            
            // Calculate row index from placement Y for row indicator
            const rowIndex = this.rowManager.getRowIndexAtY(placementY);
            
            // Draw dashed row indicator
            this.drawRowIndicator(rowIndex);
        }
        
        // Show row indicator when moving measure to another row
        if (this.isMovingMeasureRow) {
            console.log('[handleMeasureMouseMove] Drawing blue row indicator for row move mode');
            const rowIndex = this.rowManager.getRowIndexAtY(yPos);
            if (rowIndex >= 0 && rowIndex <= this.rows.length) {
                // Draw dashed row indicator in blue
                const rowYPos = this.config.headerHeight + (rowIndex + 0.5) * this.config.rowHeight;
                console.log('[handleMeasureMouseMove] Row indicator at Y:', rowYPos);
                const indicator = new paper.Path.Line({
                    from: [0, rowYPos],
                    to: [this.config.nameColumnWidth + this.config.cycles * this.config.cycleWidth, rowYPos],
                    strokeColor: '#0000FF', // Blue color for row move
                    strokeWidth: 2,
                    dashArray: [10, 5]
                });
                this.tempMeasureGraphics.push(indicator);
            }
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
        // After selecting row, auto-assign text as t1, t2, t3, etc.
        const measureRowIndex = this.currentMeasure.measureRow;
        
        // Auto-generate measure text (t1, t2, t3, ...)
        // Use dedicated counter to avoid duplicates when measures are deleted
        this.measureTextCounter++;
        this.currentMeasure.text = `t${this.measureTextCounter}`;
        
        // Store measure in Map
        this.measuresData.set(this.currentMeasure.name, this.currentMeasure);
        
        // Add row to all existing AC tables
        this.addACTableRowForMeasure(this.currentMeasure.name, this.currentMeasure);
        
        // Insert new measure row
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
        
        // Clean up measure mode state
        this.hideInstruction();
        this.measureMode = false;
        this.measureState = null;
        this.currentMeasure = null;
        this.canvas.style.cursor = 'default';
        
        // Restore original onMouseMove
        this.tool.onMouseMove = this.originalOnMouseMove;
        
        // Render the measure
        this.render();
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
            
            // Remove from AC tables first
            this.removeACTableRowForMeasure(measureName);
            
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
    
    startDragMeasureText(measureRowIndex, event) {
        // Start dragging measure text in X direction
        // measureRowIndex is the row index, not the measure array index
        console.log('[startDragMeasureText] Called with measureRowIndex:', measureRowIndex);
        
        // Find the measure by row index
        if (measureRowIndex < 0 || measureRowIndex >= this.rows.length) {
            console.log('[startDragMeasureText] Invalid measureRowIndex, aborting');
            return;
        }
        
        const row = this.rows[measureRowIndex];
        if (row.type !== 'measure') {
            console.log('[startDragMeasureText] Row is not a measure, aborting');
            return;
        }
        
        const measure = this.measuresData.get(row.name);
        if (!measure) {
            console.log('[startDragMeasureText] Measure not found, aborting');
            return;
        }
        
        const startX = event.point.x;
        
        // If textX is not set, we need to calculate the default rendered position
        // to use as the starting point for dragging
        let currentTextX = measure.textX;
        if (currentTextX == null) {
            // Calculate the default text position based on the measure coordinates
            const coords = this.getMeasureCoordinates(measure);
            const spacing = Math.abs(coords.x2 - coords.x1);
            const isInward = spacing < 30;
            const minX = Math.min(coords.x1, coords.x2);
            const maxX = Math.max(coords.x1, coords.x2);
            
            if (measure.text) {
                // Create temporary text to measure dimensions
                const tempText = new paper.PointText({
                    content: measure.text,
                    fontFamily: measure.textFont || 'Arial',
                    fontSize: measure.textSize || 12,
                    fontWeight: 'bold'
                });
                const textWidth = tempText.bounds.width;
                tempText.remove();
                
                const textGap = 10;
                if (isInward) {
                    // Inward arrows: text to the right
                    currentTextX = maxX + textGap;
                } else {
                    // Outward arrows: text in the middle
                    currentTextX = (minX + maxX) / 2 - textWidth / 2;
                }
            } else {
                // No text, use middle point
                currentTextX = (minX + maxX) / 2;
            }
        }
        
        console.log('[startDragMeasureText] Starting drag at X:', startX, 'currentTextX:', currentTextX);
        
        this.isDraggingMeasureText = true;
        this.currentEditingMeasureRow = measureRowIndex;
        this.dragStartX = startX;
        this.originalTextX = currentTextX;
        this.draggingMeasure = measure; // Store reference to the measure being dragged
        
        this.canvas.style.cursor = 'ew-resize'; // Show horizontal resize cursor
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
    
    startRechooseMeasurePoint(measureRowIndex, pointIndex) {
        // Allow user to re-choose a measure point
        // measureRowIndex is the row index, not the measure array index
        console.log('[startRechooseMeasurePoint] Called with measureRowIndex:', measureRowIndex, 'pointIndex:', pointIndex);
        
        if (measureRowIndex < 0 || measureRowIndex >= this.rows.length) {
            console.log('[startRechooseMeasurePoint] Invalid measureRowIndex, aborting');
            return;
        }
        
        const row = this.rows[measureRowIndex];
        if (row.type !== 'measure') {
            console.log('[startRechooseMeasurePoint] Row is not a measure, aborting');
            return;
        }
        
        const measure = this.measuresData.get(row.name);
        if (!measure) {
            console.log('[startRechooseMeasurePoint] Measure not found, aborting');
            return;
        }
        
        // Store measure name for later use
        this.currentEditingMeasureName = measure.name;
        this.rechoosingPointIndex = pointIndex;
        
        // Enter re-choose mode
        this.measureMode = true;
        this.measureState = pointIndex === 1 ? 'rechoose-point-1' : 'rechoose-point-2';
        this.canvas.style.cursor = 'crosshair';
        
        // Set up onMouseMove handler for visual feedback
        // Save current handler only if not already saved (prevents overwriting during nested calls)
        if (this.originalOnMouseMove === undefined) {
            this.originalOnMouseMove = this.tool.onMouseMove || null;
        }
        this.tool.onMouseMove = (event) => this.handleMeasureMouseMove(event);
        
        console.log('[startRechooseMeasurePoint] Entering rechoose mode for point', pointIndex);
        this.showInstruction(`Click to re-choose point ${pointIndex}`);
    }
    
    startMovingMeasureRow(measureRowIndex, event) {
        // Start moving measure to another row
        // measureRowIndex is the row index, not the measure array index
        console.log('[startMovingMeasureRow] Called with measureRowIndex:', measureRowIndex);
        
        if (measureRowIndex < 0 || measureRowIndex >= this.rows.length) {
            console.log('[startMovingMeasureRow] Invalid measureRowIndex, aborting');
            return;
        }
        
        const row = this.rows[measureRowIndex];
        if (row.type !== 'measure') {
            console.log('[startMovingMeasureRow] Row is not a measure, aborting');
            return;
        }
        
        const measure = this.measuresData.get(row.name);
        if (!measure) {
            console.log('[startMovingMeasureRow] Measure not found, aborting');
            return;
        }
        
        // Store measure name for later use
        this.currentEditingMeasureName = measure.name;
        this.movingMeasureRowIndex = measureRowIndex;
        this.canvas.style.cursor = 'move';
        
        console.log('[startMovingMeasureRow] Entering move mode for row', measureRowIndex);
        this.showInstruction('Click on a row to move the measure there');
        
        // Set up click handler for selecting new row
        this.isMovingMeasureRow = true;
        
        // Enable measure mode so handleMeasureMouseMove is called for visual feedback
        this.measureMode = true;
        this.measureState = null; // No specific measure state, just moving
        
        // Set up onMouseMove handler for visual feedback
        // Save current handler only if not already saved (prevents overwriting during nested calls)
        if (this.originalOnMouseMove === undefined) {
            this.originalOnMouseMove = this.tool.onMouseMove || null;
        }
        this.tool.onMouseMove = (event) => this.handleMeasureMouseMove(event);
    }
    
    // ===========================
    // Arrow Functions
    // ===========================
    
    startArrowMode() {
        this.arrowMode = true;
        this.arrowState = 'first-point';
        // Generate unique arrow name
        const arrowName = `A${this.arrowCounter}`;
        this.arrowCounter++;
        
        this.currentArrow = {
            name: arrowName,
            signal1Name: null,
            cycle1: null,
            poi1Type: 'auto',  // POI type for start point
            signal2Name: null,
            cycle2: null,
            poi2Type: 'auto',  // POI type for end point
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            ctrl1X: null,
            ctrl1Y: null,
            ctrl2X: null,
            ctrl2Y: null,
            width: 2,  // Default arrow width
            color: '#0000FF',  // Default blue color
            text: 'result',  // Default text label
            textFont: 'Arial',
            textSize: 12,
            textColor: '#0000FF'
        };
        this.canvas.style.cursor = 'crosshair';
        
        // Show instruction
        this.showInstruction("Click at the start point (trigger)");
        
        // Add onMouseMove handler for visual feedback
        this.originalOnMouseMove = this.tool.onMouseMove;
        this.tool.onMouseMove = (event) => this.handleArrowMouseMove(event);
    }
    
    handleArrowMouseMove(event) {
        // Show visual feedback while creating arrow
        if (!this.arrowMode) return;
        
        // Clear any temporary graphics
        if (this.tempArrowGraphics) {
            this.tempArrowGraphics.remove();
            this.tempArrowGraphics = null;
        }
        
        // Use Paper.js's event.point for accurate canvas coordinates
        const mouseX = event.point.x;
        const mouseY = event.point.y;
        
        const poi = this.findNearestPOI(mouseX, mouseY);
        if (poi) {
            const signal = this.getSignalByIndex(poi.signalIndex);
            if (signal) {
                // Get all available POIs for this signal and cycle
                const allPOIs = this.getAllPOIsForSignalCycle(signal.name, poi.cycle);
                const closestPOI = this.findClosestPOI(allPOIs, mouseX, mouseY);
                
                if (closestPOI) {
                    // Draw only the closest POI as a highlight circle
                    this.tempArrowGraphics = new paper.Group();
                    const circle = new paper.Path.Circle({
                        center: [closestPOI.x, closestPOI.y],
                        radius: 5,
                        fillColor: '#0000FF',
                        strokeColor: '#FFFFFF',
                        strokeWidth: 2,
                        opacity: 0.7
                    });
                    this.tempArrowGraphics.addChild(circle);
                    
                    paper.view.draw();
                }
            }
        }
    }
    
    cancelArrow() {
        this.arrowMode = false;
        this.arrowState = null;
        this.currentArrow = null;
        this.arrowEditMode = false;
        this.currentEditingArrowName = null;
        this.canvas.style.cursor = 'default';
        
        // Clear temporary graphics
        if (this.tempArrowGraphics) {
            this.tempArrowGraphics.remove();
            this.tempArrowGraphics = null;
        }
        
        // Restore original mouse move handler
        if (this.originalOnMouseMove !== undefined) {
            this.tool.onMouseMove = this.originalOnMouseMove;
            this.originalOnMouseMove = undefined;
        }
        
        this.hideInstruction();
        this.render();
    }
    
    finalizeArrow() {
        // Calculate control points for bezier curve
        const dx = this.currentArrow.endX - this.currentArrow.startX;
        const dy = this.currentArrow.endY - this.currentArrow.startY;
        
        // Control points should create somewhat horizontal exit/entry
        // The "somewhat" is because signals are often in different rows and close in X
        const horizontalBias = Math.min(Math.abs(dx) * 0.5, 100); // Max 100px horizontal bias
        
        // Control point 1: exit somewhat horizontally to the right
        this.currentArrow.ctrl1X = this.currentArrow.startX + horizontalBias;
        this.currentArrow.ctrl1Y = this.currentArrow.startY;
        
        // Control point 2: enter somewhat horizontally from the left
        this.currentArrow.ctrl2X = this.currentArrow.endX - horizontalBias;
        this.currentArrow.ctrl2Y = this.currentArrow.endY;
        
        // Store in arrowsData
        this.arrowsData.set(this.currentArrow.name, { ...this.currentArrow });
        
        // Clear temporary state
        this.arrowMode = false;
        this.arrowState = null;
        this.currentArrow = null;
        this.canvas.style.cursor = 'default';
        
        // Clear temporary graphics
        if (this.tempArrowGraphics) {
            this.tempArrowGraphics.remove();
            this.tempArrowGraphics = null;
        }
        
        // Restore original mouse move handler
        if (this.originalOnMouseMove !== undefined) {
            this.tool.onMouseMove = this.originalOnMouseMove;
            this.originalOnMouseMove = undefined;
        }
        
        this.hideInstruction();
        this.render();
    }
    
    deleteArrow() {
        if (this.currentEditingArrowName) {
            this.arrowsData.delete(this.currentEditingArrowName);
            this.currentEditingArrowName = null;
            this.arrowEditMode = false;
            this.hideAllMenus();
            this.render();
        }
    }
    
    showArrowOptionsDialog() {
        if (!this.currentEditingArrowName) return;
        
        const arrow = this.arrowsData.get(this.currentEditingArrowName);
        if (!arrow) return;
        
        // Populate dialog with current values
        document.getElementById('arrow-width-input').value = arrow.width || 2;
        document.getElementById('arrow-color-input').value = arrow.color || '#0000FF';
        
        // Show dialog
        document.getElementById('arrow-options-dialog').style.display = 'flex';
        this.hideAllMenus();
    }
    
    hideArrowOptionsDialog() {
        document.getElementById('arrow-options-dialog').style.display = 'none';
    }
    
    applyArrowOptions() {
        if (!this.currentEditingArrowName) {
            this.hideArrowOptionsDialog();
            return;
        }
        
        const arrow = this.arrowsData.get(this.currentEditingArrowName);
        if (!arrow) {
            this.hideArrowOptionsDialog();
            return;
        }
        
        // Get values from dialog
        arrow.width = parseInt(document.getElementById('arrow-width-input').value) || 2;
        arrow.color = document.getElementById('arrow-color-input').value || '#0000FF';
        
        this.hideArrowOptionsDialog();
        this.render();
    }
    
    showArrowContextMenu(event, arrowName) {
        this.currentEditingArrowName = arrowName;
        this.hideAllMenus();
        
        const menu = document.getElementById('arrow-context-menu');
        menu.style.display = 'block';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
    }
    
    showArrowTextContextMenu(event, arrowName) {
        this.currentEditingArrowName = arrowName;
        this.hideAllMenus();
        
        const menu = document.getElementById('arrow-text-context-menu');
        menu.style.display = 'block';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
    }
    
    showEditArrowTextDialog() {
        if (!this.currentEditingArrowName) return;
        
        const arrow = this.arrowsData.get(this.currentEditingArrowName);
        if (!arrow) return;
        
        document.getElementById('edit-arrow-text-input').value = arrow.text || '';
        document.getElementById('edit-arrow-text-dialog').style.display = 'flex';
        this.hideAllMenus();
    }
    
    hideEditArrowTextDialog() {
        document.getElementById('edit-arrow-text-dialog').style.display = 'none';
    }
    
    applyEditArrowText() {
        if (!this.currentEditingArrowName) {
            this.hideEditArrowTextDialog();
            return;
        }
        
        const arrow = this.arrowsData.get(this.currentEditingArrowName);
        if (!arrow) {
            this.hideEditArrowTextDialog();
            return;
        }
        
        arrow.text = document.getElementById('edit-arrow-text-input').value;
        this.hideEditArrowTextDialog();
        this.render();
    }
    
    showArrowTextOptionsDialog() {
        if (!this.currentEditingArrowName) return;
        
        const arrow = this.arrowsData.get(this.currentEditingArrowName);
        if (!arrow) return;
        
        document.getElementById('arrow-text-font-select').value = arrow.textFont || 'Arial';
        document.getElementById('arrow-text-size-input').value = arrow.textSize || 12;
        document.getElementById('arrow-text-color-input').value = arrow.textColor || arrow.color || '#0000FF';
        document.getElementById('arrow-text-options-dialog').style.display = 'flex';
        this.hideAllMenus();
    }
    
    hideArrowTextOptionsDialog() {
        document.getElementById('arrow-text-options-dialog').style.display = 'none';
    }
    
    applyArrowTextOptions() {
        if (!this.currentEditingArrowName) {
            this.hideArrowTextOptionsDialog();
            return;
        }
        
        const arrow = this.arrowsData.get(this.currentEditingArrowName);
        if (!arrow) {
            this.hideArrowTextOptionsDialog();
            return;
        }
        
        arrow.textFont = document.getElementById('arrow-text-font-select').value;
        arrow.textSize = parseInt(document.getElementById('arrow-text-size-input').value, 10) || 12;
        arrow.textColor = document.getElementById('arrow-text-color-input').value;
        this.hideArrowTextOptionsDialog();
        this.render();
    }
    
    startEditingArrow(arrowName) {
        this.arrowEditMode = true;
        this.currentEditingArrowName = arrowName;
        this.render();
    }
    
    stopEditingArrow() {
        this.arrowEditMode = false;
        this.currentEditingArrowName = null;
        this.isDraggingArrowPoint = false;
        this.draggingArrowPointIndex = null;
        this.render();
    }
    
    startDraggingArrowPoint(arrowName, pointIndex, event) {
        this.isDraggingArrowPoint = true;
        this.draggingArrowPointIndex = pointIndex;
        this.currentEditingArrowName = arrowName;
        this.canvas.style.cursor = 'move';
    }
    
    findClosestPOI(allPOIs, x, y) {
        // Find the closest POI to the given (x, y) coordinates
        // Uses squared distances for performance (avoids Math.sqrt)
        if (!allPOIs || allPOIs.length === 0) return null;
        
        let closestPOI = allPOIs[0];
        let minDistSq = (x - allPOIs[0].x) ** 2 + (y - allPOIs[0].y) ** 2;
        
        for (let i = 1; i < allPOIs.length; i++) {
            const distSq = (x - allPOIs[i].x) ** 2 + (y - allPOIs[i].y) ** 2;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestPOI = allPOIs[i];
            }
        }
        
        return closestPOI;
    }
    
    updateArrowPoint(arrowName, pointIndex, x, y) {
        const arrow = this.arrowsData.get(arrowName);
        if (!arrow) return;
        
        // Update the appropriate point
        if (pointIndex === 0) {
            // Start point - snap to closest POI (cycle boundary) with user-selectable type
            const poi = this.findNearestPOI(x, y);
            if (poi) {
                const signal = this.getSignalByIndex(poi.signalIndex);
                if (signal) {
                    // Get all POI options and find the closest one
                    const allPOIs = this.getAllPOIsForSignalCycle(signal.name, poi.cycle);
                    const closestPOI = this.findClosestPOI(allPOIs, x, y);
                    
                    if (closestPOI) {
                        arrow.startX = closestPOI.x;
                        arrow.startY = closestPOI.y;
                        arrow.signal1Name = signal.name;
                        arrow.cycle1 = poi.cycle;
                        arrow.poi1Type = closestPOI.poiType;
                    }
                }
            }
        } else if (pointIndex === 1) {
            // Control point 1 - free positioning
            arrow.ctrl1X = x;
            arrow.ctrl1Y = y;
        } else if (pointIndex === 2) {
            // Control point 2 - free positioning
            arrow.ctrl2X = x;
            arrow.ctrl2Y = y;
        } else if (pointIndex === 3) {
            // End point - snap to closest POI (cycle boundary) with user-selectable type
            const poi = this.findNearestPOI(x, y);
            if (poi) {
                const signal = this.getSignalByIndex(poi.signalIndex);
                if (signal) {
                    // Get all POI options and find the closest one
                    const allPOIs = this.getAllPOIsForSignalCycle(signal.name, poi.cycle);
                    const closestPOI = this.findClosestPOI(allPOIs, x, y);
                    
                    if (closestPOI) {
                        arrow.endX = closestPOI.x;
                        arrow.endY = closestPOI.y;
                        arrow.signal2Name = signal.name;
                        arrow.cycle2 = poi.cycle;
                        arrow.poi2Type = closestPOI.poiType;
                    }
                }
            }
        }
        
        this.render();
    }
    
    recalculateArrowPositions() {
        // Recalculate arrow positions when signals move
        for (const [name, arrow] of this.arrowsData.entries()) {
            // Recalculate start point using POI with stored type
            if (arrow.signal1Name !== null && arrow.cycle1 !== null) {
                const poiType = arrow.poi1Type || 'auto';
                const point = this.getPointOfInterest(arrow.signal1Name, arrow.cycle1, poiType);
                if (point) {
                    arrow.startX = point.x;
                    arrow.startY = point.y;
                }
            }
            
            // Recalculate end point using POI with stored type
            if (arrow.signal2Name !== null && arrow.cycle2 !== null) {
                const poiType = arrow.poi2Type || 'auto';
                const point = this.getPointOfInterest(arrow.signal2Name, arrow.cycle2, poiType);
                if (point) {
                    arrow.endX = point.x;
                    arrow.endY = point.y;
                }
            }
            
            // Recalculate control points based on new positions
            // Only if both start and end points exist
            if (arrow.startX != null && arrow.endX != null && 
                arrow.startY != null && arrow.endY != null) {
                const dx = arrow.endX - arrow.startX;
                const horizontalBias = Math.min(Math.abs(dx) * 0.5, 100);
                arrow.ctrl1X = arrow.startX + horizontalBias;
                arrow.ctrl1Y = arrow.startY;
                arrow.ctrl2X = arrow.endX - horizontalBias;
                arrow.ctrl2Y = arrow.endY;
            }
        }
    }
    
    getPointOfInterest(signalName, cycle, poiType = 'auto') {
        // Get the screen coordinates for a point of interest on a signal at a cycle
        // poiType options:
        // - 'auto': Auto-detect based on signal state (default)
        // - 'low': Low state at cycle beginning
        // - 'mid': Middle state at cycle beginning
        // - 'high': High state at cycle beginning
        // - 'slew-start': Start of slew slope
        // - 'slew-center': Center of slew slope
        // - 'slew-end': End of slew slope
        // - 'rising': Middle of rising transition (clock)
        // - 'falling': Middle of falling transition (clock)
        
        const signal = this.getSignalByName(signalName);
        if (!signal) return null;
        
        const signals = this.getSignals();
        const signalIndex = signals.findIndex(s => s.name === signalName);
        if (signalIndex < 0) return null;
        
        const signalRow = this.rowManager.signalIndexToRowIndex(signalIndex);
        const baseY = this.rowManager.getRowYPosition(signalRow);
        
        let x, y;
        
        if (signal.type === 'clock') {
            // Clock signal POIs
            if (poiType === 'rising' || (poiType === 'auto' && cycle > 0)) {
                // Middle of rising transition (at cycle boundary)
                x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
                y = baseY + this.config.rowHeight * 0.5;
            } else if (poiType === 'falling') {
                // Middle of falling transition (at mid-cycle)
                x = this.config.nameColumnWidth + cycle * this.config.cycleWidth + this.config.cycleWidth * 0.5;
                y = baseY + this.config.rowHeight * 0.5;
            } else {
                // Default: cycle boundary, middle
                x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
                y = baseY + this.config.rowHeight * 0.5;
            }
        } else if (signal.type === 'bit' || signal.type === 'bus') {
            // Bit/Bus signal POIs
            const stateCycle = cycle === 0 ? 0 : cycle - 1;
            const currentValue = this.getBitValueAtCycle(signal, cycle);
            const prevValue = this.getBitValueAtCycle(signal, stateCycle);
            const hasTransition = cycle > 0 && currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X';
            
            // Calculate slew positions using signal-specific delay and slew values
            const delayInfo = this.getEffectiveDelay(signal, cycle);
            const slewPixels = this.getEffectiveSlew(signal, cycle);
            const slewStartX = this.config.nameColumnWidth + cycle * this.config.cycleWidth + delayInfo.min;
            const slewEndX = slewStartX + slewPixels;
            const slewCenterX = slewStartX + slewPixels / 2;
            
            if (poiType === 'low' || (poiType === 'auto' && prevValue === 0)) {
                x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
                y = baseY + this.config.rowHeight * 0.8;
            } else if (poiType === 'high' || (poiType === 'auto' && prevValue === 1)) {
                x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
                y = baseY + this.config.rowHeight * 0.2;
            } else if (poiType === 'mid' || poiType === 'auto') {
                x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
                y = baseY + this.config.rowHeight * 0.5;
            } else if (poiType === 'slew-start' && hasTransition) {
                x = slewStartX;
                // Y position at start of slew (at previous value level)
                if (prevValue === 0) {
                    y = baseY + this.config.rowHeight * 0.8;  // Low
                } else if (prevValue === 1) {
                    y = baseY + this.config.rowHeight * 0.2;  // High
                } else {
                    y = baseY + this.config.rowHeight * 0.5;  // Mid (for Z/X)
                }
            } else if (poiType === 'slew-center' && hasTransition) {
                x = slewCenterX;
                y = baseY + this.config.rowHeight * 0.5;  // Always middle during transition
            } else if (poiType === 'slew-end' && hasTransition) {
                x = slewEndX;
                // Y position at end of slew (at current value level)
                if (currentValue === 0) {
                    y = baseY + this.config.rowHeight * 0.8;  // Low
                } else if (currentValue === 1) {
                    y = baseY + this.config.rowHeight * 0.2;  // High
                } else {
                    y = baseY + this.config.rowHeight * 0.5;  // Mid (for Z/X)
                }
            } else {
                // Fallback to cycle boundary, middle
                x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
                y = baseY + this.config.rowHeight * 0.5;
            }
        } else {
            // Unknown signal type, use middle
            x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
            y = baseY + this.config.rowHeight * 0.5;
        }
        
        return { x, y, signalName, cycle, poiType };
    }
    
    getAllPOIsForSignalCycle(signalName, cycle) {
        // Get all available POI options for a signal at a given cycle
        const signal = this.getSignalByName(signalName);
        if (!signal) return [];
        
        const pois = [];
        
        if (signal.type === 'clock') {
            // Clock signals: rising and falling transitions
            pois.push(this.getPointOfInterest(signalName, cycle, 'rising'));
            pois.push(this.getPointOfInterest(signalName, cycle, 'falling'));
        } else if (signal.type === 'bit' || signal.type === 'bus') {
            // Bit/Bus signals: low, mid, high positions
            pois.push(this.getPointOfInterest(signalName, cycle, 'low'));
            pois.push(this.getPointOfInterest(signalName, cycle, 'mid'));
            pois.push(this.getPointOfInterest(signalName, cycle, 'high'));
            
            // Add slew positions if there's a transition
            const stateCycle = cycle === 0 ? 0 : cycle - 1;
            let hasTransition = false;
            
            if (signal.type === 'bit') {
                const currentValue = this.getBitValueAtCycle(signal, cycle);
                const prevValue = this.getBitValueAtCycle(signal, stateCycle);
                hasTransition = cycle > 0 && currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X';
            } else if (signal.type === 'bus') {
                const currentValue = this.getBusValueAtCycle(signal, cycle);
                const prevValue = this.getBusValueAtCycle(signal, stateCycle);
                hasTransition = cycle > 0 && currentValue !== prevValue;
            }
            
            if (hasTransition) {
                pois.push(this.getPointOfInterest(signalName, cycle, 'slew-start'));
                pois.push(this.getPointOfInterest(signalName, cycle, 'slew-center'));
                pois.push(this.getPointOfInterest(signalName, cycle, 'slew-end'));
            }
        }
        
        return pois.filter(poi => poi !== null);
    }
    
    getTransitionPoint(signalName, cycle) {
        // Get the screen coordinates for a signal transition at a given cycle
        // This is kept for backward compatibility but POI should be used for arrows
        const signal = this.getSignalByName(signalName);
        if (!signal) return null;
        
        const signals = this.getSignals();
        const signalIndex = signals.findIndex(s => s.name === signalName);
        if (signalIndex < 0) return null;
        
        const signalRow = this.rowManager.signalIndexToRowIndex(signalIndex);
        const y = this.rowManager.getRowYPosition(signalRow) + this.config.rowHeight / 2;
        const x = this.config.nameColumnWidth + cycle * this.config.cycleWidth;
        
        return { x, y, signalName, cycle };
    }
    
    handleNewDocument() {
        // Check if there's any data
        const hasData = this.rows.length > 0;
        
        if (hasData) {
            // Ask user if they want to save
            if (confirm('Do you want to save the current diagram before creating a new one?')) {
                TimingGenData.saveToJSON(this);
            }
        }
        
        // Clear all data
        this.rows = [];
        this.signalsData.clear();
        this.measuresData.clear();
        this.textData.clear();
        this.counterData.clear();
        this.arrowsData.clear();
        
        // Reset counters (keep measureCounter for unique internal names)
        // Only reset display counters
        this.measureTextCounter = 0;
        this.textCounter = 0;
        this.counterCounter = 0;
        this.arrowCounter = 0;
        
        // Reset selections
        this.selectedSignals.clear();
        this.selectedMeasureRows.clear();
        
        // Render empty canvas
        this.render();
    }
    
    deleteTextRow() {
        if (this.currentEditingText) {
            // Confirm deletion
            if (!confirm('Delete this text row?')) {
                this.hideAllMenus();
                return;
            }
            
            // Find row index
            const rowIndex = this.rows.findIndex(row => row.type === 'text' && row.name === this.currentEditingText);
            if (rowIndex >= 0) {
                // Remove from rows array
                this.rows.splice(rowIndex, 1);
                // Remove from text data
                this.textData.delete(this.currentEditingText);
                
                this.currentEditingText = null;
                this.hideAllMenus();
                this.render();
            }
        }
    }
    
    deleteMeasureRow() {
        if (this.currentEditingMeasureRow !== null) {
            // Confirm deletion
            if (!confirm('Delete this measure?')) {
                this.hideAllMenus();
                return;
            }
            
            const row = this.rows[this.currentEditingMeasureRow];
            if (row && row.type === 'measure') {
                // Remove from AC tables first
                this.removeACTableRowForMeasure(row.name);
                
                // Remove from measures data
                this.measuresData.delete(row.name);
                // Remove from rows array
                this.rows.splice(this.currentEditingMeasureRow, 1);
                
                this.currentEditingMeasureRow = null;
                this.hideAllMenus();
                this.render();
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
            version: '3.3.3',
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
