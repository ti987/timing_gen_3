// Timing Gen 3 - UI Management Module
// Version 3.0.1
// Handles dialog management and user interface interactions

class TimingGenUI {
    static showAddSignalDialog(app) {
        document.getElementById('add-signal-dialog').style.display = 'flex';
        document.getElementById('signal-name-input').value = '';
        document.getElementById('signal-name-input').focus();
    }
    
    static hideAddSignalDialog() {
        document.getElementById('add-signal-dialog').style.display = 'none';
    }
    
    static showEditSignalDialog(app) {
        app.hideAllMenus();
        if (app.currentEditingSignal !== null) {
            const signal = app.signals[app.currentEditingSignal];
            document.getElementById('edit-signal-name-input').value = signal.name;
            document.getElementById('edit-signal-type-select').value = signal.type;
            document.getElementById('edit-signal-dialog').style.display = 'flex';
            document.getElementById('edit-signal-name-input').focus();
        }
    }
    
    static hideEditSignalDialog() {
        document.getElementById('edit-signal-dialog').style.display = 'none';
    }
    
    static showBusValueDialog(app, signalIndex, cycle) {
        app.currentEditingSignal = signalIndex;
        app.currentEditingCycle = cycle;
        const signal = app.signals[signalIndex];
        const currentValue = signal.values[cycle];
        
        document.getElementById('bus-value-input').value = currentValue !== undefined ? currentValue : '';
        document.getElementById('bus-value-dialog').style.display = 'flex';
        document.getElementById('bus-value-input').focus();
    }
    
    static hideBusValueDialog(app) {
        document.getElementById('bus-value-dialog').style.display = 'none';
        app.currentEditingSignal = null;
        app.currentEditingCycle = null;
    }
    
    static showGlobalOptionDialog(app) {
        // Populate dialog with current values
        document.getElementById('clock-period-input').value = app.config.clockPeriod;
        document.getElementById('clock-period-unit-select').value = app.config.clockPeriodUnit;
        document.getElementById('slew-input').value = app.config.slew;
        document.getElementById('delay-input').value = app.config.delay;
        document.getElementById('delay-unit-select').value = app.config.delayUnit;
        
        document.getElementById('global-option-dialog').style.display = 'flex';
        document.getElementById('clock-period-input').focus();
    }
    
    static hideGlobalOptionDialog() {
        document.getElementById('global-option-dialog').style.display = 'none';
    }
    
    static saveGlobalOptions(app) {
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
        
        app.config.clockPeriod = clockPeriod;
        app.config.clockPeriodUnit = clockPeriodUnit;
        app.config.slew = slew;
        app.config.delay = delay;
        app.config.delayUnit = delayUnit;
        
        TimingGenUI.hideGlobalOptionDialog();
        app.render();
    }
    
    static hideAllDialogs(app) {
        TimingGenUI.hideAddSignalDialog();
        TimingGenUI.hideEditSignalDialog();
        TimingGenUI.hideBusValueDialog(app);
        TimingGenUI.hideGlobalOptionDialog();
    }
    
    static showContextMenu(menuId, x, y) {
        const menu = document.getElementById(menuId);
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }
    
    static showBitCycleContextMenu(app, x, y) {
        const menu = document.getElementById('bit-cycle-context-menu');
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Add click handlers for menu items
        const items = menu.querySelectorAll('.menu-item');
        items.forEach(item => {
            item.onclick = () => {
                const value = item.getAttribute('data-value');
                app.setBitValue(app.currentEditingSignal, app.currentEditingCycle, value);
                app.hideAllMenus();
            };
        });
    }
}
