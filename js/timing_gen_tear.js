// Timing Gen 3 - Tear Marks Module
// Version 3.5.0
// Handles tear mark functionality for cycle visualization

class TimingGenTear {
    /**
     * Show dialog to add a new tear mark
     * @param {TimingGenApp} app - Main application instance
     */
    static showAddTearDialog(app) {
        document.getElementById('tear-cycle-input').value = '0';
        document.getElementById('add-tear-dialog').style.display = 'flex';
    }
    
    /**
     * Hide the add tear dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideAddTearDialog(app) {
        document.getElementById('add-tear-dialog').style.display = 'none';
    }
    
    /**
     * Add a tear mark at the specified cycle from dialog input
     * @param {TimingGenApp} app - Main application instance
     */
    static addTear(app) {
        const cycleInput = document.getElementById('tear-cycle-input').value.trim();
        const cycle = parseInt(cycleInput);
        
        if (cycleInput === '' || isNaN(cycle)) {
            alert('Please enter a valid cycle number');
            return;
        }
        
        if (cycle < 0 || cycle >= app.config.cycles) {
            alert(`Cycle number must be between 0 and ${app.config.cycles - 1}`);
            return;
        }
        
        if (app.tears.has(cycle)) {
            alert(`Cycle ${cycle} already has a tear mark`);
            return;
        }
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        // Add tear to the set
        app.tears.add(cycle);
        
        TimingGenTear.hideAddTearDialog(app);
        app.render();
    }
    
    /**
     * Delete a tear mark at the specified cycle
     * @param {TimingGenApp} app - Main application instance
     * @param {number} cycle - Cycle number where tear should be deleted
     */
    static deleteTear(app, cycle) {
        if (!app.tears.has(cycle)) {
            return;
        }
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        // Remove tear from the set
        app.tears.delete(cycle);
        
        app.render();
    }
    
    /**
     * Add a tear mark at the specified cycle (without dialog)
     * @param {TimingGenApp} app - Main application instance
     * @param {number} cycle - Cycle number where tear should be added
     */
    static addTearAtCycle(app, cycle) {
        // Validate cycle number
        if (cycle < 0 || cycle >= app.config.cycles) {
            return;
        }
        
        if (app.tears.has(cycle)) {
            return; // Already has a tear
        }
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        // Add tear to the set
        app.tears.add(cycle);
        
        app.render();
    }
}
