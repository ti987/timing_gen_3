# Timing Gen 3 - Interactive Digital Logic Waveform Editor

An interactive web-based digital logic waveform editor for creating and editing timing diagrams. This tool lets users quickly draw signal waveforms, save them for later editing, and export to SVG for documentation.

## Features

- **Multiple Signal Types**: Clock, Bit, and Bus signals
- **Widget Rows**: Text labels and Counter displays for documentation
- **Interactive Editing**:
  - Add signals with custom names and types
  - Add text rows for labels and annotations
  - Add counter rows for cycle numbering (with custom formats like "t1", "t2", etc.)
  - Toggle bit signal states by clicking
  - Set bus values with radix support (hex, dec, string, X, Z)
  - Right-click context menus for editing
  - Drag-and-drop signal reordering
- **Waveform Rendering**:
  - Clock signals with square waves
  - Bit signals with transitions, X (unknown), and Z (high-impedance) states
  - Bus signals with slew transitions and value labels
  - Text rows for annotations in waveform area
  - Counter rows with incremental or custom numbering
- **Measurement Tools**:
  - Add timing measurements between signal transitions
  - Visual indicators with double-headed arrows
  - Flexible placement (above, below, or between rows)
- **File Operations**:
  - Save/Load diagrams in JSON format
  - Export to SVG for documentation (with proper handling of text/counter widgets)
- **Configurable**: Adjustable number of cycles

## Setup

### Prerequisites

The application uses Paper.js from CDN, so no manual download is required. However, if you need offline access:

1. **Paper.js Library** (optional for offline use): Download Paper.js from:
   ```
   https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js
   ```
   
2. Place the downloaded `paper-full.min.js` file in the `js/` directory
3. Update `index.html` to use local file instead of CDN

### Running the Application

1. Open `index.html` in a modern web browser (requires internet for CDN)
2. Or serve it using a local web server:
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000/index.html` in your browser

**Note**: The application will automatically fallback to a minimal Paper.js implementation (`js/paper-shim.js`) if the CDN is unavailable.

## Usage

### Adding Signals

1. Click the "Add Signal" button in the top menu
2. Enter a signal name
3. Select signal type (Clock, Bit, or Bus)
4. Click "OK"

### Adding Widgets

**Text Rows:**
1. Click "Add Widget" → "Text" in the top menu
2. Enter text for the row (or leave empty for a blank row)
3. Click "OK"
4. Text appears in the waveform area, not in the name column

**Counter Rows:**
1. Click "Add Widget" → "Counter" in the top menu
2. Enter a start value (e.g., "1", "t1", "ts1")
3. Enter the start cycle number
4. Click "OK"
5. The counter automatically increments for each cycle
6. Supports formats like "t1", "t2", "t3" or "1", "2", "3"

**Measurements:**
1. Click "Add Widget" → "Measure" in the top menu
2. Click on the first signal transition point
3. Click on the second signal transition point
4. Click where you want the measurement displayed (above rows, below rows, or between rows)

### Editing Signals

- **Edit Signal Name/Type**: Right-click on signal name → "Edit"
- **Delete Signal**: Right-click on signal name → "Delete"
- **Toggle Bit Signal**: Left-click on any cycle of a bit signal to toggle between high (1) and low (0)
- **Set Bit Value**: Right-click on a cycle → select value (0, 1, X, or Z)
- **Set Bus Value**: Left-click on any cycle of a bus signal, enter value and radix

### Signal Reordering

**Selection:**
- **Left-click** on signal name: Select signal (clears previous selection)
- **Ctrl/Cmd-click**: Toggle selection (add or remove from selection)
- **Shift-click**: Select range from last selected to clicked signal
- **Alt-click**: Deselect a specific signal
- **Escape key**: Clear all selections and cancel dragging

**Reordering:**
- Click and drag any selected signal name up or down to reorder
- All selected signals move together maintaining their relative order
- A red indicator line shows where the signals will be placed
- Selected signals are highlighted with blue background and white text

### Saving and Loading

- **Save**: Click "Save" to download the current diagram as a JSON file
- **Load**: Click "Load" to open a previously saved JSON file
- **Export SVG**: Click "Export SVG" to download the diagram as an SVG image
  - Text and counter rows are included in the SVG
  - Signal highlights are automatically turned off
  - Cycle reference numbers are hidden in SVG when counter rows are present

### Configuration

- **Cycles**: Use the number input in the top menu to change the number of cycles displayed

## Widget Types

### Text Rows
- Display text annotations in the waveform area
- Can be empty for spacing/blank rows
- Movable and reorderable like signals
- Included in SVG exports

### Counter Rows
- Display incremental cycle counters
- Support alphanumeric formats: "t1", "t2", "ts1", "ts2", etc.
- Support purely numeric formats: "1", "2", "3", etc.
- Can start and stop at specific cycles
- Automatically hides the default cycle reference counter
- Included in SVG exports

Example counter configuration:
```json
{
  "values": [
    {"cycle": 1, "value": "4"},      // Start at cycle 1 with value "4"
    {"cycle": 4, "value": null},     // Stop counting at cycle 4
    {"cycle": 6, "value": "ts1"}     // Resume at cycle 6 with "ts1"
  ]
}
```
This produces: "", "4", "5", "6", "", "", "ts1", "ts2", ...

## Signal Types

### Clock
- Generates a square wave pattern
- Not editable (always toggles high/low at each half-cycle)

### Bit
- Single-bit signals with states:
  - `0` (low): drawn at bottom
  - `1` (high): drawn at top
  - `Z` (high-impedance): drawn at middle
  - `X` (unknown): shown with crossed pattern
- Click to toggle, right-click for specific value

### Bus
- Multi-bit signals with:
  - Numeric values (hex, decimal)
  - String labels
  - `X` (unknown): shown with crossed pattern
  - `Z` (high-impedance): shown as middle line
- Slew transitions between value changes
- Value labels displayed in the waveform

## Technical Details

- Built with HTML5, CSS3, and JavaScript
- Uses Paper.js from CDN for vector graphics rendering (with local fallback)
- Canvas-based drawing for high-quality output
- JSON-based data storage format
- SVG export for documentation
- Organized structure: `js/` for JavaScript, `css/` for styles

## Data Format

The JSON file format contains:
```json
{
  "version": "3.3.0",
  "config": {
    "cycles": 20
  },
  "rows": [
    {
      "type": "signal",
      "name": "clk",
      "data": {
        "name": "clk",
        "type": "clock",
        "values": {}
      }
    },
    {
      "type": "text",
      "name": "T0",
      "data": {
        "text": "Data Phase"
      }
    },
    {
      "type": "counter",
      "name": "C0",
      "data": {
        "values": [
          {"cycle": 0, "value": "t1"}
        ]
      }
    },
    {
      "type": "signal",
      "name": "data",
      "data": {
        "name": "data",
        "type": "bus",
        "values": {
          "0": "X",
          "3": "0xAB",
          "8": "Z"
        }
      }
    }
  ]
}
```

## Browser Compatibility

- Modern browsers with HTML5 Canvas support
- Tested on Chrome, Firefox, Safari, and Edge

## License

This project is part of the timing_gen series of timing diagram tools.
