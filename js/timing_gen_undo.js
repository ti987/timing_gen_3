// Timing Gen 3 - Undo/Redo Manager
// Version 3.3.3
// Manages undo/redo history for all user actions

class UndoRedoManager {
    constructor(app) {
        this.app = app;
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 100; // Limit stack size to prevent memory issues
    }
    
    /**
     * Capture the current state before a user action
     * This should be called before any state-modifying operation
     */
    captureState() {
        const state = this.serializeState();
        this.undoStack.push(state);
        
        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
        
        this.updateButtons();
    }
    
    /**
     * Serialize the current application state
     * @returns {Object} Serialized state object
     */
    serializeState() {
        return {
            config: JSON.parse(JSON.stringify(this.app.config)),
            rows: JSON.parse(JSON.stringify(this.app.rows)),
            signalsData: this.serializeMap(this.app.signalsData),
            measuresData: this.serializeMap(this.app.measuresData),
            textData: this.serializeMap(this.app.textData),
            counterData: this.serializeMap(this.app.counterData),
            arrowsData: this.serializeMap(this.app.arrowsData),
            tears: Array.from(this.app.tears || new Set()),
            measureCounter: this.app.measureCounter,
            measureTextCounter: this.app.measureTextCounter,
            textCounter: this.app.textCounter,
            counterCounter: this.app.counterCounter,
            arrowCounter: this.app.arrowCounter
        };
    }
    
    /**
     * Helper to serialize a Map object
     * @param {Map} map - Map to serialize
     * @returns {Array} Array of [key, value] pairs
     */
    serializeMap(map) {
        return Array.from(map.entries()).map(([key, value]) => [
            key,
            JSON.parse(JSON.stringify(value))
        ]);
    }
    
    /**
     * Restore a state
     * @param {Object} state - State object to restore
     */
    restoreState(state) {
        // Restore config
        this.app.config = JSON.parse(JSON.stringify(state.config));
        
        // Restore rows
        this.app.rows = JSON.parse(JSON.stringify(state.rows));
        
        // Restore data maps
        this.app.signalsData = new Map(state.signalsData.map(([key, value]) => [
            key,
            JSON.parse(JSON.stringify(value))
        ]));
        
        this.app.measuresData = new Map(state.measuresData.map(([key, value]) => [
            key,
            JSON.parse(JSON.stringify(value))
        ]));
        
        this.app.textData = new Map(state.textData.map(([key, value]) => [
            key,
            JSON.parse(JSON.stringify(value))
        ]));
        
        this.app.counterData = new Map(state.counterData.map(([key, value]) => [
            key,
            JSON.parse(JSON.stringify(value))
        ]));
        
        this.app.arrowsData = new Map(state.arrowsData.map(([key, value]) => [
            key,
            JSON.parse(JSON.stringify(value))
        ]));
        
        // Restore tears
        this.app.tears = new Set(state.tears || []);
        
        // Restore counters
        this.app.measureCounter = state.measureCounter;
        this.app.measureTextCounter = state.measureTextCounter;
        this.app.textCounter = state.textCounter;
        this.app.counterCounter = state.counterCounter;
        this.app.arrowCounter = state.arrowCounter;
        
        // Update cycles input
        document.getElementById('cycles-input').value = this.app.config.cycles;
        
        // Clear selections
        this.app.selectedSignals.clear();
        this.app.selectedMeasureRows.clear();
        
        // Re-render
        this.app.render();
    }
    
    /**
     * Perform undo operation
     */
    undo() {
        if (this.undoStack.length === 0) {
            return;
        }
        
        // Save current state to redo stack
        const currentState = this.serializeState();
        this.redoStack.push(currentState);
        
        // Pop and restore previous state
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);
        
        this.updateButtons();
    }
    
    /**
     * Perform redo operation
     */
    redo() {
        if (this.redoStack.length === 0) {
            return;
        }
        
        // Save current state to undo stack
        const currentState = this.serializeState();
        this.undoStack.push(currentState);
        
        // Pop and restore next state
        const nextState = this.redoStack.pop();
        this.restoreState(nextState);
        
        this.updateButtons();
    }
    
    /**
     * Clear all history (called on New or Load)
     */
    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateButtons();
    }
    
    /**
     * Update the undo/redo button states
     */
    updateButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }
}
