// Timing Gen 3 - Rendering Module
// Version 3.1.0
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
        
        // Draw header with cycle numbers
        TimingGenRendering.drawHeader(app);
        
        // Draw rows (signals and measures) from unified rows array
        if (app.rows && app.rows.length > 0) {
            app.rows.forEach((row, rowIndex) => {
                if (row.type === 'signal') {
                    // Draw signal
                    app.signalLayer.activate();
                    const signalIndex = app.rowManager.rowIndexToSignalIndex(rowIndex);
                    if (signalIndex >= 0) {
                        TimingGenRendering.drawSignal(app, row.data, signalIndex);
                    }
                } else if (row.type === 'measure') {
                    // Draw measures in this row
                    app.measureLayer.activate();
                    row.data.forEach((measure) => {
                        TimingGenRendering.drawMeasure(app, measure, rowIndex);
                    });
                }
            });
        } else {
            // Fallback to old system (signals + measures arrays)
            app.signalLayer.activate();
            app.signals.forEach((signal, index) => {
                TimingGenRendering.drawSignal(app, signal, index);
            });
            
            app.measureLayer.activate();
            app.measures.forEach((measure, index) => {
                TimingGenRendering.drawMeasure(app, measure, index);
            });
        }
        
        paper.view.draw();
    }
    
    static drawGrid(app) {
        // Calculate total rows
        let totalRows;
        if (app.rowManager && app.rowManager.isUsingNewSystem()) {
            totalRows = app.rowManager.getTotalRows();
        } else {
            // Old system: signals + blank rows
            const blankRowCount = app.blankRows ? app.blankRows.length : 0;
            totalRows = app.signals.length + blankRowCount;
        }
        
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
            let yPos;
            if (app.rowManager && app.rowManager.isUsingNewSystem()) {
                yPos = app.rowManager.getRowYPosition(idx);
            } else {
                // Old system
                yPos = TimingGenRendering.getSignalYPosition(app, idx);
            }
            
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
    
    static drawMeasure(app, measure, measureRowIndex) {
        // Get coordinates from measure data (signal row indices + cycles)
        const coords = app.getMeasureCoordinates(measure);
        
        const rowHeight = app.config.rowHeight;
        const headerHeight = app.config.headerHeight;
        
        // Calculate row boundaries based on signal row positions
        const row1Pos = app.rowManager.getRowYPosition(measure.signal1Row);
        const row2Pos = app.rowManager.getRowYPosition(measure.signal2Row);
        
        // Determine the extent of vertical lines
        const lineStart = Math.min(row1Pos, row2Pos);
        const lineEnd = Math.max(row1Pos, row2Pos) + rowHeight;
        
        // Draw first vertical line
        const line1 = new paper.Path.Line({
            from: [coords.x1, lineStart],
            to: [coords.x1, lineEnd],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        // Draw small cross at first point
        const cross1 = TimingGenRendering.drawSmallCross(coords.x1, coords.y1);
        
        // Draw second vertical line
        const line2 = new paper.Path.Line({
            from: [coords.x2, lineStart],
            to: [coords.x2, lineEnd],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        // Draw small cross at second point
        const cross2 = TimingGenRendering.drawSmallCross(coords.x2, coords.y2);
        
        // Calculate arrow Y position based on measureRow
        // Use the measure row index directly from unified system
        const arrowY = app.rowManager.getRowYPosition(measure.measureRow) + rowHeight / 2;
        
        // Draw double-headed arrows
        const arrowSize = 8;
        const spacing = Math.abs(coords.x2 - coords.x1);
        // Default to outward arrows, only use inward if spacing is too small (< 30px for arrow heads)
        const isInward = spacing < 30;
        
        // Horizontal line connecting the arrows
        const hLine = new paper.Path.Line({
            from: [Math.min(coords.x1, coords.x2), arrowY],
            to: [Math.max(coords.x1, coords.x2), arrowY],
            strokeColor: '#FF0000',
            strokeWidth: 2
        });
        
        // Draw arrow heads using the helper function
        if (isInward) {
            // Arrows pointing inward (towards each other)
            TimingGenRendering.drawArrowHead(Math.min(coords.x1, coords.x2), arrowY, 'right', arrowSize);
            TimingGenRendering.drawArrowHead(Math.max(coords.x1, coords.x2), arrowY, 'left', arrowSize);
        } else {
            // Arrows pointing outward (away from each other)
            TimingGenRendering.drawArrowHead(Math.min(coords.x1, coords.x2), arrowY, 'left', arrowSize);
            TimingGenRendering.drawArrowHead(Math.max(coords.x1, coords.x2), arrowY, 'right', arrowSize);
        }
        
        // Draw text label if it exists
        if (measure.text) {
            const textX = Math.max(coords.x1, coords.x2) + 10;
            const text = new paper.PointText({
                point: [textX, arrowY + 5],
                content: measure.text,
                fillColor: '#FF0000',
                fontFamily: 'Arial',
                fontSize: 12,
                fontWeight: 'bold'
            });
            
            // Store measure index in text for right-click handling
            text.data = { measureIndex: index };
            
            // Make text interactive for right-click
            text.onMouseDown = function(event) {
                if (event.event.button === 2) {
                    app.currentEditingMeasure = this.data.measureIndex;
                }
            };
        }
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
        // Use row manager for unified row system
        if (app.rowManager && app.rowManager.isUsingNewSystem()) {
            const rowIndex = app.rowManager.signalIndexToRowIndex(signalIndex);
            return app.rowManager.getRowYPosition(rowIndex);
        }
        
        // Fallback to old system: Calculate Y position accounting for blank rows
        let blankRowsAbove = 0;
        if (app.blankRows) {
            blankRowsAbove = app.blankRows.filter(rowIndex => rowIndex <= signalIndex).length;
        }
        return app.config.headerHeight + (signalIndex + blankRowsAbove) * app.config.rowHeight;
    }
}
