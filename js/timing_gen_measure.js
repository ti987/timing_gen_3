// Timing Gen 3 - Measure Tool Module
// Version 3.4.1
// Handles measure functionality for timing measurements

class TimingGenMeasure {
    /**
     * Start measure mode for creating a new measure
     * @param {TimingGenApp} app - Main application instance
     */
    static startMeasureMode(app) {
        app.measureMode = true;
        app.measureState = 'first-point';
        // Generate unique measure name
        const measureName = `M${app.measureCounter}`;
        app.measureCounter++;
        
        app.currentMeasure = {
            name: measureName,
            signal1Row: null,
            cycle1: null,
            signal2Row: null,
            cycle2: null,
            measureRow: null,
            text: '',
            textX: null,
            textFont: 'Arial',
            textSize: 12,
            textColor: '#FF0000'
        };
        app.canvas.style.cursor = 'crosshair';
        
        TimingGenMeasure.showInstruction(app, "Click at the first point");
        
        app.originalOnMouseMove = app.tool.onMouseMove;
        app.tool.onMouseMove = (event) => TimingGenMeasure.handleMeasureMouseMove(app, event);
    }
    
    /**
     * Get cycle number at X position
     * @param {TimingGenApp} app - Main application instance
     * @param {number} xPos - X position in canvas coordinates
     * @returns {number|null} Cycle number or null if outside bounds
     */
    static getCycleAtX(app, xPos) {
        const relativeX = xPos - app.config.nameColumnWidth;
        if (relativeX < 0) return null;
        
        const cycle = Math.round(relativeX / app.config.cycleWidth);
        if (cycle < 0 || cycle > app.config.cycles) {
            return null;
        }
        return cycle;
    }
    
    /**
     * Get screen coordinates for a measure
     * @param {TimingGenApp} app - Main application instance
     * @param {Object} measure - Measure object with signal names and cycles
     * @returns {Object} Coordinates {x1, y1, x2, y2, signal1Index, signal2Index}
     */
    static getMeasureCoordinates(app, measure) {
        const signal1 = app.getSignalByName(measure.signal1Name);
        const signal2 = app.getSignalByName(measure.signal2Name);
        
        if (!signal1 || !signal2) {
            console.error('Signal not found for measure:', measure);
            return {
                x1: app.config.nameColumnWidth,
                y1: app.config.headerHeight,
                x2: app.config.nameColumnWidth,
                y2: app.config.headerHeight,
                signal1Index: -1,
                signal2Index: -1
            };
        }
        
        const signals = app.getSignals();
        const signal1Index = signals.indexOf(signal1);
        const signal2Index = signals.indexOf(signal2);
        
        const signal1Row = app.rowManager.signalIndexToRowIndex(signal1Index);
        const signal2Row = app.rowManager.signalIndexToRowIndex(signal2Index);
        
        const x1 = TimingGenMeasure.getTransitionMidpointX(app, signal1Index, measure.cycle1);
        const x2 = TimingGenMeasure.getTransitionMidpointX(app, signal2Index, measure.cycle2);
        
        const signal1RowHeight = app.rowManager.getRowHeight(signal1Row);
        const signal2RowHeight = app.rowManager.getRowHeight(signal2Row);
        const y1 = app.rowManager.getRowYPosition(signal1Row) + signal1RowHeight / 2;
        const y2 = app.rowManager.getRowYPosition(signal2Row) + signal2RowHeight / 2;
        
        return { x1, y1, x2, y2, signal1Index, signal2Index };
    }
    
    /**
     * Get X coordinate for the midpoint of a transition
     * @param {TimingGenApp} app - Main application instance
     * @param {number} signalIndex - Signal index
     * @param {number} cycle - Cycle number (negative for clock falling edges)
     * @returns {number} X coordinate
     */
    static getTransitionMidpointX(app, signalIndex, cycle) {
        const signals = app.getSignals();
        
        if (signalIndex < 0 || signalIndex >= signals.length) {
            const absCycle = Math.abs(cycle);
            return app.config.nameColumnWidth + absCycle * app.config.cycleWidth;
        }
        
        const signal = app.getSignalByIndex(signalIndex);
        
        if (!signal) {
            const absCycle = Math.abs(cycle);
            return app.config.nameColumnWidth + absCycle * app.config.cycleWidth;
        }
        
        if (signal.type === 'clock' && cycle < 0) {
            const absCycle = Math.abs(cycle + 1);
            return app.config.nameColumnWidth + absCycle * app.config.cycleWidth + app.config.cycleWidth / 2;
        }
        
        const baseX = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
        
        if (signal.type === 'clock') {
            return baseX;
        }
        
        const delayInfo = app.getEffectiveDelay(signal, cycle);
        const slew = app.getEffectiveSlew(signal, cycle);
        
        if (cycle > 0 && signal.type === 'bit') {
            const currentValue = app.getBitValueAtCycle(signal, cycle);
            const prevValue = app.getBitValueAtCycle(signal, cycle - 1);
            
            if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                return baseX + delayInfo.min + slew / 2;
            }
        } else if (cycle > 0 && signal.type === 'bus') {
            const currentValue = app.getBusValueAtCycle(signal, cycle);
            const prevValue = app.getBusValueAtCycle(signal, cycle - 1);
            
            if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                return baseX + delayInfo.min + slew / 2;
            }
        }
        
        if (signal.type === 'bus') {
            return baseX + delayInfo.min + slew / 2;
        }
        return baseX + delayInfo.min;
    }
    
    /**
     * Find the nearest transition to click position
     * @param {TimingGenApp} app - Main application instance
     * @param {number} xPos - X position
     * @param {number} yPos - Y position
     * @returns {Object|null} {signalIndex, cycle} or null
     */
    static findNearestTransition(app, xPos, yPos) {
        const signals = app.getSignals();
        
        if (!signals || signals.length === 0) {
            console.warn('Cannot create measure: no signals loaded');
            return null;
        }
        
        const signalIndex = app.getSignalIndexAtY(yPos);
        if (signalIndex === -1 || signalIndex >= signals.length) {
            const cycle = TimingGenMeasure.getCycleAtX(app, xPos);
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        const signal = app.getSignalByIndex(signalIndex);
        if (!signal) {
            const cycle = TimingGenMeasure.getCycleAtX(app, xPos);
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        const clickedCycle = TimingGenMeasure.getCycleAtX(app, xPos);
        if (clickedCycle === null) {
            return { signalIndex, cycle: 0 };
        }
        
        if (signal.type === 'bit') {
            let nearestCycle = clickedCycle;
            let minDistance = Infinity;
            
            for (let cycle = Math.max(1, clickedCycle - 2); cycle <= Math.min(app.config.cycles - 1, clickedCycle + 2); cycle++) {
                const currentValue = app.getBitValueAtCycle(signal, cycle);
                const prevValue = app.getBitValueAtCycle(signal, cycle - 1);
                
                if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                    const transitionX = TimingGenMeasure.getTransitionMidpointX(app, signalIndex, cycle);
                    const distance = Math.abs(transitionX - xPos);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCycle = cycle;
                    }
                }
            }
            
            return { signalIndex, cycle: nearestCycle };
        }
        
        if (signal.type === 'clock') {
            let nearestCycle = clickedCycle;
            let nearestEdge = 'rising';
            let minDistance = Infinity;
            
            for (let cycle = Math.max(0, clickedCycle - 1); cycle <= Math.min(app.config.cycles, clickedCycle + 1); cycle++) {
                const risingEdgeX = app.config.nameColumnWidth + cycle * app.config.cycleWidth;
                const risingDistance = Math.abs(risingEdgeX - xPos);
                
                if (risingDistance < minDistance) {
                    minDistance = risingDistance;
                    nearestCycle = cycle;
                    nearestEdge = 'rising';
                }
                
                if (cycle < app.config.cycles) {
                    const fallingEdgeX = app.config.nameColumnWidth + cycle * app.config.cycleWidth + app.config.cycleWidth / 2;
                    const fallingDistance = Math.abs(fallingEdgeX - xPos);
                    
                    if (fallingDistance < minDistance) {
                        minDistance = fallingDistance;
                        nearestCycle = cycle;
                        nearestEdge = 'falling';
                    }
                }
            }
            
            if (nearestEdge === 'falling') {
                nearestCycle = -(nearestCycle + 1);
            }
            
            return { signalIndex, cycle: nearestCycle };
        }
        
        if (signal.type === 'bus') {
            let nearestCycle = clickedCycle;
            let minDistance = Infinity;
            
            for (let cycle = Math.max(1, clickedCycle - 2); cycle <= Math.min(app.config.cycles - 1, clickedCycle + 2); cycle++) {
                const currentValue = app.getBusValueAtCycle(signal, cycle);
                const prevValue = app.getBusValueAtCycle(signal, cycle - 1);
                
                if (currentValue !== prevValue && currentValue !== 'X' && prevValue !== 'X') {
                    const transitionX = TimingGenMeasure.getTransitionMidpointX(app, signalIndex, cycle);
                    const distance = Math.abs(transitionX - xPos);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCycle = cycle;
                    }
                }
            }
            
            return { signalIndex, cycle: nearestCycle };
        }
        
        return { signalIndex, cycle: clickedCycle };
    }
    
    /**
     * Find the nearest point of interest (cycle boundary)
     * @param {TimingGenApp} app - Main application instance
     * @param {number} xPos - X position
     * @param {number} yPos - Y position
     * @returns {Object|null} {signalIndex, cycle} or null
     */
    static findNearestPOI(app, xPos, yPos) {
        const signals = app.getSignals();
        
        if (!signals || signals.length === 0) {
            console.warn('Cannot find POI: no signals loaded');
            return null;
        }
        
        const signalIndex = app.getSignalIndexAtY(yPos);
        if (signalIndex === -1 || signalIndex >= signals.length) {
            const cycle = TimingGenMeasure.getCycleAtX(app, xPos);
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        const signal = app.getSignalByIndex(signalIndex);
        if (!signal) {
            const cycle = TimingGenMeasure.getCycleAtX(app, xPos);
            return { signalIndex: 0, cycle: cycle !== null ? cycle : 0 };
        }
        
        const relativeX = xPos - app.config.nameColumnWidth;
        const nearestCycle = Math.round(relativeX / app.config.cycleWidth);
        const cycle = Math.max(0, Math.min(app.config.cycles, nearestCycle));
        
        return { signalIndex, cycle };
    }
    
    /**
     * Show instruction text to user
     * @param {TimingGenApp} app - Main application instance
     * @param {string} text - Instruction text to display
     */
    static showInstruction(app, text) {
        const instructionBox = document.getElementById('instruction-box');
        const instructionText = document.getElementById('instruction-text');
        instructionText.textContent = text;
        instructionBox.style.display = 'block';
    }
    
    /**
     * Hide instruction text
     * @param {TimingGenApp} app - Main application instance
     */
    static hideInstruction(app) {
        document.getElementById('instruction-box').style.display = 'none';
    }
    
    /**
     * Handle mouse move during measure creation
     * @param {TimingGenApp} app - Main application instance
     * @param {Object} event - Paper.js mouse event
     */
    static handleMeasureMouseMove(app, event) {
        if (!app.measureMode) return;
        
        const xPos = event.point.x;
        const yPos = event.point.y;
        
        console.log('[handleMeasureMouseMove] Called - measureState:', app.measureState, 'isMovingMeasureRow:', app.isMovingMeasureRow);
        
        if (app.tempMeasureGraphics) {
            if (Array.isArray(app.tempMeasureGraphics)) {
                app.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (app.tempMeasureGraphics.remove) {
                app.tempMeasureGraphics.remove();
            }
            app.tempMeasureGraphics = null;
        }
        
        app.measureLayer.activate();
        app.tempMeasureGraphics = [];
        
        if (app.measureState === 'first-point' || app.measureState === 'second-point') {
            const snapPoint = TimingGenMeasure.findNearestTransition(app, xPos, yPos);
            if (snapPoint) {
                const snapX = TimingGenMeasure.getTransitionMidpointX(app, snapPoint.signalIndex, snapPoint.cycle);
                const snapY = app.rowManager.getRowYPosition(app.rowManager.signalIndexToRowIndex(snapPoint.signalIndex)) + app.config.rowHeight / 2;
                
                const snapIndicator = new paper.Path.Circle({
                    center: [snapX, snapY],
                    radius: 8,
                    strokeColor: '#FF0000',
                    strokeWidth: 2,
                    fillColor: new paper.Color(1, 0, 0, 0.2)
                });
                app.tempMeasureGraphics.push(snapIndicator);
            }
        }
        
        if (app.measureState === 'rechoose-point-1' || app.measureState === 'rechoose-point-2') {
            console.log('[handleMeasureMouseMove] Drawing orange snap indicator for rechoose mode');
            const snapPoint = TimingGenMeasure.findNearestTransition(app, xPos, yPos);
            if (snapPoint) {
                const snapX = TimingGenMeasure.getTransitionMidpointX(app, snapPoint.signalIndex, snapPoint.cycle);
                const snapY = app.rowManager.getRowYPosition(app.rowManager.signalIndexToRowIndex(snapPoint.signalIndex)) + app.config.rowHeight / 2;
                
                console.log('[handleMeasureMouseMove] Snap point found at:', snapX, snapY);
                
                const snapIndicator = new paper.Path.Circle({
                    center: [snapX, snapY],
                    radius: 8,
                    strokeColor: '#FFA500',
                    strokeWidth: 2,
                    fillColor: new paper.Color(1, 0.65, 0, 0.2)
                });
                app.tempMeasureGraphics.push(snapIndicator);
            }
        }
        
        if (app.measureState === 'second-point' && app.currentMeasure.signal1Name) {
            const coords = TimingGenMeasure.getMeasureCoordinates(app, {
                signal1Name: app.currentMeasure.signal1Name,
                cycle1: app.currentMeasure.cycle1,
                signal2Name: app.currentMeasure.signal1Name,
                cycle2: app.currentMeasure.cycle1
            });
            
            const cross1 = TimingGenMeasure.drawSmallCross(app, coords.x1, coords.y1);
            app.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
            
            const line1 = TimingGenMeasure.drawFullVerticalLine(app, coords.x1, coords.y1, coords.y1);
            app.tempMeasureGraphics.push(line1);
            
            const dynamicLine = TimingGenMeasure.drawDynamicVerticalLine(app, coords.x1, coords.y1, yPos);
            app.tempMeasureGraphics.push(dynamicLine);
        } else if (app.measureState === 'placing-row' && app.currentMeasure.signal1Name && app.currentMeasure.signal2Name) {
            const coords = TimingGenMeasure.getMeasureCoordinates(app, app.currentMeasure);
            
            const cross1 = TimingGenMeasure.drawSmallCross(app, coords.x1, coords.y1);
            app.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
            
            const line1 = TimingGenMeasure.drawFullVerticalLine(app, coords.x1, coords.y1, coords.y2);
            app.tempMeasureGraphics.push(line1);
            
            const cross2 = TimingGenMeasure.drawSmallCross(app, coords.x2, coords.y2);
            app.tempMeasureGraphics.push(cross2.hLine, cross2.vLine);
            
            const line2 = TimingGenMeasure.drawFullVerticalLine(app, coords.x2, coords.y1, coords.y2);
            app.tempMeasureGraphics.push(line2);
            
            const placementY = TimingGenMeasure.getMeasurePlacementY(app, yPos);
            
            const arrows = TimingGenMeasure.drawMeasureArrows(app, coords.x1, coords.x2, placementY);
            app.tempMeasureGraphics.push(...arrows);
            
            const rowIndex = app.rowManager.getRowIndexAtY(placementY);
            TimingGenMeasure.drawRowIndicator(app, rowIndex);
        }
        
        if (app.isMovingMeasureRow) {
            console.log('[handleMeasureMouseMove] Drawing row indicator for row move mode');
            const row = app.getRowAtY(yPos);
            if (row) {
                const rowYPos = app.rowManager.getRowYPosition(row.index);
                const rowHeight = app.rowManager.getRowHeight(row.index);
                
                console.log('[handleMeasureMouseMove] Target row:', row.type, 'at index:', row.index, 'Y:', rowYPos);
                
                let highlightColor = 'rgba(170,224,224, 0.4)';
                if (row.type === 'measure') {
                   highlightColor = 'rgba(255,215,0, 0.4)';
                } else if (row.type === 'group') {
                   highlightColor = 'rgba(218, 160, 218, 0.4)';
                }
                
                const highlightRect = new paper.Path.Rectangle({
                    point: [0, rowYPos],
                    size: [app.config.nameColumnWidth + app.config.cycles * app.config.cycleWidth, rowHeight],
                    fillColor: new paper.Color(highlightColor),
                    strokeColor: highlightColor,
                    strokeWidth: 2
                });
                app.tempMeasureGraphics.push(highlightRect);
            }
        }
        
        paper.view.draw();
    }
    
    /**
     * Draw measure bar (vertical line)
     * @param {TimingGenApp} app - Main application instance
     * @param {number} xPos - X position
     * @param {string} color - Line color
     * @returns {paper.Path.Line} Paper.js line object
     */
    static drawMeasureBar(app, xPos, color) {
        const signals = app.getSignals();
        const bar = new paper.Path.Line({
            from: [xPos, 0],
            to: [xPos, app.config.headerHeight + signals.length * app.config.rowHeight],
            strokeColor: color,
            strokeWidth: 2
        });
        return bar;
    }
    
    /**
     * Draw measure arrows (double-headed arrow)
     * @param {TimingGenApp} app - Main application instance
     * @param {number} x1 - First X position
     * @param {number} x2 - Second X position
     * @param {number} yPos - Y position
     * @returns {Array} Array of Paper.js path objects
     */
    static drawMeasureArrows(app, x1, x2, yPos) {
        const arrowSize = 8;
        const spacing = Math.abs(x2 - x1);
        const isInward = spacing < 30;
        const elements = [];
        
        const line = new paper.Path.Line({
            from: [Math.min(x1, x2), yPos],
            to: [Math.max(x1, x2), yPos],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        elements.push(line);
        
        if (isInward) {
            const leftArrow = new paper.Path([
                [Math.min(x1, x2), yPos],
                [Math.min(x1, x2) + arrowSize, yPos - arrowSize/2],
                [Math.min(x1, x2) + arrowSize, yPos + arrowSize/2]
            ]);
            leftArrow.closed = true;
            leftArrow.fillColor = '#FF0000';
            elements.push(leftArrow);
            
            const rightArrow = new paper.Path([
                [Math.max(x1, x2), yPos],
                [Math.max(x1, x2) - arrowSize, yPos - arrowSize/2],
                [Math.max(x1, x2) - arrowSize, yPos + arrowSize/2]
            ]);
            rightArrow.closed = true;
            rightArrow.fillColor = '#FF0000';
            elements.push(rightArrow);
        } else {
            const leftArrow = new paper.Path([
                [Math.min(x1, x2), yPos],
                [Math.min(x1, x2) - arrowSize, yPos - arrowSize/2],
                [Math.min(x1, x2) - arrowSize, yPos + arrowSize/2]
            ]);
            leftArrow.closed = true;
            leftArrow.fillColor = '#FF0000';
            elements.push(leftArrow);
            
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
    
    /**
     * Get row index at Y position
     * @param {TimingGenApp} app - Main application instance
     * @param {number} yPos - Y position
     * @returns {number} Row index (-1 if above header)
     */
    static getRowIndexAtY(app, yPos) {
        if (yPos < app.config.headerHeight) {
            return -1;
        }
        const relativeY = yPos - app.config.headerHeight;
        const rowIndex = Math.floor(relativeY / app.config.rowHeight);
        return rowIndex;
    }
    
    /**
     * Get Y position for measure placement based on mouse position
     * @param {TimingGenApp} app - Main application instance
     * @param {number} yPos - Mouse Y position
     * @returns {number} Snapped Y position for measure placement
     */
    static getMeasurePlacementY(app, yPos) {
        const totalRows = app.rowManager.getTotalRows();
        
        if (yPos < app.config.headerHeight) {
            return app.config.headerHeight;
        }
        
        const relativeY = yPos - app.config.headerHeight;
        const rowIndex = Math.floor(relativeY / app.config.rowHeight);
        
        if (rowIndex >= totalRows) {
            return app.config.headerHeight + totalRows * app.config.rowHeight;
        }
        
        const row = app.rows[rowIndex];
        if (row && row.type === 'measure') {
            return app.config.headerHeight + (rowIndex + 0.5) * app.config.rowHeight;
        }
        
        const rowStartY = app.config.headerHeight + rowIndex * app.config.rowHeight;
        const posInRow = yPos - rowStartY;
        
        if (posInRow < app.config.rowHeight / 2) {
            return rowStartY;
        } else {
            return rowStartY + app.config.rowHeight;
        }
    }
    
    /**
     * Draw small cross marker
     * @param {TimingGenApp} app - Main application instance
     * @param {number} xPos - X position
     * @param {number} yPos - Y position
     * @returns {Object} {hLine, vLine} Paper.js line objects
     */
    static drawSmallCross(app, xPos, yPos) {
        const crossSize = 6;
        
        const hLine = new paper.Path.Line({
            from: [xPos - crossSize, yPos],
            to: [xPos + crossSize, yPos],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        const vLine = new paper.Path.Line({
            from: [xPos, yPos - crossSize],
            to: [xPos, yPos + crossSize],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        return { hLine, vLine };
    }
    
    /**
     * Draw dynamic vertical line during measure creation
     * @param {TimingGenApp} app - Main application instance
     * @param {number} xPos - X position
     * @param {number} startY - Start Y position
     * @param {number} currentY - Current mouse Y position
     * @returns {paper.Path.Line} Paper.js line object
     */
    static drawDynamicVerticalLine(app, xPos, startY, currentY) {
        const rowHeight = app.config.rowHeight;
        const startRowTop = Math.floor((startY - app.config.headerHeight) / rowHeight) * rowHeight + app.config.headerHeight;
        const startRowBottom = startRowTop + rowHeight;
        
        let lineStart, lineEnd;
        
        if (currentY < startRowTop) {
            lineStart = currentY;
            lineEnd = startRowBottom;
        } else if (currentY > startRowBottom) {
            lineStart = startRowTop;
            lineEnd = currentY;
        } else {
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
    
    /**
     * Draw full vertical line between two points
     * @param {TimingGenApp} app - Main application instance
     * @param {number} xPos - X position
     * @param {number} startY - Start Y position
     * @param {number} endY - End Y position
     * @returns {paper.Path.Line} Paper.js line object
     */
    static drawFullVerticalLine(app, xPos, startY, endY) {
        const rowHeight = app.config.rowHeight;
        const startRowTop = Math.floor((startY - app.config.headerHeight) / rowHeight) * rowHeight + app.config.headerHeight;
        const startRowBottom = startRowTop + rowHeight;
        const endRowTop = Math.floor((endY - app.config.headerHeight) / rowHeight) * rowHeight + app.config.headerHeight;
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
    
    /**
     * Draw row indicator line
     * @param {TimingGenApp} app - Main application instance
     * @param {number} rowIndex - Row index
     */
    static drawRowIndicator(app, rowIndex) {
        const yPos = app.config.headerHeight + (rowIndex + 0.5) * app.config.rowHeight;
        const indicator = new paper.Path.Line({
            from: [0, yPos],
            to: [app.config.nameColumnWidth + app.config.cycles * app.config.cycleWidth, yPos],
            strokeColor: '#FF0000',
            strokeWidth: 1,
            dashArray: [5, 3]
        });
        
        if (app.tempMeasureGraphics && Array.isArray(app.tempMeasureGraphics)) {
            app.tempMeasureGraphics.push(indicator);
        }
    }
    
    /**
     * Draw arrow head
     * @param {TimingGenApp} app - Main application instance
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} direction - Direction: 'left', 'right', 'up', 'down'
     * @param {number} size - Arrow size
     * @returns {paper.Path} Paper.js path object
     */
    static drawArrowHead(app, x, y, direction, size = 8) {
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
    
    /**
     * Draw visuals after first point selection
     * @param {TimingGenApp} app - Main application instance
     */
    static drawFirstPointVisuals(app) {
        if (app.tempMeasureGraphics) {
            if (Array.isArray(app.tempMeasureGraphics)) {
                app.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (app.tempMeasureGraphics.remove) {
                app.tempMeasureGraphics.remove();
            }
            app.tempMeasureGraphics = null;
        }
        
        app.measureLayer.activate();
        app.tempMeasureGraphics = [];
        
        const coords = TimingGenMeasure.getMeasureCoordinates(app, {
            signal1Name: app.currentMeasure.signal1Name,
            cycle1: app.currentMeasure.cycle1,
            signal2Name: app.currentMeasure.signal1Name,
            cycle2: app.currentMeasure.cycle1
        });
        
        const cross1 = TimingGenMeasure.drawSmallCross(app, coords.x1, coords.y1);
        app.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
        
        const line1 = TimingGenMeasure.drawFullVerticalLine(app, coords.x1, coords.y1, coords.y1);
        app.tempMeasureGraphics.push(line1);
        
        paper.view.draw();
    }
    
    /**
     * Draw visuals after second point selection
     * @param {TimingGenApp} app - Main application instance
     */
    static drawSecondPointVisuals(app) {
        if (app.tempMeasureGraphics) {
            if (Array.isArray(app.tempMeasureGraphics)) {
                app.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (app.tempMeasureGraphics.remove) {
                app.tempMeasureGraphics.remove();
            }
            app.tempMeasureGraphics = null;
        }
        
        app.measureLayer.activate();
        app.tempMeasureGraphics = [];
        
        const coords = TimingGenMeasure.getMeasureCoordinates(app, app.currentMeasure);
        
        const cross1 = TimingGenMeasure.drawSmallCross(app, coords.x1, coords.y1);
        app.tempMeasureGraphics.push(cross1.hLine, cross1.vLine);
        
        const line1 = TimingGenMeasure.drawFullVerticalLine(app, coords.x1, coords.y1, coords.y2);
        app.tempMeasureGraphics.push(line1);
        
        const cross2 = TimingGenMeasure.drawSmallCross(app, coords.x2, coords.y2);
        app.tempMeasureGraphics.push(cross2.hLine, cross2.vLine);
        
        const line2 = TimingGenMeasure.drawFullVerticalLine(app, coords.x2, coords.y1, coords.y2);
        app.tempMeasureGraphics.push(line2);
        
        const coords2 = TimingGenMeasure.getMeasureCoordinates(app, app.currentMeasure);
        const arrowY = (coords.y1 + coords.y2) / 2;
        const arrows = TimingGenMeasure.drawMeasureArrows(app, coords.x1, coords.x2, arrowY);
        app.tempMeasureGraphics.push(...arrows);
        
        paper.view.draw();
    }
    
    /**
     * Finalize measure with a blank row (auto-assign text)
     * @param {TimingGenApp} app - Main application instance
     */
    static finalizeMeasureWithBlankRow(app) {
        app.undoRedoManager.captureState();
        
        const measureRowIndex = app.currentMeasure.measureRow;
        
        app.measureTextCounter++;
        app.currentMeasure.text = `t${app.measureTextCounter}`;
        
        app.measuresData.set(app.currentMeasure.name, app.currentMeasure);
        
        app.addACTableRowForMeasure(app.currentMeasure.name, app.currentMeasure);
        
        let finalMeasureRowIndex = measureRowIndex;
        const firstACTableIndex = app.rows.findIndex(r => r.type === 'ac-table');
        if (firstACTableIndex >= 0 && finalMeasureRowIndex >= firstACTableIndex) {
            finalMeasureRowIndex = firstACTableIndex;
        }
        
        app.rows.splice(finalMeasureRowIndex, 0, {
            type: 'measure',
            name: app.currentMeasure.name
        });
        
        if (app.tempMeasureGraphics) {
            if (Array.isArray(app.tempMeasureGraphics)) {
                app.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (app.tempMeasureGraphics.remove) {
                app.tempMeasureGraphics.remove();
            }
            app.tempMeasureGraphics = null;
        }
        
        TimingGenMeasure.hideInstruction(app);
        app.measureMode = false;
        app.measureState = null;
        app.currentMeasure = null;
        app.canvas.style.cursor = 'default';
        
        app.tool.onMouseMove = app.originalOnMouseMove;
        
        app.render();
    }
    
    /**
     * Finalize measure (with custom text)
     * @param {TimingGenApp} app - Main application instance
     */
    static finalizeMeasure(app) {
        const text = document.getElementById('measure-text-input').value.trim();
        if (!text) {
            alert('Please enter a label for the measure');
            return;
        }
        
        app.undoRedoManager.captureState();
        
        app.currentMeasure.text = text;
        
        const measureName = app.currentMeasure.name;
        
        app.measuresData.set(measureName, app.currentMeasure);
        
        document.getElementById('measure-text-dialog').style.display = 'none';
        
        app.measureMode = false;
        app.measureState = null;
        app.currentMeasure = null;
        app.canvas.style.cursor = 'default';
        
        app.tool.onMouseMove = app.originalOnMouseMove;
        
        app.render();
    }
    
    /**
     * Cancel measure creation
     * @param {TimingGenApp} app - Main application instance
     */
    static cancelMeasure(app) {
        document.getElementById('measure-text-dialog').style.display = 'none';
        TimingGenMeasure.hideInstruction(app);
        
        if (app.currentMeasure) {
            const measureName = app.currentMeasure.name;
            const rowIndex = app.rows.findIndex(row => row.type === 'measure' && row.name === measureName);
            if (rowIndex >= 0) {
                app.rows.splice(rowIndex, 1);
            }
        }
        
        app.measureMode = false;
        app.measureState = null;
        app.currentMeasure = null;
        app.canvas.style.cursor = 'default';
        
        if (app.tempMeasureGraphics) {
            if (Array.isArray(app.tempMeasureGraphics)) {
                app.tempMeasureGraphics.forEach(item => {
                    if (item && item.remove) item.remove();
                });
            } else if (app.tempMeasureGraphics.remove) {
                app.tempMeasureGraphics.remove();
            }
            app.tempMeasureGraphics = null;
        }
        
        app.tool.onMouseMove = app.originalOnMouseMove;
        
        app.render();
    }
    
    /**
     * Show context menu for measure
     * @param {TimingGenApp} app - Main application instance
     * @param {Object} event - Mouse event
     * @param {number} measureIndex - Measure index
     */
    static showMeasureContextMenu(app, event, measureIndex) {
        app.currentEditingMeasure = measureIndex;
        
        const menu = document.getElementById('measure-context-menu');
        
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.display = 'block';
        
        event.preventDefault();
    }
    
    /**
     * Delete measure
     * @param {TimingGenApp} app - Main application instance
     */
    static deleteMeasure(app) {
        const measures = app.getMeasures();
        if (app.currentEditingMeasure !== null && app.currentEditingMeasure >= 0 && app.currentEditingMeasure < measures.length) {
            app.undoRedoManager.captureState();
            
            const measureToDelete = measures[app.currentEditingMeasure];
            const measureName = measureToDelete.name;
            
            app.removeACTableRowForMeasure(measureName);
            
            app.measuresData.delete(measureName);
            
            const rowIndex = app.rows.findIndex(row => row.type === 'measure' && row.name === measureName);
            if (rowIndex >= 0) {
                app.rows.splice(rowIndex, 1);
            }
            
            app.currentEditingMeasure = null;
            app.hideAllMenus();
            app.render();
        }
    }
    
    /**
     * Start dragging measure text horizontally
     * @param {TimingGenApp} app - Main application instance
     * @param {number} measureRowIndex - Row index of measure
     * @param {Object} event - Mouse event
     */
    static startDragMeasureText(app, measureRowIndex, event) {
        console.log('[startDragMeasureText] Called with measureRowIndex:', measureRowIndex);
        
        if (measureRowIndex < 0 || measureRowIndex >= app.rows.length) {
            console.log('[startDragMeasureText] Invalid measureRowIndex, aborting');
            return;
        }
        
        const row = app.rows[measureRowIndex];
        if (row.type !== 'measure') {
            console.log('[startDragMeasureText] Row is not a measure, aborting');
            return;
        }
        
        const measure = app.measuresData.get(row.name);
        if (!measure) {
            console.log('[startDragMeasureText] Measure not found, aborting');
            return;
        }
        
        app.undoRedoManager.captureState();
        
        const startX = event.point.x;
        
        let currentTextX = measure.textX;
        if (currentTextX == null) {
            const coords = TimingGenMeasure.getMeasureCoordinates(app, measure);
            const spacing = Math.abs(coords.x2 - coords.x1);
            const isInward = spacing < 30;
            const minX = Math.min(coords.x1, coords.x2);
            const maxX = Math.max(coords.x1, coords.x2);
            
            if (measure.text) {
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
                    currentTextX = maxX + textGap;
                } else {
                    currentTextX = (minX + maxX) / 2 - textWidth / 2;
                }
            } else {
                currentTextX = (minX + maxX) / 2;
            }
        }
        
        console.log('[startDragMeasureText] Starting drag at X:', startX, 'currentTextX:', currentTextX);
        
        app.isDraggingMeasureText = true;
        app.currentEditingMeasureRow = measureRowIndex;
        app.dragStartX = startX;
        app.originalTextX = currentTextX;
        app.draggingMeasure = measure;
        
        app.canvas.style.cursor = 'ew-resize';
    }
    
    /**
     * Show context menu for measure text
     * @param {TimingGenApp} app - Main application instance
     * @param {Object} event - Mouse event
     * @param {number} measureIndex - Measure index
     */
    static showMeasureTextContextMenu(app, event, measureIndex) {
        app.currentEditingMeasure = measureIndex;
        
        const menu = document.getElementById('measure-text-context-menu');
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.display = 'block';
        
        event.preventDefault();
    }
    
    /**
     * Start re-choosing a measure point
     * @param {TimingGenApp} app - Main application instance
     * @param {number} measureRowIndex - Row index of measure
     * @param {number} pointIndex - Point index (1 or 2)
     */
    static startRechooseMeasurePoint(app, measureRowIndex, pointIndex) {
        console.log('[startRechooseMeasurePoint] Called with measureRowIndex:', measureRowIndex, 'pointIndex:', pointIndex);
        
        if (measureRowIndex < 0 || measureRowIndex >= app.rows.length) {
            console.log('[startRechooseMeasurePoint] Invalid measureRowIndex, aborting');
            return;
        }
        
        const row = app.rows[measureRowIndex];
        if (row.type !== 'measure') {
            console.log('[startRechooseMeasurePoint] Row is not a measure, aborting');
            return;
        }
        
        const measure = app.measuresData.get(row.name);
        if (!measure) {
            console.log('[startRechooseMeasurePoint] Measure not found, aborting');
            return;
        }
        
        app.currentEditingMeasureName = measure.name;
        app.rechoosingPointIndex = pointIndex;
        
        app.measureMode = true;
        app.measureState = pointIndex === 1 ? 'rechoose-point-1' : 'rechoose-point-2';
        app.canvas.style.cursor = 'crosshair';
        
        if (app.originalOnMouseMove === undefined) {
            app.originalOnMouseMove = app.tool.onMouseMove || null;
        }
        app.tool.onMouseMove = (event) => TimingGenMeasure.handleMeasureMouseMove(app, event);
        
        console.log('[startRechooseMeasurePoint] Entering rechoose mode for point', pointIndex);
        TimingGenMeasure.showInstruction(app, `Click to re-choose point ${pointIndex}`);
    }
    
    /**
     * Start moving measure to another row
     * @param {TimingGenApp} app - Main application instance
     * @param {string|number} measureIdentifier - Measure name or row index
     * @param {Object} event - Mouse event
     */
    static startMovingMeasureRow(app, measureIdentifier, event) {
        console.log('[startMovingMeasureRow] Called with measureIdentifier:', measureIdentifier);
        
        let measureName = null;
        let measureRowIndex = null;
        
        if (typeof measureIdentifier === 'string') {
            measureName = measureIdentifier;
            const measure = app.measuresData.get(measureName);
            if (!measure) {
                console.log('[startMovingMeasureRow] Measure not found, aborting move:', measureName);
                return;
            }
            measureRowIndex = measure.measureRow;
            console.log('[startMovingMeasureRow] Measure name:', measureName, 'at row:', measureRowIndex);
        } else if (typeof measureIdentifier === 'number') {
            measureRowIndex = measureIdentifier;
            
            if (measureRowIndex < 0 || measureRowIndex >= app.rows.length) {
                console.log('[startMovingMeasureRow] Invalid measureRowIndex, aborting');
                return;
            }
            
            const row = app.rows[measureRowIndex];
            if (row.type !== 'measure') {
                console.log('[startMovingMeasureRow] Row is not a measure, aborting');
                return;
            }
            
            measureName = row.name;
            const measure = app.measuresData.get(measureName);
            if (!measure) {
                console.log('[startMovingMeasureRow] Measure not found, aborting');
                return;
            }
        } else {
            console.log('[startMovingMeasureRow] Invalid measureIdentifier type, aborting');
            return;
        }
        
        app.currentEditingMeasureName = measureName;
        app.movingMeasureRowIndex = measureRowIndex;
        app.canvas.style.cursor = 'move';
        
        console.log('[startMovingMeasureRow] Entering move mode for measure', measureName, 'at row', measureRowIndex);
        TimingGenMeasure.showInstruction(app, 'Click on a row to move the measure there');
        
        app.isMovingMeasureRow = true;
        
        app.measureMode = true;
        app.measureState = null;
        
        if (app.originalOnMouseMove === undefined) {
            app.originalOnMouseMove = app.tool.onMouseMove || null;
        }
        app.tool.onMouseMove = (event) => TimingGenMeasure.handleMeasureMouseMove(app, event);
    }
}
