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
        
        // Draw the line path, skipping X regions
        const path = new paper.Path();
        path.strokeColor = app.config.signalColor;
        path.strokeWidth = 2;
        
        let pathStarted = false;
        
        for (let i = 0; i <= app.config.cycles; i++) {
            const x = app.config.nameColumnWidth + i * app.config.cycleWidth;
            
            const value = (i < app.config.cycles) ? app.getBitValueAtCycle(signal, i) : app.getBitValueAtCycle(signal, app.config.cycles - 1);
            const currentY = (value === 1) ? highY : (value === 'Z') ? midY : lowY;
            
            if (!pathStarted) {
                // Start or restart the path
                path.moveTo(new paper.Point(x, currentY));
                pathStarted = true;
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
                    const prevY = (prevValue === 1) ? highY : (prevValue === 'Z') ? midY : lowY;
                    
                    // Check if value actually changed
                    if (value !== prevValue) {
                        // Draw transition
                        path.lineTo(new paper.Point(x, prevY));
                        path.lineTo(new paper.Point(x, currentY));
                    } else {
                        // Same value, just continue
                        path.lineTo(new paper.Point(x, currentY));
                    }
                } else {
                    // No previous non-X cycle, just draw to current
                    path.lineTo(new paper.Point(x, currentY));
                }
            }
        }
        
        // Draw X patterns as continuous spans
        xSpans.forEach(span => {
            const x1 = app.config.nameColumnWidth + span.start * app.config.cycleWidth;
            const x2 = app.config.nameColumnWidth + (span.end + 1) * app.config.cycleWidth;
            TimingGenRendering.drawXPattern(x1, x2, baseY, highY, lowY, app.config.signalColor);
        });
    }
    
    static drawBusWaveform(app, signal, baseY) {
        const topY = baseY + 20;
        const bottomY = baseY + app.config.rowHeight - 20;
        const slew = app.config.slew;
        
        // First pass: identify value spans
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
            
            const x1 = app.config.nameColumnWidth + spanStart * app.config.cycleWidth;
            const x2 = app.config.nameColumnWidth + (spanEnd + 1) * app.config.cycleWidth;
            
            if (value === 'Z') {
                // High-Z state - draw middle line
                const midY = baseY + app.config.rowHeight / 2;
                const line = new paper.Path.Line({
                    from: [x1, midY],
                    to: [x2, midY],
                    strokeColor: app.config.signalColor,
                    strokeWidth: 2
                });
            } else if (value === 'X') {
                // Unknown state - draw X pattern for the entire span
                TimingGenRendering.drawXPattern(x1, x2, baseY, topY, bottomY, app.config.signalColor);
            } else {
                // Valid value - draw bus shape for the entire span
                const path = new paper.Path();
                path.strokeColor = app.config.signalColor;
                path.strokeWidth = 2;
                path.fillColor = '#e8f4f8';
                
                // Check if there's a transition at the end
                const hasNextValue = (spanEnd + 1 < app.config.cycles && signal.values[spanEnd + 1] !== undefined);
                
                path.moveTo(new paper.Point(x1 + slew, topY));
                
                if (hasNextValue) {
                    // Transition at end
                    path.lineTo(new paper.Point(x2 - slew, topY));
                    path.lineTo(new paper.Point(x2, topY + (bottomY - topY) / 2));
                    path.lineTo(new paper.Point(x2 - slew, bottomY));
                } else {
                    path.lineTo(new paper.Point(x2, topY));
                    path.lineTo(new paper.Point(x2, bottomY));
                }
                
                path.lineTo(new paper.Point(x1 + slew, bottomY));
                path.lineTo(new paper.Point(x1, bottomY + (topY - bottomY) / 2));
                path.closePath();
                
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
