// Timing Gen 3 - Rendering Module
// Version 3.4.0
// Handles all waveform rendering functionality using Paper.js

class TimingGenRendering {
    static render(app) {
        // Clear all layers
        app.backgroundLayer.removeChildren();
        app.gridLayer.removeChildren();
        app.signalLayer.removeChildren();
        app.measureLayer.removeChildren();
        
        // Activate background layer and draw
        app.backgroundLayer.activate();
        const background = new paper.Path.Rectangle({
            point: [0, 0],
            size: [paper.view.size.width, paper.view.size.height],
            fillColor: app.config.backgroundColor
        });
        
        // Draw grid
        app.gridLayer.activate();
        TimingGenRendering.drawGrid(app);
        
        // Draw header with cycle numbers (if header should be visible)
        if (TimingGenRendering.shouldShowHeader(app)) {
            TimingGenRendering.drawHeader(app);
        }
        
        // Draw rows (signals, measures, text, counter, ac-table) from unified rows array
        if (app.rows && app.rows.length > 0) {
            app.rows.forEach((row, rowIndex) => {
                if (row.type === 'signal') {
                    // Draw signal - get data from Map
                    app.signalLayer.activate();
                    const signal = app.signalsData.get(row.name);
                    if (signal) {
                        const signalIndex = app.rowManager.rowIndexToSignalIndex(rowIndex);
                        if (signalIndex >= 0) {
                            TimingGenRendering.drawSignal(app, signal, signalIndex);
                        }
                    }
                } else if (row.type === 'measure') {
                    // Draw measure - get data from Map
                    const measure = app.measuresData.get(row.name);
                    if (measure) {
                        // Draw measure row name in name column
                        app.gridLayer.activate();
                        TimingGenRendering.drawMeasureRowName(app, rowIndex, 1);
                        
                        // Draw measure
                        app.measureLayer.activate();
                        TimingGenRendering.drawMeasure(app, measure, rowIndex);
                    }
                } else if (row.type === 'text') {
                    // Draw text widget - get data from Map
                    app.signalLayer.activate();
                    const textData = app.textData.get(row.name);
                    if (textData) {
                        TimingGenRendering.drawTextRow(app, textData, rowIndex);
                    }
                } else if (row.type === 'counter') {
                    // Draw counter widget - get data from Map
                    app.signalLayer.activate();
                    const counterData = app.counterData.get(row.name);
                    if (counterData) {
                        TimingGenRendering.drawCounterRow(app, counterData, rowIndex);
                    }
                } else if (row.type === 'ac-table') {
                    // Draw AC Table widget - get data from Map
                    app.signalLayer.activate();
                    const acTableData = app.acTablesData.get(row.name);
                    if (acTableData) {
                        TimingGenRendering.drawACTable(app, acTableData, row.name, rowIndex);
                    }
                }
            });
        }
        
        // Draw arrows (not in rows, drawn on top of signals)
        app.measureLayer.activate();
        for (const [name, arrow] of app.arrowsData.entries()) {
            TimingGenRendering.drawArrow(app, arrow, name);
        }
        
        paper.view.draw();
    }
    
    static drawGrid(app) {
        // Calculate total rows from unified row system
        const totalRows = app.rowManager.getTotalRows();
        const maxHeight = app.config.headerHeight + totalRows * app.config.rowHeight;
        
        // Vertical lines (cycle dividers) - draw to max height based on signals
        for (let idx = 0; idx <= app.config.cycles; idx++) {
            const xPos = app.config.nameColumnWidth + idx * app.config.cycleWidth;
            const line = new paper.Path.Line({
                from: [xPos, 0],
                to: [xPos, maxHeight],
                strokeColor: app.config.gridColor,
                strokeWidth: 1
            });
        }
        
        // Horizontal lines (row dividers)
        for (let idx = 0; idx <= totalRows; idx++) {
            const yPos = app.rowManager.getRowYPosition(idx);
            
            const line = new paper.Path.Line({
                from: [0, yPos],
                to: [app.config.nameColumnWidth + app.config.cycles * app.config.cycleWidth, yPos],
                strokeColor: app.config.gridColor,
                strokeWidth: 1
            });
        }
        
        // Name column divider
        const divider = new paper.Path.Line({
            from: [app.config.nameColumnWidth, 0],
            to: [app.config.nameColumnWidth, maxHeight],
            strokeColor: '#999',
            strokeWidth: 2
        });
    }
    
    static shouldShowHeader(app) {
        // Determine if the cycle reference header should be shown
        // Hide if:
        // 1. hideHeader flag is set (for SVG export)
        // 2. There are counter rows present
        if (app.hideHeader) {
            return false;
        }
        const hasCounter = app.rows && app.rows.some(row => row.type === 'counter');
        return !hasCounter;
    }
    
    static drawHeader(app) {
        for (let idx = 0; idx < app.config.cycles; idx++) {
            const xPos = app.config.nameColumnWidth + idx * app.config.cycleWidth + app.config.cycleWidth / 2;
            const yPos = 30;
            
            const text = new paper.PointText({
                point: [xPos, yPos],
                content: idx.toString(),
                fillColor: 'black',
                fontFamily: 'Arial',
                fontSize: 12,
                justification: 'center'
            });
        }
    }
    
    static drawSignal(app, signal, index) {
        // Calculate Y position accounting for blank rows
        const yPos = TimingGenRendering.getSignalYPosition(app, index);
        
        // Draw selection highlight background if signal is selected
        if (app.selectedSignals.has(index)) {
            const highlightRect = new paper.Path.Rectangle({
                point: [0, yPos],
                size: [app.config.nameColumnWidth, app.config.rowHeight],
                fillColor: '#3498db'
            });
        }
        
        // Draw signal name
        const nameColor = app.selectedSignals.has(index) ? 'white' : 'black';
        const nameText = new paper.PointText({
            point: [app.config.nameColumnWidth - 10, yPos + app.config.rowHeight / 2 + 5],
            content: signal.name,
            fillColor: nameColor,
            fontFamily: 'Arial',
            fontSize: 14,
            fontWeight: 'bold',
            justification: 'right'
        });
        
        // Draw waveform
        if (signal.type === 'clock') {
            TimingGenRendering.drawClockWaveform(app, signal, yPos);
        } else if (signal.type === 'bit') {
            TimingGenRendering.drawBitWaveform(app, signal, yPos);
        } else if (signal.type === 'bus') {
            TimingGenRendering.drawBusWaveform(app, signal, yPos);
        }
    }
    
    static drawClockWaveform(app, signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + app.config.rowHeight - 20;
        
        const path = new paper.Path();
        path.strokeColor = app.config.signalColor;
        path.strokeWidth = 2;
        
        for (let idx = 0; idx < app.config.cycles; idx++) {
            const x1 = app.config.nameColumnWidth + idx * app.config.cycleWidth;
            const x2 = x1 + app.config.cycleWidth / 2;
            const x3 = x1 + app.config.cycleWidth;
            
            // Rising edge at start of cycle
            if (idx === 0) {
                path.moveTo(new paper.Point(x1, lowY));
            }
            path.lineTo(new paper.Point(x1, highY));
            path.lineTo(new paper.Point(x2, highY));
            
            // Falling edge at middle of cycle
            path.lineTo(new paper.Point(x2, lowY));
            path.lineTo(new paper.Point(x3, lowY));
        }
    }
    
    // Helper function to draw delay uncertainty parallelogram for bit signals
    static drawBitDelayUncertainty(baseX, delayInfo, fromY, toY, slew) {
        const delayMin = delayInfo.min;
        const delayMax = delayInfo.max;
        const color = delayInfo.color;
        
        // Only draw if there's uncertainty (min != max)
        if (delayMin >= delayMax) {
            return; // No uncertainty to draw
        }
        
        // Create a parallelogram shape
        const path = new paper.Path();
        
        // Starting from the previous state at delayMin
        const x1 = baseX + delayMin;
        const x2 = baseX + delayMax;

        if (fromY !== 'X') {
            // For a transition from fromY to toY:
            // The parallelogram extends the previous state (fromY) for delayMin,
            // then slopes down to the new state (toY)
            
            // Bottom-left: end of previous state at delayMin
            path.moveTo(new paper.Point(x1, fromY));
            
            // Bottom-right: slope starts at delayMax
            path.lineTo(new paper.Point(x2, fromY));
            
            // Top-right: slope ends at delayMax + slew
            path.lineTo(new paper.Point(x2 + slew, toY));
        
            // Top-left: slope ends at delayMin + slew
            path.lineTo(new paper.Point(x1 + slew, toY));
        
            // Close the path
            path.closePath();

        } else {
            // fromY is X.
            // If toY is 1, draw a parallelogram
            // elsif toY is 0, draw a parallelogram
            // else draw a hexagon.
            if (toY[2] == toY[0]) {
                // current (toY[2]) is high (toY[0])
                // left to right right to left
                path.moveTo(new paper.Point(x1, toY[1]));
                path.lineTo(new paper.Point(x2, toY[1]));
                path.lineTo(new paper.Point(x2 + slew, toY[2]));
                path.lineTo(new paper.Point(x1 + slew, toY[2]));
                path.closePath();
            } else if(toY[2] == toY[1]) {
                // current (toY[2]) is low (toY[1])
                // left to right right to left
                path.moveTo(new paper.Point(x1, toY[0]));
                path.lineTo(new paper.Point(x2, toY[0]));
                path.lineTo(new paper.Point(x2 + slew, toY[2]));
                path.lineTo(new paper.Point(x1 + slew, toY[2]));
                path.closePath();
            } else {
                // current is middle
                path.moveTo(new paper.Point(x1, toY[0]));
                path.lineTo(new paper.Point(x2, toY[0]));
                path.lineTo(new paper.Point(x2 + slew/2, toY[2]));
                path.lineTo(new paper.Point(x2, toY[1]));
                path.lineTo(new paper.Point(x1, toY[1]));
                path.lineTo(new paper.Point(x1 + slew/2, toY[2]));
                path.closePath();
            }
        }
        
        // Set the fill color with transparency
        // Handle both full Paper.js and the shim
        if (typeof paper.Color === 'function') {
            // Full Paper.js
            path.fillColor = new paper.Color(color);
            path.fillColor.alpha = 0.3; // 30% transparency
        } else {
            // Paper.js shim - use rgba directly
            // Convert hex color to rgba
            const red = parseInt(color.substring(1, 3), 16);
            const green = parseInt(color.substring(3, 5), 16);
            const blue = parseInt(color.substring(5, 7), 16);
            path.fillColor = `rgba(${red}, ${green}, ${blue}, 0.3)`;
        }
        // Add black stroke on all edges for bit signals
        path.strokeColor = '#000000';
        path.strokeWidth = 1;
    }
    
    // Helper function to draw delay uncertainty hexagon for bus signals
    static drawBusDelayUncertainty(baseX, delayInfo, fromY, toY, slew) {
        const delayMin = delayInfo.min;
        const delayMax = delayInfo.max;
        const color = delayInfo.color;
        
        // Only draw if there's uncertainty (min != max)
        if (delayMin >= delayMax) {
            return; // No uncertainty to draw
        }
        
        // Create a hexagon shape (concaved on right side)
        const path = new paper.Path();
        
        // Starting positions
        const x1 = baseX + delayMin;
        const x2 = baseX + delayMax;
        const midY = (fromY + toY) / 2;
        
        // For bus signals: extend previous value to min delay,
        // then add "<<" shape to max delay
        
        // Bottom-left: extend previous value
        path.moveTo(new paper.Point(x1, fromY));
        
        // Bottom-middle: end of extension at max delay
        path.lineTo(new paper.Point(x2, fromY));
        
        // Right-middle: concave point (creates the "<<" shape)
        path.lineTo(new paper.Point(x2 + slew/2, midY));
        
        // Top-middle: other side of concave
        path.lineTo(new paper.Point(x2, toY));
        
        // Top-left: end at min delay
        path.lineTo(new paper.Point(x1, toY));
        
        // Close the path back to start
        path.closePath();
        
        // Set the fill color with transparency
        // Handle both full Paper.js and the shim
        if (typeof paper.Color === 'function') {
            // Full Paper.js
            path.fillColor = new paper.Color(color);
            path.fillColor.alpha = 0.3; // 30% transparency
        } else {
            // Paper.js shim - use rgba directly
            // Convert hex color to rgba
            const red = parseInt(color.substring(1, 3), 16);
            const green = parseInt(color.substring(3, 5), 16);
            const blue = parseInt(color.substring(5, 7), 16);
            path.fillColor = `rgba(${red}, ${green}, ${blue}, 0.3)`;
        }
        path.strokeColor = null; // No stroke for bus signals
    }
    
    static drawBitWaveform(app, signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + app.config.rowHeight - 20;
        const midY = baseY + app.config.rowHeight / 2;
        
        // First, identify all X spans
        const xSpans = [];
        let idx = 0;
        while (idx < app.config.cycles) {
            const value = app.getBitValueAtCycle(signal, idx);
            if (value === 'X') {
                const spanStart = idx;
                let spanEnd = idx;
                // Find the end of this X span
                for (let jdx = idx + 1; jdx < app.config.cycles; jdx++) {
                    const nextValue = app.getBitValueAtCycle(signal, jdx);
                    if (nextValue !== 'X') {
                        spanEnd = jdx - 1;
                        break;
                    }
                    if (jdx === app.config.cycles - 1) {
                        spanEnd = jdx;
                    }
                }
                xSpans.push({ start: spanStart, end: spanEnd });
                idx = spanEnd + 1;
            } else {
                idx++;
            }
        }
        
        // Draw the line path with slew transitions and delays
        const path = new paper.Path();
        path.strokeColor = app.config.signalColor;
        path.strokeWidth = 2;
        
        let pathStarted = false;
        let prevX = null;
        let prevY = null;
        
        for (let idx = 0; idx <= app.config.cycles; idx++) {
            // Get delay info object for this cycle (contains min, max, color)
            const delayInfo = idx < app.config.cycles && idx > 0 ?
                app.getEffectiveDelay(signal, idx) : { min: 0, max: 0, color: app.config.delayColor };
            
            // Get slew for this cycle
            const slew = idx < app.config.cycles ? app.getEffectiveSlew(signal, idx) : app.config.slew;
            
            // Base x position at grid line
            const baseX = app.config.nameColumnWidth + idx * app.config.cycleWidth;
            // Actual transition point after minimum delay
            const xPos = baseX + delayInfo.min;
            
            const value = (idx < app.config.cycles) ? app.getBitValueAtCycle(signal, idx) : app.getBitValueAtCycle(signal, app.config.cycles - 1);
            const currentY = (value === 1) ? highY : (value === 'Z') ? midY : lowY;
            
            if (!pathStarted) {
                // Start or restart the path
                path.moveTo(new paper.Point(xPos, currentY));
                pathStarted = true;
                prevX = xPos;
                prevY = currentY;
            } else {
                // Continue the path
                const prevCycle = idx - 1;
                // Skip back over any X spans to find the last non-X cycle
                let lastNonXCycle = prevCycle;
                while (lastNonXCycle >= 0 && xSpans.some(span => lastNonXCycle >= span.start && lastNonXCycle <= span.end)) {
                    lastNonXCycle--;
                }
                
                if (lastNonXCycle >= 0) {
                    const prevValue = app.getBitValueAtCycle(signal, lastNonXCycle);
                    const prevValueY = (prevValue === 1) ? highY : (prevValue === 'Z') ? midY : lowY;
                    
                    // Check if value actually changed
                    if (value !== prevValue) {
                        // Draw delay uncertainty parallelogram if there's uncertainty
                        if (delayInfo.max > delayInfo.min) {
                            TimingGenRendering.drawBitDelayUncertainty(baseX, delayInfo, prevValueY, currentY, slew);
                        }
                        
                        // Draw transition with slew
                        // First, draw horizontal line at transition
                        path.lineTo(new paper.Point(xPos, prevValueY));
                        // Then draw sloped to after transition
                        path.lineTo(new paper.Point(xPos + slew, currentY));
                    } else if (app.getBitValueAtCycle(signal,idx - 1) === 'X') {
                        // Draw delay uncertainty parallelogram if there's uncertainty
                        if (delayInfo.max > delayInfo.min) {
                            TimingGenRendering.drawBitDelayUncertainty(baseX, delayInfo, 'X', [highY, lowY, currentY], slew);
                        }
                        // Draw transition with slew
                        // First, draw horizontal line at transition
                        path.lineTo(new paper.Point(xPos, prevValueY));
                        // Then draw sloped to after transition
                        path.lineTo(new paper.Point(xPos + slew, currentY));
                        

                    } else {
                        // Same value, just continue
                        path.lineTo(new paper.Point(xPos, currentY));
                    }
                } else {
                    // No previous non-X cycle, just draw to current
                    path.lineTo(new paper.Point(xPos, currentY));
                }
                
                prevX = xPos;
                prevY = currentY;
            }
        }
        
        // Draw X patterns as continuous spans
        xSpans.forEach(span => {
            const path = new paper.Path();
            path.strokeColor = app.config.signalColor;
            path.strokeWidth = 2;
            path.fillColor = '#999999';

            var  x1 = app.config.nameColumnWidth + span.start * app.config.cycleWidth;
            var  x2 = app.config.nameColumnWidth + (span.end + 1) * app.config.cycleWidth;

            const delay1 = span.start < app.config.cycles && span.start > 0 ?
                app.getEffectiveDelay(signal, span.start) : { min: 0, max: 0, color: app.config.delayColor };
            const delay2 = span.end < app.config.cycles && span.end > 0 ?
                app.getEffectiveDelay(signal, span.end) : { min: 0, max: 0, color: app.config.delayColor };
            x1 = x1 + delay1.min;
            x2 = x2 + delay2.min;
            
            let spanStart = span.start;
            let spanEnd = span.end;

            const prevValue = spanStart > 0 ? app.getBusValueAtCycle(signal, spanStart - 1) : null;
            const nextValue = spanEnd + 1 < app.config.cycles ? app.getBusValueAtCycle(signal, spanEnd + 1) : null;
            const hasNextValue = (spanEnd + 1 < app.config.cycles && signal.values[spanEnd + 1] !== undefined);

            const slew = span.start < app.config.cycles ? app.getEffectiveSlew(signal, span.start) : app.config.slew;

            if (prevValue === null || spanStart === 0) {
                path.moveTo(new paper.Point(x1 , highY));
            } else if (prevValue === 'Z') {
                path.moveTo(new paper.Point(x1 , midY));
                path.lineTo(new paper.Point(x1+slew/2, highY));
            } else if (prevValue == 1) {
                path.moveTo(new paper.Point(x1 , highY));
            } else {
                // prevValue == 0
                path.moveTo(new paper.Point(x1+slew , highY));
            }

            // Top line
            if (hasNextValue) {
                if (nextValue == 1) {
                    path.lineTo(new paper.Point(x2+slew , highY));
                    path.lineTo(new paper.Point(x2 , lowY));
                } else if (nextValue === 'Z') {
                    path.lineTo(new paper.Point(x2 , highY));
                    path.lineTo(new paper.Point(x2 + slew/2 , midY));
                    path.lineTo(new paper.Point(x2 , lowY));
                } else if (nextValue == 0) {
                    path.lineTo(new paper.Point(x2 , highY));
                    path.lineTo(new paper.Point(x2+slew , lowY));
                } else if (nextValue === null) {
                    path.lineTo(new paper.Point(x2 , highY));
                    path.lineTo(new paper.Point(x2+slew , lowY));
                } else {
                    path.lineTo(new paper.Point(x2, highY));
                }
            } else {
                path.lineTo(new paper.Point(x2, highY));
            }
                
            // Bottom line
            
            // Close with X-shaped transition if coming from X
            if (prevValue === null || spanStart === 0) {
                path.lineTo(new paper.Point(x1 , lowY));
            } else if (prevValue === 'Z') {
                path.lineTo(new paper.Point(x1 + slew/2, lowY));
                path.lineTo(new paper.Point(x1 , midY));
                
            } else if (nextValue == 1) {
                path.lineTo(new paper.Point(x1 + slew, lowY));
                path.lineTo(new paper.Point(x1 + slew/2, midY));
            } else {
                path.lineTo(new paper.Point(x1 , lowY));
            }
            path.closePath();

            //TimingGenRendering.drawXPattern(x1, x2, baseY, highY, lowY, app.config.signalColor);
        });
    }
    
    static drawBusWaveform(app, signal, baseY) {
        const topY = baseY + 20;
        const bottomY = baseY + app.config.rowHeight - 20;
        const midY = baseY + app.config.rowHeight / 2;
        
        // First pass: identify value spans with their cycles
        let idx = 0;
        while (idx < app.config.cycles) {
            const value = app.getBusValueAtCycle(signal, idx);
            
            // Find where this value span starts and ends
            let spanStart = idx;
            let spanEnd = idx;
            
            // Find the end of this value span
            for (let jdx = idx + 1; jdx < app.config.cycles; jdx++) {
                if (signal.values[jdx] !== undefined) {
                    spanEnd = jdx - 1;
                    break;
                }
                if (jdx === app.config.cycles - 1) {
                    spanEnd = jdx;
                }
            }
            
            if (spanEnd === idx && idx < app.config.cycles - 1 && signal.values[idx + 1] === undefined) {
                spanEnd = app.config.cycles - 1;
            }
            
            // Get delay info object for this cycle (contains min, max, color)
            const delayInfo = app.getEffectiveDelay(signal, spanStart);

            if (spanStart == 0) {
                // avoid space at the very beginning of the waveform 
                delayInfo.min = 0; 
                delayInfo.max = 0; 
            }
                
            // Get slew for transitions
            const slew = app.getEffectiveSlew(signal, spanStart);
            
            // Calculate start position (at grid line + delay)
            // The grid line is where the transition should end, so slew should start before it
            const baseX1 = app.config.nameColumnWidth + spanStart * app.config.cycleWidth;
            const x1 = baseX1; // + delayInfo.min; // Actual transition point (minimum delay)

            // obtain how far in next cycle has been drawn here
            const nextDelay = spanEnd + 1 < app.config.cycles ? app.getEffectiveDelay(signal, spanEnd + 1) : {min:0,max:0, color:"black"};
            const x2 = app.config.nameColumnWidth + (spanEnd + 1) * app.config.cycleWidth + nextDelay.min;

            
            if (value === 'Z') {
                // High-Z state - draw middle line
                const line = new paper.Path.Line({
                    from: [x1+delayInfo.min+slew/2, midY],
                    to: [x2+nextDelay.min, midY],
                    strokeColor: app.config.signalColor,
                    strokeWidth: 2
                });
                //            } else if (value === 'X') {
                // Unknown state - draw X pattern for the entire span
                //TimingGenRendering.drawXPattern(x1, x2, baseY, topY, bottomY, app.config.signalColor);
            } else {
                // Valid value - check if we need transition from/to X
                const prevValue = spanStart > 0 ? app.getBusValueAtCycle(signal, spanStart - 1) : null;
                const nextValue = spanEnd + 1 < app.config.cycles ? app.getBusValueAtCycle(signal, spanEnd + 1) : null;
                const hasNextValue = (spanEnd + 1 < app.config.cycles && signal.values[spanEnd + 1] !== undefined);


                // draw uncertainty between min and max delay.
                
                
                // Draw delay uncertainty if transitioning and there's uncertainty
                if (prevValue !== null && prevValue !== value && delayInfo.max > delayInfo.min) {
                    // For bus signals, draw hexagon uncertainty from bottom to top
                    const path = new paper.Path();
                    path.strokeColor = app.config.signalColor;
                    path.strokeWidth = 2;
                    path.fillColor = delayInfo.color;
                    path.moveTo(new paper.Point(x1 + delayInfo.min + slew, topY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew, topY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew/2, midY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew, bottomY));
                    path.lineTo(new paper.Point(x1 + delayInfo.min + slew,bottomY));
                    path.lineTo(new paper.Point(x1 + delayInfo.min + slew/2, midY));
                    path.closePath();
                    //TimingGenRendering.drawBusDelayUncertainty(baseX1, delayInfo, bottomY, topY, slew);
                }
                
                // Draw bus shape with X-shaped transitions
                const path = new paper.Path();
                path.strokeColor = app.config.signalColor;
                path.strokeWidth = 2;
                path.fillColor = '#e8f4f8';
                
                if (value === 'X') {
                    path.fillColor = '#999999';
                } else {
                    path.fillColor = '#e8f4f8';
                }
                
                // Start with X-shaped transition if coming from X or at beginning
                if (prevValue === null || spanStart === 0) {
                    // X-shaped start transition
                    path.moveTo(new paper.Point(x1 + delayInfo.max , bottomY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max , topY));
                } else if (prevValue === 'Z') {
                    path.moveTo(new paper.Point(x1 + delayInfo.max , midY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew/2, topY));
                } else {
                    // Normal start - the slew has already brought us to the transition point
                    path.moveTo(new paper.Point(x1 + delayInfo.max + slew/2, midY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew, topY));
                    //path.moveTo(new paper.Point(x1, topY));
                }
                
                // Top line
                if (hasNextValue) {
                    // start at transition
                    
                    path.lineTo(new paper.Point(x2 , topY));
                    path.lineTo(new paper.Point(x2 + slew/2, midY));
                    path.lineTo(new paper.Point(x2 , bottomY));
                
                } else {
                    path.lineTo(new paper.Point(x2, topY));
                    path.lineTo(new paper.Point(x2, bottomY));
                }
                
                // Bottom line
                
                // Close with X-shaped transition if coming from X
                if (prevValue === null || spanStart === 0) {
                    path.lineTo(new paper.Point(x1 + delayInfo.max , bottomY));
                } else if (prevValue === 'Z') {
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew/2, bottomY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max , midY));

                } else {
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew, bottomY));
                    path.lineTo(new paper.Point(x1 + delayInfo.max + slew/2, midY));
                }
                path.closePath();

                    
                if (value !== 'X') {
                    // Draw value text in the middle of the span
                    const textX = (x1 + x2) / 2;
                    const text = new paper.PointText({
                        point: [textX, baseY + app.config.rowHeight / 2 + 4],
                        content: value,
                        fillColor: 'black',
                        fontFamily: 'Arial',
                        fontSize: 12,
                        justification: 'center'
                    });
                }
            }
            
            // Move to next span
            idx = spanEnd + 1;
        }
    }
    
    static drawXPattern(x1, x2, baseY, topY, bottomY, signalColor) {
        // Draw darker solid gray rectangle bounded by high and low state lines
        const rect = new paper.Path.Rectangle({
            point: [x1, topY],
            size: [x2 - x1, bottomY - topY],
            fillColor: '#999999',
            strokeColor: signalColor,
            strokeWidth: 2
        });
    }
    
    static drawMeasureRowName(app, rowIndex, measureCount) {
        // Draw name column for measure row
        const yPos = app.rowManager.getRowYPosition(rowIndex);
        
        // Highlight if selected
        if (app.selectedMeasureRows && app.selectedMeasureRows.has(rowIndex)) {
            const highlightRect = new paper.Path.Rectangle({
                point: [0, yPos],
                size: [app.config.nameColumnWidth, app.config.rowHeight],
                fillColor: '#e74c3c'  // Red to distinguish from signal selection
            });
        }
        
        // Draw measure row label
        const nameColor = (app.selectedMeasureRows && app.selectedMeasureRows.has(rowIndex)) ? 'white' : '#666';
        const label = measureCount > 1 ? `Measures (${measureCount})` : 'Measure';
        const nameText = new paper.PointText({
            point: [app.config.nameColumnWidth - 10, yPos + app.config.rowHeight / 2 + 5],
            content: label,
            fillColor: nameColor,
            fontFamily: 'Arial',
            fontSize: 12,
            fontStyle: 'italic',
            justification: 'right'
        });
    }
    
    static drawMeasure(app, measure, index) {
        // Get coordinates from measure data (signal names + cycles)
        const coords = app.getMeasureCoordinates(measure);
        
        // Check if coordinates are valid
        if (!coords || coords.signal1Index < 0 || coords.signal2Index < 0) {
            console.warn('Invalid measure coordinates, skipping draw:', measure);
            return;
        }
        
        const rowHeight = app.config.rowHeight;
        
        // Get row positions dynamically from signal names
        const signal1 = app.getSignalByName(measure.signal1Name);
        const signal2 = app.getSignalByName(measure.signal2Name);
        
        if (!signal1 || !signal2) {
            console.warn('Signal not found for measure:', measure);
            return;
        }
        
        const signals = app.getSignals();
        const signal1Idx = signals.indexOf(signal1);
        const signal2Idx = signals.indexOf(signal2);
        const row1 = app.rowManager.signalIndexToRowIndex(signal1Idx);
        const row2 = app.rowManager.signalIndexToRowIndex(signal2Idx);
        const measureRow = measure.measureRow;
        
        const row1Pos = app.rowManager.getRowYPosition(row1);
        const row2Pos = app.rowManager.getRowYPosition(row2);
        const measureRowPos = app.rowManager.getRowYPosition(measureRow);
        
        // Determine the extent of vertical lines
        const lineStart = Math.min(row1Pos, row2Pos, measureRowPos);
        const lineEnd = Math.max(row1Pos, row2Pos, measureRowPos) + rowHeight;
        
        // Create a group for all measure elements for easier interaction
        const measureGroup = new paper.Group();
        measureGroup.data = { measureIndex: index, type: 'measure' };
        
        // Draw first vertical line
        const line1 = new paper.Path.Line({
            from: [coords.x1, lineStart],
            to: [coords.x1, lineEnd],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        line1.data = { type: 'vbar', measureIndex: index, pointIndex: 1 };
        measureGroup.addChild(line1);
        
        // Draw small cross at first point
        const cross1 = TimingGenRendering.drawSmallCross(coords.x1, coords.y1);
        cross1.hLine.data = { type: 'vbar', measureIndex: index, pointIndex: 1 };
        cross1.vLine.data = { type: 'vbar', measureIndex: index, pointIndex: 1 };
        measureGroup.addChild(cross1.hLine);
        measureGroup.addChild(cross1.vLine);
        
        // Draw second vertical line
        const line2 = new paper.Path.Line({
            from: [coords.x2, lineStart],
            to: [coords.x2, lineEnd],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        line2.data = { type: 'vbar', measureIndex: index, pointIndex: 2 };
        measureGroup.addChild(line2);
        
        // Draw small cross at second point
        const cross2 = TimingGenRendering.drawSmallCross(coords.x2, coords.y2);
        cross2.hLine.data = { type: 'vbar', measureIndex: index, pointIndex: 2 };
        cross2.vLine.data = { type: 'vbar', measureIndex: index, pointIndex: 2 };
        measureGroup.addChild(cross2.hLine);
        measureGroup.addChild(cross2.vLine);
        
        // Calculate arrow Y position based on measureRow
        const arrowY = measureRowPos + rowHeight / 2;
        
        // Draw double-headed arrows
        const arrowSize = 8;
        const spacing = Math.abs(coords.x2 - coords.x1);
        const isInward = spacing < 30;
        
        // Calculate text dimensions if text exists
        let textWidth = 0;
        let textHeight = 0;
        let textObject = null;
        
        if (measure.text) {
            // Create temporary text to measure dimensions
            const tempText = new paper.PointText({
                content: measure.text,
                fontFamily: measure.textFont || 'Arial',
                fontSize: measure.textSize || 12,
                fontWeight: 'bold'
            });
            textWidth = tempText.bounds.width;
            textHeight = tempText.bounds.height;
            tempText.remove();
        }
        
        const textGap = 10; // Gap between arrow and text
        const minX = Math.min(coords.x1, coords.x2);
        const maxX = Math.max(coords.x1, coords.x2);
        
        // Calculate text position
        let textX;
        if (measure.textX != null) {
            // Use stored text position
            textX = measure.textX;
        } else if (isInward) {
            // Inward arrows: place text to the right of right arrow
            textX = maxX + textGap;
        } else {
            // Outward arrows: place text in the middle
            textX = (minX + maxX) / 2 - textWidth / 2;
        }
        
        // Draw horizontal line segments and arrows based on text position
        if (isInward) {
            // Inward pointing arrows - single line, text on right
            const hLine = new paper.Path.Line({
                from: [minX, arrowY],
                to: [maxX, arrowY],
                strokeColor: '#FF0000',
                strokeWidth: 2
            });
            hLine.data = { type: 'arrow', measureIndex: index };
            measureGroup.addChild(hLine);
            
            const arrow1 = TimingGenRendering.drawArrowHead(minX, arrowY, 'right', arrowSize);
            const arrow2 = TimingGenRendering.drawArrowHead(maxX, arrowY, 'left', arrowSize);
            arrow1.data = { type: 'arrow', measureIndex: index };
            arrow2.data = { type: 'arrow', measureIndex: index };
            measureGroup.addChild(arrow1);
            measureGroup.addChild(arrow2);
        } else {
            // Outward pointing arrows - split line with text in middle
            if (measure.text) {
                // Only draw line segments if they stay within the vbar bounds
                // Left arrow segment - only draw if text is to the right of left vbar
                if (textX - textGap > minX) {
                    const leftLine = new paper.Path.Line({
                        from: [minX, arrowY],
                        to: [textX - textGap, arrowY],
                        strokeColor: '#FF0000',
                        strokeWidth: 2
                    });
                    leftLine.data = { type: 'arrow', measureIndex: index };
                    measureGroup.addChild(leftLine);
                }
                
                // Right arrow segment - only draw if text is to the left of right vbar
                if (textX + textWidth + textGap < maxX) {
                    const rightLine = new paper.Path.Line({
                        from: [textX + textWidth + textGap, arrowY],
                        to: [maxX, arrowY],
                        strokeColor: '#FF0000',
                        strokeWidth: 2
                    });
                    rightLine.data = { type: 'arrow', measureIndex: index };
                    measureGroup.addChild(rightLine);
                }
                
                // Arrowheads always at vbar positions
                const arrow1 = TimingGenRendering.drawArrowHead(minX, arrowY, 'left', arrowSize);
                arrow1.data = { type: 'arrow', measureIndex: index };
                measureGroup.addChild(arrow1);
                
                const arrow2 = TimingGenRendering.drawArrowHead(maxX, arrowY, 'right', arrowSize);
                arrow2.data = { type: 'arrow', measureIndex: index };
                measureGroup.addChild(arrow2);
            } else {
                // No text - single line with outward arrows
                const hLine = new paper.Path.Line({
                    from: [minX, arrowY],
                    to: [maxX, arrowY],
                    strokeColor: '#FF0000',
                    strokeWidth: 2
                });
                hLine.data = { type: 'arrow', measureIndex: index };
                measureGroup.addChild(hLine);
                
                const arrow1 = TimingGenRendering.drawArrowHead(minX, arrowY, 'left', arrowSize);
                const arrow2 = TimingGenRendering.drawArrowHead(maxX, arrowY, 'right', arrowSize);
                arrow1.data = { type: 'arrow', measureIndex: index };
                arrow2.data = { type: 'arrow', measureIndex: index };
                measureGroup.addChild(arrow1);
                measureGroup.addChild(arrow2);
            }
        }
        
        // Draw text label if it exists
        if (measure.text) {
            const text = new paper.PointText({
                point: [textX, arrowY + 5],
                content: measure.text,
                fillColor: measure.textColor || '#FF0000',
                fontFamily: measure.textFont || 'Arial',
                fontSize: measure.textSize || 12,
                fontWeight: 'bold'
            });
            text.data = { type: 'text', measureIndex: index };
            measureGroup.addChild(text);
        }
        
        // Make the entire group interactive
        measureGroup.onMouseDown = function(event) {
            const hitItem = event.target;
            
            if (event.event.button === 0) { // Left-click
                if (hitItem.data && hitItem.data.type === 'text') {
                    // Start dragging text
                    app.startDragMeasureText(this.data.measureIndex, event);
                    event.stopPropagation();
                } else if (hitItem.data && hitItem.data.type === 'vbar') {
                    // Re-choose measure point
                    app.startRechooseMeasurePoint(this.data.measureIndex, hitItem.data.pointIndex);
                    event.stopPropagation();
                } else if (hitItem.data && hitItem.data.type === 'arrow') {
                    // Start moving measure to another row
                    app.startMovingMeasureRow(this.data.measureIndex, event);
                    event.stopPropagation();
                }
            } else if (event.event.button === 2) { // Right-click
                event.preventDefault();
                if (hitItem.data && hitItem.data.type === 'text') {
                    // Show text context menu
                    app.showMeasureTextContextMenu(event.event, this.data.measureIndex);
                } else {
                    // Show general measure context menu
                    app.showMeasureContextMenu(event.event, this.data.measureIndex);
                }
            }
        };
    }
    
    static drawArrow(app, arrow, arrowName) {
        // Draw arrow as a bezier curve from start to end point
        // with control points for smooth curvature
        
        const arrowGroup = new paper.Group();
        arrowGroup.data = { type: 'arrow', arrowName: arrowName };
        
        // Draw transparent thicker hit area for easier clicking
        const hitArea = new paper.Path();
        hitArea.add(new paper.Segment(
            new paper.Point(arrow.startX, arrow.startY),
            null,
            new paper.Point(arrow.ctrl1X - arrow.startX, arrow.ctrl1Y - arrow.startY)
        ));
        hitArea.add(new paper.Segment(
            new paper.Point(arrow.endX, arrow.endY),
            new paper.Point(arrow.ctrl2X - arrow.endX, arrow.ctrl2Y - arrow.endY),
            null
        ));
        hitArea.strokeColor = new paper.Color(0, 0, 0, 0.01);  // Almost transparent but still registers hits
        hitArea.strokeWidth = 10;  // Transparent hit area for easier clicking
        hitArea.data = { type: 'arrow-curve', arrowName: arrowName };
        arrowGroup.addChild(hitArea);
        
        // Draw the visible bezier curve
        const curve = new paper.Path();
        curve.add(new paper.Segment(
            new paper.Point(arrow.startX, arrow.startY),
            null,  // handleIn
            new paper.Point(arrow.ctrl1X - arrow.startX, arrow.ctrl1Y - arrow.startY)  // handleOut
        ));
        curve.add(new paper.Segment(
            new paper.Point(arrow.endX, arrow.endY),
            new paper.Point(arrow.ctrl2X - arrow.endX, arrow.ctrl2Y - arrow.endY),  // handleIn
            null  // handleOut
        ));
        curve.strokeColor = arrow.color || '#0000FF';
        curve.strokeWidth = arrow.width || 2;
        curve.data = { type: 'arrow-curve-visual', arrowName: arrowName };
        arrowGroup.addChild(curve);
        
        // Draw small circle at start point (smaller than measure marker)
        const startCircle = new paper.Path.Circle({
            center: [arrow.startX, arrow.startY],
            radius: 3,
            fillColor: arrow.color || '#0000FF'
        });
        startCircle.data = { type: 'arrow-start', arrowName: arrowName };
        arrowGroup.addChild(startCircle);
        
        // Calculate arrow head angle from curve tangent at end point
        // Get the tangent at the end of the curve
        const tangent = curve.getTangentAt(curve.length);
        let angle;
        if (tangent) {
            angle = Math.atan2(tangent.y, tangent.x);
        } else if (arrow.ctrl2X != null && arrow.ctrl2Y != null && arrow.endX != null && arrow.endY != null) {
            // Fallback to control point direction if tangent unavailable
            angle = Math.atan2(arrow.endY - arrow.ctrl2Y, arrow.endX - arrow.ctrl2X);
        } else {
            // Final fallback to horizontal right
            angle = 0;
        }
        
        // Draw arrow head at end point with proper rotation
        const arrowHead = TimingGenRendering.drawRotatedArrowHead(
            arrow.endX, arrow.endY,
            angle,
            arrow.color || '#0000FF',
            8
        );
        arrowHead.data = { type: 'arrow-head', arrowName: arrowName };
        arrowGroup.addChild(arrowHead);
        
        // Draw text label near the middle of the arrow
        if (arrow.text) {
            const midX = (arrow.startX + arrow.endX) / 2;
            const midY = (arrow.startY + arrow.endY) / 2;
            
            // Use stored text position or default position
            const textX = arrow.textX !== undefined ? arrow.textX : midX;
            const textY = arrow.textY !== undefined ? arrow.textY : midY - 10;
            
            const text = new paper.PointText({
                point: [textX, textY],
                content: arrow.text,
                fillColor: arrow.textColor || arrow.color || '#0000FF',
                fontFamily: arrow.textFont || 'Arial',
                fontSize: arrow.textSize || 12,
                justification: 'center'
            });
            text.data = { type: 'arrow-text', arrowName: arrowName };
            
            // Highlight text if this arrow is in edit mode
            if (app.arrowEditMode && app.currentEditingArrowName === arrowName) {
                text.fillColor = '#FF0000';  // Red color for highlighting
                text.fontWeight = 'bold';     // Make it bold
            }
            
            // Add drag handlers to make text draggable
            text.onMouseDown = function(event) {
                if (event.event && event.event.stopPropagation) {
                    event.event.stopPropagation();
                }
                if (event.event.button === 0) {
                    // Left click - start dragging text
                    app.draggingArrowText = {
                        arrowName: arrowName,
                        startX: event.point.x,
                        startY: event.point.y,
                        originalTextX: this.getPosition().x, //textX,
                        originalTextY: this.getPosition().y, //textY
                    };
                }
                return; // false;
            };
            
            text.onMouseDrag = function(event) {
                if (app.draggingArrowText && app.draggingArrowText.arrowName === arrowName) {
                    // Calculate new text position
                    const dx = event.point.x - app.draggingArrowText.startX;
                    const dy = event.point.y - app.draggingArrowText.startY;
                    const newTextX = app.draggingArrowText.originalTextX + dx;
                    const newTextY = app.draggingArrowText.originalTextY + dy;
                    
                    // Update text position directly (visual feedback)
                    text.position = new paper.Point(newTextX, newTextY);
                    
                    // Update text position in arrow object
                    const arrow = app.arrowsData.get(arrowName);
                    if (arrow) {
                        arrow.textX = newTextX;
                        arrow.textY = newTextY;
                    }
                }
                return false;
            };
            
            text.onMouseUp = function(event) {
                if (app.draggingArrowText && app.draggingArrowText.arrowName === arrowName) {
                    app.draggingArrowText = null;
                }
                return false;
            };
            
            arrowGroup.addChild(text);
        }
        
        // If in edit mode for this arrow, show control points
        if (app.arrowEditMode && app.currentEditingArrowName === arrowName) {
            // Draw control point squares
            const controlPoints = [
                { x: arrow.startX, y: arrow.startY, index: 0, label: 'Start' },
                { x: arrow.ctrl1X, y: arrow.ctrl1Y, index: 1, label: 'Ctrl1' },
                { x: arrow.ctrl2X, y: arrow.ctrl2Y, index: 2, label: 'Ctrl2' },
                { x: arrow.endX, y: arrow.endY, index: 3, label: 'End' }
            ];
            
            controlPoints.forEach(point => {
                // Draw transparent hit area first (much larger for easier clicking)
                const hitArea = new paper.Path.Rectangle({
                    center: [point.x, point.y],
                    size: [24, 24],  // Much larger hit area (24x24 instead of 16x16)
                    fillColor: new paper.Color(0, 0, 0, 0.01)  // Almost transparent but still registers hits
                });
                hitArea.data = { type: 'arrow-control-point', arrowName: arrowName, pointIndex: point.index };
                
                // Add event handlers directly to the control point hit area
                hitArea.onMouseDown = function(event) {
                    if (event.event && event.event.stopPropagation) {
                        event.event.stopPropagation();
                    }
                    if (event.event.button === 0) {
                        app.startDraggingArrowPoint(arrowName, point.index, event);
                    }
                    return false;
                };
                
                hitArea.onMouseDrag = function(event) {
                    if (app.draggingArrowPoint && app.draggingArrowPoint.arrowName === arrowName) {
                        app.handleCanvasMouseDrag(event);
                    }
                    return false;
                };
                
                hitArea.onMouseUp = function(event) {
                    if (app.draggingArrowPoint && app.draggingArrowPoint.arrowName === arrowName) {
                        app.draggingArrowPoint = null;
                    }
                    return false;
                };
                
                //arrowGroup.addChild(hitArea);
                
                // Draw visible square on top (also larger)
                const square = new paper.Path.Rectangle({
                    center: [point.x, point.y],
                    size: [12, 12],  // Larger visible square (12x12 instead of 8x8)
                    fillColor: '#FFD700',
                    strokeColor: '#000000',
                    strokeWidth: 1
                });
                square.data = { type: 'arrow-control-point-visual', arrowName: arrowName, pointIndex: point.index };
                //arrowGroup.addChild(square);
            });
            
            // Draw lines from control points to their respective endpoints
            const ctrlLine1 = new paper.Path.Line({
                from: [arrow.startX, arrow.startY],
                to: [arrow.ctrl1X, arrow.ctrl1Y],
                strokeColor: '#00FF00',
                strokeWidth: 1,
                dashArray: [4, 4]
            });
            arrowGroup.addChild(ctrlLine1);
            
            const ctrlLine2 = new paper.Path.Line({
                from: [arrow.ctrl2X, arrow.ctrl2Y],
                to: [arrow.endX, arrow.endY],
                strokeColor: '#00FF00',
                strokeWidth: 1,
                dashArray: [4, 4]
            });
            arrowGroup.addChild(ctrlLine2);
        }
        
        // Make the group interactive (control points have their own handlers)
        arrowGroup.onMouseDown = function(event) {
            // Stop event propagation to prevent multiple invocations
            if (event.event && event.event.stopPropagation) {
                event.event.stopPropagation();
            }
            
            // Do hit testing to find what was actually clicked
            const hitResult = arrowGroup.hitTest(event.point, {
                fill: true,
                stroke: true,
                tolerance: 0
            });
            
            const clickedItem = hitResult ? hitResult.item : event.target;
            
            if (event.event.button === 0) {
                // Left click
                // Skip handling if text was clicked (let text handle its own drag)
                // Don't return false - just don't handle it, allowing event to propagate to text
                if (clickedItem.data && clickedItem.data.type === 'arrow-text') {
                    // Don't handle this event, let it propagate to text naturally
                    return;  // Don't return false, just return undefined to allow propagation
                }
                
                // Toggle edit mode for the arrow
                // (control points handle their own clicks via their own handlers)
                if (app.arrowEditMode && app.currentEditingArrowName === arrowName) {
                    app.stopEditingArrow();
                } else {
                    app.startEditingArrow(arrowName);
                }
            } else if (event.event.button === 2) {
                // Right click - check what was clicked
                if (clickedItem.data && clickedItem.data.type === 'arrow-text') {
                    // Show text context menu
                    app.currentEditingArrowName = arrowName;
                    app.showArrowTextContextMenu(event.event, arrowName);
                } else {
                    // Show arrow context menu
                    app.showArrowContextMenu(event.event, arrowName);
                }
            }
            
            // Return false to prevent Paper.js event bubbling to parent/children
            return false;
        };
    }
    
    static drawRotatedArrowHead(endX, endY, angle, color, size) {
        // Draw arrow head rotated to match the curve angle
        const arrowHead = new paper.Path({
            segments: [
                [endX, endY],
                [endX - size * Math.cos(angle - Math.PI / 6), endY - size * Math.sin(angle - Math.PI / 6)],
                [endX - size * Math.cos(angle + Math.PI / 6), endY - size * Math.sin(angle + Math.PI / 6)]
            ],
            fillColor: color,
            closed: true
        });
        
        return arrowHead;
    }
    
    static drawBezierArrowHead(endX, endY, ctrlX, ctrlY, color, size) {
        // Calculate angle of arrow based on control point direction
        const dx = endX - ctrlX;
        const dy = endY - ctrlY;
        const angle = Math.atan2(dy, dx);
        
        // Create arrow head triangle
        const arrowHead = new paper.Path({
            segments: [
                [endX, endY],
                [endX - size * Math.cos(angle - Math.PI / 6), endY - size * Math.sin(angle - Math.PI / 6)],
                [endX - size * Math.cos(angle + Math.PI / 6), endY - size * Math.sin(angle + Math.PI / 6)]
            ],
            fillColor: color,
            closed: true
        });
        
        return arrowHead;
    }
    
    static drawSmallCross(xPos, yPos) {
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
        
        // Return both lines (no Group needed for rendering)
        return { hLine, vLine };
    }
    
    static drawArrowHead(x, y, direction, size = 8) {
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
    
    static getSignalYPosition(app, signalIndex) {
        // Use unified row system
        const rowIndex = app.rowManager.signalIndexToRowIndex(signalIndex);
        return app.rowManager.getRowYPosition(rowIndex);
    }
    
    // ========================================
    // Text and Counter Row Rendering
    // ========================================
    
    static drawTextRow(app, textData, rowIndex) {
        const yPos = app.rowManager.getRowYPosition(rowIndex);
        
        // Draw text in the waveform area (centered vertically in the row)
        if (textData.text) {
            const xPos = app.config.nameColumnWidth + (textData.xOffset || 10);
            const textObj = new paper.PointText({
                point: [xPos, yPos + app.config.rowHeight / 2 + 5],
                content: textData.text,
                fillColor: textData.color || 'black',
                fontFamily: textData.fontFamily || 'Arial',
                fontSize: textData.fontSize || 14,
                justification: 'left'
            });
            
            // Add metadata for click detection
            textObj.data = { type: 'text', rowIndex: rowIndex };
        }
        // If text is empty, row remains blank
    }
    
    static drawCounterRow(app, counterData, rowIndex) {
        const yPos = app.rowManager.getRowYPosition(rowIndex);
        
        // Parse counter values and generate labels for each cycle
        const labels = TimingGenRendering.generateCounterLabels(counterData, app.config.cycles);
        
        // Draw each label in its corresponding cycle
        for (let cycle = 0; cycle < app.config.cycles; cycle++) {
            const label = labels[cycle];
            if (label !== null && label !== undefined && label !== '') {
                const xPos = app.config.nameColumnWidth + cycle * app.config.cycleWidth + app.config.cycleWidth / 2;
                const text = new paper.PointText({
                    point: [xPos, yPos + app.config.rowHeight / 2 + 5],
                    content: String(label),
                    fillColor: 'black',
                    fontFamily: 'Arial',
                    fontSize: 14,
                    justification: 'center'
                });
            }
        }
    }
    
    static generateCounterLabels(counterData, totalCycles) {
        // Initialize all cycles with empty string
        const labels = new Array(totalCycles).fill('');
        
        if (!counterData.values || counterData.values.length === 0) {
            return labels;
        }
        
        // Sort values by cycle
        const sorted = [...counterData.values].sort((a, b) => a.cycle - b.cycle);
        
        // Process each value entry
        for (let i = 0; i < sorted.length; i++) {
            const entry = sorted[i];
            const startCycle = entry.cycle;
            const startValue = entry.value;
            
            // Check if value is null/undefined (means stop counting)
            // Note: We support both actual null/undefined and string representations
            // for backward compatibility with user-entered data
            const isStopValue = startValue === null || 
                               startValue === undefined || 
                               startValue === 'null' || 
                               startValue === 'undef';
            
            if (isStopValue) {
                // Stop counting - leave empty
                if (startCycle >= 0 && startCycle < totalCycles) {
                    labels[startCycle] = '';
                }
                continue;
            }
            
            // Determine end cycle (either next entry or end of cycles)
            const endCycle = (i < sorted.length - 1) ? sorted[i + 1].cycle : totalCycles;
            
            // Check if value is numeric or alphanumeric
            const match = String(startValue).match(/^([a-zA-Z]*)(\d+)$/);
            
            if (match) {
                // Alphanumeric format: extract prefix and number
                const prefix = match[1];
                let num = parseInt(match[2]);
                
                // Generate incremental labels
                for (let cycle = startCycle; cycle < endCycle && cycle < totalCycles; cycle++) {
                    if (cycle >= 0) {
                        labels[cycle] = prefix + num;
                        num++;
                    }
                }
            } else {
                // Not numeric - just repeat the value
                for (let cycle = startCycle; cycle < endCycle && cycle < totalCycles; cycle++) {
                    if (cycle >= 0) {
                        if (startValue === "-") {
                            labels[cycle] = "";
                        } else {
                            labels[cycle] = startValue;
                        }
                    }
                }
            }
        }
        
        return labels;
    }
    
    // ========================================
    // AC Table Drawing
    // ========================================
    
    static drawACTable(app, tableData, tableName, rowIndex) {
        const yPos = app.rowManager.getRowYPosition(rowIndex);
        const tableWidth = 900; // Fixed total width
        const cellPadding = 5;
        const rowHeight = 25;
        const titleHeight = 30;
        const headerHeight = 25;
        
        // Calculate column positions based on column widths
        const colWidths = tableData.columnWidths || [400, 100, 100, 100, 100, 100];
        const colPositions = [0];
        for (let i = 0; i < colWidths.length; i++) {
            colPositions.push(colPositions[i] + colWidths[i]);
        }
        
        const startX = app.config.nameColumnWidth + 10;
        const startY = yPos;
        
        // Draw title
        const titleText = new paper.PointText({
            point: [startX, startY + titleHeight / 2 + 5],
            content: tableData.title || 'Read Cycle',
            fillColor: tableData.titleColor || '#000000',
            fontFamily: tableData.titleFont || 'Arial',
            fontSize: tableData.titleSize || 14,
            fontWeight: 'bold'
        });
        titleText.data = { 
            type: 'ac-table-title', 
            tableName: tableName 
        };
        
        // Draw table border
        const tableHeight = titleHeight + headerHeight + (tableData.rows.length * rowHeight) + 100; // Extra for notes
        const tableBorder = new paper.Path.Rectangle({
            point: [startX, startY + titleHeight],
            size: [tableWidth, tableHeight],
            strokeColor: '#000000',
            strokeWidth: 1
        });
        tableBorder.data = { 
            type: 'ac-table-border', 
            tableName: tableName 
        };
        
        // Draw header row background
        const headerBg = new paper.Path.Rectangle({
            point: [startX, startY + titleHeight],
            size: [tableWidth, headerHeight],
            fillColor: '#f0f0f0',
            strokeColor: '#000000',
            strokeWidth: 1
        });
        headerBg.data = { 
            type: 'ac-table-header-bg', 
            tableName: tableName 
        };
        
        // Draw column dividers in header
        const headers = ['Parameter', 'Symbol', 'Min.', 'Max.', 'Unit', 'Note'];
        for (let i = 0; i <= colWidths.length; i++) {
            const x = startX + colPositions[i];
            const divider = new paper.Path.Line({
                from: [x, startY + titleHeight],
                to: [x, startY + titleHeight + headerHeight],
                strokeColor: '#000000',
                strokeWidth: 1
            });
            divider.data = { 
                type: 'ac-table-col-divider', 
                tableName: tableName,
                colIndex: i
            };
            
            // Draw header text
            if (i < headers.length) {
                const headerText = new paper.PointText({
                    point: [x + cellPadding, startY + titleHeight + headerHeight / 2 + 5],
                    content: headers[i],
                    fillColor: tableData.headerColor || '#000000',
                    fontFamily: tableData.headerFont || 'Arial',
                    fontSize: tableData.headerSize || 12,
                    fontWeight: 'bold'
                });
                headerText.data = { 
                    type: 'ac-table-header-text', 
                    tableName: tableName,
                    colIndex: i
                };
            }
        }
        
        // Draw data rows
        let currentY = startY + titleHeight + headerHeight;
        tableData.rows.forEach((row, dataRowIndex) => {
            const actualRowHeight = rowHeight * (row.rowSpan || 1);
            const isDoubleRow = (row.rowSpan || 1) === 2;
            
            // Draw row border
            const rowBorder = new paper.Path.Rectangle({
                point: [startX, currentY],
                size: [tableWidth, actualRowHeight],
                strokeColor: '#000000',
                strokeWidth: 1
            });
            rowBorder.data = { 
                type: 'ac-table-row-border', 
                tableName: tableName,
                rowIndex: dataRowIndex
            };
            
            // Draw column dividers for this row
            for (let i = 0; i <= colWidths.length; i++) {
                const x = startX + colPositions[i];
                const divider = new paper.Path.Line({
                    from: [x, currentY],
                    to: [x, currentY + actualRowHeight],
                    strokeColor: '#000000',
                    strokeWidth: 1
                });
                divider.data = { 
                    type: 'ac-table-col-divider', 
                    tableName: tableName,
                    rowIndex: dataRowIndex,
                    colIndex: i
                };
            }
            
            // If double-row, draw horizontal dividers for columns 1-5 (not parameter column)
            if (isDoubleRow) {
                const midY = currentY + rowHeight;
                for (let i = 1; i < colWidths.length; i++) {
                    const fromX = startX + colPositions[i];
                    const toX = startX + colPositions[i + 1];
                    const midDivider = new paper.Path.Line({
                        from: [fromX, midY],
                        to: [toX, midY],
                        strokeColor: '#000000',
                        strokeWidth: 1
                    });
                    midDivider.data = { 
                        type: 'ac-table-mid-divider', 
                        tableName: tableName,
                        rowIndex: dataRowIndex
                    };
                }
            }
            
            // Draw cell contents
            const cellData = [
                row.parameter || '',
                row.symbol || '',
                row.min || '',
                row.max || '',
                row.unit || '',
                row.note || ''
            ];
            
            cellData.forEach((content, colIndex) => {
                const cellWidth = colWidths[colIndex];
                const cellX = startX + colPositions[colIndex];
                // For double-row: parameter (col 0) uses full height, others use top half
                const cellHeight = isDoubleRow && colIndex > 0 ? rowHeight : actualRowHeight;
                const cellY = currentY; // Y position is always currentY for the cell start
                
                if (content) {
                    // Draw text for non-empty cells
                    const x = cellX + cellPadding;
                    const yOffset = isDoubleRow && colIndex > 0 ? rowHeight / 2 : actualRowHeight / 2;
                    const y = currentY + yOffset + 5;
                    
                    const cellText = new paper.PointText({
                        point: [x, y],
                        content: String(content),
                        fillColor: row.color || tableData.cellColor || '#000000',
                        fontFamily: row.fontFamily || tableData.cellFont || 'Arial',
                        fontSize: row.fontSize || tableData.cellSize || 12
                    });
                    cellText.data = { 
                        type: 'ac-table-cell', 
                        tableName: tableName,
                        rowIndex: dataRowIndex,
                        colIndex: colIndex,
                        measureName: row.measureName,
                        subRow: isDoubleRow && colIndex > 0 ? 0 : undefined
                    };
                } else {
                    // Draw almost transparent box for empty cells (slightly smaller than cell)
                    const padding = 2;
                    const boxX = cellX + padding;
                    const boxY = cellY + padding;
                    const boxWidth = cellWidth - (2 * padding);
                    const boxHeight = cellHeight - (2 * padding);
                    
                    const emptyBox = new paper.Path.Rectangle({
                        point: [boxX, boxY],
                        size: [boxWidth, boxHeight],
                        fillColor: new paper.Color(0, 0, 0, 0.02), // Almost transparent
                        strokeColor: null
                    });
                    emptyBox.data = { 
                        type: 'ac-table-cell', 
                        tableName: tableName,
                        rowIndex: dataRowIndex,
                        colIndex: colIndex,
                        measureName: row.measureName,
                        isEmpty: true,
                        subRow: isDoubleRow && colIndex > 0 ? 0 : undefined
                    };
                }
                
                // For double-row cells (except parameter column), also create clickable area for bottom sub-row
                if (isDoubleRow && colIndex > 0) {
                    const padding = 2;
                    const boxX = cellX + padding;
                    const boxY = currentY + rowHeight + padding; // Bottom half starts at rowHeight offset
                    const boxWidth = cellWidth - (2 * padding);
                    const boxHeight = rowHeight - (2 * padding);
                    
                    const bottomSubRowBox = new paper.Path.Rectangle({
                        point: [boxX, boxY],
                        size: [boxWidth, boxHeight],
                        fillColor: new paper.Color(0, 0, 0, 0.02), // Almost transparent
                        strokeColor: null
                    });
                    bottomSubRowBox.data = { 
                        type: 'ac-table-cell', 
                        tableName: tableName,
                        rowIndex: dataRowIndex,
                        colIndex: colIndex,
                        measureName: row.measureName,
                        isEmpty: true,
                        subRow: 1  // Bottom sub-row
                    };
                }
            });
            
            currentY += actualRowHeight;
        });
        
        // Draw note field at the bottom
        const noteFieldY = currentY;
        const noteFieldHeight = 20 + (tableData.notes.length * 20);
        
        // Draw "Note" label
        const noteLabel = new paper.PointText({
            point: [startX + cellPadding, noteFieldY + 15],
            content: 'Note',
            fillColor: '#000000',
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'bold'
        });
        noteLabel.data = { 
            type: 'ac-table-note-label', 
            tableName: tableName 
        };
        
        // Draw note rows
        const uniqueNotes = new Set();
        tableData.rows.forEach(row => {
            if (row.note) {
                const numbers = row.note.split(',').map(n => n.trim()).filter(n => n);
                numbers.forEach(num => uniqueNotes.add(num));
            }
        });
        
        const sortedNotes = Array.from(uniqueNotes).sort((a, b) => parseInt(a) - parseInt(b));
        sortedNotes.forEach((noteNum, index) => {
            const noteY = noteFieldY + 15 + (index * 20);
            
            // Get note data for font properties
            const noteData = tableData.notes.find(n => n.number === noteNum);
            
            // Note number
            const noteNumText = new paper.PointText({
                point: [startX + 60, noteY],
                content: noteNum,
                fillColor: '#000000',
                fontFamily: 'Arial',
                fontSize: 11
            });
            noteNumText.data = { 
                type: 'ac-table-note-num', 
                tableName: tableName,
                noteNum: noteNum
            };
            
            // Note text (find in notes array)
            const noteTextContent = noteData ? noteData.text : '';
            
            if (noteTextContent) {
                const noteTextObj = new paper.PointText({
                    point: [startX + 90, noteY],
                    content: noteTextContent,
                    fillColor: (noteData && noteData.color) || '#000000',
                    fontFamily: (noteData && noteData.fontFamily) || 'Arial',
                    fontSize: (noteData && noteData.fontSize) || 11
                });
                noteTextObj.data = { 
                    type: 'ac-table-note-text', 
                    tableName: tableName,
                    noteNum: noteNum
                };
            }
        });
    }
}
