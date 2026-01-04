// Minimal Paper.js shim for testing purposes
// This provides just enough Paper.js API to make the timing_gen_3 app work
// For production, use the real Paper.js library from: https://paperjs.org/

(function() {
    'use strict';
    
    // Global paper object
    window.paper = {};
    
    let canvas, ctx, layers = [], currentLayer = null;
    
    // Point class
    class Point {
        constructor(x, y) {
            if (Array.isArray(x)) {
                this.x = x[0];
                this.y = x[1];
            } else {
                this.x = x;
                this.y = y || 0;
            }
        }
    }
    
    // Size class
    class Size {
        constructor(width, height) {
            this.width = width;
            this.height = height;
        }
    }
    
    // Layer class
    class Layer {
        constructor() {
            this.children = [];
            this.active = false;
            layers.push(this);
        }
        
        activate() {
            currentLayer = this;
            this.active = true;
            layers.forEach(l => {
                if (l !== this) l.active = false;
            });
        }
        
        removeChildren() {
            this.children = [];
        }
    }
    
    // Base Item class
    class Item {
        constructor(props = {}) {
            this.strokeColor = props.strokeColor || null;
            this.strokeWidth = props.strokeWidth || 1;
            this.fillColor = props.fillColor || null;
            if (currentLayer) {
                currentLayer.children.push(this);
            }
        }
        
        draw() {
            // Override in subclasses
        }
    }
    
    // Path class
    class Path extends Item {
        constructor(props = {}) {
            super(props);
            this.segments = [];
            this.closed = false;
        }
        
        moveTo(point) {
            this.segments = [{point: point, type: 'moveTo'}];
        }
        
        lineTo(point) {
            this.segments.push({point: point, type: 'lineTo'});
        }
        
        closePath() {
            this.closed = true;
        }
        
        draw() {
            if (this.segments.length === 0) return;
            
            ctx.beginPath();
            
            this.segments.forEach((seg, i) => {
                const p = seg.point;
                if (i === 0 || seg.type === 'moveTo') {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            });
            
            if (this.closed) {
                ctx.closePath();
            }
            
            if (this.fillColor) {
                ctx.fillStyle = this.fillColor;
                ctx.fill();
            }
            
            if (this.strokeColor) {
                ctx.strokeStyle = this.strokeColor;
                ctx.lineWidth = this.strokeWidth;
                ctx.stroke();
            }
        }
    }
    
    // Path.Line
    Path.Line = function(props) {
        const path = new Path(props);
        if (props.from) {
            path.moveTo(props.from instanceof Point ? props.from : new Point(props.from));
        }
        if (props.to) {
            path.lineTo(props.to instanceof Point ? props.to : new Point(props.to));
        }
        return path;
    };
    
    // Path.Rectangle
    Path.Rectangle = function(props) {
        const path = new Path(props);
        const point = props.point instanceof Point ? props.point : new Point(props.point);
        const size = props.size instanceof Size ? props.size : new Size(props.size[0], props.size[1]);
        
        path.moveTo(new Point(point.x, point.y));
        path.lineTo(new Point(point.x + size.width, point.y));
        path.lineTo(new Point(point.x + size.width, point.y + size.height));
        path.lineTo(new Point(point.x, point.y + size.height));
        path.closePath();
        
        return path;
    };
    
    // PointText class
    class PointText extends Item {
        constructor(props = {}) {
            super(props);
            this.point = props.point instanceof Point ? props.point : new Point(props.point);
            this.content = props.content || '';
            this.fontSize = props.fontSize || 12;
            this.fontFamily = props.fontFamily || 'Arial';
            this.fontWeight = props.fontWeight || 'normal';
            this.justification = props.justification || 'left';
        }
        
        draw() {
            ctx.save();
            ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
            ctx.fillStyle = this.fillColor || 'black';
            ctx.textAlign = this.justification;
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(this.content, this.point.x, this.point.y);
            ctx.restore();
        }
    }
    
    // Tool class
    class Tool {
        constructor() {
            this.onMouseDown = null;
            
            canvas.addEventListener('mousedown', (e) => {
                if (this.onMouseDown) {
                    const rect = canvas.getBoundingClientRect();
                    const point = new Point(e.clientX - rect.left, e.clientY - rect.top);
                    this.onMouseDown({point: point, event: e});
                }
            });
        }
    }
    
    // View class
    const view = {
        viewSize: new Size(800, 600),
        size: new Size(800, 600),
        draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            layers.forEach(layer => {
                layer.children.forEach(item => item.draw());
            });
        }
    };
    
    // Project class
    const project = {
        exportSVG(options = {}) {
            // Generate SVG from all layers
            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`;
            svg += `<rect width="100%" height="100%" fill="white"/>`;
            
            layers.forEach(layer => {
                layer.children.forEach(item => {
                    if (item instanceof Path) {
                        if (item.segments.length > 0) {
                            let d = '';
                            item.segments.forEach((seg, i) => {
                                const p = seg.point;
                                if (i === 0 || seg.type === 'moveTo') {
                                    d += `M ${p.x} ${p.y} `;
                                } else {
                                    d += `L ${p.x} ${p.y} `;
                                }
                            });
                            if (item.closed) {
                                d += 'Z';
                            }
                            
                            const stroke = item.strokeColor ? `stroke="${item.strokeColor}"` : '';
                            const strokeWidth = item.strokeWidth ? `stroke-width="${item.strokeWidth}"` : '';
                            const fill = item.fillColor ? `fill="${item.fillColor}"` : 'fill="none"';
                            
                            svg += `<path d="${d}" ${stroke} ${strokeWidth} ${fill}/>`;
                        }
                    } else if (item instanceof PointText) {
                        const x = item.point.x;
                        const y = item.point.y;
                        const anchor = item.justification === 'center' ? 'middle' : item.justification === 'right' ? 'end' : 'start';
                        const fontWeight = item.fontWeight !== 'normal' ? `font-weight="${item.fontWeight}"` : '';
                        
                        svg += `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${item.fontFamily}" font-size="${item.fontSize}" ${fontWeight} fill="${item.fillColor || 'black'}">${item.content}</text>`;
                    }
                });
            });
            
            svg += '</svg>';
            
            return options.asString ? svg : null;
        }
    };
    
    // Setup function
    paper.setup = function(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        layers = [];
        currentLayer = null;
        view.viewSize = new Size(canvas.width, canvas.height);
        view.size = view.viewSize;
    };
    
    // Exports
    paper.Point = Point;
    paper.Size = Size;
    paper.Layer = Layer;
    paper.Path = Path;
    paper.PointText = PointText;
    paper.Tool = Tool;
    paper.view = view;
    paper.project = project;
    
    console.log('Paper.js shim loaded - using minimal implementation for testing');
})();
