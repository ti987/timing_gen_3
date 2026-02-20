// Timing Gen 3 - Interactive Digital Logic Waveform Editor
// Version 3.5.0
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
            rowHeight: 80, // deprecated - kept for backward compatibility
            signalRowHeight: 80, // height for signal rows
            measureRowHeight: 80, // height for measure/group rows
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
        
        // Data model v3.4.0 - Extended with AC Table tool and Group row type
        // rows: defines order only - Array of {type: 'signal'|'measure'|'text'|'counter'|'ac-table'|'group', name: string}
        // signalsData: Map<name, signalObject> - actual signal data
        // measuresData: Map<name, measureObject> - actual measure data
        // textData: Map<name, textObject> - actual text data
        // counterData: Map<name, counterObject> - actual counter data
        // arrowsData: Map<name, arrowObject> - actual arrow data
        // acTablesData: Map<name, acTableObject> - actual AC table data
        // groupsData: Map<name, groupObject> - actual group data (contains array of measure names)
        // tears: Set<number> - cycles that have tear marks
        this.rows = [];
        this.signalsData = new Map();  // Key: signal name, Value: signal object
        this.measuresData = new Map(); // Key: measure name (auto-generated), Value: measure object
        this.textData = new Map();     // Key: text name (auto-generated), Value: text object
        this.counterData = new Map();  // Key: counter name (auto-generated), Value: counter object
        this.arrowsData = new Map();   // Key: arrow name (auto-generated), Value: arrow object
        this.acTablesData = new Map(); // Key: table name (auto-generated), Value: AC table object
        this.groupsData = new Map();   // Key: group name (auto-generated), Value: {name, measures: [measureNames]}
        this.tears = new Set();        // Set of cycle numbers that have tear marks
        
        // Counter for auto-generating unique measure names
        this.measureCounter = 0;
        this.measureTextCounter = 0; // Counter for measure text (t1, t2, t3...)
        this.textCounter = 0;
        this.counterCounter = 0;
        this.arrowCounter = 0;
        this.acTableCounter = 0;
        this.groupCounter = 0; // Counter for group names (G0, G1, G2...)
        
        // Row manager for unified row system
        this.rowManager = new RowManager(this);
        
        // Undo/Redo manager
        this.undoRedoManager = new UndoRedoManager(this);
        
        this.currentEditingSignal = null;
        this.currentEditingCycle = null;
        this.currentRightClickCycle = null; // Track cycle for context menu actions (e.g., delete tear)
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
        this.currentEditingNote = null; // {tableName, noteNum} for editing note text
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
        this.selectedGroupRows = new Set(); // Set of group row indices
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
        const height = this.config.headerHeight + 10 * this.config.signalRowHeight + 100;
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
        document.getElementById('undo-btn').addEventListener('click', () => this.undoRedoManager.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.undoRedoManager.redo());
        document.getElementById('redraw-btn').addEventListener('click', () => this.redrawAll());
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
        document.getElementById('add-group-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.addGroup();
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
        document.getElementById('add-tear-menu').addEventListener('click', () => {
            document.getElementById('add-submenu').style.display = 'none';
            this.showAddTearDialog();
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
        document.getElementById('counter-dialog-ok-btn').addEventListener('click', () => TimingGenTextCounter.addCounterRow(this));
        document.getElementById('counter-dialog-cancel-btn').addEventListener('click', () => this.hideAddCounterDialog());
        
        // Edit counter dialog
        document.getElementById('edit-counter-ok-btn').addEventListener('click', () => this.updateCounterValue());
        document.getElementById('edit-counter-cancel-btn').addEventListener('click', () => this.hideEditCounterDialog());
        
        // Counter options dialog
        document.getElementById('counter-options-ok-btn').addEventListener('click', () => TimingGenTextCounter.saveCounterOptions(this));
        document.getElementById('counter-options-cancel-btn').addEventListener('click', () => TimingGenTextCounter.hideCounterOptionsDialog(this));
        
        // AC Table dialog
        document.getElementById('ac-table-dialog-ok-btn').addEventListener('click', () => this.addACTable());
        document.getElementById('ac-table-dialog-cancel-btn').addEventListener('click', () => this.hideAddACTableDialog());
        
        // Tear dialog
        document.getElementById('tear-dialog-ok-btn').addEventListener('click', () => this.addTear());
        document.getElementById('tear-dialog-cancel-btn').addEventListener('click', () => this.hideAddTearDialog());
        
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
        document.getElementById('update-ac-table-menu').addEventListener('click', () => this.updateCurrentACTable());
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
        document.getElementById('font-arrow-text-menu').addEventListener('click', () => this.showArrowTextOptionsDialog());
        document.getElementById('cancel-arrow-text-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Signal name context menu
        document.getElementById('edit-signal-name-menu').addEventListener('click', () => {
            this.hideAllMenus();
            TimingGenUI.showEditSignalDialog(this);
        });
        document.getElementById('signal-options-name-menu').addEventListener('click', () => {
            this.hideAllMenus();
            TimingGenUI.showSignalOptionsDialog(this);
        });
        document.getElementById('delete-signal-name-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.deleteSignal();
        });
        document.getElementById('font-signal-name-menu').addEventListener('click', () => this.showSignalNameFontDialog());
        document.getElementById('cancel-signal-name-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Bus value context menu
        document.getElementById('font-bus-value-menu').addEventListener('click', () => this.showBusValueFontDialog());
        document.getElementById('cancel-bus-value-menu').addEventListener('click', () => this.hideAllMenus());
        
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
        
        // Measure text context menu
        document.getElementById('edit-measure-text-menu').addEventListener('click', () => this.showEditMeasureTextDialog());
        document.getElementById('font-measure-text-menu').addEventListener('click', () => this.showMeasureTextFontDialog());
        document.getElementById('color-measure-text-menu').addEventListener('click', () => this.showMeasureTextColorDialog());
        document.getElementById('cancel-measure-text-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Text row name context menu
        document.getElementById('delete-text-row-menu').addEventListener('click', () => this.deleteTextRow());
        document.getElementById('cancel-text-row-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Counter cycle context menu
        document.getElementById('continue-counter-menu').addEventListener('click', () => this.continueCounter());
        document.getElementById('restart-counter-menu').addEventListener('click', () => this.showRestartCounterDialog());
        document.getElementById('blank-counter-menu').addEventListener('click', () => this.blankCounter());
        document.getElementById('cancel-counter-cycle-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Counter name context menu handlers
        document.getElementById('counter-options-menu').addEventListener('click', () => {
            this.hideAllMenus();
            if (this.currentEditingCounterName) {
                TimingGenTextCounter.showCounterOptionsDialog(this, this.currentEditingCounterName);
            }
        });
        document.getElementById('delete-counter-menu').addEventListener('click', () => this.deleteCounter());
        document.getElementById('cancel-counter-name-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Measure row name context menu
        document.getElementById('delete-measure-row-menu').addEventListener('click', () => this.deleteMeasureRow());
        document.getElementById('cancel-measure-row-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Add signal dialog
        // Add signal dialog
        document.getElementById('signal-type-select').addEventListener('change', function() {
            const clockOptionsContainer = document.getElementById('clock-options-container');
            const clockDomainContainer = document.getElementById('signal-clock-domain-container');
            
            if (this.value === 'clock') {
                clockOptionsContainer.style.display = 'block';
                clockDomainContainer.style.display = 'none';
            } else {
                // Bit or Bus signals need clock domain selection
                clockOptionsContainer.style.display = 'none';
                clockDomainContainer.style.display = 'block';
            }
        });
        
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
        
        // Clock cycle context menu handlers
        document.getElementById('disable-clock-cycle-menu').addEventListener('click', () => this.disableClockCycle());
        document.getElementById('enable-clock-cycle-menu').addEventListener('click', () => this.enableClockCycle());
        document.getElementById('clock-cycle-options-menu').addEventListener('click', () => {
            this.hideAllMenus();
            TimingGenUI.showCycleOptionsDialog(this);
        });
        document.getElementById('insert-cycles-clock-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.insertCycleMode = 'signal';
            TimingGenUI.showInsertCyclesDialog(this);
        });
        document.getElementById('delete-cycles-clock-menu').addEventListener('click', () => {
            this.hideAllMenus();
            this.deleteCycleMode = 'signal';
            TimingGenUI.showDeleteCyclesDialog(this);
        });
        document.getElementById('cancel-clock-cycle-menu').addEventListener('click', () => this.hideAllMenus());
        
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
        document.getElementById('add-tear-cycle-menu').addEventListener('click', () => {
            this.hideAllMenus();
            if (this.currentRightClickCycle !== null) {
                this.addTearAtCycle(this.currentRightClickCycle);
            }
        });
        document.getElementById('remove-tear-cycle-menu').addEventListener('click', () => {
            this.hideAllMenus();
            if (this.currentRightClickCycle !== null) {
                this.deleteTear(this.currentRightClickCycle);
            }
        });
        document.getElementById('cancel-cycle-menu').addEventListener('click', () => this.hideAllMenus());
        
        // Canvas events using Paper.js tool
        this.tool = new paper.Tool();
        this.tool.onMouseDown = (event) => this.handleCanvasClick(event);
        this.tool.onMouseDrag = (event) => this.handleCanvasMouseDrag(event);
        this.tool.onMouseUp = (event) => this.handleCanvasMouseUp(event);
        this.tool.onDoubleClick = (event) => this.handleCanvasDoubleClick(event);
        
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
        document.getElementById('signal-name-context-menu').style.display = 'none';
        document.getElementById('bit-cycle-context-menu').style.display = 'none';
        document.getElementById('bus-cycle-context-menu').style.display = 'none';
        document.getElementById('bus-value-context-menu').style.display = 'none';
        document.getElementById('cycle-context-menu').style.display = 'none';
        document.getElementById('measure-context-menu').style.display = 'none';
        document.getElementById('measure-text-context-menu').style.display = 'none';
        document.getElementById('arrow-context-menu').style.display = 'none';
        document.getElementById('arrow-text-context-menu').style.display = 'none';
        document.getElementById('text-context-menu').style.display = 'none';
        document.getElementById('text-row-name-context-menu').style.display = 'none';
        document.getElementById('counter-cycle-context-menu').style.display = 'none';
        document.getElementById('counter-name-context-menu').style.display = 'none';
        document.getElementById('measure-row-name-context-menu').style.display = 'none';
        document.getElementById('ac-cell-context-menu').style.display = 'none';
        document.getElementById('ac-param-context-menu').style.display = 'none';
        document.getElementById('ac-table-context-menu').style.display = 'none';
        document.getElementById('clock-cycle-context-menu').style.display = 'none';
        
        // Clear editing state to prevent stale references
        // Note: Don't clear everything as some dialogs might still need the state
    }
    
    showAboutDialog() {
        document.getElementById('about-dialog').style.display = 'flex';
    }
    
    hideAboutDialog() {
        document.getElementById('about-dialog').style.display = 'none';
    }
    
    showAddTextDialog() {
        TimingGenTextCounter.showAddTextDialog(this);
    }
    
    hideAddTextDialog() {
        TimingGenTextCounter.hideAddTextDialog(this);
    }
    
    showEditTextDialog() {
        TimingGenTextCounter.showEditTextDialog(this);
    }
    
    hideEditTextDialog() {
        TimingGenTextCounter.hideEditTextDialog(this);
    }
    
    showFontDialog() {
        TimingGenTextCounter.showFontDialog(this);
    }
    
    hideFontDialog() {
        TimingGenTextCounter.hideFontDialog(this);
    }
    
    showColorDialog() {
        TimingGenTextCounter.showColorDialog(this);
    }
    
    hideColorDialog() {
        TimingGenTextCounter.hideColorDialog(this);
    }
    
    updateTextRow() {
        TimingGenTextCounter.updateTextRow(this);
    }
    
    updateTextFont() {
        TimingGenTextCounter.updateTextFont(this);
    }
    
    updateTextColor() {
        TimingGenTextCounter.updateTextColor(this);
    }
    
    // Measure text editing functions (dedicated for measure text context menu)
    showEditMeasureTextDialog() {
        const measures = this.getMeasures();
        if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
            const measure = measures[this.currentEditingMeasure];
            document.getElementById('edit-text-input').value = measure.text || '';
            document.getElementById('edit-text-dialog').style.display = 'flex';
        }
        this.hideAllMenus();
    }
    
    showMeasureTextFontDialog() {
        const measures = this.getMeasures();
        if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
            const measure = measures[this.currentEditingMeasure];
            document.getElementById('font-family-select').value = measure.textFont || 'Arial';
            document.getElementById('font-size-input').value = measure.textSize || 12;
            document.getElementById('font-dialog').style.display = 'flex';
        }
        this.hideAllMenus();
    }
    
    showMeasureTextColorDialog() {
        const measures = this.getMeasures();
        if (this.currentEditingMeasure !== null && this.currentEditingMeasure >= 0 && this.currentEditingMeasure < measures.length) {
            const measure = measures[this.currentEditingMeasure];
            document.getElementById('text-color-input').value = measure.textColor || '#FF0000';
            document.getElementById('color-dialog').style.display = 'flex';
        }
        this.hideAllMenus();
    }
    
    showSignalNameFontDialog() {
        if (this.currentEditingSignal !== null && this.currentEditingSignal !== undefined) {
            const signal = this.getSignalByIndex(this.currentEditingSignal);
            if (signal) {
                document.getElementById('font-family-select').value = signal.nameFont || 'Arial';
                document.getElementById('font-size-input').value = signal.nameFontSize || 14;
                document.getElementById('font-color-input').value = signal.nameFontColor || '#000000';
                document.getElementById('font-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    showBusValueFontDialog() {
        if (this.currentEditingBusValue) {
            const signal = this.getSignalByName(this.currentEditingBusValue.signalName);
            if (signal) {
                document.getElementById('font-family-select').value = signal.valueFontFamily || 'Arial';
                document.getElementById('font-size-input').value = signal.valueFontSize || 12;
                document.getElementById('font-color-input').value = signal.valueFontColor || '#000000';
                document.getElementById('font-dialog').style.display = 'flex';
            }
        }
        this.hideAllMenus();
    }
    
    showAddCounterDialog() {
        TimingGenTextCounter.showAddCounterDialog(this);
    }
    
    hideAddCounterDialog() {
        TimingGenTextCounter.hideAddCounterDialog(this);
    }
    
    showEditCounterDialog(counterName, cycle) {
        TimingGenTextCounter.showEditCounterDialog(this, counterName, cycle);
    }
    
    hideEditCounterDialog() {
        TimingGenTextCounter.hideEditCounterDialog(this);
    }
    
    updateCounterValue() {
        TimingGenTextCounter.updateCounterValue(this);
    }
    
    // Counter cycle context menu actions
    continueCounter() {
        TimingGenTextCounter.continueCounter(this);
    }
    
    showRestartCounterDialog() {
        TimingGenTextCounter.showRestartCounterDialog(this);
    }
    
    blankCounter() {
        TimingGenTextCounter.blankCounter(this);
    }
    
    addTextRow() {
        TimingGenTextCounter.addTextRow(this);
    }
    
    addCounterRow() {
        TimingGenTextCounter.addCounterRow(this);
    }
    
    // ========================================
    // AC Table Methods (delegated to TimingGenACTable)
    // ========================================
    
    showAddACTableDialog() {
        TimingGenACTable.showAddACTableDialog(this);
    }
    
    hideAddACTableDialog() {
        TimingGenACTable.hideAddACTableDialog(this);
    }
    
    addACTable() {
        TimingGenACTable.addACTable(this);
    }
    
    // ========================================
    // Tear Methods
    // ========================================
    
    showAddTearDialog() {
        TimingGenTear.showAddTearDialog(this);
    }
    
    hideAddTearDialog() {
        TimingGenTear.hideAddTearDialog(this);
    }
    
    addTear() {
        TimingGenTear.addTear(this);
    }
    
    deleteTear(cycle) {
        TimingGenTear.deleteTear(this, cycle);
    }
    
    addTearAtCycle(cycle) {
        TimingGenTear.addTearAtCycle(this, cycle);
    }
    
    initializeACTableRows(acTableData) {
        TimingGenACTable.initializeACTableRows(this, acTableData);
    }
    
    createACTableRowFromMeasure(measureName, measure) {
        return TimingGenACTable.createACTableRowFromMeasure(this, measureName, measure);
    }
    
    updateACTableForMeasureChange(measureName, measure) {
        TimingGenACTable.updateACTableForMeasureChange(this, measureName, measure);
    }
    
    addACTableRowForMeasure(measureName, measure) {
        TimingGenACTable.addACTableRowForMeasure(this, measureName, measure);
    }
    
    removeACTableRowForMeasure(measureName) {
        TimingGenACTable.removeACTableRowForMeasure(this, measureName);
    }
    
    deleteACTable(tableName) {
        TimingGenACTable.deleteACTable(this, tableName);
    }
    
    moveACTableToPosition(tableName, position) {
        TimingGenACTable.moveACTableToPosition(this, tableName, position);
    }
    
    showEditACCellDialog() {
        TimingGenACTable.showEditACCellDialog(this);
    }
    
    hideEditACCellDialog() {
        TimingGenACTable.hideEditACCellDialog(this);
    }
    
    updateACCell() {
        TimingGenACTable.updateACCell(this);
    }
    
    showACCellFontDialog() {
        TimingGenACTable.showACCellFontDialog(this);
    }
    
    hideACCellFontDialog() {
        TimingGenACTable.hideACCellFontDialog(this);
    }
    
    updateACCellFont() {
        TimingGenACTable.updateACCellFont(this);
    }
    
    showACRowSpanDialog() {
        TimingGenACTable.showACRowSpanDialog(this);
    }
    
    hideACRowSpanDialog() {
        TimingGenACTable.hideACRowSpanDialog(this);
    }
    
    updateACRowSpan() {
        TimingGenACTable.updateACRowSpan(this);
    }
    
    deleteACTableRow() {
        TimingGenACTable.deleteACTableRow(this);
    }
    
    moveACTableTo(position) {
        TimingGenACTable.moveACTableTo(this, position);
    }
    
    deleteCurrentACTable() {
        TimingGenACTable.deleteCurrentACTable(this);
    }
    
    updateCurrentACTable() {
        TimingGenACTable.updateCurrentACTable(this);
    }
    
    updateACTableValues(tableName) {
        TimingGenACTable.updateACTableValues(this, tableName);
    }
    
    flashMeasure(measureName) {
        TimingGenACTable.flashMeasure(this, measureName);
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
        
        // Capture state before action
        this.undoRedoManager.captureState();
        
        const signal = {
            name: name,
            type: type,
            values: {}
        };
        
        // Add period and phase for clock signals
        if (type === 'clock') {
            // Capture period
            const periodValue = parseFloat(document.getElementById('signal-period-input').value);
            const periodUnit = document.getElementById('signal-period-unit-input').value;
            if (isNaN(periodValue) || periodValue <= 0) {
                alert('Please enter a valid period value greater than 0');
                return;
            }
            signal.period = periodValue;
            signal.periodUnit = periodUnit;
            
            // Capture phase
            const phaseValue = parseFloat(document.getElementById('signal-phase-input').value);
            if (isNaN(phaseValue) || phaseValue < 0 || phaseValue > 1) {
                alert('Please enter a valid phase value between 0.0 and 1.0');
                return;
            }
            signal.phase = phaseValue;
        }
        
        // Add base_clock for bit and bus signals
        if (type === 'bit' || type === 'bus') {
            // Get selected clock from dropdown
            const selectedClock = document.getElementById('signal-clock-domain-input').value;
            
            if (selectedClock) {
                signal.base_clock = selectedClock;
            } else {
                // Find the first clock signal, or use 'clk' as default
                const signals = this.getSignals();
                const clockSignal = signals.find(sg => sg.type === 'clock');
                signal.base_clock = clockSignal ? clockSignal.name : 'clk';
            }
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
        
        // If this is a clock, check if we need to add a cycle-numbers row before it
        let insertIndex = this.rows.length; // Default to end
        
        // Find where to insert (before AC tables)
        const acTableIndex = this.rows.findIndex(r => r.type === 'ac-table');
        if (acTableIndex >= 0) {
            insertIndex = acTableIndex;
        }
        
        // If this is a clock (2nd or later), add a cycle-numbers row first
        if (type === 'clock') {
            const existingClocks = this.getClockSignals();
            if (existingClocks.length > 0) {
                // This is the 2nd+ clock, insert a cycle-numbers row first
                this.rows.splice(insertIndex, 0, {
                    type: 'cycle-numbers',
                    name: `cycle-numbers-${name}`,
                    clockName: name
                });
                insertIndex++; // Adjust insert position for the signal itself
            }
        }
        
        // Add the signal row
        this.rows.splice(insertIndex, 0, {
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
            
            // Capture state before action
            this.undoRedoManager.captureState();
            
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
                // Capture state before action
                this.undoRedoManager.captureState();
                
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
            
            // Capture state before action
            this.undoRedoManager.captureState();
            
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
        // Capture state before action
        this.undoRedoManager.captureState();
        
        this.config.cycles = parseInt(newCycles);
        this.initializeCanvas();
        this.render();
    }
    
    // ========================================
    // Canvas Event Handlers
    // ========================================
    
    // Helper method for hit testing (used by both click and right-click handlers)
    getHitTestOptions() {
        return {
            segments: true,
            stroke: true,
            fill: true,
            tolerance: 5
        };
    }
    
    // Hit test all layers (not just active layer)
    // This is essential for finding AC table elements which are in signalLayer
    hitTestAllLayers(point, options) {
        const allResults = [];
        const layers = [this.backgroundLayer, this.gridLayer, this.signalLayer, this.measureLayer];
        
        layers.forEach(layer => {
            if (layer) {
                const results = layer.hitTestAll(point, options);
                if (results && results.length > 0) {
                    allResults.push(...results);
                }
            }
        });
        
        return allResults;
    }
    
    // Handle left-click events on canvas
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
        // Use hitTestAll to get all items at the point - search all layers
        // IMPORTANT: Skip this check when in measure mode selecting points (first-point or second-point)
        // to allow placing measures on top of existing measures/arrows
        // ALSO skip when in arrow mode to allow placing arrows without being interrupted by measure clicks
        const isSelectingMeasurePoints = this.measureMode && 
            (this.measureState === 'first-point' || this.measureState === 'second-point' ||
             this.measureState === 'rechoose-point-1' || this.measureState === 'rechoose-point-2');
        
        const isPlacingArrow = this.arrowMode && 
            (this.arrowState === 'first-point' || this.arrowState === 'second-point');
        
        const hitResults = this.hitTestAllLayers(event.point, this.getHitTestOptions());
        
        if (hitResults && hitResults.length > 0 && !isSelectingMeasurePoints && !isPlacingArrow) {
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
                const measureName = measureGroup.data.measureName;
                
                // Debug logging to help diagnose click issues
                console.log('[Measure Click] Detected:', hitItem.data.type, 'at measureIndex:', measureIndex, 'measureName:', measureName);
                
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
                    this.startMovingMeasureRow(measureName, event);
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
            TimingGenArrow.handleArrowClick(this, event);
            return;
        }
        
        // Handle moving measure to another row
        if (this.isMovingMeasureRow) {
            const row = this.getRowAtY(yPos);
            if (row) {
                const measure = this.measuresData.get(this.currentEditingMeasureName);
                if (measure) {
                    const measureName = measure.name;
                    
                    // Check if measure is currently in a group
                    const currentGroupRow = this.rows.find(r => {
                        if (r.type === 'group') {
                            const group = this.groupsData.get(r.name);
                            return group && group.measures && group.measures.includes(measureName);
                        }
                        return false;
                    });
                    
                    // Remove measure from old position (either standalone measure row or from group)
                    if (currentGroupRow) {
                        // Remove from group
                        const group = this.groupsData.get(currentGroupRow.name);
                        const measureIndex = group.measures.indexOf(measureName);
                        if (measureIndex >= 0) {
                            group.measures.splice(measureIndex, 1);
                        }
                        // If group is now empty, remove it
                        if (group.measures.length === 0) {
                            const groupRowIndex = this.rows.findIndex(r => r.name === currentGroupRow.name);
                            if (groupRowIndex >= 0) {
                                this.rows.splice(groupRowIndex, 1);
                            }
                            this.groupsData.delete(currentGroupRow.name);
                        }
                    } else {
                        // Remove standalone measure row
                        const oldRowIndex = this.rows.findIndex(r => r.type === 'measure' && r.name === measureName);
                        if (oldRowIndex >= 0) {
                            this.rows.splice(oldRowIndex, 1);
                        }
                    }
                    
                    // Add to target row (signal, measure, or group)
                    if (row.type === 'signal') {
                        // Insert as new measure row after the signal
                        let newRowIndex = row.index + 1;
                        this.rows.splice(newRowIndex, 0, {
                            type: 'measure',
                            name: measureName
                        });
                    } else if (row.type === 'measure') {
                        // Merge into a new or existing group
                        const targetMeasure = this.measuresData.get(row.name);
                        if (targetMeasure) {
                            // Create a new group with both measures
                            const groupName = `G${this.groupCounter}`;
                            this.groupCounter++;
                            
                            // Remove the target measure row
                            const targetRowIndex = this.rows.findIndex(r => r.type === 'measure' && r.name === row.name);
                            if (targetRowIndex >= 0) {
                                this.rows.splice(targetRowIndex, 1);
                            }
                            
                            // Create group with both measures
                            const group = {
                                name: groupName,
                                measures: [row.name, measureName]
                            };
                            this.groupsData.set(groupName, group);
                            
                            // Insert group row at target position (adjusted after removal)
                            this.rows.splice(targetRowIndex, 0, {
                                type: 'group',
                                name: groupName
                            });
                        }
                    } else if (row.type === 'group') {
                        // Add to existing group
                        const targetGroup = this.groupsData.get(row.name);
                        if (targetGroup) {
                            if (!targetGroup.measures.includes(measureName)) {
                                targetGroup.measures.push(measureName);
                            }
                        }
                    } else {
                        // For other row types (text, counter, ac-table), insert as measure row
                        let newRowIndex = row.index;
                        this.rows.splice(newRowIndex, 0, {
                            type: 'measure',
                            name: measureName
                        });
                    }
                    
                    // Update all measure row references and recalculate arrow positions
                    this.rebuildAfterMeasureRowMove();
                    
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
                            this.selectedGroupRows.clear();
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
                    this.selectedGroupRows.clear();
                    this.selectedMeasureRows.add(row.index);
                    this.render();
                }
                this.startDragMeasureRow(row.index, event);
            } else if (row && row.type === 'group') {
                // Handle group row selection - clicking on name column moves entire group
                if (!this.selectedGroupRows.has(row.index)) {
                    // If not already selected, make it the only selection
                    this.selectedSignals.clear();
                    this.selectedMeasureRows.clear();
                    this.selectedGroupRows.clear();
                    this.selectedGroupRows.add(row.index);
                    this.render();
                }
                this.startDragGroupRow(row.index, event);
            } else if (row && (row.type === 'text' || row.type === 'counter')) {
                // Handle text/counter row selection - reuse measure selection logic
                // Text and counter rows use selectedMeasureRows for dragging (non-signal tools)
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
                    // Capture state before action
                    this.undoRedoManager.captureState();
                    
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
                const counterData = this.counterData.get(clickedRow.name);
                // Use domain-specific cycle width if counter has base_clock
                let cycleWidth = this.config.cycleWidth;
                if (counterData && counterData.base_clock) {
                    const clock = this.signalsData.get(counterData.base_clock);
                    if (clock) {
                        cycleWidth = this.getCycleWidthForClock(clock);
                    }
                }
                const cycle = Math.floor((xPos - this.config.nameColumnWidth) / cycleWidth);
                if (cycle >= 0 && cycle < this.config.cycles) {
                    this.showEditCounterDialog(clickedRow.name, cycle);
                    return;
                }
            }
        }
        
        // Check signal interaction - clear selection if clicking waveform
        const signalIndex = this.getSignalIndexAtY(yPos);
        
        if (signalIndex !== -1) {
            const signal = this.getSignalByIndex(signalIndex);
            // Use domain-specific cycle width for accurate click detection
            const cycleWidth = this.getCycleWidthForSignal(signal);
            const cycle = Math.floor((xPos - this.config.nameColumnWidth) / cycleWidth);
            
            if (cycle >= 0 && cycle < this.config.cycles) {
                if (signal.type === 'bit') {
                    this.toggleBitSignal(signalIndex, cycle);
                } else if (signal.type === 'bus') {
                    TimingGenUI.showBusValueDialog(this, signalIndex, cycle);
                }
            }
        }
    }
    
    // Handle right-click events on canvas (context menu activation)
    handleCanvasRightClick(ev) {
        ev.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const xPos = ev.clientX - rect.left;
        const yPos = ev.clientY - rect.top;
        
        this.hideAllMenus();
        
        // Convert canvas DOM coordinates to Paper.js view coordinates
        // This accounts for any view transformations (zoom, pan, etc.)
        const paperPoint = paper.view.viewToProject(new paper.Point(xPos, yPos));
        const paperX = paperPoint.x;
        const paperY = paperPoint.y;
        
        // Check if right-click is in cycle header area (top row with cycle numbers)
        if (paperY < this.config.headerHeight && paperX >= this.config.nameColumnWidth) {
            const cycle = Math.floor((paperX - this.config.nameColumnWidth) / this.config.cycleWidth);
            if (cycle >= 0 && cycle < this.config.cycles) {
                this.currentEditingCycle = cycle;
                this.currentRightClickCycle = cycle;
                
                // Show or hide "Add Tear" and "Remove Tear" menu items based on whether this cycle has a tear
                const addTearMenuItem = document.getElementById('add-tear-cycle-menu');
                const removeTearMenuItem = document.getElementById('remove-tear-cycle-menu');
                if (this.tears.has(cycle)) {
                    // Cycle has a tear - show "Remove Tear", hide "Add Tear"
                    addTearMenuItem.style.display = 'none';
                    removeTearMenuItem.style.display = 'block';
                } else {
                    // Cycle doesn't have a tear - show "Add Tear", hide "Remove Tear"
                    addTearMenuItem.style.display = 'block';
                    removeTearMenuItem.style.display = 'none';
                }
                
                TimingGenUI.showContextMenu('cycle-context-menu', ev.clientX, ev.clientY);
            }
            return;
        }
        
        // Check if right-click is in signal name area
        if (paperX < this.config.nameColumnWidth) {
            const row = this.getRowAtY(paperY);
            if (row) {
                if (row.type === 'signal') {
                    const signalIndex = this.getSignalIndexAtY(paperY);
                    if (signalIndex !== -1) {
                        this.currentEditingSignal = signalIndex;
                        const signal = this.getSignalByIndex(signalIndex);
                        this.currentEditingSignalName = signal.name;
                        TimingGenUI.showContextMenu('signal-name-context-menu', ev.clientX, ev.clientY);
                    }
                } else if (row.type === 'counter') {
                    // Right-click on counter row name column - show counter name context menu
                    this.currentEditingCounterName = row.name;
                    TimingGenUI.showContextMenu('counter-name-context-menu', ev.clientX, ev.clientY);
                } else if (row.type === 'text') {
                    // Right-click on text row name column - show delete/cancel menu
                    this.currentEditingText = row.name;
                    TimingGenUI.showContextMenu('text-row-name-context-menu', ev.clientX, ev.clientY);
                } else if (row.type === 'measure' || row.type === 'group') {
                    // Right-click on measure/group row name column - show delete/cancel menu
                    this.currentEditingMeasureRow = row.index;
                    TimingGenUI.showContextMenu('measure-row-name-context-menu', ev.clientX, ev.clientY);
                }
            }
            return;
        }
        
        // Check if right-click is in waveform area
        const row = this.getRowAtY(paperY);
        
        // First check for arrow elements (they overlay signals)
        // Use paperPoint for hit testing (already in Paper.js coordinates)
        const hitResults = this.hitTestAllLayers(paperPoint, this.getHitTestOptions());
        
        if (hitResults && hitResults.length > 0) {
            // Look for signal names and bus values first
            for (const result of hitResults) {
                const item = result.item;
                
                if (item.data && item.data.type === 'signal-name') {
                    // Right-click on signal name
                    this.currentEditingSignal = item.data.signalIndex;
                    this.currentEditingSignalName = item.data.signalName;
                    TimingGenUI.showContextMenu('signal-name-context-menu', ev.clientX, ev.clientY);
                    return;
                }
                
                if (item.data && item.data.type === 'bus-value') {
                    // Right-click on bus value text
                    this.currentEditingBusValue = {
                        signalName: item.data.signalName,
                        cycle: item.data.cycle,
                        value: item.data.value
                    };
                    TimingGenUI.showContextMenu('bus-value-context-menu', ev.clientX, ev.clientY);
                    return;
                }
            }
            
            // Look for arrow elements
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
        
        // Check if we clicked on an AC table element (regardless of which row getRowAtY returns)
        // AC tables are taller than one row, so getRowAtY may return a different row
        // when clicking on lower parts of the table (2nd data row, notes section, etc.)
        if (hitResults && hitResults.length > 0) {
            for (const result of hitResults) {
                const item = result.item;
                
                // Check if this is an AC table element
                if (item.data && item.data.tableName) {
                    // Find the AC table row by tableName
                    const acTableRow = this.rows.find(r => r.type === 'ac-table' && r.name === item.data.tableName);
                    
                    if (acTableRow) {
                        if (item.data.type === 'ac-table-cell') {
                                // Right-click on a cell
                                this.currentEditingACCell = {
                                    tableName: item.data.tableName,
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
                            } else if (item.data.type === 'ac-table-note-text' || item.data.type === 'ac-table-note-num') {
                                // Right-click on note field text or note number
                                this.currentEditingNote = {
                                    tableName: item.data.tableName,
                                    noteNum: item.data.noteNum
                                };
                                TimingGenUI.showContextMenu('text-context-menu', ev.clientX, ev.clientY);
                                return;
                            } else if (item.data.type === 'ac-table-row-border') {
                                // Right-click on empty AC table cell area (cell border without text)
                                const tableName = item.data.tableName;
                                const tableData = this.acTablesData.get(tableName);
                                if (!tableData) return;
                                
                                // Use Paper.js coordinates (already converted above)
                                const startX = this.config.nameColumnWidth + 10;
                                const colWidths = tableData.columnWidths || [400, 100, 100, 100, 100, 100];
                                const colPositions = [0];
                                for (let i = 0; i < colWidths.length; i++) {
                                    colPositions.push(colPositions[i] + colWidths[i]);
                                }
                                
                                // Determine which column was clicked using Paper.js coordinates
                                const clickX = paperX - startX;
                                let colIndex = -1;
                                for (let i = 0; i < colPositions.length - 1; i++) {
                                    if (clickX >= colPositions[i] && clickX < colPositions[i + 1]) {
                                        colIndex = i;
                                        break;
                                    }
                                }
                                
                                if (colIndex >= 0 && colIndex < 6) {
                                    // Set up editing context for this cell (even if empty)
                                    this.currentEditingACCell = {
                                        tableName: tableName,
                                        cellType: 'data',
                                        rowIndex: item.data.rowIndex,
                                        colIndex: colIndex,
                                        colName: ['parameter', 'symbol', 'min', 'max', 'unit', 'note'][colIndex]
                                    };
                                    
                                    // Show parameter context menu if it's parameter column (index 0)
                                    if (colIndex === 0) {
                                        TimingGenUI.showContextMenu('ac-param-context-menu', ev.clientX, ev.clientY);
                                    } else {
                                        TimingGenUI.showContextMenu('ac-cell-context-menu', ev.clientX, ev.clientY);
                                    }
                                    return;
                                }
                            } else if (item.data.type === 'ac-table-title' || item.data.type === 'ac-table-border') {
                                // Right-click on table title or border - show table menu
                                this.currentEditingACTable = item.data.tableName;
                                TimingGenUI.showContextMenu('ac-table-context-menu', ev.clientX, ev.clientY);
                                return;
                            }
                        }
                    }
                }
        }
        
        if (row) {
            if (row.type === 'counter') {
                // Right-click on counter row - show counter cycle context menu
                const counterData = this.counterData.get(row.name);
                // Use domain-specific cycle width if counter has base_clock
                let cycleWidth = this.config.cycleWidth;
                if (counterData && counterData.base_clock) {
                    const clock = this.signalsData.get(counterData.base_clock);
                    if (clock) {
                        cycleWidth = this.getCycleWidthForClock(clock);
                    }
                }
                const cycle = Math.floor((paperX - this.config.nameColumnWidth) / cycleWidth);
                this.currentEditingCounter = { name: row.name, cycle: cycle };
                TimingGenUI.showContextMenu('counter-cycle-context-menu', ev.clientX, ev.clientY);
                return;
            } else if (row.type === 'text') {
                // Right-click on text row - show text context menu
                this.currentEditingText = row.name;
                TimingGenUI.showContextMenu('text-context-menu', ev.clientX, ev.clientY);
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
                            // Show dedicated measure text context menu
                            TimingGenUI.showContextMenu('measure-text-context-menu', ev.clientX, ev.clientY);
                        } else {
                            // General measure context menu
                            this.showMeasureContextMenu(ev, measureIndex);
                        }
                        return;
                    }
                }
            } else if (row.type === 'signal') {
                const signalIndex = this.getSignalIndexAtY(paperY);
                
                if (signalIndex !== -1) {
                    const signal = this.getSignalByIndex(signalIndex);
                    // Use domain-specific cycle width for accurate click detection
                    const cycleWidth = this.getCycleWidthForSignal(signal);
                    const cycle = Math.floor((paperX - this.config.nameColumnWidth) / cycleWidth);
                    
                    if (cycle >= 0 && cycle < this.config.cycles) {
                        // Show appropriate cycle context menu based on signal type
                        if (signal.type === 'bit') {
                            this.currentEditingSignal = signalIndex;
                            this.currentEditingCycle = cycle;
                            TimingGenUI.showBitCycleContextMenu(this, ev.clientX, ev.clientY);
                        } else if (signal.type === 'bus') {
                            this.currentEditingSignal = signalIndex;
                            this.currentEditingCycle = cycle;
                            TimingGenUI.showBusCycleContextMenu(this, ev.clientX, ev.clientY);
                        } else if (signal.type === 'clock') {
                            this.currentEditingSignal = signalIndex;
                            this.currentEditingCycle = cycle;
                            TimingGenUI.showClockCycleContextMenu(this, ev.clientX, ev.clientY);
                        }
                    }
                }
            }
        }
    }
    
    // Handle double-click events on canvas (edit dialogs)
    handleCanvasDoubleClick(event) {
        // Handle double-click events on the canvas
        const xPos = event.point.x;
        const yPos = event.point.y;
        
        // Use Paper.js hitTest to find what was clicked - search all layers
        const hitResults = this.hitTestAllLayers(event.point, {
            fill: true,
            stroke: true,
            segments: true,
            tolerance: 5
        });
        
        if (!hitResults || hitResults.length === 0) return;
        
        // Check for AC Table cell double-click
        for (const result of hitResults) {
            const item = result.item;
            
            if (item.data && item.data.type === 'ac-table-cell') {
                // Double-click on AC Table cell - open edit dialog
                this.currentEditingACCell = {
                    tableName: item.data.tableName,
                    cellType: 'data',
                    rowIndex: item.data.rowIndex,
                    colIndex: item.data.colIndex,
                    colName: ['parameter', 'symbol', 'min', 'max', 'unit', 'note'][item.data.colIndex]
                };
                this.showEditACCellDialog();
                return;
            }
            
            // Check for empty AC table cell area (cell border without text)
            if (item.data && item.data.type === 'ac-table-row-border') {
                // Find which column was clicked
                const tableName = item.data.tableName;
                const tableData = this.acTablesData.get(tableName);
                if (!tableData) return;
                
                const startX = this.config.nameColumnWidth + 10;
                const colWidths = tableData.columnWidths || [400, 100, 100, 100, 100, 100];
                const colPositions = [0];
                for (let i = 0; i < colWidths.length; i++) {
                    colPositions.push(colPositions[i] + colWidths[i]);
                }
                
                // Determine which column was clicked
                const clickX = xPos - startX;
                let colIndex = -1;
                for (let i = 0; i < colPositions.length - 1; i++) {
                    if (clickX >= colPositions[i] && clickX < colPositions[i + 1]) {
                        colIndex = i;
                        break;
                    }
                }
                
                if (colIndex >= 0 && colIndex < 6) {
                    // Open edit dialog for this cell (even if empty)
                    this.currentEditingACCell = {
                        tableName: tableName,
                        cellType: 'data',
                        rowIndex: item.data.rowIndex,
                        colIndex: colIndex,
                        colName: ['parameter', 'symbol', 'min', 'max', 'unit', 'note'][colIndex]
                    };
                    this.showEditACCellDialog();
                    return;
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
        // Capture state before action
        this.undoRedoManager.captureState();
        
        const signal = this.getSignalByIndex(signalIndex);
        const currentValue = this.getBitValueAtCycle(signal, cycle);
        const newValue = (currentValue === 0 || currentValue === 'X' || currentValue === 'Z') ? 1 : 0;
        signal.values[cycle] = newValue;
        this.render();
    }
    
    setBitValue(signalIndex, cycle, value) {
        if (signalIndex !== null && cycle !== null) {
            // Capture state before action
            this.undoRedoManager.captureState();
            
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
            // Capture state before action
            this.undoRedoManager.captureState();
            
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
            // Capture state before action
            this.undoRedoManager.captureState();
            
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
    
    disableClockCycle() {
        this.hideAllMenus();
        if (this.currentEditingSignal !== null && this.currentEditingCycle !== null) {
            const signal = this.getSignalByIndex(this.currentEditingSignal);
            if (signal && signal.type === 'clock') {
                // Capture state before action
                this.undoRedoManager.captureState();
                
                // Initialize cycleOptions if needed
                if (!signal.cycleOptions) {
                    signal.cycleOptions = {};
                }
                if (!signal.cycleOptions[this.currentEditingCycle]) {
                    signal.cycleOptions[this.currentEditingCycle] = {};
                }
                
                // Set disabled flag and default disable state
                signal.cycleOptions[this.currentEditingCycle].disabled = true;
                if (!signal.cycleOptions[this.currentEditingCycle].disableState) {
                    signal.cycleOptions[this.currentEditingCycle].disableState = '0';
                }
                
                this.render();
            }
        }
    }
    
    enableClockCycle() {
        this.hideAllMenus();
        if (this.currentEditingSignal !== null && this.currentEditingCycle !== null) {
            const signal = this.getSignalByIndex(this.currentEditingSignal);
            if (signal && signal.type === 'clock') {
                // Capture state before action
                this.undoRedoManager.captureState();
                
                // Remove disabled flag
                if (signal.cycleOptions && signal.cycleOptions[this.currentEditingCycle]) {
                    delete signal.cycleOptions[this.currentEditingCycle].disabled;
                    delete signal.cycleOptions[this.currentEditingCycle].disableState;
                    
                    // Clean up empty objects
                    if (Object.keys(signal.cycleOptions[this.currentEditingCycle]).length === 0) {
                        delete signal.cycleOptions[this.currentEditingCycle];
                    }
                    if (Object.keys(signal.cycleOptions).length === 0) {
                        delete signal.cycleOptions;
                    }
                }
                
                this.render();
            }
        }
    }
    
    setClockDisableState(signalIndex, cycle, state) {
        const signal = this.getSignalByIndex(signalIndex);
        if (signal && signal.type === 'clock') {
            // Capture state before action
            this.undoRedoManager.captureState();
            
            // Initialize cycleOptions if needed
            if (!signal.cycleOptions) {
                signal.cycleOptions = {};
            }
            if (!signal.cycleOptions[cycle]) {
                signal.cycleOptions[cycle] = {};
            }
            
            // Set the disable state
            signal.cycleOptions[cycle].disableState = state;
            // Also enable disabled flag
            signal.cycleOptions[cycle].disabled = true;
            
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
    
    // Get inherited phase delay from signal's domain clock in time units
    // Returns the phase delay in the same time units as the clock period
    getPhaseDelayForSignal(signal) {
        // Only applies to bit and bus signals (not clocks themselves)
        if (!signal || signal.type === 'clock') {
            return 0;
        }
        
        // Get the clock for this signal's domain
        const clock = this.getClockForSignal(signal);
        if (!clock) {
            return 0;
        }
        
        // Get clock's phase (0.0 to 1.0) and period
        const phase = clock.phase || 0;
        
        // Get the clock's period in time units
        const clockPeriodInNs = this.convertPeriodToNs(clock.period, clock.periodUnit);
        
        // Calculate phase delay: phase * period
        return phase * clockPeriodInNs;
    }
    
    // Helper to convert period to nanoseconds for consistent calculations
    convertPeriodToNs(period, unit) {
        const conversions = {
            'fs': 0.000001,  // femtoseconds to nanoseconds
            'ps': 0.001,     // picoseconds to nanoseconds
            'ns': 1,         // nanoseconds (base)
            'us': 1000,      // microseconds to nanoseconds
            'ms': 1000000    // milliseconds to nanoseconds
        };
        return period * (conversions[unit] || 1);
    }
    
    // Get effective delay value with cascading priority: cycle > signal > global
    // Each attribute (delayMin, delayMax, delayColor) is resolved independently
    // Returns object with {min, max, color} delay in pixels
    // Also includes inherited phase delay from signal's domain clock
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
        
        // Add inherited phase delay from signal's domain clock
        const phaseDelay = this.getPhaseDelayForSignal(signal);
        delayMinInTime += phaseDelay;
        delayMaxInTime += phaseDelay;
        
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
    
    // Get effective delay value in time units (not pixels) with cascading priority: cycle > signal > global
    // Returns object with {min, max} delay in time units (same as clockPeriod units)
    // Also includes inherited phase delay from signal's domain clock
    getEffectiveDelayInTime(signal, cycle) {
        // Start with defaults from code (0 for delays)
        let delayMinInTime = 0;
        let delayMaxInTime = 0;
        
        // Apply global level settings
        if (this.config.delayMin !== undefined) {
            delayMinInTime = this.config.delayMin;
        }
        if (this.config.delayMax !== undefined) {
            delayMaxInTime = this.config.delayMax;
        }
        
        // Safety check: if signal is undefined or null, return global defaults
        if (!signal) {
            return { min: delayMinInTime, max: delayMaxInTime };
        }
        
        // Apply signal level overrides
        if (signal.delayMin !== undefined) {
            delayMinInTime = signal.delayMin;
        }
        if (signal.delayMax !== undefined) {
            delayMaxInTime = signal.delayMax;
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
        }
        
        // Add inherited phase delay from signal's domain clock
        const phaseDelay = this.getPhaseDelayForSignal(signal);
        delayMinInTime += phaseDelay;
        delayMaxInTime += phaseDelay;
        
        return { min: delayMinInTime, max: delayMaxInTime };
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
    
    startDragGroupRow(rowIndex, event) {
        this.draggedGroupRow = rowIndex;
        this.isDragging = true;
        
        const rect = this.canvas.getBoundingClientRect();
        
        const onMouseMove = (moveEvent) => {
            const yPos = moveEvent.clientY - rect.top;
            this.updateDragIndicator(yPos);
        };
        
        const onMouseUp = (upEvent) => {
            const yPos = upEvent.clientY - rect.top;
            this.dropGroupRow(yPos);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.draggedGroupRow = null;
            this.isDragging = false;
            this.removeDragIndicator();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    dropGroupRow(yPos) {
        const targetRow = this.getRowAtY(yPos);
        
        if (!targetRow || targetRow.index === this.draggedGroupRow) {
            return; // Invalid drop location or same position
        }
        
        // Calculate position within row
        const targetYPos = this.rowManager.getRowYPosition(targetRow.index);
        const targetYMid = targetYPos + this.config.rowHeight / 2;
        
        // Extract and remove from old position
        const groupRow = this.rows[this.draggedGroupRow];
        this.rows.splice(this.draggedGroupRow, 1);
        
        // Calculate new insertion index (above or below target row)
        let newIndex = targetRow.index;
        
        // Adjust newIndex if dragged row was before target
        if (this.draggedGroupRow < targetRow.index) {
            newIndex--;
        }
        
        // Determine if we should insert above or below the target row
        if (yPos >= targetYMid) {
            newIndex++; // Insert below
        }
        
        // Insert at new position
        this.rows.splice(newIndex, 0, groupRow);
        
        // Update measures in the group to reflect new row position
        this.rebuildAfterGroupRowMove();
        
        // Clear selection after drop
        this.selectedGroupRows.clear();
        
        this.render();
    }
    
    rebuildAfterGroupRowMove() {
        // After moving a group row, update measureRow field in measures within groups
        this.rows.forEach((row, rowIndex) => {
            if (row.type === 'group') {
                const group = this.groupsData.get(row.name);
                if (group && group.measures) {
                    this.updateGroupMeasureRows(group, rowIndex);
                }
            }
        });
    }
    
    updateGroupMeasureRows(group, rowIndex) {
        // Helper to update measureRow for all measures in a group
        if (!group || !group.measures) return;
        
        group.measures.forEach(measureName => {
            const measure = this.measuresData.get(measureName);
            if (measure) {
                measure.measureRow = rowIndex;
            }
        });
    }
    
    dropMeasureRow(yPos) {
        const targetRow = this.getRowAtY(yPos);
        
        if (!targetRow || targetRow.index === this.draggedMeasureRow) {
            return; // Invalid drop location or same position
        }
        
        // Capture state before action
        this.undoRedoManager.captureState();
        
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
        
        // Prevent inserting after AC tables - find first AC table and cap insertion index
        const firstACTableIndex = this.rows.findIndex(r => r.type === 'ac-table');
        if (firstACTableIndex >= 0 && newIndex > firstACTableIndex) {
            newIndex = firstACTableIndex;
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
            } else if (row.type === 'group') {
                // Update measureRow for all measures in group
                const group = this.groupsData.get(row.name);
                if (group) {
                    this.updateGroupMeasureRows(group, rowIndex);
                }
            }
        });
        
        // Recalculate arrow positions when measures move (arrows may be positioned relative to measures)
        this.recalculateArrowPositions();
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
            
            // Prevent inserting after AC tables - find first AC table and cap insertion index
            const firstACTableIndex = this.rows.findIndex(r => r.type === 'ac-table');
            if (firstACTableIndex >= 0 && insertRowIndex > firstACTableIndex) {
                insertRowIndex = firstACTableIndex;
            }
            
            // Get the row indices of selected signals
            const selectedSignalRows = selectedIndices.map(idx => 
                this.rowManager.signalIndexToRowIndex(idx)
            );
            
            // Check if reordering will actually happen
            const willReorder = selectedSignalRows.some((row, i) => row !== insertRowIndex + i);
            
            if (!willReorder) {
                return; // No actual reordering needed
            }
            
            // Capture state before action
            this.undoRedoManager.captureState();
            
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
        TimingGenCycle.insertCyclesGlobal(this, startCycle, numCycles);
    }
    
    deleteCyclesGlobal(startCycle, numCycles) {
        TimingGenCycle.deleteCyclesGlobal(this, startCycle, numCycles);
    }
    
    insertCyclesSignal(signalIndex, startCycle, numCycles) {
        TimingGenCycle.insertCyclesSignal(this, signalIndex, startCycle, numCycles);
    }
    
    deleteCyclesSignal(signalIndex, startCycle, numCycles) {
        TimingGenCycle.deleteCyclesSignal(this, signalIndex, startCycle, numCycles);
    }
    
    insertCyclesForSignal(signal, startCycle, numCycles) {
        TimingGenCycle.insertCyclesForSignal(signal, startCycle, numCycles);
    }
    
    deleteCyclesForSignal(signal, startCycle, numCycles) {
        TimingGenCycle.deleteCyclesForSignal(signal, startCycle, numCycles);
    }
    
    updateMeasureCyclesAfterInsertion(startCycle, numCycles) {
        TimingGenCycle.updateMeasureCyclesAfterInsertion(this, startCycle, numCycles);
    }
    
    updateMeasureCyclesAfterDeletion(startCycle, numCycles) {
        TimingGenCycle.updateMeasureCyclesAfterDeletion(this, startCycle, numCycles);
    }
    
    updateArrowCyclesAfterInsertion(startCycle, numCycles) {
        TimingGenCycle.updateArrowCyclesAfterInsertion(this, startCycle, numCycles);
    }
    
    updateArrowCyclesAfterDeletion(startCycle, numCycles) {
        TimingGenCycle.updateArrowCyclesAfterDeletion(this, startCycle, numCycles);
    }
    
    handleInsertCycles() {
        TimingGenCycle.handleInsertCycles(this);
    }
    
    handleDeleteCycles() {
        TimingGenCycle.handleDeleteCycles(this);
    }
    
    validateCycleCount(numCycles) {
        return TimingGenCycle.validateCycleCount(numCycles);
    }
    
    // Measure-related methods
    startMeasureMode() {
        TimingGenMeasure.startMeasureMode(this);
    }
    
    getCycleAtX(xPos) {
        return TimingGenMeasure.getCycleAtX(this, xPos);
    }
    
    getMeasureCoordinates(measure) {
        return TimingGenMeasure.getMeasureCoordinates(this, measure);
    }
    
    getTransitionMidpointX(signalIndex, cycle) {
        return TimingGenMeasure.getTransitionMidpointX(this, signalIndex, cycle);
    }
    
    findNearestTransition(xPos, yPos) {
        return TimingGenMeasure.findNearestTransition(this, xPos, yPos);
    }
    
    findNearestPOI(xPos, yPos) {
        return TimingGenMeasure.findNearestPOI(this, xPos, yPos);
    }
    
    showInstruction(text) {
        TimingGenMeasure.showInstruction(this, text);
    }
    
    hideInstruction() {
        TimingGenMeasure.hideInstruction(this);
    }
    
    handleMeasureMouseMove(event) {
        TimingGenMeasure.handleMeasureMouseMove(this, event);
    }
    
    drawMeasureBar(xPos, color) {
        return TimingGenMeasure.drawMeasureBar(this, xPos, color);
    }
    
    drawMeasureArrows(x1, x2, yPos) {
        return TimingGenMeasure.drawMeasureArrows(this, x1, x2, yPos);
    }
    
    getRowIndexAtY(yPos) {
        return TimingGenMeasure.getRowIndexAtY(this, yPos);
    }
    
    getMeasurePlacementY(yPos) {
        return TimingGenMeasure.getMeasurePlacementY(this, yPos);
    }
    
    // New drawing helper methods for measure feature
    drawSmallCross(xPos, yPos) {
        return TimingGenMeasure.drawSmallCross(this, xPos, yPos);
    }
    
    drawDynamicVerticalLine(xPos, startY, currentY) {
        return TimingGenMeasure.drawDynamicVerticalLine(this, xPos, startY, currentY);
    }
    
    drawFullVerticalLine(xPos, startY, endY) {
        return TimingGenMeasure.drawFullVerticalLine(this, xPos, startY, endY);
    }
    
    drawRowIndicator(rowIndex) {
        TimingGenMeasure.drawRowIndicator(this, rowIndex);
    }
    
    drawArrowHead(x, y, direction, size = 8) {
        return TimingGenMeasure.drawArrowHead(this, x, y, direction, size);
    }
    
    // Draw visuals immediately after first click
    drawFirstPointVisuals() {
        TimingGenMeasure.drawFirstPointVisuals(this);
    }
    
    // Draw visuals immediately after second click
    drawSecondPointVisuals() {
        TimingGenMeasure.drawSecondPointVisuals(this);
    }
    
    finalizeMeasureWithBlankRow() {
        TimingGenMeasure.finalizeMeasureWithBlankRow(this);
    }
    
    finalizeMeasure() {
        TimingGenMeasure.finalizeMeasure(this);
    }
    
    cancelMeasure() {
        TimingGenMeasure.cancelMeasure(this);
    }
    
    showMeasureContextMenu(event, measureIndex) {
        TimingGenMeasure.showMeasureContextMenu(this, event, measureIndex);
    }
    
    deleteMeasure() {
        TimingGenMeasure.deleteMeasure(this);
    }
    
    startDragMeasureText(measureRowIndex, event) {
        TimingGenMeasure.startDragMeasureText(this, measureRowIndex, event);
    }
    
    showMeasureTextContextMenu(event, measureIndex) {
        TimingGenMeasure.showMeasureTextContextMenu(this, event, measureIndex);
    }
    
    startRechooseMeasurePoint(measureRowIndex, pointIndex) {
        TimingGenMeasure.startRechooseMeasurePoint(this, measureRowIndex, pointIndex);
    }
    
    startMovingMeasureRow(measureIdentifier, event) {
        TimingGenMeasure.startMovingMeasureRow(this, measureIdentifier, event);
    }
    
    // ===========================
    // Arrow Functions
    // ===========================
    
    addGroup() {
        // Create a new empty group
        const groupName = `G${this.groupCounter}`;
        this.groupCounter++;
        
        const group = {
            name: groupName,
            measures: []
        };
        
        // Store in groupsData
        this.groupsData.set(groupName, group);
        
        // Add to rows array at the end (before AC tables if any)
        const firstACTableIndex = this.rows.findIndex(r => r.type === 'ac-table');
        const insertIndex = firstACTableIndex >= 0 ? firstACTableIndex : this.rows.length;
        
        this.rows.splice(insertIndex, 0, {
            type: 'group',
            name: groupName
        });
        
        this.render();
        
        // Show instruction
        this.showInstruction(`Group ${groupName} created. Use measure arrow to move measures into this group.`);
        setTimeout(() => this.hideInstruction(), 3000);
    }
    
    startArrowMode() {
        TimingGenArrow.startArrowMode(this);
    }
    
    handleArrowMouseMove(event) {
        TimingGenArrow.handleArrowMouseMove(this, event);
    }
    
    cancelArrow() {
        TimingGenArrow.cancelArrow(this);
    }
    
    finalizeArrow() {
        TimingGenArrow.finalizeArrow(this);
    }
    
    deleteArrow() {
        TimingGenArrow.deleteArrow(this);
    }
    
    showArrowOptionsDialog() {
        TimingGenArrow.showArrowOptionsDialog(this);
    }
    
    hideArrowOptionsDialog() {
        TimingGenArrow.hideArrowOptionsDialog(this);
    }
    
    applyArrowOptions() {
        TimingGenArrow.applyArrowOptions(this);
    }
    
    showArrowContextMenu(event, arrowName) {
        TimingGenArrow.showArrowContextMenu(this, event, arrowName);
    }
    
    showArrowTextContextMenu(event, arrowName) {
        TimingGenArrow.showArrowTextContextMenu(this, event, arrowName);
    }
    
    showEditArrowTextDialog() {
        TimingGenArrow.showEditArrowTextDialog(this);
    }
    
    hideEditArrowTextDialog() {
        TimingGenArrow.hideEditArrowTextDialog(this);
    }
    
    applyEditArrowText() {
        TimingGenArrow.applyEditArrowText(this);
    }
    
    showArrowTextOptionsDialog() {
        TimingGenArrow.showArrowTextOptionsDialog(this);
    }
    
    hideArrowTextOptionsDialog() {
        TimingGenArrow.hideArrowTextOptionsDialog(this);
    }
    
    applyArrowTextOptions() {
        TimingGenArrow.applyArrowTextOptions(this);
    }
    
    startEditingArrow(arrowName) {
        TimingGenArrow.startEditingArrow(this, arrowName);
    }
    
    stopEditingArrow() {
        TimingGenArrow.stopEditingArrow(this);
    }
    
    startDraggingArrowPoint(arrowName, pointIndex, event) {
        TimingGenArrow.startDraggingArrowPoint(this, arrowName, pointIndex, event);
    }
    
    findClosestPOI(allPOIs, x, y) {
        return TimingGenArrow.findClosestPOI(allPOIs, x, y);
    }
    
    updateArrowPoint(arrowName, pointIndex, x, y) {
        TimingGenArrow.updateArrowPoint(this, arrowName, pointIndex, x, y);
    }
    
    recalculateArrowPositions() {
        TimingGenArrow.recalculateArrowPositions(this);
    }
    
    getPointOfInterest(signalName, cycle, poiType = 'auto') {
        return TimingGenArrow.getPointOfInterest(this, signalName, cycle, poiType);
    }
    
    getAllPOIsForSignalCycle(signalName, cycle) {
        return TimingGenArrow.getAllPOIsForSignalCycle(this, signalName, cycle);
    }
    
    getTransitionPoint(signalName, cycle) {
        return TimingGenArrow.getTransitionPoint(this, signalName, cycle);
    }
    
    
    redrawAll() {
        // Update all AC tables for measure changes
        for (const [measureName, measure] of this.measuresData.entries()) {
            this.updateACTableForMeasureChange(measureName, measure);
        }
        
        // Recalculate arrow positions
        this.recalculateArrowPositions();
        
        // Redraw everything
        this.render();
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
        
        // Clear undo/redo history
        this.undoRedoManager.clearHistory();
        
        // Render empty canvas
        this.render();
    }
    
    deleteTextRow() {
        TimingGenTextCounter.deleteTextRow(this);
    }
    
    deleteCounter() {
        this.hideAllMenus();
        if (this.currentEditingCounterName) {
            // Capture state before action
            this.undoRedoManager.captureState();
            
            // Remove from data store
            this.counterData.delete(this.currentEditingCounterName);
            
            // Remove from rows array
            const rowIndex = this.rows.findIndex(r => r.type === 'counter' && r.name === this.currentEditingCounterName);
            if (rowIndex !== -1) {
                this.rows.splice(rowIndex, 1);
            }
            
            this.currentEditingCounterName = null;
            this.render();
        }
    }
    
    deleteMeasureRow() {
        if (this.currentEditingMeasureRow !== null) {
            // Confirm deletion
            if (!confirm('Delete this measure?')) {
                this.hideAllMenus();
                return;
            }
            
            // Capture state before action
            this.undoRedoManager.captureState();
            
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

// ================================================================================
// Clock Domain Management Methods
// ================================================================================

/**
 * Get all clock signals in the diagram
 * @returns {Array} Array of clock signal objects
 */
TimingGenApp.prototype.getClockSignals = function() {
    const signals = this.getSignals();
    return signals.filter(signal => signal.type === 'clock');
};

/**
 * Get the clock signal for a given signal (based on base_clock property)
 * @param {Object} signal - The signal to get the clock for
 * @returns {Object|null} Clock signal object or null if not found
 */
TimingGenApp.prototype.getClockForSignal = function(signal) {
    if (signal.type === 'clock') {
        return signal; // Clock is its own domain
    }
    
    if (!signal.base_clock) {
        return null;
    }
    
    return this.signalsData.get(signal.base_clock) || null;
};

/**
 * Get all signals in a specific clock domain
 * @param {string} clockName - Name of the clock signal
 * @returns {Array} Array of signals in the domain (including the clock itself)
 */
TimingGenApp.prototype.getSignalsInDomain = function(clockName) {
    const signals = this.getSignals();
    const domainSignals = [];
    
    for (const signal of signals) {
        if (signal.name === clockName) {
            // The clock itself
            domainSignals.push(signal);
        } else if (signal.base_clock === clockName) {
            // Signals referencing this clock
            domainSignals.push(signal);
        }
    }
    
    return domainSignals;
};

/**
 * Get all clock domains in the diagram
 * @returns {Object} Map of clock name to array of signals in that domain
 */
TimingGenApp.prototype.getAllClockDomains = function() {
    const clocks = this.getClockSignals();
    const domains = {};
    
    for (const clock of clocks) {
        domains[clock.name] = this.getSignalsInDomain(clock.name);
    }
    
    return domains;
};

/**
 * Calculate cycle width for a specific clock based on its period
 * Uses a base scale factor to maintain reasonable pixel sizes
 * @param {Object} clock - Clock signal object
 * @returns {number} Cycle width in pixels
 */
TimingGenApp.prototype.getCycleWidthForClock = function(clock) {
    if (!clock || !clock.period) {
        // Fallback to global cycleWidth
        return this.config.cycleWidth;
    }
    
    // Base scale: 1ns = 6 pixels (default 10ns = 60px)
    const baseScale = 6;
    
    // Convert period to nanoseconds for consistent scaling
    let periodInNs = clock.period;
    switch (clock.periodUnit) {
        case 'fs':
            periodInNs = clock.period / 1000000;
            break;
        case 'ps':
            periodInNs = clock.period / 1000;
            break;
        case 'ns':
            periodInNs = clock.period;
            break;
        case 'us':
            periodInNs = clock.period * 1000;
            break;
        case 'ms':
            periodInNs = clock.period * 1000000;
            break;
    }
    
    return periodInNs * baseScale;
};

/**
 * Get cycle width for a specific signal based on its clock domain
 * @param {Object} signal - Signal object
 * @returns {number} Cycle width in pixels
 */
TimingGenApp.prototype.getCycleWidthForSignal = function(signal) {
    const clock = this.getClockForSignal(signal);
    return this.getCycleWidthForClock(clock);
};

    printData = function() {
        const app = window.timingGenApp;
        const data = {
            version: '3.5.0',
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
