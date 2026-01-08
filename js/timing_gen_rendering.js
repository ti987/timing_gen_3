// Timing Gen 3 - Rendering Module
// Version 3.0.1
// Handles all waveform rendering functionality using Paper.js

class TimingGenRendering {
    static render(app) {
        // Clear all layers
        app.backgroundLayer.removeChildren();
        app.gridLayer.removeChildren();
        app.signalLayer.removeChildren();
        
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
        
        // Draw signals
        app.signalLayer.activate();
        app.signals.forEach((signal, index) => {
            TimingGenRendering.drawSignal(app, signal, index);
        });
        
        paper.view.draw();
    }
    
    static drawGrid(app) {
        const maxHeight = app.config.headerHeight + app.signals.length * app.config.rowHeight;
        
        // Vertical lines (cycle dividers) - draw to max height based on signals
        for (let i = 0; i <= app.config.cycles; i++) {
            const x = app.config.nameColumnWidth + i * app.config.cycleWidth;
            const line = new paper.Path.Line({
                from: [x, 0],
                to: [x, maxHeight],
                strokeColor: app.config.gridColor,
                strokeWidth: 1
            });
        }
        
        // Horizontal lines (signal dividers)
        for (let i = 0; i <= app.signals.length; i++) {
            const y = app.config.headerHeight + i * app.config.rowHeight;
            const line = new paper.Path.Line({
                from: [0, y],
                to: [app.config.nameColumnWidth + app.config.cycles * app.config.cycleWidth, y],
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
        for (let i = 0; i < app.config.cycles; i++) {
            const x = app.config.nameColumnWidth + i * app.config.cycleWidth + app.config.cycleWidth / 2;
            const y = 30;
            
            const text = new paper.PointText({
                point: [x, y],
                content: i.toString(),
                fillColor: 'black',
                fontFamily: 'Arial',
                fontSize: 12,
                justification: 'center'
            });
        }
    }
    
    static drawSignal(app, signal, index) {
        const y = app.config.headerHeight + index * app.config.rowHeight;
        
        // Draw signal name
        const nameText = new paper.PointText({
            point: [app.config.nameColumnWidth - 10, y + app.config.rowHeight / 2 + 5],
            content: signal.name,
            fillColor: 'black',
            fontFamily: 'Arial',
            fontSize: 14,
            fontWeight: 'bold',
            justification: 'right'
        });
        
        // Draw waveform
        if (signal.type === 'clock') {
            TimingGenRendering.drawClockWaveform(app, signal, y);
        } else if (signal.type === 'bit') {
            TimingGenRendering.drawBitWaveform(app, signal, y);
        } else if (signal.type === 'bus') {
            TimingGenRendering.drawBusWaveform(app, signal, y);
        }
    }
    
    static drawClockWaveform(app, signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + app.config.rowHeight - 20;
        
        const path = new paper.Path();
        path.strokeColor = app.config.signalColor;
        path.strokeWidth = 2;
        
        for (let i = 0; i < app.config.cycles; i++) {
            const x1 = app.config.nameColumnWidth + i * app.config.cycleWidth;
            const x2 = x1 + app.config.cycleWidth / 2;
            const x3 = x1 + app.config.cycleWidth;
            
            // Rising edge at start of cycle
            if (i === 0) {
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
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            path.fillColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
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
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            path.fillColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
        }
        path.strokeColor = null; // No stroke for bus signals
    }
    
    static drawBitWaveform(app, signal, baseY) {
        const highY = baseY + 20;
        const lowY = baseY + app.config.rowHeight - 20;
        const midY = baseY + app.config.rowHeight / 2;
        
        // First, identify all X spans
        const xSpans = [];
        let i = 0;
        while (i < app.config.cycles) {
            const value = app.getBitValueAtCycle(signal, i);
            if (value === 'X') {
                const spanStart = i;
                let spanEnd = i;
                // Find the end of this X span
                for (let j = i + 1; j < app.config.cycles; j++) {
                    const nextValue = app.getBitValueAtCycle(signal, j);
                    if (nextValue !== 'X') {
                        spanEnd = j - 1;
                        break;
                    }
                    if (j === app.config.cycles - 1) {
                        spanEnd = j;
                    }
                }
                xSpans.push({ start: spanStart, end: spanEnd });
                i = spanEnd + 1;
            } else {
                i++;
            }
        }
        
        // Draw the line path with slew transitions and delays
        const path = new paper.Path();
        path.strokeColor = app.config.signalColor;
        path.strokeWidth = 2;
        
        let pathStarted = false;
        let prevX = null;
        let prevY = null;
        
        for (let i = 0; i <= app.config.cycles; i++) {
            // Get delay info object for this cycle (contains min, max, color)
            const delayInfo = i < app.config.cycles && i > 0 ?
                app.getEffectiveDelay(signal, i) : { min: 0, max: 0, color: app.config.delayColor };
            
            // Get slew for this cycle
            const slew = i < app.config.cycles ? app.getEffectiveSlew(signal, i) : app.config.slew;
            
            // Base x position at grid line
            const baseX = app.config.nameColumnWidth + i * app.config.cycleWidth;
            // Actual transition point after minimum delay
            const x = baseX + delayInfo.min;
            
            const value = (i < app.config.cycles) ? app.getBitValueAtCycle(signal, i) : app.getBitValueAtCycle(signal, app.config.cycles - 1);
            const currentY = (value === 1) ? highY : (value === 'Z') ? midY : lowY;
            
            if (!pathStarted) {
                // Start or restart the path
                path.moveTo(new paper.Point(x, currentY));
                pathStarted = true;
                prevX = x;
                prevY = currentY;
            } else {
                // Continue the path
                const prevCycle = i - 1;
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
                        path.lineTo(new paper.Point(x, prevValueY));
                        // Then draw sloped to after transition
                        path.lineTo(new paper.Point(x + slew, currentY));
                    } else if (app.getBitValueAtCycle(signal,i-1) === 'X') {
                        // Draw delay uncertainty parallelogram if there's uncertainty
                        if (delayInfo.max > delayInfo.min) {
                            TimingGenRendering.drawBitDelayUncertainty(baseX, delayInfo, 'X', [highY, lowY, currentY], slew);
                        }
                        // Draw transition with slew
                        // First, draw horizontal line at transition
                        path.lineTo(new paper.Point(x, prevValueY));
                        // Then draw sloped to after transition
                        path.lineTo(new paper.Point(x + slew, currentY));
                        

                    } else {
                        // Same value, just continue
                        path.lineTo(new paper.Point(x, currentY));
                    }
                } else {
                    // No previous non-X cycle, just draw to current
                    path.lineTo(new paper.Point(x, currentY));
                }
                
                prevX = x;
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

            const slew = i < app.config.cycles ? app.getEffectiveSlew(signal, span.start) : app.config.slew;

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
        let i = 0;
        while (i < app.config.cycles) {
            const value = app.getBusValueAtCycle(signal, i);
            
            // Find where this value span starts and ends
            let spanStart = i;
            let spanEnd = i;
            
            // Find the end of this value span
            for (let j = i + 1; j < app.config.cycles; j++) {
                if (signal.values[j] !== undefined) {
                    spanEnd = j - 1;
                    break;
                }
                if (j === app.config.cycles - 1) {
                    spanEnd = j;
                }
            }
            
            if (spanEnd === i && i < app.config.cycles - 1 && signal.values[i + 1] === undefined) {
                spanEnd = app.config.cycles - 1;
            }
            
            // Get delay info object for this cycle (contains min, max, color)
            const delayInfo = app.getEffectiveDelay(signal, spanStart);
            
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
                    from: [x1+slew/2, midY],
                    to: [x2, midY],
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
            i = spanEnd + 1;
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
}
