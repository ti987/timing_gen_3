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
        
        // Update delay unit label to match clock period unit
        document.getElementById('delay-unit-label').textContent = app.config.clockPeriodUnit;
        
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
        
        // Update delay unit labels in other dialogs
        document.getElementById('signal-delay-unit-label').textContent = clockPeriodUnit;
        document.getElementById('cycle-delay-unit-label').textContent = clockPeriodUnit;
        
        TimingGenUI.hideGlobalOptionDialog();
        app.render();
    }
    
    static hideAllDialogs(app) {
        TimingGenUI.hideAddSignalDialog();
        TimingGenUI.hideEditSignalDialog();
        TimingGenUI.hideBusValueDialog(app);
        TimingGenUI.hideGlobalOptionDialog();
        TimingGenUI.hideSignalOptionsDialog();
        TimingGenUI.hideCycleOptionsDialog();
    }
    
    static showSignalOptionsDialog(app) {
        if (app.currentEditingSignal !== null) {
            const signal = app.signals[app.currentEditingSignal];
            // Populate with signal-specific values if they exist
            document.getElementById('signal-slew-input').value = signal.slew !== undefined ? signal.slew : '';
            document.getElementById('signal-delay-input').value = signal.delay !== undefined ? signal.delay : '';
            
            // Update delay unit label to match clock period unit
            document.getElementById('signal-delay-unit-label').textContent = app.config.clockPeriodUnit;
            
            document.getElementById('signal-options-dialog').style.display = 'flex';
            document.getElementById('signal-slew-input').focus();
        }
    }
    
    static hideSignalOptionsDialog() {
        document.getElementById('signal-options-dialog').style.display = 'none';
    }
    
    static saveSignalOptions(app) {
        if (app.currentEditingSignal !== null) {
            const signal = app.signals[app.currentEditingSignal];
            const slewValue = document.getElementById('signal-slew-input').value;
            const delayValue = document.getElementById('signal-delay-input').value;
            
            // If empty, remove the override (use global)
            if (slewValue === '') {
                delete signal.slew;
            } else {
                const slew = parseInt(slewValue);
                if (isNaN(slew) || slew < 0) {
                    alert('Please enter a valid slew value');
                    return;
                }
                signal.slew = slew;
            }
            
            if (delayValue === '') {
                delete signal.delay;
            } else {
                const delay = parseFloat(delayValue);
                if (isNaN(delay) || delay < 0) {
                    alert('Please enter a valid delay value');
                    return;
                }
                signal.delay = delay;
            }
            
            TimingGenUI.hideSignalOptionsDialog();
            app.render();
        }
    }
    
    static showCycleOptionsDialog(app) {
        if (app.currentEditingSignal !== null && app.currentEditingCycle !== null) {
            const signal = app.signals[app.currentEditingSignal];
            const cycle = app.currentEditingCycle;
            
            // Initialize cycle options if not exists
            if (!signal.cycleOptions) {
                signal.cycleOptions = {};
            }
            
            const cycleOpts = signal.cycleOptions[cycle] || {};
            document.getElementById('cycle-slew-input').value = cycleOpts.slew !== undefined ? cycleOpts.slew : '';
            document.getElementById('cycle-delay-input').value = cycleOpts.delay !== undefined ? cycleOpts.delay : '';
            
            // Update delay unit label to match clock period unit
            document.getElementById('cycle-delay-unit-label').textContent = app.config.clockPeriodUnit;
            
            document.getElementById('cycle-options-dialog').style.display = 'flex';
            document.getElementById('cycle-slew-input').focus();
        }
    }
    
    static hideCycleOptionsDialog() {
        document.getElementById('cycle-options-dialog').style.display = 'none';
    }
    
    static saveCycleOptions(app) {
        if (app.currentEditingSignal !== null && app.currentEditingCycle !== null) {
            const signal = app.signals[app.currentEditingSignal];
            const cycle = app.currentEditingCycle;
            
            if (!signal.cycleOptions) {
                signal.cycleOptions = {};
            }
            
            const slewValue = document.getElementById('cycle-slew-input').value;
            const delayValue = document.getElementById('cycle-delay-input').value;
            
            if (!signal.cycleOptions[cycle]) {
                signal.cycleOptions[cycle] = {};
            }
            
            // If empty, remove the override
            if (slewValue === '') {
                delete signal.cycleOptions[cycle].slew;
            } else {
                const slew = parseInt(slewValue);
                if (isNaN(slew) || slew < 0) {
                    alert('Please enter a valid slew value');
                    return;
                }
                signal.cycleOptions[cycle].slew = slew;
            }
            
            if (delayValue === '') {
                delete signal.cycleOptions[cycle].delay;
            } else {
                const delay = parseFloat(delayValue);
                if (isNaN(delay) || delay < 0) {
                    alert('Please enter a valid delay value');
                    return;
                }
                signal.cycleOptions[cycle].delay = delay;
            }
            
            // Clean up empty objects
            if (Object.keys(signal.cycleOptions[cycle]).length === 0) {
                delete signal.cycleOptions[cycle];
            }
            if (Object.keys(signal.cycleOptions).length === 0) {
                delete signal.cycleOptions;
            }
            
            TimingGenUI.hideCycleOptionsDialog();
            app.render();
        }
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
        
        // Add click handlers for menu items with data-value
        const items = menu.querySelectorAll('.menu-item[data-value]');
        items.forEach(item => {
            item.onclick = () => {
                const value = item.getAttribute('data-value');
                app.setBitValue(app.currentEditingSignal, app.currentEditingCycle, value);
                app.hideAllMenus();
            };
        });
    }
    
    static showBusCycleContextMenu(app, x, y) {
        const menu = document.getElementById('bus-cycle-context-menu');
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }
}
