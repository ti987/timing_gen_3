// Timing Gen 3 - Arrow Tool Module
// Version 3.4.1
// Handles arrow functionality for timing diagram annotations

class TimingGenArrow {
    /**
     * Start arrow mode for creating a new arrow
     * @param {TimingGenApp} app - Main application instance
     */
    static startArrowMode(app) {
        app.arrowMode = true;
        app.arrowState = 'first-point';
        // Generate unique arrow name
        const arrowName = `A${app.arrowCounter}`;
        app.arrowCounter++;
        
        app.currentArrow = {
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
        app.canvas.style.cursor = 'crosshair';
        
        // Show instruction
        TimingGenMeasure.showInstruction(app, "Click at the start point (trigger)");
        
        // Add onMouseMove handler for visual feedback
        app.originalOnMouseMove = app.tool.onMouseMove;
        app.tool.onMouseMove = (event) => TimingGenArrow.handleArrowMouseMove(app, event);
    }
    
    /**
     * Handle mouse movement during arrow creation to show visual feedback
     * @param {TimingGenApp} app - Main application instance
     * @param {paper.MouseEvent} event - Paper.js mouse event
     */
    static handleArrowMouseMove(app, event) {
        // Show visual feedback while creating arrow
        if (!app.arrowMode) return;
        
        // Clear any temporary graphics
        if (app.tempArrowGraphics) {
            app.tempArrowGraphics.remove();
            app.tempArrowGraphics = null;
        }
        
        // Use Paper.js's event.point for accurate canvas coordinates
        const mouseX = event.point.x;
        const mouseY = event.point.y;
        
        const poi = TimingGenMeasure.findNearestPOI(app, mouseX, mouseY);
        if (poi) {
            const signal = app.getSignalByIndex(poi.signalIndex);
            if (signal) {
                // Get all available POIs for this signal and cycle
                const allPOIs = TimingGenArrow.getAllPOIsForSignalCycle(app, signal.name, poi.cycle);
                const closestPOI = TimingGenArrow.findClosestPOI(allPOIs, mouseX, mouseY);
                
                if (closestPOI) {
                    // Draw only the closest POI as a highlight circle
                    app.tempArrowGraphics = new paper.Group();
                    const circle = new paper.Path.Circle({
                        center: [closestPOI.x, closestPOI.y],
                        radius: 5,
                        fillColor: '#0000FF',
                        strokeColor: '#FFFFFF',
                        strokeWidth: 2,
                        opacity: 0.7
                    });
                    app.tempArrowGraphics.addChild(circle);
                    
                    paper.view.draw();
                }
            }
        }
    }
    
    /**
     * Cancel arrow creation mode
     * @param {TimingGenApp} app - Main application instance
     */
    static cancelArrow(app) {
        app.arrowMode = false;
        app.arrowState = null;
        app.currentArrow = null;
        app.arrowEditMode = false;
        app.currentEditingArrowName = null;
        app.canvas.style.cursor = 'default';
        
        // Clear temporary graphics
        if (app.tempArrowGraphics) {
            app.tempArrowGraphics.remove();
            app.tempArrowGraphics = null;
        }
        
        // Restore original mouse move handler
        if (app.originalOnMouseMove !== undefined) {
            app.tool.onMouseMove = app.originalOnMouseMove;
            app.originalOnMouseMove = undefined;
        }
        
        TimingGenMeasure.hideInstruction(app);
        app.render();
    }
    
    /**
     * Finalize arrow creation and add it to the diagram
     * @param {TimingGenApp} app - Main application instance
     */
    static finalizeArrow(app) {
        // Capture state before action
        app.undoRedoManager.captureState();
        
        // Calculate control points for bezier curve
        const dx = app.currentArrow.endX - app.currentArrow.startX;
        const dy = app.currentArrow.endY - app.currentArrow.startY;
        
        // Control points should create somewhat horizontal exit/entry
        // The "somewhat" is because signals are often in different rows and close in X
        const horizontalBias = Math.min(Math.abs(dx) * 0.5, 100); // Max 100px horizontal bias
        
        // Control point 1: exit somewhat horizontally to the right
        app.currentArrow.ctrl1X = app.currentArrow.startX + horizontalBias;
        app.currentArrow.ctrl1Y = app.currentArrow.startY;
        
        // Control point 2: enter somewhat horizontally from the left
        app.currentArrow.ctrl2X = app.currentArrow.endX - horizontalBias;
        app.currentArrow.ctrl2Y = app.currentArrow.endY;
        
        // Store in arrowsData
        app.arrowsData.set(app.currentArrow.name, { ...app.currentArrow });
        
        // Clear temporary state
        app.arrowMode = false;
        app.arrowState = null;
        app.currentArrow = null;
        app.canvas.style.cursor = 'default';
        
        // Clear temporary graphics
        if (app.tempArrowGraphics) {
            app.tempArrowGraphics.remove();
            app.tempArrowGraphics = null;
        }
        
        // Restore original mouse move handler
        if (app.originalOnMouseMove !== undefined) {
            app.tool.onMouseMove = app.originalOnMouseMove;
            app.originalOnMouseMove = undefined;
        }
        
        TimingGenMeasure.hideInstruction(app);
        app.render();
    }
    
    /**
     * Delete the currently selected arrow
     * @param {TimingGenApp} app - Main application instance
     */
    static deleteArrow(app) {
        if (app.currentEditingArrowName) {
            // Capture state before action
            app.undoRedoManager.captureState();
            
            app.arrowsData.delete(app.currentEditingArrowName);
            app.currentEditingArrowName = null;
            app.arrowEditMode = false;
            app.hideAllMenus();
            app.render();
        }
    }
    
    /**
     * Show arrow options dialog (width and color)
     * @param {TimingGenApp} app - Main application instance
     */
    static showArrowOptionsDialog(app) {
        if (!app.currentEditingArrowName) return;
        
        const arrow = app.arrowsData.get(app.currentEditingArrowName);
        if (!arrow) return;
        
        // Populate dialog with current values
        document.getElementById('arrow-width-input').value = arrow.width || 2;
        document.getElementById('arrow-color-input').value = arrow.color || '#0000FF';
        
        // Show dialog
        document.getElementById('arrow-options-dialog').style.display = 'flex';
        app.hideAllMenus();
    }
    
    /**
     * Hide arrow options dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideArrowOptionsDialog(app) {
        document.getElementById('arrow-options-dialog').style.display = 'none';
    }
    
    /**
     * Apply arrow options from dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static applyArrowOptions(app) {
        if (!app.currentEditingArrowName) {
            TimingGenArrow.hideArrowOptionsDialog(app);
            return;
        }
        
        const arrow = app.arrowsData.get(app.currentEditingArrowName);
        if (!arrow) {
            TimingGenArrow.hideArrowOptionsDialog(app);
            return;
        }
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        // Get values from dialog
        arrow.width = parseInt(document.getElementById('arrow-width-input').value) || 2;
        arrow.color = document.getElementById('arrow-color-input').value || '#0000FF';
        
        TimingGenArrow.hideArrowOptionsDialog(app);
        app.render();
    }
    
    /**
     * Show context menu for arrow editing
     * @param {TimingGenApp} app - Main application instance
     * @param {MouseEvent} event - Mouse event for positioning
     * @param {string} arrowName - Name of the arrow
     */
    static showArrowContextMenu(app, event, arrowName) {
        app.currentEditingArrowName = arrowName;
        app.hideAllMenus();
        
        const menu = document.getElementById('arrow-context-menu');
        menu.style.display = 'block';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
    }
    
    /**
     * Show context menu for arrow text editing
     * @param {TimingGenApp} app - Main application instance
     * @param {MouseEvent} event - Mouse event for positioning
     * @param {string} arrowName - Name of the arrow
     */
    static showArrowTextContextMenu(app, event, arrowName) {
        app.currentEditingArrowName = arrowName;
        app.hideAllMenus();
        
        const menu = document.getElementById('arrow-text-context-menu');
        menu.style.display = 'block';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
    }
    
    /**
     * Show dialog to edit arrow text
     * @param {TimingGenApp} app - Main application instance
     */
    static showEditArrowTextDialog(app) {
        if (!app.currentEditingArrowName) return;
        
        const arrow = app.arrowsData.get(app.currentEditingArrowName);
        if (!arrow) return;
        
        document.getElementById('edit-arrow-text-input').value = arrow.text || '';
        document.getElementById('edit-arrow-text-dialog').style.display = 'flex';
        app.hideAllMenus();
    }
    
    /**
     * Hide arrow text edit dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideEditArrowTextDialog(app) {
        document.getElementById('edit-arrow-text-dialog').style.display = 'none';
    }
    
    /**
     * Apply edited arrow text from dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static applyEditArrowText(app) {
        if (!app.currentEditingArrowName) {
            TimingGenArrow.hideEditArrowTextDialog(app);
            return;
        }
        
        const arrow = app.arrowsData.get(app.currentEditingArrowName);
        if (!arrow) {
            TimingGenArrow.hideEditArrowTextDialog(app);
            return;
        }
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        arrow.text = document.getElementById('edit-arrow-text-input').value;
        TimingGenArrow.hideEditArrowTextDialog(app);
        app.render();
    }
    
    /**
     * Show arrow text options dialog (font, size, color)
     * @param {TimingGenApp} app - Main application instance
     */
    static showArrowTextOptionsDialog(app) {
        if (!app.currentEditingArrowName) return;
        
        const arrow = app.arrowsData.get(app.currentEditingArrowName);
        if (!arrow) return;
        
        document.getElementById('arrow-text-font-select').value = arrow.textFont || 'Arial';
        document.getElementById('arrow-text-size-input').value = arrow.textSize || 12;
        document.getElementById('arrow-text-color-input').value = arrow.textColor || arrow.color || '#0000FF';
        document.getElementById('arrow-text-options-dialog').style.display = 'flex';
        app.hideAllMenus();
    }
    
    /**
     * Hide arrow text options dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static hideArrowTextOptionsDialog(app) {
        document.getElementById('arrow-text-options-dialog').style.display = 'none';
    }
    
    /**
     * Apply arrow text options from dialog
     * @param {TimingGenApp} app - Main application instance
     */
    static applyArrowTextOptions(app) {
        if (!app.currentEditingArrowName) {
            TimingGenArrow.hideArrowTextOptionsDialog(app);
            return;
        }
        
        const arrow = app.arrowsData.get(app.currentEditingArrowName);
        if (!arrow) {
            TimingGenArrow.hideArrowTextOptionsDialog(app);
            return;
        }
        
        // Capture state before action
        app.undoRedoManager.captureState();
        
        arrow.textFont = document.getElementById('arrow-text-font-select').value;
        arrow.textSize = parseInt(document.getElementById('arrow-text-size-input').value, 10) || 12;
        arrow.textColor = document.getElementById('arrow-text-color-input').value;
        TimingGenArrow.hideArrowTextOptionsDialog(app);
        app.render();
    }
    
    /**
     * Start editing mode for an arrow (show control points)
     * @param {TimingGenApp} app - Main application instance
     * @param {string} arrowName - Name of the arrow to edit
     */
    static startEditingArrow(app, arrowName) {
        app.arrowEditMode = true;
        app.currentEditingArrowName = arrowName;
        app.render();
    }
    
    /**
     * Stop editing mode for arrow
     * @param {TimingGenApp} app - Main application instance
     */
    static stopEditingArrow(app) {
        app.arrowEditMode = false;
        app.currentEditingArrowName = null;
        app.isDraggingArrowPoint = false;
        app.draggingArrowPointIndex = null;
        app.render();
    }
    
    /**
     * Start dragging an arrow control point
     * @param {TimingGenApp} app - Main application instance
     * @param {string} arrowName - Name of the arrow
     * @param {number} pointIndex - Index of the point (0=start, 1=ctrl1, 2=ctrl2, 3=end)
     * @param {paper.MouseEvent} event - Mouse event
     */
    static startDraggingArrowPoint(app, arrowName, pointIndex, event) {
        // Capture state before action
        app.undoRedoManager.captureState();
        
        app.isDraggingArrowPoint = true;
        app.draggingArrowPointIndex = pointIndex;
        app.currentEditingArrowName = arrowName;
        app.canvas.style.cursor = 'move';
    }
    
    /**
     * Find the closest POI from a list of POIs to the given coordinates
     * @param {Array} allPOIs - Array of POI objects with x, y coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Closest POI object or null
     */
    static findClosestPOI(allPOIs, x, y) {
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
    
    /**
     * Update an arrow point position (when dragging)
     * @param {TimingGenApp} app - Main application instance
     * @param {string} arrowName - Name of the arrow
     * @param {number} pointIndex - Index of the point (0=start, 1=ctrl1, 2=ctrl2, 3=end)
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     */
    static updateArrowPoint(app, arrowName, pointIndex, x, y) {
        const arrow = app.arrowsData.get(arrowName);
        if (!arrow) return;
        
        // Update the appropriate point
        if (pointIndex === 0) {
            // Start point - snap to closest POI (cycle boundary) with user-selectable type
            const poi = TimingGenMeasure.findNearestPOI(app, x, y);
            if (poi) {
                const signal = app.getSignalByIndex(poi.signalIndex);
                if (signal) {
                    // Get all POI options and find the closest one
                    const allPOIs = TimingGenArrow.getAllPOIsForSignalCycle(app, signal.name, poi.cycle);
                    const closestPOI = TimingGenArrow.findClosestPOI(allPOIs, x, y);
                    
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
            const poi = TimingGenMeasure.findNearestPOI(app, x, y);
            if (poi) {
                const signal = app.getSignalByIndex(poi.signalIndex);
                if (signal) {
                    // Get all POI options and find the closest one
                    const allPOIs = TimingGenArrow.getAllPOIsForSignalCycle(app, signal.name, poi.cycle);
                    const closestPOI = TimingGenArrow.findClosestPOI(allPOIs, x, y);
                    
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
        
        app.render();
    }
    
    /**
     * Recalculate all arrow positions when signals move
     * @param {TimingGenApp} app - Main application instance
     */
    static recalculateArrowPositions(app) {
        // Recalculate arrow positions when signals move
        for (const [name, arrow] of app.arrowsData.entries()) {
            // Recalculate start point using POI with stored type
            if (arrow.signal1Name !== null && arrow.cycle1 !== null) {
                const poiType = arrow.poi1Type || 'auto';
                const point = TimingGenArrow.getPointOfInterest(app, arrow.signal1Name, arrow.cycle1, poiType);
                if (point) {
                    arrow.startX = point.x;
                    arrow.startY = point.y;
                }
            }
            
            // Recalculate end point using POI with stored type
            if (arrow.signal2Name !== null && arrow.cycle2 !== null) {
                const poiType = arrow.poi2Type || 'auto';
                const point = TimingGenArrow.getPointOfInterest(app, arrow.signal2Name, arrow.cycle2, poiType);
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
    
    /**
     * Get the screen coordinates for a point of interest on a signal at a cycle
     * @param {TimingGenApp} app - Main application instance
     * @param {string} signalName - Name of the signal
     * @param {number} cycle - Cycle number
     * @param {string} poiType - Type of POI ('auto', 'low', 'mid', 'high', 'slew-start', 'slew-center', 'slew-end', 'rising', 'falling')
     * @returns {Object|null} Point object with x, y, signalName, cycle, poiType or null
     */
    static getPointOfInterest(app, signalName, cycle, poiType = 'auto') {
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
        
        const signal = app.getSignalByName(signalName);
        if (!signal) return null;
        
        const signals = app.getSignals();
        const signalIndex = signals.findIndex(s => s.name === signalName);
        if (signalIndex < 0) return null;
        
        const signalRow = app.rowManager.signalIndexToRowIndex(signalIndex);
        const baseY = app.rowManager.getRowYPosition(signalRow);
        const rowHeight = app.rowManager.getRowHeight(signalRow);
        
        let x, y;
        
        if (signal.type === 'clock') {
            // Clock signal POIs
            if (poiType === 'rising' || (poiType === 'auto' && cycle > 0)) {
                // Middle of rising transition (at cycle boundary)
                x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
                y = baseY + rowHeight * 0.5;
            } else if (poiType === 'falling') {
                // Middle of falling transition (at mid-cycle)
                x = app.config.nameColumnWidth + cycle * app.config.cycleWidth + app.config.cycleWidth * 0.5;
                y = baseY + rowHeight * 0.5;
            } else {
                // Default: cycle boundary, middle
                x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
                y = baseY + rowHeight * 0.5;
            }
        } else if (signal.type === 'bit' || signal.type === 'bus') {
            // Bit/Bus signal POIs
            const stateCycle = cycle === 0 ? 0 : cycle - 1;
            const currentValue = app.getBitValueAtCycle(signal, cycle);
            const prevValue = app.getBitValueAtCycle(signal, stateCycle);
            const hasTransition = cycle > 0 && currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X';
            
            // Calculate slew positions using signal-specific delay and slew values
            const delayInfo = app.getEffectiveDelay(signal, cycle);
            const slewPixels = app.getEffectiveSlew(signal, cycle);
            const slewStartX = app.config.nameColumnWidth + cycle * app.config.cycleWidth + delayInfo.min;
            const slewEndX = slewStartX + slewPixels;
            const slewCenterX = slewStartX + slewPixels / 2;
            
            if (poiType === 'low' || (poiType === 'auto' && prevValue === 0)) {
                x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
                y = baseY + rowHeight * 0.8;
            } else if (poiType === 'high' || (poiType === 'auto' && prevValue === 1)) {
                x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
                y = baseY + rowHeight * 0.2;
            } else if (poiType === 'mid' || poiType === 'auto') {
                x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
                y = baseY + rowHeight * 0.5;
            } else if (poiType === 'slew-start' && hasTransition) {
                x = slewStartX;
                // Y position at start of slew (at previous value level)
                if (prevValue === 0) {
                    y = baseY + rowHeight * 0.8;  // Low
                } else if (prevValue === 1) {
                    y = baseY + rowHeight * 0.2;  // High
                } else {
                    y = baseY + rowHeight * 0.5;  // Mid (for Z/X)
                }
            } else if (poiType === 'slew-center' && hasTransition) {
                x = slewCenterX;
                y = baseY + rowHeight * 0.5;  // Always middle during transition
            } else if (poiType === 'slew-end' && hasTransition) {
                x = slewEndX;
                // Y position at end of slew (at current value level)
                if (currentValue === 0) {
                    y = baseY + rowHeight * 0.8;  // Low
                } else if (currentValue === 1) {
                    y = baseY + rowHeight * 0.2;  // High
                } else {
                    y = baseY + rowHeight * 0.5;  // Mid (for Z/X)
                }
            } else if (poiType === 'delayed' && hasTransition) {
                // Delayed point at delayMax position
                const delayMaxX = app.config.nameColumnWidth + cycle * app.config.cycleWidth + delayInfo.max;
                x = delayMaxX;
                // Y position at current value level (after transition)
                if (currentValue === 0) {
                    y = baseY + rowHeight * 0.8;  // Low
                } else if (currentValue === 1) {
                    y = baseY + rowHeight * 0.2;  // High
                } else {
                    y = baseY + rowHeight * 0.5;  // Mid (for Z/X)
                }
            } else {
                // Fallback to cycle boundary, middle
                x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
                y = baseY + rowHeight * 0.5;
            }
        } else {
            // Unknown signal type, use middle
            x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
            y = baseY + rowHeight * 0.5;
        }
        
        return { x, y, signalName, cycle, poiType };
    }
    
    /**
     * Get all available POI options for a signal at a given cycle
     * @param {TimingGenApp} app - Main application instance
     * @param {string} signalName - Name of the signal
     * @param {number} cycle - Cycle number
     * @returns {Array} Array of POI objects
     */
    static getAllPOIsForSignalCycle(app, signalName, cycle) {
        // Get all available POI options for a signal at a given cycle
        const signal = app.getSignalByName(signalName);
        if (!signal) return [];
        
        const pois = [];
        
        if (signal.type === 'clock') {
            // Clock signals: rising and falling transitions
            pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'rising'));
            pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'falling'));
        } else if (signal.type === 'bit' || signal.type === 'bus') {
            // Bit/Bus signals: low, mid, high positions
            pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'low'));
            pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'mid'));
            pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'high'));
            
            // Add slew positions if there's a transition
            const stateCycle = cycle === 0 ? 0 : cycle - 1;
            let hasTransition = false;
            
            if (signal.type === 'bit') {
                const currentValue = app.getBitValueAtCycle(signal, cycle);
                const prevValue = app.getBitValueAtCycle(signal, stateCycle);
                hasTransition = cycle > 0 && currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X';
            } else if (signal.type === 'bus') {
                const currentValue = app.getBusValueAtCycle(signal, cycle);
                const prevValue = app.getBusValueAtCycle(signal, stateCycle);
                hasTransition = cycle > 0 && currentValue !== prevValue;
            }
            
            if (hasTransition) {
                pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'slew-start'));
                pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'slew-center'));
                pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'slew-end'));
                pois.push(TimingGenArrow.getPointOfInterest(app, signalName, cycle, 'delayed'));
            }
        }
        
        return pois.filter(poi => poi !== null);
    }
    
    /**
     * Get the screen coordinates for a signal transition at a given cycle
     * @param {TimingGenApp} app - Main application instance
     * @param {string} signalName - Name of the signal
     * @param {number} cycle - Cycle number
     * @returns {Object|null} Point object with x, y, signalName, cycle or null
     */
    static getTransitionPoint(app, signalName, cycle) {
        // Get the screen coordinates for a signal transition at a given cycle
        // This is kept for backward compatibility but POI should be used for arrows
        const signal = app.getSignalByName(signalName);
        if (!signal) return null;
        
        const signals = app.getSignals();
        const signalIndex = signals.findIndex(s => s.name === signalName);
        if (signalIndex < 0) return null;
        
        const signalRow = app.rowManager.signalIndexToRowIndex(signalIndex);
        const y = app.rowManager.getRowYPosition(signalRow) + app.config.rowHeight / 2;
        const x = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
        
        return { x, y, signalName, cycle };
    }
    
    /**
     * Handle arrow click during arrow creation mode
     * @param {TimingGenApp} app - Main application instance
     * @param {paper.MouseEvent} event - Mouse event
     */
    static handleArrowClick(app, event) {
        if (app.arrowState === 'first-point') {
            // First click: select start point at nearest POI (cycle boundary)
            const mouseX = event.point.x;
            const mouseY = event.point.y;
            const poi = TimingGenMeasure.findNearestPOI(app, mouseX, mouseY);
            if (poi) {
                const signal = app.getSignalByIndex(poi.signalIndex);
                if (signal) {
                    // Get all POI options and find the closest one
                    const allPOIs = TimingGenArrow.getAllPOIsForSignalCycle(app, signal.name, poi.cycle);
                    const closestPOI = TimingGenArrow.findClosestPOI(allPOIs, mouseX, mouseY);
                    
                    if (closestPOI) {
                        app.currentArrow.startX = closestPOI.x;
                        app.currentArrow.startY = closestPOI.y;
                        app.currentArrow.signal1Name = signal.name;
                        app.currentArrow.cycle1 = poi.cycle;
                        app.currentArrow.poi1Type = closestPOI.poiType;
                        
                        app.arrowState = 'second-point';
                        TimingGenMeasure.showInstruction(app, "Click at the end point (result)");
                    }
                }
            }
            return true;
        } else if (app.arrowState === 'second-point') {
            // Second click: select end point at nearest POI (cycle boundary)
            const mouseX = event.point.x;
            const mouseY = event.point.y;
            const poi = TimingGenMeasure.findNearestPOI(app, mouseX, mouseY);
            if (poi) {
                const signal = app.getSignalByIndex(poi.signalIndex);
                if (signal) {
                    // Get all POI options and find the closest one
                    const allPOIs = TimingGenArrow.getAllPOIsForSignalCycle(app, signal.name, poi.cycle);
                    const closestPOI = TimingGenArrow.findClosestPOI(allPOIs, mouseX, mouseY);
                    
                    if (closestPOI) {
                        app.currentArrow.endX = closestPOI.x;
                        app.currentArrow.endY = closestPOI.y;
                        app.currentArrow.signal2Name = signal.name;
                        app.currentArrow.cycle2 = poi.cycle;
                        app.currentArrow.poi2Type = closestPOI.poiType;
                        
                        // Finalize the arrow
                        TimingGenArrow.finalizeArrow(app);
                    }
                }
            }
            return true;
        }
        return false;
    }
}
