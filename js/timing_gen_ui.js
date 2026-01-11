// Timing Gen 3 - UI Management Module
// Version 3.0.3
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
        document.getElementById('delay-min-input').value = app.config.delayMin;
        document.getElementById('delay-max-input').value = app.config.delayMax;
        document.getElementById('delay-color-input').value = app.config.delayColor;
        
        // Update delay unit labels to match clock period unit
        document.getElementById('delay-min-unit-label').textContent = app.config.clockPeriodUnit;
        document.getElementById('delay-max-unit-label').textContent = app.config.clockPeriodUnit;
        
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
        const delayMin = parseFloat(document.getElementById('delay-min-input').value);
        const delayMax = parseFloat(document.getElementById('delay-max-input').value);
        const delayColor = document.getElementById('delay-color-input').value;
        
        if (isNaN(clockPeriod) || clockPeriod <= 0) {
            alert('Please enter a valid clock period');
            return;
        }
        
        if (isNaN(slew) || slew < 0) {
            alert('Please enter a valid slew value');
            return;
        }
        
        if (isNaN(delayMin) || delayMin < 0) {
            alert('Please enter a valid delay min value');
            return;
        }
        
        if (isNaN(delayMax) || delayMax < 0) {
            alert('Please enter a valid delay max value');
            return;
        }
        
        if (delayMax < delayMin) {
            alert('Delay max must be greater than or equal to delay min');
            return;
        }
        
        app.config.clockPeriod = clockPeriod;
        app.config.clockPeriodUnit = clockPeriodUnit;
        app.config.slew = slew;
        app.config.delayMin = delayMin;
        app.config.delayMax = delayMax;
        app.config.delayColor = delayColor;
        
        // Update delay unit labels in other dialogs
        document.getElementById('signal-delay-min-unit-label').textContent = clockPeriodUnit;
        document.getElementById('signal-delay-max-unit-label').textContent = clockPeriodUnit;
        document.getElementById('cycle-delay-min-unit-label').textContent = clockPeriodUnit;
        document.getElementById('cycle-delay-max-unit-label').textContent = clockPeriodUnit;
        
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
        TimingGenUI.hideInsertCyclesDialog();
        TimingGenUI.hideDeleteCyclesDialog();
    }
    
    static showSignalOptionsDialog(app) {
        if (app.currentEditingSignal !== null) {
            const signal = app.signals[app.currentEditingSignal];
            // Populate with signal-specific values if they exist
            document.getElementById('signal-slew-input').value = signal.slew !== undefined ? signal.slew : '';
            document.getElementById('signal-delay-min-input').value = signal.delayMin !== undefined ? signal.delayMin : '';
            document.getElementById('signal-delay-max-input').value = signal.delayMax !== undefined ? signal.delayMax : '';
            document.getElementById('signal-delay-color-input').value = signal.delayColor !== undefined ? signal.delayColor : app.config.delayColor;
            
            // Update delay unit labels to match clock period unit
            document.getElementById('signal-delay-min-unit-label').textContent = app.config.clockPeriodUnit;
            document.getElementById('signal-delay-max-unit-label').textContent = app.config.clockPeriodUnit;
            
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
            const delayMinValue = document.getElementById('signal-delay-min-input').value;
            const delayMaxValue = document.getElementById('signal-delay-max-input').value;
            const delayColorValue = document.getElementById('signal-delay-color-input').value;
            
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
            
            // Handle delay min/max
            if (delayMinValue === '' && delayMaxValue === '') {
                delete signal.delayMin;
                delete signal.delayMax;
                delete signal.delayColor;
            } else if (delayMinValue !== '' && delayMaxValue !== '') {
                const delayMin = parseFloat(delayMinValue);
                const delayMax = parseFloat(delayMaxValue);
                if (isNaN(delayMin) || delayMin < 0) {
                    alert('Please enter a valid delay min value');
                    return;
                }
                if (isNaN(delayMax) || delayMax < 0) {
                    alert('Please enter a valid delay max value');
                    return;
                }
                if (delayMax < delayMin) {
                    alert('Delay max must be greater than or equal to delay min');
                    return;
                }
                signal.delayMin = delayMin;
                signal.delayMax = delayMax;
                signal.delayColor = delayColorValue;
            } else {
                alert('Please enter both delay min and delay max, or leave both empty to use signal/global values');
                return;
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
            document.getElementById('cycle-delay-min-input').value = cycleOpts.delayMin !== undefined ? cycleOpts.delayMin : '';
            document.getElementById('cycle-delay-max-input').value = cycleOpts.delayMax !== undefined ? cycleOpts.delayMax : '';
            document.getElementById('cycle-delay-color-input').value = cycleOpts.delayColor !== undefined ? cycleOpts.delayColor : (signal.delayColor || app.config.delayColor);
            
            // Update delay unit labels to match clock period unit
            document.getElementById('cycle-delay-min-unit-label').textContent = app.config.clockPeriodUnit;
            document.getElementById('cycle-delay-max-unit-label').textContent = app.config.clockPeriodUnit;
            
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
            const delayMinValue = document.getElementById('cycle-delay-min-input').value;
            const delayMaxValue = document.getElementById('cycle-delay-max-input').value;
            const delayColorValue = document.getElementById('cycle-delay-color-input').value;
            
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
            
            // Handle delay min/max
            if (delayMinValue === '' && delayMaxValue === '') {
                delete signal.cycleOptions[cycle].delayMin;
                delete signal.cycleOptions[cycle].delayMax;
                delete signal.cycleOptions[cycle].delayColor;
            } else if (delayMinValue !== '' && delayMaxValue !== '') {
                const delayMin = parseFloat(delayMinValue);
                const delayMax = parseFloat(delayMaxValue);
                if (isNaN(delayMin) || delayMin < 0) {
                    alert('Please enter a valid delay min value');
                    return;
                }
                if (isNaN(delayMax) || delayMax < 0) {
                    alert('Please enter a valid delay max value');
                    return;
                }
                if (delayMax < delayMin) {
                    alert('Delay max must be greater than or equal to delay min');
                    return;
                }
                signal.cycleOptions[cycle].delayMin = delayMin;
                signal.cycleOptions[cycle].delayMax = delayMax;
                signal.cycleOptions[cycle].delayColor = delayColorValue;
            } else {
                alert('Please enter both delay min and delay max, or leave both empty to use signal/global values');
                return;
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
    
    static showContextMenu(menuId, xPos, yPos) {
        const menu = document.getElementById(menuId);
        menu.style.display = 'block';
        menu.style.left = xPos + 'px';
        menu.style.top = yPos + 'px';
    }
    
    static showBitCycleContextMenu(app, xPos, yPos) {
        const menu = document.getElementById('bit-cycle-context-menu');
        menu.style.display = 'block';
        menu.style.left = xPos + 'px';
        menu.style.top = yPos + 'px';
        
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
    
    static showBusCycleContextMenu(app, xPos, yPos) {
        const menu = document.getElementById('bus-cycle-context-menu');
        menu.style.display = 'block';
        menu.style.left = xPos + 'px';
        menu.style.top = yPos + 'px';
    }
    
    static showInsertCyclesDialog(app) {
        document.getElementById('insert-cycles-input').value = '1';
        document.getElementById('insert-cycles-dialog').style.display = 'flex';
        document.getElementById('insert-cycles-input').focus();
    }
    
    static hideInsertCyclesDialog() {
        document.getElementById('insert-cycles-dialog').style.display = 'none';
    }
    
    static showDeleteCyclesDialog(app) {
        document.getElementById('delete-cycles-input').value = '1';
        document.getElementById('delete-cycles-dialog').style.display = 'flex';
        document.getElementById('delete-cycles-input').focus();
    }
    
    static hideDeleteCyclesDialog() {
        document.getElementById('delete-cycles-dialog').style.display = 'none';
    }
}
